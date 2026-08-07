/**
 * Le vocabulaire du site.
 *
 * C'est LE seul fichier a modifier pour ajouter ou retirer une categorie
 * ou un mot-cle : les cases a cocher de /admin et les filtres du site
 * public s'y alignent tout seuls.
 *
 * Une valeur retiree d'ici ne disparait pas des fiches qui l'utilisent
 * deja : l'administration l'affiche quand meme, pour que tu ne perdes
 * rien sans t'en apercevoir.
 */

export const BRAND_CATEGORIES = [
  "Streetwear",
  "Minimalisme",
  "Denim",
  "Maille",
  "Tailoring",
  "Workwear",
  "Sportswear",
  "Techwear",
  "Upcycling",
  "Sur-mesure",
  "Bijoux",
  "Accessoires",
  "Chaussures",
  "Vintage",
] as const;

/**
 * Les rayons d'une marque.
 * Volontairement courts : c'est le decoupage qu'utilisent les
 * boutiques indep elles-memes (Hauts / Bas / Vestes / Accessoires),
 * pas une nomenclature de grand magasin.
 */
export const PRODUCT_CATEGORIES = [
  "Hauts",
  "Bas",
  "Vestes",
  "Robes",
  "Maille",
  "Chaussures",
  "Bijoux",
  "Accessoires",
] as const;

export const POST_KEYWORDS = [
  "marque indé",
  "made in france",
  "série limitée",
  "savoir-faire",
  "atelier",
  "coulisses",
  "interview",
  "sélection",
  "drop",
  "nouveauté",
  "denim",
  "streetwear",
  "minimalisme",
  "upcycling",
] as const;

/**
 * Fusionne la liste de reference avec les valeurs deja enregistrees.
 * Sans ca, modifier une fiche qui porte une ancienne valeur la ferait
 * disparaitre en silence au premier enregistrement.
 */
export function withExisting(
  reference: readonly string[],
  existing: string[] | undefined
): string[] {
  const extra = (existing ?? []).filter((v) => !reference.includes(v));
  return [...reference, ...extra];
}
