"use client";

import { useEffect, useRef } from "react";

/**
 * Le curseur du site : un point chromé, et un anneau qui le rattrape.
 *
 * DEUX PIÈCES PLUTÔT QU'UNE, et c'est ce qui fait tout l'effet. Le
 * point colle exactement au pointeur, parce qu'un curseur qui traîne
 * est un curseur qu'on trouve cassé. L'anneau, lui, arrive avec un
 * léger retard : c'est lui qui donne la matière, et il ne gêne rien
 * puisqu'on ne vise jamais avec.
 *
 * Il grossit au survol de ce qui est cliquable. Ce n'est pas
 * décoratif : en masquant le curseur du système, on perd la petite main
 * qui signalait un lien, et il fallait la remplacer par autre chose.
 *
 * TROIS ENDROITS OÙ IL NE PARAÎT PAS.
 * Les écrans tactiles, où il n'y a pas de pointeur du tout. Les champs
 * de saisie, où le trait vertical du système dit quelque chose que
 * notre point ne sait pas dire : où le texte va s'insérer. Et pour qui
 * a demandé moins d'animations, auquel cas l'anneau cesse de traîner et
 * se colle au point.
 *
 * POUR LE COÛT : une seule boucle d'affichage, uniquement des
 * transformations, et elle s'arrête d'elle-même dès que l'anneau a
 * rattrapé le point. Un curseur immobile ne consomme rien.
 */

/** Le rattrapage de l'anneau, par image. Plus haut, plus sec. */
const SOUPLESSE = 0.19;

/** En deçà, on considère l'anneau arrivé et l'on rend la main. */
const SEUIL = 0.1;

/** Ce qui mérite que l'anneau grossisse. */
const CLIQUABLE =
  'a, button, [role="button"], summary, label[for], select, input[type="checkbox"], input[type="radio"], input[type="range"], [data-calque]';

export default function Curseur() {
  const point = useRef<HTMLDivElement>(null);
  const anneau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * Aucun pointeur fin, aucun curseur. Sur un écran tactile, dessiner
     * un anneau qui suivrait le dernier endroit touché serait un objet
     * fantôme posé au milieu de la page.
     */
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const racine = document.documentElement;
    const p = point.current;
    const a = anneau.current;
    if (!p || !a) return;

    racine.dataset.curseur = "1";

    const sobre =
      racine.dataset.fige === "1" ||
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let ax = x;
    let ay = y;
    let image = 0;

    const peindre = () => {
      image = 0;

      const dx = x - ax;
      const dy = y - ay;
      ax += dx * (sobre ? 1 : SOUPLESSE);
      ay += dy * (sobre ? 1 : SOUPLESSE);

      p.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      a.style.transform = `translate3d(${ax}px, ${ay}px, 0) translate(-50%, -50%)`;

      // Tant que l'anneau n'est pas arrivé, on redemande une image.
      if (Math.abs(dx) > SEUIL || Math.abs(dy) > SEUIL) {
        image = requestAnimationFrame(peindre);
      }
    };

    const planifier = () => {
      if (!image) image = requestAnimationFrame(peindre);
    };

    const surMouvement = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      racine.dataset.curseurVu = "1";

      /*
       * L'état du curseur se lit sur la CIBLE de l'évènement, à chaque
       * mouvement, plutôt qu'en posant un écouteur sur chaque lien de la
       * page. Une page d'annuaire en compte des centaines, et les
       * cartes apparaissent au fil du défilement : il aurait fallu
       * surveiller le document en permanence pour les rattraper.
       */
      const cible = e.target as Element | null;
      const dessus = cible?.closest?.(CLIQUABLE) ?? null;
      const saisie = cible?.closest?.("input:not([type]), input[type='text'], input[type='email'], input[type='password'], input[type='search'], input[type='url'], input[type='number'], textarea, [contenteditable='true']");

      racine.dataset.curseurEtat = saisie ? "saisie" : dessus ? "actif" : "";
      planifier();
    };

    const surSortie = () => {
      delete racine.dataset.curseurVu;
    };

    const surAppui = (v: string) => () => {
      if (v) racine.dataset.curseurAppui = v;
      else delete racine.dataset.curseurAppui;
    };

    const appuyer = surAppui("1");
    const relacher = surAppui("");

    window.addEventListener("pointermove", surMouvement, { passive: true });
    window.addEventListener("pointerdown", appuyer, { passive: true });
    window.addEventListener("pointerup", relacher, { passive: true });
    document.addEventListener("pointerleave", surSortie);
    window.addEventListener("blur", surSortie);

    return () => {
      if (image) cancelAnimationFrame(image);
      window.removeEventListener("pointermove", surMouvement);
      window.removeEventListener("pointerdown", appuyer);
      window.removeEventListener("pointerup", relacher);
      document.removeEventListener("pointerleave", surSortie);
      window.removeEventListener("blur", surSortie);
      delete racine.dataset.curseur;
      delete racine.dataset.curseurVu;
      delete racine.dataset.curseurEtat;
      delete racine.dataset.curseurAppui;
    };
  }, []);

  return (
    <>
      <div ref={anneau} className="curseur-anneau" aria-hidden />
      <div ref={point} className="curseur-point" aria-hidden />
    </>
  );
}
