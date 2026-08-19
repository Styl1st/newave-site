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
