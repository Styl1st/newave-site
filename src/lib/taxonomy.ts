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

/**
 * Les catégories de marque.
 *
 * Volontairement CLASSIQUES. Un filtre ne sert à rien si le visiteur
 * doit deviner ce qu'il recouvre : « Grunge » ou « Bijoux » se
 * comprennent sans explication, une trouvaille de vocabulaire non.
 * L'annuaire n'a pas à inventer un vocabulaire, il a à retrouver
 * celui que les gens emploient déjà.
 *
 * Rangées par famille plutôt que par ordre alphabétique : c'est
 * l'ordre dans lequel les cases s'affichent en administration, et
 * cocher un style puis une matière puis un rayon suit la façon dont on
 * décrit une marque à voix haute.
 *
 * Un canal de vente n'a rien à faire ici. Vinted, Depop, Etsy se
 * déduisent de l'adresse de la boutique et s'affichent tout seuls :
 * en faire des cases à cocher revenait à demander de saisir deux fois
 * la même information, avec le risque que les deux se contredisent.
 */
export const BRAND_CATEGORIES = [
  // Le style. C'est ce qu'on cherche en premier.
  "Streetwear",
  "Alternative",
  "Grunge",
  "Punk",
  "Gothique",
  "Y2K",
  "Skate",
  "Sportswear",
  "Techwear",
  "Workwear",
  "Tailoring",
  "Old money",
  "Minimalisme",
  "Casual",
  "Vintage",
  "Luxe",
  // La matière et la façon.
  "Denim",
  "Maille",
  "Cuir",
  "Upcycling",
  "Sur-mesure",
  // Ce qui est vendu, quand la marque ne fait que ça.
  "Accessoires",
  "Bijoux",
  "Chaussures",
  // Qui est derrière. « Artiste » commande l'onglet de l'annuaire :
  // une personne qui fait elle-même, souvent à l'unité.
  "Artiste",
  "Womenswear",
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
  // Le `Set` n'est pas une précaution de style : une valeur venue
  // d'ailleurs peut arriver en double, et deux cases à cocher de même
  // nom deviennent deux enfants React de même clé.
  const extra = Array.from(new Set(existing ?? [])).filter((v) => !reference.includes(v));
  return [...reference, ...extra];
}
