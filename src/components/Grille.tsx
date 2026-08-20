"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * Une grille dont on choisit la densité.
 *
 * Deux façons de regarder une liste : au calme, avec de grandes
 * vignettes, ou d'un coup d'œil, pour balayer tout ce qu'il y a. Le
 * choix se garde d'une visite à l'autre — le redemander à chaque page
 * reviendrait à ne pas l'avoir écouté.
 */

type Densite = "confort" | "serre";
type Variante = "pieces" | "marques";

const CLASSES: Record<Variante, Record<Densite, string>> = {
  pieces: {
    confort: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4",
    serre: "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6",
  },
  marques: {
    confort: "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",
    serre: "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4",
  },
};

function IconConfort() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.4" />
      <rect x="9" y="1" width="6" height="6" rx="1.4" />
      <rect x="1" y="9" width="6" height="6" rx="1.4" />
      <rect x="9" y="9" width="6" height="6" rx="1.4" />
    </svg>
  );
}

function IconSerre() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      {[1, 6.3, 11.6].map((y) =>
        [1, 6.3, 11.6].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3.4" height="3.4" rx=".9" />
        ))
      )}
    </svg>
  );
}

/**
 * La hauteur d'une rangée de mosaïque, en pixels.
 *
 * Ce n'est pas la hauteur d'une carte : c'est le pas de la trame. Plus
 * il est fin, plus une carte se cale près de sa hauteur réelle, et
 * moins il reste de blanc sous elle. Huit pixels, c'est invisible à
 * l'œil et ça n'alourdit pas le calcul.
 */
const PAS = 8;

