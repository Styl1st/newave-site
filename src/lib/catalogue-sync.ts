import type { SupabaseClient } from "@supabase/supabase-js";
import { cleLien, type CatalogueItem } from "./catalogue-commun";

/**
 * Ranger un catalogue lu chez une marque dans notre base.
 *
 * Cette logique sert deux fois : quand une marque importe elle-même
 * ses pièces, et quand la mise à jour quotidienne repasse derrière.
 * Il fallait qu'elle soit écrite une seule fois, sinon les deux
 * chemins auraient fini par diverger, et l'automate aurait
 * silencieusement abîmé ce que l'import faisait correctement.
 *
 * La règle qui compte : on ne remplace jamais une pièce par une
 * autre. Chaque pièce lue est appariée à une pièce existante, d'abord
 * par son identifiant chez la boutique, puis par son adresse. Si rien
 * ne correspond, c'est une nouvelle.
 *
 * Et ce que la personne a décidé lui appartient. Un rafraîchissement
 * met à jour le prix, les photos, les tailles et la disponibilité,
 * mais ne touche ni au rayon choisi, ni à la mise en avant, ni à
 * l'ordre d'affichage, ni au fait qu'une pièce soit publiée ou non.
 */

export type Existante = {
  id: string;
  source_id: string | null;
  shop_url: string | null;
  slug: string | null;
  status: string;
  position: number | null;
  categories: string[] | null;
  featured: boolean | null;
  retired_at: string | null;
};

export type Bilan = { creees: number; majs: number; retirees: number; erreur?: string };

/**
 * En deçà, on ne retire rien.
 *
 * Si une boutique ne renvoie plus qu'une poignée de pièces alors
 * qu'elle en avait cinquante, l'explication la plus probable n'est pas
 * qu'elle a tout arrêté : c'est que sa page a mal répondu, ou que son
 * site a changé de forme. Marquer tout son catalogue comme retiré sur
 * la foi d'une lecture bancale ferait bien plus de dégâts que
 * d'attendre le passage du lendemain.
 */
const SEUIL_DE_CONFIANCE = 0.4;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function enLigne(item: CatalogueItem, brandId: string) {
  return {
    brand_id: brandId,
    source_id: item.source_id,
    slug: item.slug || slugify(item.name),
    name: item.name,
    description: item.description,
    price_cents: item.price_cents,
    compare_at_cents: item.compare_at_cents,
    currency: item.currency,
    sizes: item.sizes,
    size_label: item.size_label,
    images: item.images,
    image_url: item.images[0] ?? null,
    shop_url: item.shop_url,
    available: item.available,
  };
}

export async function synchroniserCatalogue(
  supabase: SupabaseClient,
  brandId: string,
  items: CatalogueItem[],
  options: {
    /** Ce que devient une pièce qu'on n'avait jamais vue. */
    statutDesNouvelles: "draft" | "published";
    /**
     * true seulement quand on vient de lire la boutique ENTIÈRE.
     *
     * Un import depuis l'adresse d'une seule pièce ne dit rien des
     * autres : conclure de son absence qu'elles ont disparu serait
     * absurde. Seule la relecture quotidienne, qui parcourt tout le
     * catalogue, est en droit d'en tirer cette conclusion.
     */
    marquerLesAbsentes?: boolean;
  }
): Promise<Bilan> {
  if (items.length === 0) return { creees: 0, majs: 0, retirees: 0 };

  const { data: brut, error: lecture } = await supabase
    .from("products")
    .select("id, source_id, shop_url, slug, status, position, categories, featured, retired_at")
    .eq("brand_id", brandId);

  if (lecture) return { creees: 0, majs: 0, retirees: 0, erreur: lecture.message };

  const existantes = (brut as Existante[] | null) ?? [];
  const parSource = new Map<string, Existante>();
  const parLien = new Map<string, Existante>();
  const slugsPris = new Set<string>();

  for (const p of existantes) {
    if (p.source_id) parSource.set(p.source_id, p);
    const cle = cleLien(p.shop_url);
    if (cle) parLien.set(cle, p);
    if (p.slug) slugsPris.add(p.slug);
  }

  let rang = existantes.reduce((max, p) => Math.max(max, p.position ?? 0), -1) + 1;

  const aMettreAJour: Record<string, unknown>[] = [];
  const aCreer: Record<string, unknown>[] = [];
  const dejaTraitees = new Set<string>();

  for (const item of items) {
    const ligne = enLigne(item, brandId);
    const trouvee =
      (ligne.source_id ? parSource.get(ligne.source_id) : undefined) ??
      parLien.get(cleLien(ligne.shop_url));

    if (trouvee) {
      // Postgres refuse de modifier deux fois la même ligne dans un
      // même lot : on ne reprend donc une pièce qu'une fois.
      if (dejaTraitees.has(trouvee.id)) continue;
      dejaTraitees.add(trouvee.id);

      aMettreAJour.push({
        ...ligne,
        id: trouvee.id,
        slug: trouvee.slug ?? ligne.slug,
        status: trouvee.status,
        position: trouvee.position ?? 0,
        categories: trouvee.categories ?? [],
        featured: trouvee.featured ?? false,
        // Elle est de retour dans la boutique : on lève l'archive.
        retired_at: null,
      });
    } else {
      // Deux pièces d'une même marque ne peuvent pas partager une
      // adresse : on suffixe plutôt que d'échouer sur un message brut.
      const base = ligne.slug || slugify(ligne.name);
      let pieceSlug = base;
      while (slugsPris.has(pieceSlug)) {
        pieceSlug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      slugsPris.add(pieceSlug);

      aCreer.push({
        ...ligne,
        slug: pieceSlug,
        categories: [] as string[],
        status: options.statutDesNouvelles,
        position: rang++,
      });
    }
  }

  if (aMettreAJour.length > 0) {
    const { error } = await supabase.from("products").upsert(aMettreAJour);
    if (error) return { creees: 0, majs: 0, retirees: 0, erreur: error.message };
  }
  if (aCreer.length > 0) {
    const { error } = await supabase.from("products").insert(aCreer);
    if (error) {
      return { creees: 0, majs: aMettreAJour.length, retirees: 0, erreur: error.message };
    }
  }

  /* ---------- les pièces qui ont quitté la boutique ----------
     On ne les efface pas. Elles ont peut-être reçu des coups de cœur,
     et ceux-ci racontent ce que la marque a fait : les jeter
     reviendrait à effacer une partie de son histoire, et à retirer à
     la marque une visibilité qu'elle a méritée. On date leur retrait,
     et la fiche le dit clairement. */
  let retirees = 0;

  if (options.marquerLesAbsentes) {
    // Seules les pièces venues d'un import sont concernées : une pièce
    // saisie à la main n'a jamais été dans le flux de la boutique, son
    // absence ne prouve donc rien.
    const importees = existantes.filter((p) => p.source_id && !p.retired_at);
    const disparues = importees.filter((p) => !dejaTraitees.has(p.id));

    const proportionLue = importees.length === 0 ? 1 : dejaTraitees.size / importees.length;

    if (disparues.length > 0 && proportionLue >= SEUIL_DE_CONFIANCE) {
      const { error } = await supabase
        .from("products")
        .update({ retired_at: new Date().toISOString(), available: false })
        .in("id", disparues.map((p) => p.id))
        .eq("brand_id", brandId);
      if (!error) retirees = disparues.length;
    }
  }

  return { creees: aCreer.length, majs: aMettreAJour.length, retirees };
}
