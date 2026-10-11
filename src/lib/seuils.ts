/**
 * Les volumes à partir desquels un outil a quelque chose à trier.
 *
 * POURQUOI CE FICHIER. Pendant la bêta, plusieurs pages montraient des
 * outils plus gros que ce qu'ils servaient à trier : huit villes et sept
 * rubriques au-dessus d'une seule annonce, une recherche, des thèmes et
 * trois tris pour cinq posts, une pastille « 2ᵉ coup de cœur de la
 * communauté » décernée sur un seul clic. Chacun de ces outils dit au
 * visiteur, mieux qu'un compteur, qu'il n'y a encore presque rien.
 * Ils attendent donc d'avoir de quoi faire.
 *
 * Ces nombres sont un POINT DE DÉPART : ils bougeront avec le site,
 * c'est pour ça qu'ils sont ici plutôt qu'au milieu d'un JSX.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`) et que serveur comme navigateur y lisent des nombres.
 * Les seuils propres à la page des coups de cœur vivent à côté d'elle,
 * dans `components/coeurs/seuils.ts`.
 */

/** Combien d'annonces avant d'afficher villes et rubriques dans le forum. */
export const ANNONCES_POUR_FILTRER = 10;

/** Combien de posts avant d'afficher la recherche, les critères et le tri. */
export const POSTS_POUR_FILTRER = 12;

/**
 * Combien de coups de cœur une pièce doit avoir reçus pour porter la
 * pastille « Coup de cœur de la communauté » sur sa page.
 *
 * Être dans les dix premières ne suffit pas : sur un site jeune, un
 * seul clic y fait entrer, et la pastille annonce alors une distinction
 * qui n'en est pas une.
 */
export const PASTILLE_COEURS_MIN = 10;

/**
 * Les filtres d'une liste valent-ils la place qu'ils prennent ?
 *
 * Oui à partir du seuil. En dessous non, SAUF si un filtre est déjà
 * posé : quelqu'un qui arrive par un lien partagé (`?ville=Lyon`) doit
 * voir ce qui rétrécit sa liste, et pouvoir le retirer.
 *
 * La réponse se prend une fois, à l'arrivée sur la page : un filtre
 * qu'on vient d'enlever ne doit pas emporter les autres avec lui.
 */
export function filtresUtiles(combien: number, seuil: number, dejaFiltre: boolean): boolean {
  return dejaFiltre || combien >= seuil;
}

/** La pastille de classement d'une pièce, à partir de `PASTILLE_COEURS_MIN` cœurs. */
export function pastilleMeritee(coeurs: number): boolean {
  return coeurs >= PASTILLE_COEURS_MIN;
}