export default function Grille({
  variante,
  memoire,
  children,
  aside,
  mosaique = false,
}: {
  variante: Variante;
  /** Sous quel nom retenir le choix. Une clé par type de liste. */
  memoire: string;
  children: React.ReactNode;
  /** Ce qu'on affiche à gauche du sélecteur, un compteur par exemple. */
  aside?: React.ReactNode;
  /**
   * Les cartes du dessous remontent combler le vide laissé par celles
   * du dessus.
   *
   * POURQUOI DU JAVASCRIPT ICI, ALORS QUE TOUT LE RESTE EST EN CSS.
   * Une grille aligne ses cases sur des rangées : soit toutes les
   * cartes d'une rangée prennent la hauteur de la plus haute, et une
   * marque sans accroche se retrouve avec un grand blanc, soit chacune
   * fait sa taille et il reste des trous entre les rangées. Les deux
   * ont l'air bâclés, chacun à leur façon.
   *
   * Il existe bien une valeur CSS faite pour ça, mais aucun navigateur
   * ne la propose encore. Le contournement classique — des colonnes —
   * range les cartes de haut en bas puis de gauche à droite, ce qui
   * casserait l'ordre de l'annuaire : les huit premières marques
   * finiraient empilées dans la colonne de gauche.
   *
   * On garde donc la grille, avec une trame très fine, et l'on dit à
   * chaque carte combien de rangées elle occupe. L'ordre de lecture
   * reste de gauche à droite, et les trous se comblent.
   */
  mosaique?: boolean;
}) {
  /*
   * Le premier rendu est volontairement identique côté serveur et côté
   * navigateur — « confort » pour tout le monde. La préférence n'est
   * lue qu'ensuite : le serveur n'a aucun moyen de la connaître, et
   * l'appliquer trop tôt ferait diverger les deux rendus.
   */
  const [densite, setDensite] = useState<Densite>("confort");

  useEffect(() => {
    try {
      const garde = localStorage.getItem(`grille:${memoire}`);
      if (garde === "serre" || garde === "confort") setDensite(garde);
    } catch {
      // navigation privée, stockage refusé : on reste sur le défaut
    }
  }, [memoire]);

  function choisir(valeur: Densite) {
    setDensite(valeur);
    try {
      localStorage.setItem(`grille:${memoire}`, valeur);
    } catch {
      // sans mémoire, le choix vaut au moins pour cette page
    }
  }

  const conteneur = useRef<HTMLDivElement>(null);
  const nombre = Children.count(children);

  useEffect(() => {
    if (!mosaique) return;
    const boite = conteneur.current;
    if (!boite) return;

    /*
     * LA MOSAÏQUE ET LA MISE DE CÔTÉ DES CARTES HORS ÉCRAN SONT
     * COMPATIBLES, contrairement à ce que j'avais cru.
     *
     * J'avais désactivé la mosaïque sur téléphone en pensant qu'elle
     * empêchait le navigateur de mettre les cartes de côté : elle doit
     * les mesurer, donc elles devaient bien être rendues. Les trous
     * entre les rangées sont revenus sur mobile, pour rien.
     *
     * En réalité, lire la hauteur d'une carte mise de côté ne la force
     * pas à se rendre : le navigateur répond avec la hauteur de réserve.
     * Et comme cette réserve est déclarée en `auto` (voir
     * `.carte-eco-etroit` dans globals.css), il RETIENT la vraie hauteur
     * dès la première fois qu'il l'a affichée. Une carte déjà vue rend
     * donc sa mesure exacte, une carte jamais vue rend une estimation,
     * et le remesurage ci-dessous la corrige quand elle arrive.
     */
    boite.classList.add("mosaique");

    /*
     * La trame est posée ici et non dans le JSX, pour une question
     * d'ORDRE. Il faut mesurer les cartes AVANT de leur attribuer des
     * rangées, et si la trame arrivait par un rendu React, ce rendu
     * aurait lieu après la mesure : le temps d'une image, chaque carte
     * se retrouverait dans une rangée de huit pixels sans savoir
     * combien elle en occupe, et la grille s'écraserait sous les yeux.
     */
    boite.style.gridAutoRows = `${PAS}px`;
    boite.style.rowGap = "0px";

    const calculer = () => {
      for (const carte of Array.from(boite.children) as HTMLElement[]) {
        /*
         * `offsetHeight` et non `getBoundingClientRect` : la seconde
         * tient compte des transformations, et nos cartes en portent
         * une pendant leur animation d'entrée comme au survol. On
         * mesurerait alors une carte en train de bouger, et la trame
         * sauterait sous le curseur.
         */
        const hauteur = carte.offsetHeight;
        if (!hauteur) continue;
        carte.style.gridRowEnd = `span ${Math.max(1, Math.ceil(hauteur / PAS))}`;
      }
    };

    calculer();

    /*
     * On remesure quand quelque chose change de taille : la fenêtre,
     * une image qui arrive, une police qui se charge. Sans ça, la
     * première mise en page est faite sur des cartes encore vides et
     * les trous reviennent une fois tout affiché.
     *
     * Aucun risque de boucle : `align-items: start` empêche une carte
     * de s'étirer jusqu'au bout des rangées qu'on vient de lui
     * attribuer, donc lui donner une place ne change pas sa hauteur.
     */
    const veille = new ResizeObserver(calculer);
    veille.observe(boite);
    for (const carte of Array.from(boite.children)) veille.observe(carte);
    return () => veille.disconnect();
    /*
     * `Children.count` plutôt que `children`.
     *
     * Le tableau d'enfants est reconstruit à chaque rendu du parent,
     * donc toujours différent : l'effet se rejouait en permanence, et
     * avec lui l'observateur qu'on démonte et remonte sur vingt-quatre
     * cartes. Ce qui nous intéresse ici, c'est uniquement le NOMBRE de
     * cartes, et lui ne bouge que quand la liste change vraiment.
     */
  }, [mosaique, nombre, densite]);

  const onglet =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">{aside}</div>

        <div
          role="group"
          aria-label="Densité d'affichage"
          className="flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-white/8 p-1"
        >
          <button
            type="button"
            onClick={() => choisir("confort")}
            aria-pressed={densite === "confort"}
            title="Grandes vignettes"
            className={
              densite === "confort"
                ? `${onglet} bg-white text-[var(--color-ink)]`
                : `${onglet} text-white/70 hover:text-white`
            }
          >
            <IconConfort />
            <span className="hidden sm:inline">Confort</span>
          </button>
          <button
            type="button"
            onClick={() => choisir("serre")}
            aria-pressed={densite === "serre"}
            title="Voir plus d'éléments à la fois"
            className={
              densite === "serre"
                ? `${onglet} bg-white text-[var(--color-ink)]`
                : `${onglet} text-white/70 hover:text-white`
            }
          >
            <IconSerre />
            <span className="hidden sm:inline">Grille</span>
          </button>
        </div>
      </div>

      <div
        ref={conteneur}
        /* La classe `mosaique` est posée par l'effet et non ici : elle
           dépend de la largeur de l'écran, que le serveur ne connaît
           pas. L'écrire dans le rendu ferait diverger les deux. */
        className={`${CLASSES[variante][densite]} ${densite === "serre" ? "grille-serre" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
