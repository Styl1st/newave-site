"use client";

import { useEffect } from "react";

/**
 * Le halo qui suit la souris, sur tout ce qui porte `data-halo`.
 *
 * UN SEUL ÉCOUTEUR POUR TOUTE LA PAGE, ET RIEN À RENDRE. Chaque ligne
 * de l'annuaire, chaque post de la colonne de l'accueil pourrait
 * écouter sa propre souris ; cent soixante écouteurs pour un effet qui
 * ne concerne qu'un élément à la fois, c'est cent cinquante-neuf de
 * trop. Celui-ci écoute le document, retrouve l'élément survolé et lui
 * pose deux variables, `--x` et `--y`. Tout le dessin est en CSS (voir
 * `.ligne-halo` et `.post-halo` dans globals.css).
 *
 * PAS DE RENDU REACT À CHAQUE MOUVEMENT. Les deux variables sont écrites
 * directement sur l'élément, une fois par image au plus : la souris
 * bouge soixante fois par seconde, React n'a pas à le savoir.
 *
 * Au doigt, rien : un halo qui suit un doigt posé sur l'écran se
 * cache sous ce doigt. Les écrans tactiles ont leur propre lumière,
 * qui suit le défilement (voir `LigneMarque`).
 */
export default function Halo() {
  useEffect(() => {
    let image = 0;
    let dernier: PointerEvent | null = null;

    function peindre() {
      image = 0;
      const e = dernier;
      if (!e) return;
      const cible = (e.target as Element | null)?.closest?.("[data-halo]");
      if (!(cible instanceof HTMLElement)) return;
      const cadre = cible.getBoundingClientRect();
      cible.style.setProperty("--x", `${Math.round(e.clientX - cadre.left)}px`);
      cible.style.setProperty("--y", `${Math.round(e.clientY - cadre.top)}px`);
    }

    function bouge(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      dernier = e;
      if (!image) image = requestAnimationFrame(peindre);
    }

    document.addEventListener("pointermove", bouge, { passive: true });
    return () => {
      document.removeEventListener("pointermove", bouge);
      if (image) cancelAnimationFrame(image);
    };
  }, []);

  return null;
}
