"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Le curseur du site : une flèche aux couleurs de l'ambiance choisie.
 *
 * POURQUOI UNE FLÈCHE ET NON UN POINT. Un point rond ne dit pas où il
 * pointe : son centre, sa pointe et son bord se valent, et l'on vise
 * approximativement sans savoir pourquoi. La flèche du système a une
 * pointe, tout le monde sait exactement où elle mord. On garde donc sa
 * forme, et l'on n'en change que la matière.
 *
 * Elle prend les couleurs du thème du compte. Ce n'est pas de la
 * coquetterie : sur une ambiance verte, une flèche violette serait le
 * seul élément de l'écran à ne pas suivre le réglage.
 *
 * IL Y AVAIT UN ANNEAU QUI LA SUIVAIT, ET IL EST PARTI. Il servait à
 * signaler ce qui est cliquable, puisqu'en masquant le curseur du
 * système on perd sa petite main. C'est la flèche elle-même qui s'en
 * charge maintenant : elle grossit un peu au survol d'un lien et se
 * resserre à l'appui. Une pièce au lieu de deux, et le geste reste
 * lisible.
 *
 * Bon débarras côté coût, aussi : sans anneau à faire rattraper, il n'y
 * a plus d'animation à entretenir. On écrit une position, et rien
 * d'autre, quand la souris bouge.
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

/** Ce qui s'attrape et se déplace : la flèche devient une main. */
const SAISISSABLE = "[data-saisissable]";

/** Là où le trait du système en dit plus que notre flèche. */
const SAISIE =
  "input:not([type]), input[type='text'], input[type='email'], input[type='password'], input[type='search'], input[type='url'], input[type='number'], textarea, [contenteditable='true']";

export default function Curseur() {
  /*
   * La mesure de fluidité tombe une seconde après l'arrivée sur la
   * page, donc APRÈS que ce composant se soit installé. Sans cet
   * écouteur, il continuerait de tourner sur une machine qu'on vient
   * justement de déclarer trop lente. Voir `Menagement`.
   */
  const [allege, setAllege] = useState(false);
  useEffect(() => {
    const surAllege = () => setAllege(true);
    window.addEventListener("newave:allege", surAllege);
    return () => window.removeEventListener("newave:allege", surAllege);
  }, []);

  const fleche = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * Aucun pointeur fin, aucun curseur. Sur un écran tactile, dessiner
     * une flèche au dernier endroit touché serait un objet fantôme posé
     * au milieu de la page.
     */
    if (!window.matchMedia("(pointer: fine)").matches) return;

    /*
     * Sur une machine qui peine, on ne dessine plus rien de tout ça :
     * voir `Menagement`. Le curseur du système est toujours fluide,
     * puisqu'il n'est pas dessiné par la page.
     */
    if (allege || document.documentElement.dataset.allege === "1") return;

    const racine = document.documentElement;
    const el = fleche.current;
    if (!el) return;

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
     */
    const placer = (e: PointerEvent) => {
      /*
       * PAS DE RECENTRAGE. La pointe du dessin est son coin haut
       * gauche : c'est elle qui doit tomber sur le pixel visé, comme
       * celle du système. Centrer la flèche décalerait la visée d'une
       * dizaine de pixels vers le bas.
       */
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (racine.dataset.curseurVu !== "1") racine.dataset.curseurVu = "1";
    };

    /*
     * La cible précédente, pour ne rien recalculer quand elle n'a pas
     * changé.
     *
     * On remontait trois fois l'arbre du document à CHAQUE mouvement,
     * soit des centaines de fois par seconde, pour aboutir presque
     * toujours au même résultat : on survole le même élément pendant des
     * dizaines d'images d'affilée. Une comparaison suffit à s'en
     * dispenser.
     */
    let precedente: Element | null = null;

    const surMouvement = (e: PointerEvent) => {
      placer(e);

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
      const saisie = cible?.closest?.(SAISIE) ?? null;
      /*
       * L'ordre compte : une vignette qu'on peut déplacer est aussi un
       * bouton. Si « cliquable » passait devant, la main ne
       * s'afficherait jamais.
       */
      const aSaisir = cible?.closest?.(SAISISSABLE) ?? null;
      const dessus = cible?.closest?.(CLIQUABLE) ?? null;
      const etat = saisie ? "saisie" : aSaisir ? "saisir" : dessus ? "actif" : "";

      // On n'écrit l'attribut QUE s'il change : chaque écriture invalide
      // les styles de toute la page, et l'état ne bouge presque jamais.
      if (racine.dataset.curseurEtat !== etat) racine.dataset.curseurEtat = etat;
    };

    const brut = "onpointerrawupdate" in window;

    const surSortie = () => {
      delete racine.dataset.curseurVu;
    };

    const appuyer = () => {
      racine.dataset.curseurAppui = "1";
    };
    const relacher = () => {
      delete racine.dataset.curseurAppui;
    };

    if (brut) {
      window.addEventListener(
        "pointerrawupdate" as "pointermove",
        placer as EventListener,
        { passive: true }
      );
    }
    window.addEventListener("pointermove", surMouvement, { passive: true });
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
  }, [allege]);

  return (
    <div ref={fleche} className="curseur-point" aria-hidden>
      <Glyphe nom="fleche" boite="0 0 22 24">
        <path d="M2 1.6 L2 20.2 L7.2 15.6 L10.4 22.4 L13.9 20.8 L10.8 14.3 L17.6 14.3 Z" />
      </Glyphe>

      {/*
        La main ouverte, puis le poing. Les trois dessins sont toujours
        présents : seul le CSS décide lequel se montre. Les fabriquer à
        la volée obligerait à un rendu React à chaque survol d'une
        vignette, pour une image qui ne change pas.
      */}
      <Glyphe nom="main" boite="0 0 24 24">
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
      </Glyphe>

      <Glyphe nom="poing" boite="0 0 24 24">
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
      </Glyphe>
    </div>
  );
}

/**
 * Un dessin de curseur, tracé deux fois.
 *
 * Le premier passage est un contour blanc épais : c'est lui qui rend la
 * forme visible sur une photo sombre comme sur une plaque claire, sans
 * quoi une teinte de thème foncée disparaîtrait sur le fond du site.
 *
 * Le second est la forme elle-même, remplie de la couleur de
 * l'ambiance. Elle est déclarée en CSS et non ici, pour suivre le
 * réglage du compte sans qu'on ait à le transporter jusqu'ici.
 */
function Glyphe({
  nom,
  boite,
  children,
}: {
  nom: "fleche" | "main" | "poing";
  boite: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox={boite} width="24" height="24" data-glyphe={nom}>
      <g className="curseur-contour">{children}</g>
      <g className="curseur-fleche">{children}</g>
    </svg>
  );
}
