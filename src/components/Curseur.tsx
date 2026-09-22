"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Le curseur du site : une flèche aux couleurs de l'ambiance, et sept
 * autres dessins pour les endroits où une flèche ne dit pas assez.
 *
 * POURQUOI UNE FLÈCHE ET NON UN POINT. Un point rond ne dit pas où il
 * pointe : son centre, sa pointe et son bord se valent, et l'on vise
 * approximativement sans savoir pourquoi. La flèche du système a une
 * pointe, tout le monde sait exactement où elle mord. On garde donc sa
 * forme, et l'on n'en change que la matière.
 *
 * ELLE FAIT QUINZE PIXELS, ET C'EST UNE CORRECTION D'ÉCHELLE.
 * Elle en faisait vingt-quatre : la taille d'une icône d'interface, pas
 * d'un pointeur — celui du système en fait douze de large. La lourdeur
 * qu'on lui reprochait n'était pas une affaire de style.
 *
 * UN GLYPHE PAR SITUATION, ET UN MOT QUAND IL Y A UN DOUTE.
 * Trois états — actif, saisir, saisie — pour un site où l'on ouvre une
 * marque, agrandit une photo, réordonne des visuels, règle un prix et
 * supprime une pièce, cela faisait trois réponses pour huit questions.
 * Le glyphe répond tout de suite ; l'étiquette nomme le verbe la
 * première fois, et seulement si la zone en porte un.
 *
 * IL Y AVAIT UN ANNEAU QUI LA SUIVAIT, ET IL EST PARTI. Il servait à
 * signaler ce qui est cliquable, puisqu'en masquant le curseur du
 * système on perd sa petite main. C'est la flèche elle-même qui s'en
 * charge maintenant : elle grossit un peu au survol d'un lien et se
 * resserre à l'appui. Une pièce au lieu de deux, et le geste reste
 * lisible.
 *
 * TROIS ENDROITS OÙ IL NE PARAÎT PAS.
 * Les écrans tactiles, où il n'y a pas de pointeur du tout. Les champs
 * de saisie, où le trait vertical du système dit quelque chose que la
 * flèche ne sait pas dire : où le texte va s'insérer. Et hors de la
 * fenêtre, évidemment.
 */

/** Ce qui mérite que la flèche s'ouvre. */
const CLIQUABLE =
  'a, button, [role="button"], summary, label[for], select, input[type="checkbox"], input[type="radio"], input[type="range"], [data-calque]';

/**
 * Une zone qui nomme elle-même son état.
 *
 * C'est ce qui évite d'énumérer ici les composants du site : une
 * vignette de pièce, une poignée de prix et un bouton de suppression
 * n'ont aucun sélecteur commun, et les reconnaître de loin voudrait
 * dire coder l'annuaire dans le curseur.
 */
const ZONES = "[data-curseur-zone]";

/** Ce qui s'attrape et se déplace : la flèche devient une main. */
const SAISISSABLE = "[data-saisissable]";

/**
 * Ce qu'on CHOISIT du doigt, et pas seulement ce qui se clique.
 *
 * La flèche reste la règle partout ailleurs : un bouton, un lien, un
 * repli se cliquent, et y poser un doigt tendu ne dirait rien de plus.
 * Ce qui mérite le doigt, c'est ce qu'on DÉSIGNE — les pastilles de
 * couleur de l'apparence, où l'on vise une teinte parmi d'autres et où
 * la pointe indique laquelle.
 */
const DOIGT = "[data-doigt]";

/**
 * Les rails, tous les rails.
 *
 * `regler` existait déjà, mais il fallait le demander à la main, zone
 * par zone — seul le double curseur de prix le faisait. Un
 * `input[type=range]` se règle par définition : il n'y a aucune raison
 * de le déclarer. La règle est donc posée ici une fois pour toutes,
 * avant le `CLIQUABLE` qui les attrapait et leur donnait la flèche.
 */
const RAIL = "input[type='range']";

/** Ce qui est là mais ne répond pas. */
const ETEINT = '[disabled], [aria-disabled="true"]';

