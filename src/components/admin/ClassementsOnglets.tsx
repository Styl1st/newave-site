"use client";

import { useState } from "react";
import type { Ligne, Stats } from "@/lib/stats";

/**
 * Les classements, réunis derrière des onglets.
 *
 * C'étaient quatre panneaux empilés, qui poussaient la note de
 * confidentialité et le reste de la page très bas alors qu'on n'en
 * regarde qu'un à la fois. Mêmes barres, mêmes données, une seule
 * hauteur.
 *
 * QUATRE ONGLETS ET NON TROIS. Le dessin en annonce trois — Clics,
 * Favoris, Vues — mais `getStats()` calcule aussi la provenance des
 * visiteurs, et la consigne est de garder les mêmes données. Supprimer
 * l'onglet reviendrait à jeter le seul chiffre qui dise d'où vient le
 * trafic ; il est donc gardé en dernier.
 */

type Onglet = { cle: string; nom: string; legende: string; lignes: Ligne[]; vide: string };

function Barres({ lignes, vide }: { lignes: Ligne[]; vide: string }) {
  if (lignes.length === 0) {
    return <p className="m-0 text-[13.5px] text-white/55">{vide}</p>;
  }

  const max = Math.max(...lignes.map((l) => l.valeur), 1);

  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {lignes.map((l) => (
        <li key={l.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-bold text-white/90">{l.label}</span>
            <span className="shrink-0 text-[13px] font-extrabold text-white">{l.valeur}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              style={{ width: `${(l.valeur / max) * 100}%` }}
              className="h-full rounded-full bg-white/70"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ClassementsOnglets({ stats }: { stats: Stats }) {
  const onglets: Onglet[] = [
    {
      cle: "clics",
      nom: "Clics",
      legende: "Marques les plus cliquées",
      lignes: stats.clicsParMarque,
      vide: "Aucun clic sortant pour l'instant.",
    },
    {
      cle: "favoris",
      nom: "Favoris",
      legende: "Marques les plus mises en favori",
      lignes: stats.favorisParMarque,
      vide: "Aucun favori pour l'instant.",
    },
    {
      cle: "vues",
      nom: "Vues",
      legende: "Pages les plus vues",
      lignes: stats.pages,
      vide: "Aucune visite enregistrée pour l'instant.",
    },
    {
      cle: "sources",
      nom: "Sources",
      legende: "D'où viennent les visiteurs",
      lignes: stats.sources,
      vide: "Personne n'est encore arrivé depuis un autre site.",
    },
  ];

  const [courant, setCourant] = useState(onglets[0].cle);
  const actif = onglets.find((o) => o.cle === courant) ?? onglets[0];

  return (
    <div className="glass p-4 sm:p-5">
      {/* Les onglets s'enroulent : quatre pilules ne tiennent pas sur
          330px, et une barre qui défile latéralement cacherait le
          dernier — celui qu'on consulte le moins, donc celui qu'on
          oublierait tout à fait. */}
      <div role="tablist" aria-label="Classements" className="flex flex-wrap gap-1.5">
        {onglets.map((o) => {
          const choisi = o.cle === actif.cle;
          return (
            <button
              key={o.cle}
              type="button"
              role="tab"
              id={`onglet-${o.cle}`}
              aria-selected={choisi}
              aria-controls={`panneau-${o.cle}`}
              onClick={() => setCourant(o.cle)}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                choisi
                  ? "bg-white text-[var(--color-ink)]"
                  : "border border-white/25 text-white/72 hover:bg-white/12 hover:text-white"
              }`}
            >
              {o.nom}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panneau-${actif.cle}`}
        aria-labelledby={`onglet-${actif.cle}`}
        className="mt-4"
      >
        <p className="eyebrow m-0 mb-3.5">{actif.legende}</p>
        <Barres lignes={actif.lignes} vide={actif.vide} />
      </div>
    </div>
  );
}
