"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lireLesRegles } from "@/lib/regles-tags";
import {
  avecLaFamille,
  classerLaPiece,
  cleDeLibelle,
  estUneFamille,
  type Rangement,
  type Regles,
} from "@/lib/tags";

/**
 * RECLASSER SANS RELIRE LES BOUTIQUES.
 *
 * Chaque pièce importée garde ce que sa boutique a déclaré
 * (`rangement_boutique`). Le classement n'est donc qu'un calcul, qu'on
 * peut refaire à volonté : après une correction du lexique, après une
 * règle posée sur un tag local, ou juste après la migration 34, pour
 * donner leur tag fin aux pièces déjà en base sans attendre que la
 * tâche quotidienne soit passée chez chaque marque.
 *
 * Une pièce importée avant la migration n'a pas encore de rangement :
 * elle est reclassée sur son nom, comme avant, mais avec les tags fins
 * en plus. Sa prochaine lecture complétera le reste.
 */

type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;

type PieceStockee = {
  id: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  tags: string[] | null;
  tags_locaux: string[] | null;
  rangement_boutique: Rangement | null;
  classement_manuel: boolean | null;
};

type Ligne = { id: string; categories: string[]; tags: string[]; tags_locaux: string[] };

const CHAMPS =
  "id, name, description, categories, tags, tags_locaux, rangement_boutique, classement_manuel";

function meme(a: string[] | null | undefined, b: string[]): boolean {
  const x = a ?? [];
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

/** Les pièces dont le classement change, prêtes à écrire. */
function reclasser(pieces: PieceStockee[], regles: Regles): Ligne[] {
  const lignes: Ligne[] = [];
  for (const p of pieces) {
    const classe = classerLaPiece(
      { nom: p.name, description: p.description, rangement: p.rangement_boutique },
      regles
    );
    const ligne: Ligne = p.classement_manuel
      ? {
          id: p.id,
          categories: p.categories ?? [],
          tags: p.tags ?? [],
          tags_locaux: classe.locaux,
        }
      : {
          id: p.id,
          categories: avecLaFamille(p.categories, classe.famille),
          tags: classe.tags,
          tags_locaux: classe.locaux,
        };
    if (
      !meme(p.categories, ligne.categories) ||
      !meme(p.tags, ligne.tags) ||
      !meme(p.tags_locaux, ligne.tags_locaux)
    ) {
      lignes.push(ligne);
    }
  }
  return lignes;
}

/** Écrit un lot en quelques requêtes plutôt qu'une par pièce. */
async function appliquer(supabase: Client, lignes: Ligne[]): Promise<{ n: number; erreur?: string }> {
  let n = 0;
  for (let i = 0; i < lignes.length; i += 500) {
    const { data, error } = await supabase.rpc("appliquer_classement", {
      p_lignes: lignes.slice(i, i + 500),
    });
    if (error) return { n, erreur: error.message };
    n += Number(data ?? 0);
  }
  return { n };
}

function rafraichirLeSite() {
  revalidateTag("marques");
  revalidateTag("pieces");
  revalidatePath("/marques");
  revalidatePath("/pieces");
  revalidatePath("/admin/tags");
}

/** Combien de pièces on relit à chaque appel : large, puisqu'aucune boutique n'est interrogée. */
const LOT = 1000;

export async function reclasserLeCatalogue(depuis: number): Promise<{
  ok: boolean;
  error?: string;
  parcourues: number;
  changees: number;
  restantes: number;
}> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase n'est pas configuré.", parcourues: 0, changees: 0, restantes: 0 };
  }

  const regles = await lireLesRegles(supabase);

  const { data, count, error } = await supabase
    .from("products")
    .select(CHAMPS, { count: "exact" })
    // Un ordre total : sinon deux lots se recouvrent (voir `stats.ts`).
    .order("id", { ascending: true })
    .range(depuis, depuis + LOT - 1);

  if (error) {
    const manque = /tags|rangement_boutique|classement_manuel/.test(error.message);
    return {
      ok: false,
      error: manque
        ? "La base n'a pas encore les colonnes des tags : passe d'abord supabase/migration-34.sql dans le SQL Editor."
        : error.message,
      parcourues: 0,
      changees: 0,
      restantes: 0,
    };
  }

  const pieces = (data as unknown as PieceStockee[] | null) ?? [];
  const bilan = await appliquer(supabase, reclasser(pieces, regles));
  if (bilan.erreur) {
    return { ok: false, error: bilan.erreur, parcourues: pieces.length, changees: bilan.n, restantes: 0 };
  }

  const restantes = Math.max(0, (count ?? 0) - (depuis + pieces.length));
  if (restantes === 0 || pieces.length === 0) rafraichirLeSite();

  return { ok: true, parcourues: pieces.length, changees: bilan.n, restantes };
}

