"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** En deçà, la page ne défile pas assez pour qu'un cylindre ait du sens. */
const HAUTEUR_MINIMALE = 1.7;

/**
 * Décide si la page a droit au défilement animé — et rien de plus.
 *
 * Ce composant ne touche pas aux éléments de la page. Il pose un seul
 * attribut sur <html>, et c'est la feuille de style qui choisit
 * ensuite quoi animer.
 *
 * C'est un changement de méthode, pas de goût. La version précédente
 * parcourait le document pour ajouter une classe à chaque bloc. Next
 * envoie le HTML par morceaux et React l'adopte au fur et à mesure :
 * quel que soit le moment choisi pour passer, il restait des blocs pas
 * encore adoptés, qui héritaient d'une classe inconnue de React. La
 * console s'en plaignait à chaque chargement, et repousser le passage
 * ne faisait que réduire la fenêtre sans la fermer.
 *
 * <html> porte `suppressHydrationWarning` — c'est déjà là que le
 * script de couleurs écrit avant React. Un attribut de plus n'y change
 * rien.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const racine = document.documentElement;

    function decider() {
      // Le réglage système fait foi, sauf si la personne a explicitement
      // demandé du mouvement depuis « Mon compte → Apparence ».
      const reduit =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1";

      // Sur une page trop courte, un élément resterait bloqué en phase
      // de sortie, donc à demi effacé, sans qu'on puisse rien y faire.
      const assezLongue = racine.scrollHeight > window.innerHeight * HAUTEUR_MINIMALE;

      if (racine.dataset.fige !== "1" && !reduit && assezLongue) {
        racine.dataset.defilement = "1";
      } else {
        delete racine.dataset.defilement;
      }
    }

    decider();

    // La hauteur de la page bouge encore un peu après le premier rendu,
    // le temps que les visuels prennent leur place.
    const differe = setTimeout(decider, 700);
    window.addEventListener("resize", decider);

    return () => {
      clearTimeout(differe);
      window.removeEventListener("resize", decider);
    };
  }, [pathname]);

  return null;
}
