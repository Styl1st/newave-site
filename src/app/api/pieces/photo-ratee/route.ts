import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { connecterRobot } from "@/lib/robot";
import {
  adresseSure,
  decider,
  etatDeLaPage,
  etatDuStatut,
  photosDe,
  type Etat,
  type Page,
  type Piece,
} from "@/lib/photos-mortes";

/**
 * UNE PHOTO DE PIÈCE N'A PAS PU S'AFFICHER CHEZ UN VISITEUR.
 *
 * Le script du <head> envoie ici les identifiants des pièces dont une
 * photo a échoué (voir `lib/image-progressive`). Le serveur ne croit pas
 * le navigateur sur parole : il relit la pièce en base, va voir lui-même
 * chaque photo chez son hébergeur, et n'agit que sur une preuve : un 404
 * ou un 410 sur les photos, ou, si aucune ne s'affiche, la page de la
 * pièce introuvable chez la marque. Voir `lib/photos-mortes`.
 *
 * Ce qu'un appel malveillant peut faire : nous faire relire des photos
 * déjà en base, à un rythme borné. Il ne choisit ni les adresses lues,
 * ni ce qu'on écrit.
 *
 * La réponse est un compte rendu (voir `CompteRendu`) : le script ne le
 * lit pas, mais il dit depuis la console pourquoi une pièce est restée.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Une pièce n'est revue qu'une fois par demi-heure, par instance. */
const REVUES = new Map<string, number>();
const ENTRE_DEUX_REVUES = 30 * 60 * 1000;

/** Et pas plus de soixante photos lues par minute, par instance. */
let fenetre = 0;
let luesDansLaFenetre = 0;
const PHOTOS_PAR_MINUTE = 60;

function aLeDroitDeLire(): boolean {
  const maintenant = Date.now();
  if (maintenant - fenetre > 60_000) {
    fenetre = maintenant;
    luesDansLaFenetre = 0;
  }
  if (luesDansLaFenetre >= PHOTOS_PAR_MINUTE) return false;
  luesDansLaFenetre++;
  return true;
}

/**
 * On se présente comme un navigateur, comme `/api/img` : beaucoup de CDN
 * de boutiques répondent 403 à tout ce qui n'en a pas l'air. C'est ce qui
 * laissait Spider bunny en vitrine : son hébergeur refusait la question
 * au lieu de dire que la photo n'existait plus.
 */
const ENTETES = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

/**
 * Lit une adresse en suivant les redirections à la main, trois au plus,
 * chaque étape devant rester une adresse sûre. On ne lit que les
 * en-têtes : le corps est abandonné aussitôt. `null` : pas de réponse.
 */
async function lire(adresse: string, accept: string): Promise<{ statut: number; fin: string } | null> {
  let cible = adresseSure(adresse);
  for (let saut = 0; cible && saut < 4; saut++) {
    if (!aLeDroitDeLire()) return null;
    let r: Response;
    try {
      r = await fetch(cible, {
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: { ...ENTETES, accept },
        cache: "no-store",
      });
    } catch {
      return null;
    }
    void r.body?.cancel().catch(() => {});
    if (r.status >= 300 && r.status < 400) {
      const suite = r.headers.get("location");
      cible = suite ? adresseSure(new URL(suite, cible).toString()) : null;
      continue;
    }
    return { statut: r.status, fin: cible.toString() };
  }
  return null;
}

/** L'état d'une photo, avec le code reçu pour le compte rendu. */
async function etatDe(adresse: string): Promise<{ etat: Etat; code: number | null }> {
  const r = await lire(adresse, "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8");
  return r ? { etat: etatDuStatut(r.statut), code: r.statut } : { etat: "inconnu", code: null };
}

async function pageDe(adresse: string | null): Promise<{ page: Page; code: number | null; fin: string | null }> {
  if (!adresse) return { page: "inconnu", code: null, fin: null };
  const r = await lire(adresse, "text/html,*/*;q=0.8");
  return r
    ? { page: etatDeLaPage(r.statut, r.fin, adresse), code: r.statut, fin: r.fin }
    : { page: "inconnu", code: null, fin: null };
}

function nettoyer(): void {
  if (REVUES.size < 2000) return;
  const limite = Date.now() - ENTRE_DEUX_REVUES;
  for (const [id, quand] of REVUES) if (quand < limite) REVUES.delete(id);
}

/**
 * Le compte rendu, renvoyé au navigateur. Le script du <head> l'ignore ;
 * il sert à comprendre, depuis la console, pourquoi une pièce est restée.
 * Rien de secret : des codes de réponse d'adresses publiques.
 */