/** Là où le trait du système en dit plus que notre flèche. */
const SAISIE =
  "input:not([type]), input[type='text'], input[type='email'], input[type='password'], input[type='search'], input[type='url'], input[type='number'], textarea, [contenteditable='true']";

/** La zone qui porte un verbe, et qu'on annonce en toutes lettres. */
const MOT = "[data-curseur-mot]";

/**
 * Les états qu'une zone a le droit de réclamer.
 *
 * Une valeur inconnue retombe sur la suite de l'ordre de résolution
 * plutôt que d'aller s'écrire sur `<html>` : une faute de frappe dans
 * un attribut ferait autrement disparaître le curseur, sans rien dans
 * la console pour le dire.
 */
const ETATS = new Set(["piece", "zoom", "doigt", "regler", "danger", "saisir", "actif", "inactif"]);

/**
 * Le temps d'arrêt avant que l'étiquette paraisse.
 *
 * C'est lui qui l'empêche de clignoter quand on traverse une grille de
 * vignettes sans s'arrêter sur aucune. Elle disparaît, en revanche,
 * sans aucun délai : un mot qui reste après qu'on a quitté la zone est
 * un mot qui ment.
 */
const ATTENTE = 120;

export default function Curseur() {
  /*
   * IL FAUT DEUX MESURES POUR NOUS DÉMONTER, PAS UNE.
   *
   * La flèche partait avec le verre dépoli et les fonds animés, dès la
   * première mesure de fluidité — alors qu'elle est justement ce qui
   * redevient fluide une fois tout cela enlevé. Sa lenteur était un
   * symptôme, pas la cause : une machine qui refloue seize surfaces à
   * chaque image n'a plus le temps de composer une flèche, et c'est la
   * flèche qu'on voit traîner.
   *
   * `Menagement` allège donc d'abord et remesure ensuite ; ce n'est
   * qu'au second palier, la page déjà dépouillée, qu'on rend la main au
   * curseur du système. La flèche coûte aussi deux fois moins qu'avant
   * — quinze pixels au lieu de vingt-quatre, un tracé au lieu de deux.
   */
  const [allege, setAllege] = useState(false);
  useEffect(() => {
    const surAllege = () => setAllege(true);
    window.addEventListener("newave:allege-curseur", surAllege);
    return () => window.removeEventListener("newave:allege-curseur", surAllege);
  }, []);

  const fleche = useRef<HTMLDivElement>(null);
  const etiquette = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    /*
     * Aucun pointeur fin, aucun curseur. Sur un écran tactile, dessiner
     * une flèche au dernier endroit touché serait un objet fantôme posé
     * au milieu de la page.
     */
    if (!window.matchMedia("(pointer: fine)").matches) return;

    /*
     * Second palier seulement : la page a déjà été dépouillée et elle
     * ne tient toujours pas les soixante images. Là, et là seulement, le
     * curseur du système reprend la main — lui est toujours fluide,
     * puisqu'il n'est pas dessiné par la page.
     */
    if (allege || document.documentElement.dataset.allege === "2") return;

    const racine = document.documentElement;
    const el = fleche.current;
    const mot = etiquette.current;
    if (!el || !mot) return;

    racine.dataset.curseur = "1";

    /*
     * DEUX ÉVÈNEMENTS, ET C'EST LÀ QUE SE GAGNENT LES MILLISECONDES.
     *
     * `pointermove` est REGROUPÉ par le navigateur : une souris envoie
     * mille positions par seconde, il n'en délivre qu'une par
     * rafraîchissement, et il la délivre APRÈS avoir décidé de peindre.
     * On dessine donc toujours avec la position d'avant.
     *
     * `pointerrawupdate` existe pour ce cas précis : il livre les
     * positions au rythme du matériel, sans attendre. En écrivant la
     * transformation à chaque fois, celle qui sera composée à l'écran
     * est la plus fraîche possible. Il n'est pas partout, d'où
     * `pointermove` qui reste comme repli.
     *
     * On ne fait rien d'autre ici : le reste — deviner ce qu'on survole
     * — est fait à part, sur un évènement moins fréquent. Alourdir ce
     * chemin-là annulerait le bénéfice.
     *
     * L'ÉTIQUETTE EST DANS LE MÊME CALQUE, et c'est pour cette raison
     * qu'elle ne traîne pas derrière : elle voyage dans la seule
     * transformation écrite ici, sans ressort, sans second nœud à faire
     * rattraper.
     */
    /*
     * La dernière position écrite, pour ne pas l'écrire deux fois.
     *
     * `pointerrawupdate` et `pointermove` livrent la même position à un
     * instant donné : le premier plus tôt, le second de toute façon.
     * Les deux sont écoutés, parce que le premier n'existe pas partout
     * et qu'on ne veut pas de repli conditionnel qui se teste mal. Une
     * comparaison suffit à ne payer qu'une écriture.
     */
    let posX = -1;
    let posY = -1;

    const placer = (e: PointerEvent) => {
      if (e.clientX === posX && e.clientY === posY) return;
      posX = e.clientX;
      posY = e.clientY;

      /*
       * PAS DE RECENTRAGE. La pointe du dessin est son coin haut
       * gauche : c'est elle qui doit tomber sur le pixel visé, comme
       * celle du système. Centrer la flèche décalerait la visée d'une
       * dizaine de pixels vers le bas.
       */
      dernierX = e.clientX;
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (racine.dataset.curseurVu !== "1") racine.dataset.curseurVu = "1";

      /*
       * Le rangement de l'étiquette reste ici, mais seulement quand il
       * y en a une à ranger, c'est-à-dire presque jamais. Une comparaison
       * de booléen au lieu d'un appel de fonction : sur un chemin qui
       * passe mille fois par seconde, ça compte.
       */
      if (visible) ranger(e.clientX);
    };

    /* ------------------------------------------------------------------
       L'ÉTIQUETTE

       Elle ne se calcule QUE lorsque la zone survolée change, ou qu'on
       appuie : le mot ne dépend de rien d'autre. Sa largeur est mesurée
       une fois par mot, à l'écriture — une lecture de `offsetWidth`
       oblige le navigateur à calculer la mise en page, et le faire à
       chaque mouvement rendrait tout le reste inutile.
       ------------------------------------------------------------------ */

    let zone: HTMLElement | null = null;
    let dernierX = 0;
    let appui = false;
    let visible = false;
    let largeur = 0;
    let cote = "";
    let minuteur = 0;

    const verbe = () =>
      zone ? (appui && zone.dataset.curseurMotAppui) || zone.dataset.curseurMot || "" : "";

    const ecrire = (texte: string) => {
      if (mot.textContent === texte) return;
      mot.textContent = texte;
      largeur = mot.offsetWidth;
    };

    const cacher = () => {
      window.clearTimeout(minuteur);
      if (!visible) return;
      visible = false;
      delete mot.dataset.vu;
    };

    /* Au bord droit, l'étiquette passe de l'autre côté de la pointe
       plutôt que de sortir de la fenêtre. */
    const ranger = (x: number) => {
      if (!visible) return;
      const suivant = x + 14 + largeur + 10 > window.innerWidth ? "gauche" : "";
      if (suivant === cote) return;
      cote = suivant;
      if (suivant) mot.dataset.cote = suivant;
      else delete mot.dataset.cote;
    };

    const etiqueter = () => {
      const texte = verbe();
      if (!texte) {
        cacher();
        return;
      }
      /*
       * Déjà visible : le mot change, l'attente ne se rejoue pas. Sans
       * ça, passer d'une vignette à sa voisine ferait disparaître
       * l'étiquette pour la faire revenir un dixième de seconde plus
       * tard, à la même place.
       */
      if (visible) {
        ecrire(texte);
        ranger(dernierX);
        return;
      }
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(() => {
        ecrire(texte);
        visible = true;
        mot.dataset.vu = "1";
        /*
         * Le côté se décide ICI aussi, et pas seulement au mouvement
         * suivant : l'étiquette paraît après cent vingt millisecondes
         * d'arrêt, c'est-à-dire à un instant où plus aucun évènement ne
         * passe. Sans ce rappel, une étiquette qui naît contre le bord
         * droit y déborde jusqu'à ce qu'on rebouge la souris.
         */
        ranger(dernierX);
      }, ATTENTE);
    };

    /* ------------------------------------------------------------------
       CE QU'ON SURVOLE

       L'ordre est celui de la spécification, et il compte : une vignette
       qu'on peut déplacer est aussi un bouton, une poignée de prix est
       aussi une saisie. Le premier qui répond gagne, et les zones qui se
       nomment elles-mêmes passent avant tout le reste.
       ------------------------------------------------------------------ */
    const etatDe = (cible: Element | null): string => {
      if (!cible?.closest) return "";
      if (cible.closest(SAISIE)) return "saisie";

      const nommee = cible.closest(ZONES) as HTMLElement | null;
      const demande = nommee?.dataset.curseurZone ?? "";
      if (ETATS.has(demande)) return demande;

      if (cible.closest(SAISISSABLE)) return "saisir";
      if (cible.closest(ETEINT)) return "inactif";
      /* Avant `CLIQUABLE` : une pastille de couleur et un rail sont
         aussi des éléments qui répondent au clic, et le premier qui
         répond gagne. Passés après, ils recevraient la flèche. */
      if (cible.closest(DOIGT)) return "doigt";
      if (cible.closest(RAIL)) return "regler";
      if (cible.closest(CLIQUABLE)) return "actif";
      return "";
    };

    /*
     * La cible précédente, pour ne rien recalculer quand elle n'a pas
     * changé.
     *
     * On remontait trois fois l'arbre du document à CHAQUE mouvement,
     * soit des centaines de fois par seconde, pour aboutir presque
     * toujours au même résultat : on survole le même élément pendant des
     * dizaines d'images d'affilée. Une comparaison suffit à s'en
     * dispenser — et elle compte double maintenant qu'il y a six
     * sélecteurs à essayer au lieu de trois.
     */
    let precedente: Element | null = null;

    /*
     * DEVINER CE QU'ON SURVOLE N'EST PLUS SUR LE CHEMIN DU MOUVEMENT, ET
     * C'EST TOUTE LA CORRECTION.
     *
     * Ce travail vivait dans `pointermove`. Or `etatDe` essaie jusqu'à
     * cinq sélecteurs, chacun remontant le document depuis la cible, et
     * l'étiquette en ajoute un sixième — dont `CLIQUABLE`, qui teste neuf
     * sélecteurs à chaque niveau. Sur une grille de cartes, la cible
     * change à presque chaque image : on traversait donc l'arbre six fois
     * par image, et surtout AVANT que l'image soit peinte. La position
     * écrite juste avant attendait ce travail pour s'afficher, et c'est
     * exactement ce qu'on voit comme un retard de la flèche.
     *
     * `pointerover` porte la même information et le navigateur ne
     * l'émet QUE lorsque le pointeur entre dans un autre élément. Bouger
     * à l'intérieur d'une même carte ne coûte donc plus rien du tout, et
     * le chemin du mouvement ne fait plus qu'écrire une transformation.
     */
    const surSurvol = (e: PointerEvent) => {
      const cible = (e.target as Element | null) ?? null;
      if (cible === precedente) return;
      precedente = cible;

      /*
       * L'état se lit sur la CIBLE de l'évènement plutôt qu'en posant un
       * écouteur sur chaque lien de la page. Une page d'annuaire en
       * compte des centaines, et les cartes apparaissent au fil du
       * défilement : il aurait fallu surveiller le document en
       * permanence pour les rattraper.
       */
      const etat = etatDe(cible);

      // On n'écrit l'attribut QUE s'il change : chaque écriture invalide
      // les styles de toute la page, et l'état ne bouge presque jamais.
      if (racine.dataset.curseurEtat !== etat) racine.dataset.curseurEtat = etat;

      const porteur = (cible?.closest?.(MOT) as HTMLElement | null) ?? null;
      if (porteur !== zone) {
        zone = porteur;
        etiqueter();
      }
    };

    const brut = "onpointerrawupdate" in window;

    const surSortie = () => {
      delete racine.dataset.curseurVu;
      cacher();
      /*
       * On oublie la dernière position : en revenant par le même pixel
       * qu'on a quitté, le dédoublonnage refuserait sinon la seule
       * écriture qui remontre la flèche.
       */
      posX = -1;
      posY = -1;
      precedente = null;
    };

    const appuyer = () => {
      appui = true;
      racine.dataset.curseurAppui = "1";
      etiqueter();
    };
    const relacher = () => {
      appui = false;
      delete racine.dataset.curseurAppui;
      etiqueter();
    };

    if (brut) {
      window.addEventListener(
        "pointerrawupdate" as "pointermove",
        placer as EventListener,
        { passive: true }
      );
    }
    window.addEventListener("pointermove", placer, { passive: true });
    window.addEventListener("pointerover", surSurvol, { passive: true });
    window.addEventListener("pointerdown", appuyer, { passive: true });
    window.addEventListener("pointerup", relacher, { passive: true });
    document.addEventListener("pointerleave", surSortie);
    window.addEventListener("blur", surSortie);

    return () => {
      if (brut) {
        window.removeEventListener(
          "pointerrawupdate" as "pointermove",
          placer as EventListener
        );
      }
      window.clearTimeout(minuteur);
      window.removeEventListener("pointermove", placer);
      window.removeEventListener("pointerover", surSurvol);
      window.removeEventListener("pointerdown", appuyer);
      window.removeEventListener("pointerup", relacher);
      document.removeEventListener("pointerleave", surSortie);
      window.removeEventListener("blur", surSortie);
      delete racine.dataset.curseur;
      delete racine.dataset.curseurVu;
      delete racine.dataset.curseurEtat;
      delete racine.dataset.curseurAppui;
    };
  }, [allege]);

  /*
   * LES HUIT DESSINS SONT TOUS DANS LA PAGE, EN PERMANENCE.
   *
   * Le CSS décide lequel se montre, à partir de l'état écrit sur
   * <html>. Les fabriquer à la volée obligerait à un rendu React à
   * chaque survol d'une vignette, pour des images qui ne changent
   * jamais : huit `<svg>` de quelques nœuds, c'est gratuit ; un rendu
   * par mouvement de souris ne l'est pas.
   *
   * Chacun est enveloppé dans un `<span>` qui porte son décalage. La
   * flèche mord par son coin haut gauche ; les glyphes centrés — l'œil,
   * la loupe, les mains, le rond barré — doivent tomber par leur milieu
   * sur le pixel visé, sans quoi on aurait l'impression de cliquer à
   * côté. Le décalage est sur le span et l'agrandissement sur le svg :
   * mis au même endroit, le glyphe se déplacerait en grossissant.
   */
  return (
    <div ref={fleche} className="curseur-point" aria-hidden>
      <span data-glyphe="fleche">
        <svg viewBox="0 0 12 16" width="11" height="15">
          <path
            className="curseur-trait"
            strokeWidth="2.4"
            d="M1 1.2 L1 13.6 L4.35 10.35 L6.5 15 L8.75 13.9 L6.6 9.4 L11 9.4 Z"
          />
        </svg>
      </span>

      {/* L'œil d'une vignette de pièce : on va la REGARDER, pas
          l'ouvrir dans un nouvel écran. */}
      <span data-glyphe="piece">
        <svg viewBox="0 0 22 16" width="22" height="16">
          <path
            className="curseur-trait"
            strokeWidth="2.6"
            d="M1.6 8 C5 2.6 17 2.6 20.4 8 C17 13.4 5 13.4 1.6 8 Z"
          />
          <circle cx="11" cy="8" r="3.1" fill="#fff" />
        </svg>
      </span>

      {/* La loupe et son plus : la photo s'agrandit sur place. */}
      <span data-glyphe="zoom">
        <svg viewBox="0 0 19 19" width="20" height="20">
          <rect
            className="curseur-trait"
            strokeWidth="2.4"
            x="11.4"
            y="12.2"
            width="7"
            height="3"
            rx="1.5"
            transform="rotate(45 11.4 13.7)"
          />
          <circle className="curseur-trait" strokeWidth="2.4" cx="8" cy="8" r="5.6" />
          <rect x="7.2" y="5.1" width="1.6" height="5.8" rx=".8" fill="#fff" />
          <rect x="5.1" y="7.2" width="5.8" height="1.6" rx=".8" fill="#fff" />
        </svg>
      </span>

      {/* La main ouverte, puis le poing : on tient la vignette. */}
      <span data-glyphe="main">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <g className="curseur-trait" strokeWidth="2.6">
            <rect x="5" y="9" width="13" height="11" rx="5" />
            <rect x="7.2" y="3.2" width="2.8" height="9" rx="1.4" />
            <rect x="10.6" y="1.9" width="2.8" height="10.3" rx="1.4" />
            <rect x="14" y="3.4" width="2.8" height="9" rx="1.4" />
            <rect
              x="3.4"
              y="11"
              width="2.8"
              height="7.2"
              rx="1.4"
              transform="rotate(-22 4.8 14.6)"
            />
          </g>
        </svg>
      </span>

      <span data-glyphe="poing">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <g className="curseur-trait" strokeWidth="2.6">
            <rect x="4.8" y="9.6" width="13.6" height="10.4" rx="5" />
            <rect x="6.9" y="7.4" width="2.6" height="4.2" rx="1.3" />
            <rect x="10.3" y="6.8" width="2.6" height="4.8" rx="1.3" />
            <rect x="13.7" y="7.4" width="2.6" height="4.2" rx="1.3" />
            <rect
              x="3.3"
              y="12.2"
              width="2.6"
              height="5.2"
              rx="1.3"
              transform="rotate(-18 4.6 14.8)"
            />
          </g>
        </svg>
      </span>

      {/* La double flèche des poignées : ça se pousse à gauche et à
          droite, et ça ne s'ouvre pas. */}
      {/* L'index tendu : la pointe tombe sur ce qu'on vise. Il ne
          remplace pas la flèche sur tout ce qui se clique — voir
          `DOIGT` — il ne paraît que sur ce qu'on choisit du doigt. */}
      <span data-glyphe="doigt">
        <svg viewBox="0 0 18 20" width="17" height="19">
          <path
            className="curseur-trait"
            strokeWidth="2.4"
            d="M6.4 10.5 V3.1 a1.5 1.5 0 0 1 3 0 v6.4
               a1.4 1.4 0 0 1 2.8 0 v0.9
               a1.4 1.4 0 0 1 2.8 0 v0.9
               a1.35 1.35 0 0 1 2.6 0 v3
               a4.5 4.5 0 0 1 -4.5 4.5 h-2.4
               a4.5 4.5 0 0 1 -3.6 -1.8 L2.4 13.2
               a1.5 1.5 0 0 1 2.2 -2 z"
          />
        </svg>
      </span>

      <span data-glyphe="regler">
        <svg viewBox="0 0 22 12" width="23" height="13">
          <path
            className="curseur-trait"
            strokeWidth="2.4"
            d="M1 6 L5.4 2.2 L5.4 4.6 L16.6 4.6 L16.6 2.2 L21 6 L16.6 9.8 L16.6 7.4 L5.4 7.4 L5.4 9.8 Z"
          />
        </svg>
      </span>

      {/*
        Le rond barré. Il garde ses couleurs propres — un gris violet
        éteint, sur son contour blanc — parce qu'un bouton indisponible
        est la seule chose qui doive avoir l'air décolorée.
      */}
      <span data-glyphe="inactif">
        <svg viewBox="0 0 18 18" width="19" height="19">
          <circle cx="9" cy="9" r="6.8" fill="none" stroke="#fff" strokeWidth="4.6" />
          <circle cx="9" cy="9" r="6.8" fill="none" stroke="#5b4a86" strokeWidth="2.4" />
          <rect
            x="3.6"
            y="7.9"
            width="10.8"
            height="2.2"
            rx="1.1"
            transform="rotate(-45 9 9)"
            fill="#5b4a86"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinejoin="round"
            paintOrder="stroke"
          />
        </svg>
      </span>

      {/*
        Le mot. Il est vide tant qu'aucune zone n'en porte, et il reste
        dans le calque même invisible : c'est ce qui permet de mesurer sa
        largeur avant de le montrer, donc de savoir s'il tiendrait à
        droite de la pointe.
      */}
      <span ref={etiquette} className="curseur-mot" />
    </div>
  );
}
