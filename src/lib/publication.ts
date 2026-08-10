/**
 * Ce qu'une fiche doit avoir pour paraître dans l'annuaire.
 *
 * Une seule définition, parce qu'une marque peut passer en ligne par
 * quatre chemins : le formulaire d'administration, le bouton d'une
 * ligne, la barre de sélection multiple, et un jour peut-être un
 * automate. Si chacun jugeait dans son coin, il finirait par exister
 * un chemin plus permissif que les autres, et c'est par celui-là que
 * les fiches bancales passeraient.
 */

export type FichePubliable = {
  tagline?: string | null;
  description?: string | null;
  cover_url?: string | null;
  logo_url?: string | null;
};

/**
 * Renvoie ce qui manque, ou null si la fiche peut partir.
 *
 * Le message est écrit pour être montré tel quel : il dit ce qui
 * manque et pourquoi, pas « validation échouée ».
 */
export function obstacleAPublication(fiche: FichePubliable): string | null {
  const aDuTexte = Boolean(fiche.tagline?.trim() || fiche.description?.trim());
  const aUnVisuel = Boolean(fiche.cover_url?.trim() || fiche.logo_url?.trim());

  if (!aDuTexte && !aUnVisuel) {
    return "Cette fiche n'a ni visuel ni texte. Ajoute au moins une image et une accroche avant de la publier.";
  }
  if (!aUnVisuel) {
    /*
     * L'image n'est pas une décoration.
     *
     * L'annuaire est une grille de cartes : une fiche sans visuel y
     * laisse un aplat vide au milieu des autres, et c'est la marque
     * elle-même qui en paraît négligée. Mieux vaut qu'elle attende un
     * jour de plus que de se présenter comme ça.
     */
    return "Cette fiche n'a ni couverture ni logo. Une carte sans image dessert la marque : ajoute un visuel avant de la publier.";
  }
  if (!aDuTexte) {
    return "Cette fiche n'a ni accroche ni description. Remplis-en au moins une avant de la publier.";
  }
  return null;
}

/** Version courte, quand on trie une liste plutôt qu'on explique. */
export function peutEtrePubliee(fiche: FichePubliable): boolean {
  return obstacleAPublication(fiche) === null;
}