type CompteRendu = {
  id: string;
  deja?: true;
  absente?: true;
  photos?: (number | null)[];
  page?: { code: number | null; fin: string | null; verdict: Page };
  decision?: "rien" | "nettoyer" | "retirer";
  ecrit?: boolean;
  erreur?: string;
};

export async function POST(request: Request) {
  let ids: string[] = [];
  try {
    const corps = (await request.json()) as { ids?: unknown };
    if (Array.isArray(corps.ids)) {
      ids = corps.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 24);
    }
  } catch {
    return NextResponse.json({ pieces: [] }, { status: 400 });
  }

  const rendu: CompteRendu[] = [];
  const repondre = () => NextResponse.json({ pieces: rendu }, { headers: { "cache-control": "no-store" } });

  nettoyer();
  const maintenant = Date.now();
  const aRevoir: string[] = [];
  for (const id of new Set(ids)) {
    if (maintenant - (REVUES.get(id) ?? 0) > ENTRE_DEUX_REVUES) aRevoir.push(id);
    else rendu.push({ id, deja: true });
  }
  if (aRevoir.length === 0) return repondre();
  for (const id of aRevoir) REVUES.set(id, maintenant);

  const lecteur = createPublicClient();
  if (!lecteur) return repondre();

  const { data } = await lecteur
    .from("products")
    .select("id, brand_id, images, image_url, source_id, shop_url")
    .in("id", aRevoir)
    .eq("status", "published")
    .is("retired_at", null);

  const pieces = (data ?? []) as (Piece & { id: string; brand_id: string; shop_url: string | null })[];
  for (const id of aRevoir) if (!pieces.some((p) => p.id === id)) rendu.push({ id, absente: true });

  let robot: Awaited<ReturnType<typeof connecterRobot>> | undefined;

  for (const piece of pieces) {
    const etats = new Map<string, Etat>();
    const codes: (number | null)[] = [];
    for (const photo of photosDe(piece)) {
      const { etat, code } = await etatDe(photo);
      etats.set(photo, etat);
      codes.push(code);
    }

    /* La page n'est lue que si aucune photo ne s'affiche sans qu'on ait
       la preuve qu'elles sont mortes : c'est le seul cas où elle décide. */
    const valeurs = [...etats.values()];
    const lecture =
      valeurs.length > 0 && valeurs.every((e) => e !== "vivante") && valeurs.some((e) => e === "inconnu")
        ? await pageDe(piece.shop_url)
        : null;

    const decision = decider(piece, etats, lecture?.page ?? "inconnu");
    const ligne: CompteRendu = {
      id: piece.id,
      photos: codes,
      ...(lecture ? { page: { code: lecture.code, fin: lecture.fin, verdict: lecture.page } } : {}),
      decision: decision.action,
    };
    rendu.push(ligne);
    console.info(
      `[newave] photo-ratee : ${piece.id} photos [${codes.join(", ")}]` +
        (lecture ? `, page ${lecture.code} ${lecture.fin} (${lecture.page})` : "") +
        ` → ${decision.action}`
    );
    if (decision.action === "rien") continue;

    robot ??= await connecterRobot();
    if (!robot) {
      ligne.erreur = "le compte de l'automate n'a pas pu se connecter";
      console.error(`[newave] photo-ratee : ${ligne.erreur}.`);
      return repondre();
    }

    const changement =
      decision.action === "retirer"
        ? { retired_at: new Date().toISOString(), available: false }
        : { images: decision.images, image_url: decision.image_url };

    /* `.select()` : sans lui, une écriture que les règles de la base
       refusent passe sans erreur, sur zéro ligne, et l'on croirait la
       pièce retirée. */
    const { data: ecrites, error } = await robot
      .from("products")
      .update(changement)
      .eq("id", piece.id)
      .eq("brand_id", piece.brand_id)
      .is("retired_at", null)
      .select("id");

    ligne.ecrit = !error && (ecrites?.length ?? 0) > 0;
    if (error) ligne.erreur = error.message;
    else if (!ligne.ecrit) ligne.erreur = "aucune ligne écrite (droits du compte de l'automate ?)";
    console[ligne.ecrit ? "info" : "error"](
      `[newave] photo-ratee : ${piece.id} ${ligne.ecrit ? (decision.action === "retirer" ? "retirée de la vitrine" : "galerie nettoyée") : ligne.erreur}.`
    );
  }

  return repondre();
}
