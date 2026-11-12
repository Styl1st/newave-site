import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { connecterRobot } from "@/lib/robot";
import { adresseSure, decider, etatDuStatut, photosDe, type Etat, type Piece } from "@/lib/photos-mortes";

/**
 * UNE PHOTO DE PIÈCE N'A PAS PU S'AFFICHER CHEZ UN VISITEUR.
 *
 * Le script du <head> envoie ici les identifiants des pièces dont une
 * photo a échoué (voir `lib/image-progressive`). Le serveur ne croit pas
 * le navigateur sur parole : il relit la pièce en base, va voir lui-même
 * chaque photo chez son hébergeur, et n'agit que sur une preuve, un 404
 * ou un 410. Voir `lib/photos-mortes` pour la règle.
 *
 * Ce qu'un appel malveillant peut faire : nous faire relire des photos
 * déjà en base, à un rythme borné. Il ne choisit ni les adresses lues,
 * ni ce qu'on écrit.
 *
 * La réponse est toujours vide : le navigateur n'en attend rien.
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
 * L'état d'une photo chez son hébergeur. Les redirections sont suivies
 * à la main, trois au plus, et chaque étape doit rester une adresse
 * sûre. On ne lit que les en-têtes : le corps est abandonné aussitôt.
 */
async function etatDe(adresse: string): Promise<Etat> {
  let cible = adresseSure(adresse);
  for (let saut = 0; cible && saut < 4; saut++) {
    if (!aLeDroitDeLire()) return "inconnu";
    let r: Response;
    try {
      r = await fetch(cible, {
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: { accept: "image/*,*/*;q=0.5", "user-agent": "NewaveSphere/1.0 (+https://newavesphere.fr)" },
        cache: "no-store",
      });
    } catch {
      return "inconnu";
    }
    void r.body?.cancel().catch(() => {});
    if (r.status >= 300 && r.status < 400) {
      const suite = r.headers.get("location");
      cible = suite ? adresseSure(new URL(suite, cible).toString()) : null;
      continue;
    }
    return etatDuStatut(r.status);
  }
  return "inconnu";
}

function nettoyer(): void {
  if (REVUES.size < 2000) return;
  const limite = Date.now() - ENTRE_DEUX_REVUES;
  for (const [id, quand] of REVUES) if (quand < limite) REVUES.delete(id);
}

export async function POST(request: Request) {
  const vide = new NextResponse(null, { status: 204 });

  let ids: string[] = [];
  try {
    const corps = (await request.json()) as { ids?: unknown };
    if (Array.isArray(corps.ids)) {
      ids = corps.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 24);
    }
  } catch {
    return vide;
  }

  nettoyer();
  const maintenant = Date.now();
  ids = [...new Set(ids)].filter((id) => maintenant - (REVUES.get(id) ?? 0) > ENTRE_DEUX_REVUES);
  if (ids.length === 0) return vide;
  for (const id of ids) REVUES.set(id, maintenant);

  const lecteur = createPublicClient();
  if (!lecteur) return vide;

  const { data } = await lecteur
    .from("products")
    .select("id, brand_id, images, image_url, source_id")
    .in("id", ids)
    .eq("status", "published")
    .is("retired_at", null);

  const pieces = (data ?? []) as (Piece & { id: string; brand_id: string })[];
  if (pieces.length === 0) return vide;

  let robot: Awaited<ReturnType<typeof connecterRobot>> | undefined;

  for (const piece of pieces) {
    const etats = new Map<string, Etat>();
    for (const photo of photosDe(piece)) {
      etats.set(photo, await etatDe(photo));
    }

    const decision = decider(piece, etats);
    if (decision.action === "rien") continue;

    robot ??= await connecterRobot();
    if (!robot) {
      console.error("[newave] photo-ratee : le compte de l'automate n'a pas pu se connecter.");
      return vide;
    }

    const changement =
      decision.action === "retirer"
        ? { retired_at: new Date().toISOString(), available: false }
        : { images: decision.images, image_url: decision.image_url };

    const { error } = await robot
      .from("products")
      .update(changement)
      .eq("id", piece.id)
      .eq("brand_id", piece.brand_id)
      .is("retired_at", null);

    if (error) {
      console.error(`[newave] photo-ratee : ${piece.id} : ${error.message}`);
    } else {
      console.info(
        `[newave] photo-ratee : ${piece.id} ${decision.action === "retirer" ? "retirée de la vitrine" : "galerie nettoyée"}.`
      );
    }
  }

  return vide;
}
