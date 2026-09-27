"use client";

import { Children, useEffect, useRef } from "react";

/**
 * Les cartes du fil en mosaïque : pas de trou sous une carte courte.
 *
 * POURQUOI PAS `columns-3`. Les colonnes CSS remplissent la première
 * colonne de haut en bas avant de passer à la deuxième : l'annonce la
 * plus votée serait en haut à gauche, la deuxième SOUS elle, et chaque
 * lot chargé en défilant redistribuerait toutes les cartes d'une
 * colonne à l'autre. Sur un fil trié, l'ordre de lecture doit rester
 * celui des rangées.
 *
 * Même technique que la vitrine (`Grille`, en mosaïque) : une grille
 * dont les rangées font huit pixels, et chaque carte qui s'étend sur
 * autant de rangées que sa hauteur l'exige.
 */

const PAS = 8;
const ECART = 18;

export default function Mosaique({ children }: { children: React.ReactNode }) {
  const boite = useRef<HTMLDivElement>(null);
  const nombre = Children.count(children);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;

    /* Avant ce calcul, la grille est une grille ordinaire (avec son
       écart vertical) : rendue par le serveur, elle doit se lire sans
       JavaScript. La trame fine ne se pose qu'ici. */
    el.style.gridAutoRows = `${PAS}px`;
    el.style.rowGap = "0px";

    const calculer = () => {
      for (const case_ of Array.from(el.children) as HTMLElement[]) {
        const carte = case_.firstElementChild as HTMLElement | null;
        const hauteur = (carte?.offsetHeight ?? 0) + ECART;
        case_.style.gridRowEnd = `span ${Math.max(1, Math.ceil(hauteur / PAS))}`;
      }
    };

    calculer();
    const veille = new ResizeObserver(calculer);
    for (const case_ of Array.from(el.children)) {
      if (case_.firstElementChild) veille.observe(case_.firstElementChild);
    }
    return () => veille.disconnect();
  }, [nombre]);

  return (
    <div
      ref={boite}
      className="grid grid-cols-1 items-start gap-x-[18px] gap-y-[18px] sm:grid-cols-2 lg:grid-cols-3"
    >
      {Children.map(children, (enfant) => (
        <div>{enfant}</div>
      ))}
    </div>
  );
}