/**
 * Reclasse toutes les pièces de ces marques.
 *
 * C'est ce qui rend une règle visible tout de suite : promouvoir
 * « Artefacts » en « Accessoires » ne doit pas attendre la prochaine
 * lecture de la boutique. Et c'est pourquoi la règle garde la liste
 * des marques concernées : quand on la retire, les pièces qui avaient
 * quitté leurs tags locaux doivent pouvoir y revenir, alors que plus
 * rien sur elles ne dit qu'elles en viennent.
 */
async function reclasserLesMarques(supabase: Client, slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  const { data: marques } = await supabase.from("brands").select("id").in("slug", slugs);
  const ids = ((marques as { id: string }[] | null) ?? []).map((m) => m.id);
  if (ids.length === 0) return;

  const regles = await lireLesRegles(supabase);
  for (let de = 0; de < 100_000; de += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select(CHAMPS)
      .in("brand_id", ids)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error || !data) return;
    const pieces = data as unknown as PieceStockee[];
    await appliquer(supabase, reclasser(pieces, regles));
    if (pieces.length < 1000) return;
  }
}

/** Une liste de chaînes passée en JSON dans un champ caché. */
function listeDe(formData: FormData, champ: string): string[] {
  try {
    const brut = JSON.parse(String(formData.get(champ) ?? "[]"));
    return Array.isArray(brut)
      ? brut.filter((l): l is string => typeof l === "string").slice(0, 200)
      : [];
  } catch {
    return [];
  }
}

/**
 * Promouvoir ou masquer un tag local.
 *
 * `cible` vaut `famille:Vestes`, `tag:Bombers`, ou `nouveau` (ou rien)
 * avec le nom et la famille du tag à créer. Une valeur qui n'a pas de
 * sens ne pose aucune règle : on ne crée pas un tag vide.
 */
export async function poserUneRegle(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;

  const libelles = listeDe(formData, "libelles").slice(0, 50);
  const marques = listeDe(formData, "marques");
  const cle = cleDeLibelle(String(formData.get("cle") ?? libelles[0] ?? ""));
  if (!cle) return;

  const decision = formData.get("decision") === "masque" ? "masque" : "global";
  let tag: string | null = null;
  let famille: string | null = null;

  if (decision === "global") {
    const cible = String(formData.get("cible") ?? "");
    if (cible.startsWith("famille:")) {
      tag = cible.slice("famille:".length);
      if (!estUneFamille(tag)) return;
    } else if (cible.startsWith("tag:")) {
      tag = cible.slice("tag:".length).trim().slice(0, 40) || null;
    } else if (cible === "nouveau" || cible === "") {
      /* Rien de choisi dans la liste : on promeut le libellé tel qu'il
         est écrit dans le champ, sous le rayon indiqué. */
      tag = String(formData.get("nouveau") ?? "").trim().replace(/\s+/g, " ").slice(0, 40) || null;
      const f = String(formData.get("famille") ?? "");
      famille = estUneFamille(f) ? f : null;
    }
    if (!tag) return;
  }

  const { error } = await supabase.from("tags_regles").upsert({
    cle,
    decision,
    tag,
    famille,
    libelles,
    marques,
    updated_at: new Date().toISOString(),
  });
  if (error) return;

  await reclasserLesMarques(supabase, marques);
  rafraichirLeSite();
}

/** Retirer une règle : les pièces retrouvent leur tag local. */
export async function retirerUneRegle(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;

  const cle = String(formData.get("cle") ?? "");
  if (!cle) return;

  const { data } = await supabase.from("tags_regles").select("marques").eq("cle", cle).maybeSingle();
  const marques = ((data as { marques?: string[] } | null)?.marques ?? []).filter(Boolean);

  const { error } = await supabase.from("tags_regles").delete().eq("cle", cle);
  if (error) return;

  await reclasserLesMarques(supabase, marques);
  rafraichirLeSite();
}
