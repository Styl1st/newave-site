/**
 * Le peu de code catalogue dont le navigateur a besoin.
 *
 * `catalogue.ts` fait près de neuf cents lignes : lecture de flux
 * Shopify, parcours de plans de site, analyse de JSON-LD. Rien de tout
 * cela ne sert dans le navigateur, mais il suffisait qu'un composant
 * client y prenne une seule constante pour que le fichier entier parte
 * dans le paquet envoyé au visiteur. Les types et les quelques
 * fonctions pures vivent donc ici.
 */

export type Source =
  | "shopify"
  | "woocommerce"
  | "bigcartel"
  | "donnees-structurees"
  | "plan-du-site";

export type CatalogueItem = {
  source_id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number | null;
  compare_at_cents: number | null;
  currency: string;
  sizes: { label: string; available: boolean }[];
  size_label: string;
  images: string[];
  shop_url: string;
  available: boolean;
};

export type Resultat =
  | { ok: true; source: Source; items: CatalogueItem[] }
  | {
      ok: false;
      error: string;
      /**
       * La boutique est fermée volontairement — mot de passe, page
       * « coming soon », drop en préparation.
       *
       * À distinguer soigneusement d'une lecture qui échoue : là, il
       * n'y a rien à réparer de notre côté, et la marque n'a rien fait
       * de mal. C'est ce qui permet d'écrire au visiteur « ça arrive »
       * plutôt que « on n'a pas su lire ».
       */
      verrouillee?: boolean;
    };

export const SOURCE_LABEL: Record<Source, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  bigcartel: "Big Cartel",
  "donnees-structurees": "les données publiées pour Google",
  "plan-du-site": "le plan du site",
};

/**
 * Deux écritures d'une même adresse doivent donner la même clé, sinon
 * réimporter une pièce la dupliquerait au lieu de la mettre à jour.
 */
export function cleLien(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const hote = u.host.replace(/^www\./i, "").toLowerCase();
    const chemin = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `${hote}${chemin}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}
