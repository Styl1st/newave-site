/**
 * Vrai sur la page de connexion elle-même.
 *
 * Sert à ne pas proposer « Connexion » dans l'en-tête quand on est
 * déjà dessus : sur téléphone, c'était une deuxième pastille blanche
 * pour le geste que la page entière propose.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */
export function estPageConnexion(chemin: string | null | undefined): boolean {
  return !!chemin && /^\/connexion(\/|$)/.test(chemin);
}
