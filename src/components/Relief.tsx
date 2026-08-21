"use client";

import { useEffect } from "react";

/**
 * Les cartes s'inclinent vers le curseur.
 *
 * Une carte qui bascule légèrement dans la direction où on la regarde
 * donne l'impression d'un objet posé sur la page plutôt que d'une image
 * imprimée dedans. C'est le seul effet du site qui réagit à la POSITION
 * du pointeur et non à sa simple présence, et c'est ce qui le rend
 * vivant.
 *
 * UN SEUL ÉCOUTEUR POUR TOUTE LA PAGE. L'annuaire affiche jusqu'à cent
 * cartes : leur poser à chacune un gestionnaire, et le retirer au fil du
 * défilement, coûterait bien plus que de lire la cible d'un mouvement
 * déjà émis. On écrit au plus deux valeurs, une fois par image, sur une
 * seule carte à la fois.
 *
 * ON ÉCRIT `rotate`, ET SURTOUT PAS `transform`. Ce dernier est déjà
 * pris : le défilement animé du site fait tourner les cartes sur un
 * cylindre, et une animation l'emporte toujours sur une règle ordinaire.
 * L'inclinaison serait donc ignorée sur toute page assez longue pour
 * défiler. `rotate` est une propriété à part entière, appliquée avant
 * `transform` : les deux se composent au lieu de se disputer.
 */

/** Ce qui s'incline : toutes les cartes claires du site. */
const CARTES = ".card-light";

/** L'inclinaison maximale, au coin de la carte. Trois degrés suffisent. */
const AMPLITUDE = 3.2;

export default function Relief() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const racine = document.documentElement;
    /*
     * Le réglage du site et celui du système font foi. Quelqu'un qui a
     * demandé moins de mouvement n'a pas envie que ses cartes bougent
     * sous son curseur.
     */
    if (
      racine.dataset.fige === "1" ||
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1")
    ) {
      return;
    }

    let carte: HTMLElement | null = null;
    /*
     * LES DIMENSIONS DE LA CARTE SONT MESURÉES UNE FOIS, À L'ENTRÉE.
     *
     * Elles l'étaient à chaque image. Or demander la position d'un
     * élément oblige le navigateur à recalculer la mise en page de la
     * page entière avant de répondre : c'est l'opération la plus chère
     * qu'on puisse glisser dans une boucle d'affichage, et elle tombait
     * dans le même budget d'image que le curseur, qu'elle retardait
     * d'autant.
     *
     * Une carte ne change pas de taille pendant qu'on la survole. On
     * mesure donc en arrivant dessus, et plus jamais ensuite.
     */
    let cadre = { gauche: 0, haut: 0, largeur: 1, hauteur: 1 };
    let x = 0;
    let y = 0;
    let image = 0;

    const relacher = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty("--relief-x");
      el.style.removeProperty("--relief-y");
      el.style.removeProperty("--relief-angle");
      delete el.dataset.relief;
    };

    const mesurer = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      cadre = {
        gauche: r.left,
        haut: r.top,
        largeur: r.width || 1,
        hauteur: r.height || 1,
      };
    };

    const peindre = () => {
      image = 0;
      if (!carte) return;

      // De -0,5 à 0,5, depuis le centre de la carte.
      const px = (x - cadre.gauche) / cadre.largeur - 0.5;
      const py = (y - cadre.haut) / cadre.hauteur - 0.5;

      /*
       * L'axe de rotation est perpendiculaire au déplacement du
       * curseur : c'est ce qui fait pencher la carte VERS lui, comme si
       * on appuyait sur le bord qu'on survole.
       */
      carte.style.setProperty("--relief-x", String(-py));
      carte.style.setProperty("--relief-y", String(px));
      carte.style.setProperty(
        "--relief-angle",
        `${(Math.min(0.5, Math.hypot(px, py)) * 2 * AMPLITUDE).toFixed(2)}deg`
      );
    };

    const surMouvement = (e: PointerEvent) => {
      const dessus = ((e.target as Element | null)?.closest?.(CARTES) ??
        null) as HTMLElement | null;

      if (dessus !== carte) {
        relacher(carte);
        carte = dessus;
        if (carte) {
          carte.dataset.relief = "1";
          mesurer(carte);
        }
      }
      if (!carte) return;

      x = e.clientX;
      y = e.clientY;
      if (!image) image = requestAnimationFrame(peindre);
    };

    const surSortie = () => {
      relacher(carte);
      carte = null;
    };

    /*
     * Le défilement déplace la carte sans qu'on la quitte : sa position
     * mesurée n'est plus la bonne, et l'inclinaison partirait de
     * travers. On relâche plutôt que de remesurer, parce qu'on ne
     * survole plus vraiment la même chose quand la page bouge sous le
     * curseur.
     */
    window.addEventListener("scroll", surSortie, { passive: true });
    window.addEventListener("resize", surSortie);
    window.addEventListener("pointermove", surMouvement, { passive: true });
    document.addEventListener("pointerleave", surSortie);
    window.addEventListener("blur", surSortie);

    return () => {
      if (image) cancelAnimationFrame(image);
      relacher(carte);
      window.removeEventListener("scroll", surSortie);
      window.removeEventListener("resize", surSortie);
      window.removeEventListener("pointermove", surMouvement);
      document.removeEventListener("pointerleave", surSortie);
      window.removeEventListener("blur", surSortie);
    };
  }, []);

  return null;
}
