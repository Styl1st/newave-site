/**
 * Une photo ou une vidéo, dans la même liste.
 *
 * POURQUOI AUCUNE COLONNE NOUVELLE. Un post porte déjà `images`, un
 * tableau d'adresses. Une vidéo est une adresse comme une autre : il
 * suffit de la reconnaître au moment de l'afficher. Ajouter une colonne
 * `videos` à côté aurait posé une question sans réponse — dans quel
 * ordre entremêler les deux listes ? — alors qu'un carrousel est par
 * nature une SUITE, et qu'une seule liste la décrit sans ambiguïté.
 *
 * Conséquence agréable : rien à migrer, et un post déjà en ligne
 * continue de fonctionner exactement pareil.
 */

/** Les formats qu'un navigateur lit sans greffon. */
const VIDEO = /\.(mp4|webm|m4v|mov)(\?|#|$)/i;

export function estUneVideo(url: string | null | undefined): boolean {
  return Boolean(url) && VIDEO.test(url as string);
}

/**
 * La première image fixe d'une suite de médias.
 *
 * Sert de vignette dans les listes et d'aperçu au partage. Une vidéo ne
 * peut pas jouer ce rôle : une carte d'annuaire et l'aperçu d'un lien
 * partagé attendent une image, et n'affichent rien du tout si on leur
 * en donne une autre.
 */
export function premiereImage(medias: readonly string[] | null | undefined): string | null {
  return medias?.find((m) => !estUneVideo(m)) ?? null;
}

/** Y a-t-il au moins une vidéo dans la suite ? */
export function contientUneVideo(medias: readonly string[] | null | undefined): boolean {
  return (medias ?? []).some(estUneVideo);
}

/**
 * Cette pièce a-t-elle de quoi être MONTRÉE ?
 *
 * Une pièce sans photo s'affichait comme un rectangle gris portant
 * « Visuel à venir ». Sur une grille faite pour être parcourue à l'œil,
 * c'est un trou : rien à regarder, rien à comparer, et la promesse d'une
 * image qui n'arrivera pas, puisque ces pièces viennent d'un import où
 * la boutique n'en fournissait aucune.
 *
 * On les écarte donc des grilles. Leur fiche reste accessible et leur
 * enregistrement intact : ce n'est pas une suppression, c'est une pièce
 * qu'on ne met pas en vitrine tant qu'elle n'a rien à y montrer.
 *
 * Les vidéos ne comptent pas ici. La fiche sait les lire, une vignette
 * non : voir `ProductCard`.
 */
export function aUneIllustration(piece: {
  images?: string[] | null;
  image_url?: string | null;
}): boolean {
  const medias = piece.images?.length ? piece.images : [piece.image_url];
  return medias.some((m) => Boolean(m) && !estUneVideo(m));
}
