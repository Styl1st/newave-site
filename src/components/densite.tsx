"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * La densité d'une liste : ce qu'on choisit, ce qu'on retient, et le
 * petit rail de boutons qui sert à en changer.
 *
 * POURQUOI CE FICHIER EXISTE À PART DE `Grille`. Le rail vivait dans la
 * grille, au-dessus d'elle, et c'était très bien tant qu'il n'avait
 * qu'un endroit possible. L'annuaire refondu le veut DANS sa ligne de
 * filtres collante — à droite des pastilles, dans la même pilule de
 * verre — c'est-à-dire dans un composant qui n'est ni la grille ni son
 * parent direct.
 *
 * L'état est donc sorti d'ici et peut se tenir là où la mise en page
 * l'exige, la grille se contentant de le recevoir. Les listes qui n'ont
 * pas cette contrainte — les pièces, les favoris — ne changent pas :
 * `Grille` continue de gérer son choix toute seule quand on ne lui en
 * impose aucun.
 */

/**
 * `liste` est une TROISIÈME façon de regarder, et pas une grille plus
 * serrée encore.
 *
 * Les deux premières changent la taille des vignettes ; celle-ci change
 * la forme de l'entrée. Une marque n'y est plus une carte mais une
 * ligne — logo, nom, et surtout quatre de ses pièces posées dedans (voir
 * `LigneMarque`). C'est le mode fait pour CHERCHER dans un annuaire de
 * cent trente-six marques, là où les deux autres sont faits pour flâner.
 *
 * Elle n'existe que pour les marques : une pièce est déjà une photo et
 * un prix, la mettre en ligne ne révélerait rien de plus.
 */
export type Densite = "confort" | "serre" | "liste";
export type Variante = "pieces" | "marques";

export const CLASSES: Record<Variante, Partial<Record<Densite, string>>> = {
  pieces: {
    confort: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4",
    serre: "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6",
  },
  marques: {
    confort: "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",
    serre: "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4",
    liste: "flex flex-col gap-2.5",
  },
};

const LIBELLES: Record<Densite, { titre: string; aide: string }> = {
  confort: { titre: "Confort", aide: "Grandes vignettes" },
  serre: { titre: "Grille", aide: "Voir plus d'éléments à la fois" },
  liste: { titre: "Liste", aide: "Une ligne par marque, avec ses pièces" },
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

/* Trois barres pleine largeur : le dessin universel d'une liste. */
function IconListe() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
      {[1.4, 6.6, 11.8].map((y) => (
        <rect key={y} x="1" y={y} width="14" height="2.8" rx="1.2" />
      ))}
    </svg>
  );
}

const ICONES: Record<Densite, () => React.ReactElement> = {
  confort: IconConfort,
  serre: IconSerre,
  liste: IconListe,
};

/** Les densités que cette liste propose vraiment. */
export function densitesDe(variante: Variante): Densite[] {
  return (Object.keys(CLASSES[variante]) as Densite[]).filter((d) => CLASSES[variante][d]);
}

export function useDensite(memoire: string, variante: Variante, defaut: Densite = "confort") {
  /*
   * Le premier rendu est volontairement identique côté serveur et côté
   * navigateur. La préférence n'est lue qu'ensuite : le serveur n'a
   * aucun moyen de la connaître, et l'appliquer trop tôt ferait diverger
   * les deux rendus.
   *
   * `defaut` ne casse rien à cette règle tant qu'il est une constante :
   * les deux côtés partent de la même valeur.
   */
  const [densite, setDensite] = useState<Densite>(defaut);

  useEffect(() => {
    try {
      const garde = localStorage.getItem(`grille:${memoire}`) as Densite | null;
      /*
       * On vérifie que la valeur retenue existe ENCORE pour cette liste.
       * Sans ça, quelqu'un qui a choisi « Liste » sur les marques et qui
       * arrive sur les pièces sous la même clé se retrouverait avec une
       * densité sans classe : une grille sans grille, donc une colonne
       * de cartes pleine largeur.
       */
      if (garde && CLASSES[variante][garde]) setDensite(garde);
    } catch {
      // navigation privée, stockage refusé : on reste sur le défaut
    }
  }, [memoire, variante]);

  const choisir = useCallback(
    (valeur: Densite) => {
      setDensite(valeur);
      try {
        localStorage.setItem(`grille:${memoire}`, valeur);
      } catch {
        // sans mémoire, le choix vaut au moins pour cette page
      }
    },
    [memoire]
  );

  return { densite, choisir, offertes: densitesDe(variante) };
}

export function SelecteurDensite({
  densite,
  choisir,
  offertes,
  className = "",
}: {
  densite: Densite;
  choisir: (d: Densite) => void;
  offertes: Densite[];
  className?: string;
}) {
  const onglet =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition";

  return (
    <div
      role="group"
      aria-label="Densité d'affichage"
      className={`flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-white/8 p-1 ${className}`}
    >
      {offertes.map((d) => {
        const Icone = ICONES[d];
        return (
          <button
            key={d}
            type="button"
            onClick={() => choisir(d)}
            aria-pressed={densite === d}
            title={LIBELLES[d].aide}
            className={
              densite === d
                ? `${onglet} bg-white text-[var(--color-ink)]`
                : `${onglet} text-white/70 hover:text-white`
            }
          >
            <Icone />
            <span className="hidden sm:inline">{LIBELLES[d].titre}</span>
          </button>
        );
      })}
    </div>
  );
}
