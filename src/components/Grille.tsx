"use client";

import { Children, useEffect, useRef } from "react";
import {
  CLASSES,
  SelecteurDensite,
  useDensite,
  type Densite,
  type Variante,
} from "./densite";

/**
 * Une grille dont on choisit la densité.
 *
 * Deux façons de regarder une liste : au calme, avec de grandes
 * vignettes, ou d'un coup d'œil, pour balayer tout ce qu'il y a. Le
 * choix se garde d'une visite à l'autre — le redemander à chaque page
 * reviendrait à ne pas l'avoir écouté.
 *
 * LE RAIL DE BOUTONS PEUT VIVRE AILLEURS. L'annuaire refondu le veut
 * dans sa ligne de filtres collante, à côté des pastilles : il passe
 * alors `densite` et `onDensite`, garde l'état chez lui, et met
 * `selecteur` à faux. Les autres listes ne changent pas d'un iota.
 */

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
  defaut = "confort",
  densite: densiteImposee,
  onDensite,
  selecteur = true,
}: {
  variante: Variante;
  /** Sous quel nom retenir le choix. Une clé par type de liste. */
  memoire: string;
  /**
   * Le contenu, ou une FONCTION de la densité choisie.
   *
   * La forme fonction sert au seul cas où la densité ne change pas que
   * la taille des cases mais ce qu'on met dedans : en `liste`,
   * l'annuaire rend des lignes et non des cartes, et il doit donc
   * savoir ce qui a été choisi.
   */
  children: React.ReactNode | ((densite: Densite) => React.ReactNode);
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
  /** La densité au premier affichage, avant lecture de la préférence. */
  defaut?: Densite;
  /** Densité imposée par le parent. Absente = la grille gère la sienne. */
  densite?: Densite;
  onDensite?: (d: Densite) => void;
  /** Poser le rail de boutons ici. Faux quand le parent l'affiche ailleurs. */
  selecteur?: boolean;
}) {
  /*
   * L'état interne existe toujours : un hook ne peut pas être appelé
   * sous condition. Quand le parent impose une densité, il est
   * simplement ignoré.
   */
  const interne = useDensite(memoire, variante, defaut);
  const densite = densiteImposee ?? interne.densite;
  const choisir = onDensite ?? interne.choisir;

  const rendu = typeof children === "function" ? children(densite) : children;

  const conteneur = useRef<HTMLDivElement>(null);
  const nombre = Children.count(rendu);

  /*
   * LA MOSAÏQUE NE S'APPLIQUE PAS À UNE LISTE, et ce n'est pas un
   * oubli : elle sert à rattraper des cartes de hauteurs différentes
   * dans une grille. Des lignes empilées font déjà toutes la même
   * hauteur, et leur imposer une trame de huit pixels leur donnerait un
   * `grid-row-end` dans un conteneur qui n'est pas une grille.
   */
  const enMosaique = mosaique && densite !== "liste";

  useEffect(() => {
    const boite = conteneur.current;
    if (!boite) return;

    /*
     * ON DÉFAIT CE QU'ON AVAIT POSÉ, et c'est indispensable depuis qu'il
     * existe un mode liste.
     *
     * La trame et le `row-gap: 0` sont écrits en style EN LIGNE sur le
     * conteneur, qui est le même élément d'une densité à l'autre. En
     * passant en liste sans nettoyer, ce `row-gap: 0` restait et écrasait
     * l'espacement de la pile : les lignes se retrouvaient collées les
     * unes aux autres, sans que rien dans les classes ne l'explique.
     */
    if (!enMosaique) {
      boite.classList.remove("mosaique");
      boite.style.removeProperty("grid-auto-rows");
      boite.style.removeProperty("row-gap");
      for (const enfant of Array.from(boite.children) as HTMLElement[]) {
        enfant.style.removeProperty("grid-row-end");
      }
      return;
    }

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
  }, [enMosaique, nombre, densite]);

  return (
    <>
      {(aside || selecteur) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">{aside}</div>
          {selecteur && (
            <SelecteurDensite
              densite={densite}
              choisir={choisir}
              offertes={interne.offertes}
            />
          )}
        </div>
      )}

      <div
        ref={conteneur}
        /* La classe `mosaique` est posée par l'effet et non ici : elle
           dépend de la largeur de l'écran, que le serveur ne connaît
           pas. L'écrire dans le rendu ferait diverger les deux. */
        className={`${CLASSES[variante][densite] ?? ""} ${densite === "serre" ? "grille-serre" : ""}`}
      >
        {rendu}
      </div>
    </>
  );
}
