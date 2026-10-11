/**
 * Le surtitre du post mis en avant en haut de /posts.
 *
 * « Le post de la semaine » n'est vrai que si le post a moins de sept
 * jours. Au-delà, le bandeau affichait encore « de la semaine » sur un
 * post vieux de plusieurs semaines, et c'est la première chose qu'un
 * visiteur remarque : le site a l'air abandonné. On dit alors
 * simplement « Dernier post ». Le libellé de la semaine revient tout
 * seul dès qu'un nouveau post est publié.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

export function surtitrePost(publieLe: string | Date | null | undefined, maintenant: Date = new Date()): string {
  const date = publieLe ? new Date(publieLe) : null;
  if (!date || Number.isNaN(date.getTime())) return "Dernier post";
  return maintenant.getTime() - date.getTime() < SEPT_JOURS ? "Le post de la semaine" : "Dernier post";
}
