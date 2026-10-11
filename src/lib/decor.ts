/**
 * La taille du décor chromé selon la page.
 *
 * Sur l'accueil, les quatre blobs sont l'image de la marque : ils
 * restent en grand. Sur les pages de contenu (annuaire, fiches, posts,
 * forum, compte), ils mordaient sur la colonne de texte et leurs
 * reflets clairs rendaient illisibles les petits textes posés dessus
 * (« 165 marques », « 5 posts »). Ils s'y retirent dans leurs coins.
 * Voir `html[data-decor-page]` dans globals.css.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */
export type TailleDecor = "plein" | "discret";

const PLEIN = new Set(["/", "/acces"]);

export function decorPourChemin(chemin: string | null | undefined): TailleDecor {
  return chemin && PLEIN.has(chemin) ? "plein" : "discret";
}
