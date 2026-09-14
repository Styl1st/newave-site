/**
 * Depuis combien de temps une chose attend, dite en clair.
 *
 * Une date de dépôt oblige à compter dans sa tête pour savoir si c'est
 * grave. « Depuis onze jours » se lit d'un coup, et c'est la seule
 * chose qu'on veut savoir devant une pile.
 *
 * CES PHRASES VIVENT ICI PARCE QUE DEUX ÉCRANS LES DISENT. Le bandeau
 * du tableau de bord parle de la plus ancienne du tas ; la pile le dit
 * ligne par ligne. Recopiée, la règle des jours pleins finirait par
 * diverger entre les deux, et l'un des deux compterait un jour de plus
 * que l'autre pour le même dossier.
 */

/** Les jours PLEINS écoulés. Déposé il y a vingt-trois heures : zéro. */
export function joursDepuis(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** « la plus ancienne attend depuis 11 jours » — la phrase d'une carte. */
export function ancienneteDeLaPile(iso: string): string {
  const jours = joursDepuis(iso);
  if (jours <= 0) return "la plus ancienne est arrivée aujourd'hui";
  if (jours === 1) return "la plus ancienne attend depuis hier";
  return `la plus ancienne attend depuis ${jours} jours`;
}

/** « depuis 11 jours » — l'attente d'une seule ligne. */
export function attenteCourte(iso: string): string {
  const jours = joursDepuis(iso);
  if (jours <= 0) return "arrivée aujourd'hui";
  if (jours === 1) return "depuis hier";
  return `depuis ${jours} jours`;
}
