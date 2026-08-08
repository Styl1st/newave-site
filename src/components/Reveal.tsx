"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PAS = 55;
const PLAFOND = 380;

/** En deçà, la page ne défile pas assez pour qu'un cylindre ait du sens. */
const HAUTEUR_MINIMALE = 1.7;

const CIBLES =
  "main [data-reveal], main .card-light:not(.rise), main .glass:not(.rise)";

/**
 * Surfaces qu'on laisse tranquilles.
 *
 * Incliner un bloc qu'on regarde est joli ; incliner un bloc qu'on
 * VISE l'est beaucoup moins. Une barre de navigation penchée devient
 * difficile à cliquer, et un formulaire qui bascule pendant qu'on
 * écrit dedans est franchement désagréable.
 */
function aExclure(el: HTMLElement): boolean {
  if (el.hasAttribute("data-no-reveal")) return true;
  // Barres de navigation et barres d'outils.
  if (el.querySelector("nav")) return true;
  // Formulaires : on ne bouge pas ce dans quoi on saisit.
  if (el.querySelector("input, textarea, select")) return true;
  // Un élément collant a déjà sa propre logique de position.
  if (getComputedStyle(el).position === "sticky") return true;
  return false;
}

/**
 * Donne du mouvement aux éléments, de deux façons selon ce que le
 * navigateur sait faire.
 *
 * 1. Défilement en cylindre — les navigateurs récents savent lier une
 *    animation à la position d'un élément dans l'écran. L'effet est
 *    alors continu et réversible : remonter défait ce que descendre
 *    avait fait, et tout est calculé par le navigateur sans écouter le
 *    moindre événement de défilement.
 *
 * 2. Arrivée en glissant — partout ailleurs. L'élément entre une fois
 *    et reste. Moins spectaculaire, mais fluide sur n'importe quelle
 *    machine.
 *
 * Dans les deux cas, l'état masqué est posé PAR JAVASCRIPT. Si le
 * script ne tourne pas, la page reste entièrement lisible.
 */
function animer(): (() => void) | undefined {
  const racine = document.documentElement;

  const reduit =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    racine.dataset.animChoisi !== "1";
  if (racine.dataset.fige === "1" || reduit) return undefined;

  const cibles = Array.from(document.querySelectorAll<HTMLElement>(CIBLES)).filter(
    (el) => !aExclure(el)
  );
  if (cibles.length === 0) return undefined;

  const supporteCylindre =
    typeof CSS !== "undefined" &&
    CSS.supports?.("animation-timeline: view()") &&
    // Sur une page trop courte, un élément resterait bloqué en phase
    // de sortie, donc à demi effacé, sans qu'on puisse rien y faire.
    document.documentElement.scrollHeight > window.innerHeight * HAUTEUR_MINIMALE &&
    // Le cylindre incline en 3D : trop petit, l'écran ne rend pas
    // l'effet et le texte s'en trouve juste moins net.
    window.innerWidth >= 640;

  if (supporteCylindre) {
    cibles.forEach((el) => el.classList.add("cylindre"));
    return () => cibles.forEach((el) => el.classList.remove("cylindre"));
  }

  /* ---------- repli : une entrée, une seule fois ---------- */

  const compteurs = new Map<Element, number>();
  const retards = new Map<HTMLElement, number>();

  for (const el of cibles) {
    const parent = el.parentElement ?? document.body;
    const rang = compteurs.get(parent) ?? 0;
    compteurs.set(parent, rang + 1);
    retards.set(el, Math.min(rang * PAS, PLAFOND));
    el.classList.add("reveal");
  }

  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        const el = entree.target as HTMLElement;
        el.style.animationDelay = `${retards.get(el) ?? 0}ms`;
        el.classList.add("vu");
        observateur.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );

  cibles.forEach((el) => observateur.observe(el));

  const secours = setTimeout(() => {
    cibles.forEach((el) => el.classList.add("vu"));
  }, 2500);

  return () => {
    clearTimeout(secours);
    observateur.disconnect();
    cibles.forEach((el) => {
      el.classList.remove("reveal", "vu");
      el.style.animationDelay = "";
    });
  };
}

export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    let abandonne = false;
    let nettoyer: (() => void) | undefined;

    /*
     * On attend que la page soit entièrement arrivée avant d'ajouter la
     * moindre classe.
     *
     * Next envoie le HTML par morceaux : React adopte le haut de la page
     * pendant que le bas est encore en route. Cet effet, déclaré tout en
     * haut de l'arbre, se réveillait donc AVANT que React ait fini
     * d'adopter les blocs plus bas. Il leur posait une classe que React
     * ne connaissait pas, et React signalait l'écart en console.
     *
     * « load » garantit que le flux est terminé ; l'image suivante et le
     * délai zéro laissent React finir son travail en cours.
     */
    const demarrer = () =>
      requestAnimationFrame(() =>
        setTimeout(() => {
          if (!abandonne) nettoyer = animer();
        }, 0)
      );

    if (document.readyState === "complete") demarrer();
    else window.addEventListener("load", demarrer, { once: true });

    return () => {
      abandonne = true;
      window.removeEventListener("load", demarrer);
      nettoyer?.();
    };
  }, [pathname]);

  return null;
}
