"use client";

import { useEffect, useState } from "react";

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

export default function Grille({
  variante,
  memoire,
  children,
  aside,
}: {
  variante: Variante;
  /** Sous quel nom retenir le choix. Une clé par type de liste. */
  memoire: string;
  children: React.ReactNode;
  /** Ce qu'on affiche à gauche du sélecteur, un compteur par exemple. */
  aside?: React.ReactNode;
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

      <div className={`${CLASSES[variante][densite]} ${densite === "serre" ? "grille-serre" : ""}`}>
        {children}
      </div>
    </>
  );
}
