"use client";

import { useEffect } from "react";

/**
 * Remonter en haut en arrivant sur un écran d'administration.
 *
 * Après avoir enregistré une marque, on est renvoyé sur la liste — et
 * le navigateur restaure obligeamment la position qu'on y avait avant
 * de partir. On atterrit donc au milieu de soixante-dix lignes, sans
 * voir ni le titre, ni les boutons d'action, ni le résultat de ce qu'on
 * vient de faire.
 *
 * Cette restauration est un bon comportement AILLEURS : sur l'annuaire
 * public, reperdre sa place après avoir consulté une marque serait
 * pénible. Sur une table de travail, non : on revient pour faire la
 * chose suivante, pas pour reprendre sa lecture.
 *
 * `instant` et non `smooth` : un défilement animé au chargement donne
 * l'impression que la page bouge toute seule, ce qui inquiète plus que
 * ça n'aide.
 */
export default function RetourEnHaut() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return null;
}
