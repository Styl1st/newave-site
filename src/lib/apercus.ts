import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { DEMO_BRANDS, DEMO_PRODUCTS } from "./demo-data";
import { estUneVideo, premiereImage } from "./medias";
import type { ApercuMarque } from "./apercus-client";

/**
 * L'APERÇU D'UNE MARQUE : HUIT PHOTOS ET UN COMPTE, RIEN DE PLUS.
 *
 * Il était tiré de `getProductsByBrand`, c'est-à-dire de TOUTES les
 * pièces de la marque, toutes colonnes, par tranches de mille. Pour la
 * plus grosse de l'annuaire, trois mille deux cents pièces : quatre
 * allers-retours, un tri qui débordait sur le disque, et six mégaoctets
 * et demi transportés depuis la base, pour n'en garder que huit
 * adresses d'images. Chaque ligne de l'annuaire en payait autant, et
 * c'est ce qui laissait ses quatre cases vides un moment.
 *
 * Maintenant, deux lectures lancées ensemble : les douze premières
 * pièces montrables (photos seules, dans l'ordre de la boutique), et
 * leur nombre, compté dans l'index de la vitrine sans toucher à la
 * table. Quatre millisecondes au lieu de quatre requêtes.
 *
 * « MONTRABLE » VEUT DIRE LA MÊME CHOSE QUE DANS LA VITRINE : publiée,
 * pas retirée, avec au moins une photo (`a_un_visuel`, tenu à jour par
 * la base, voir la migration 42). Le « +12 » d'une ligne annonce donc
 * ce qu'on trouvera vraiment en ouvrant la marque.
 */
async function lireApercu(slug: string): Promise<ApercuMarque> {
  const supabase = createPublicClient();

  /* Sans base (développement sans clés) : les données de démonstration. */
  if (!supabase) {
    const marque = DEMO_BRANDS.find((b) => b.slug === slug);
    const pieces = DEMO_PRODUCTS.filter((p) => p.brand_id === marque?.id);
    return enApercu(pieces, pieces.length);
  }

  const { data: marque, error: erreurMarque } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  /*
   * ON LÈVE PLUTÔT QUE DE RENVOYER VIDE. `unstable_cache` garde ce que
   * la fonction renvoie, un aperçu vide compris : une base qui hoquette
   * une seconde laisserait la marque sans photos pendant cinq minutes.
   * Une erreur, elle, n'est pas gardée.
   */
  if (erreurMarque) throw new Error(erreurMarque.message);
  if (!marque) throw new MarqueIntrouvable(slug);

  const [liste, compte] = await Promise.all([
    supabase
      .from("products")
      .select("images, image_url")
      .eq("brand_id", marque.id)
      .eq("status", "published")
      .is("retired_at", null)
      .eq("a_un_visuel", true)
      .order("position", { ascending: true })
      .order("id", { ascending: true })
      /* Douze pour en garder huit : deux pièces partagent souvent la
         même photo (une taille, un coloris), et on dédoublonne. */
      .limit(12),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", marque.id)
      .eq("status", "published")
      .is("retired_at", null)
      .eq("a_un_visuel", true),
  ]);

  if (liste.error) throw new Error(liste.error.message);
  if (compte.error) throw new Error(compte.error.message);

  return enApercu(liste.data ?? [], compte.count ?? 0);
}

function enApercu(
  pieces: { images?: string[] | null; image_url?: string | null }[],
  total: number
): ApercuMarque {
  /* La première PHOTO de chaque pièce : une vidéo en tête de carrousel
     donnerait une case cassée dans une balise image. */
  const images = pieces
    .map(
      (p) =>
        premiereImage(p.images) ??
        (p.image_url && !estUneVideo(p.image_url) ? p.image_url : null)
    )
    .filter((u): u is string => Boolean(u));
  return { images: [...new Set(images)].slice(0, 8), total };
}

export class MarqueIntrouvable extends Error {
  constructor(slug: string) {
    super(`Marque introuvable : ${slug}`);
    this.name = "MarqueIntrouvable";
  }
}

/**
 * Gardé cinq minutes pour tout le monde, comme la réponse de la route.
 * La page de l'annuaire et la route lisent LE MÊME cache : une marque
 * lue pour l'une est prête pour l'autre.
 */
export const apercuDeMarque = unstable_cache(lireApercu, ["apercu-marque-v1"], {
  revalidate: 300,
});

/**
 * Les aperçus des premières marques d'une liste, lus ensemble.
 *
 * Une marque qui échoue est simplement absente du résultat : sa ligne
 * fera sa propre demande en arrivant à l'écran, comme avant. Jamais une
 * page qui tombe parce qu'une photo manque.
 */
export async function apercusDesPremieres(
  slugs: string[]
): Promise<Record<string, ApercuMarque>> {
  const lus = await Promise.allSettled(slugs.map((s) => apercuDeMarque(s)));
  const sortie: Record<string, ApercuMarque> = {};
  lus.forEach((r, i) => {
    if (r.status === "fulfilled") sortie[slugs[i]] = r.value;
  });
  return sortie;
}
