"use client";

import { useState } from "react";
import type { Stats } from "@/lib/stats";

/**
 * Les chiffres de fréquentation, et l'histogramme qui les porte.
 *
 * SEPT ET TRENTE JOURS, PAS QUATRE-VINGT-DIX.
 *
 * Le dessin proposait une bascule 7 j / 30 j / 90 j. `getStats()` ne
 * lit que trente jours : les lignes sont demandées à partir de
 * `depuis`, et les totaux sont comptés sur la même borne. Un bouton
 * « 90 j » ne pourrait donc afficher que trente jours de données sous
 * une étiquette qui en annonce quatre-vingt-dix — c'est-à-dire un
 * chiffre faux, présenté comme une baisse de fréquentation. On n'offre
 * que ce que la lecture permet ; le jour où `getStats` remontera plus
 * loin, il n'y aura qu'une valeur à ajouter ici.
 */

const PERIODES = [7, 30] as const;
type Periode = (typeof PERIODES)[number];

function Evolution({ valeur }: { valeur: number | null }) {
  if (valeur === null) {
    return (
      <span className="text-[12px] font-semibold text-white/55">pas encore de comparaison</span>
    );
  }

  // Zéro n'est ni une hausse ni une baisse : le colorer en vert
  // ferait passer une semaine identique pour une bonne nouvelle.
  const couleur = valeur > 0 ? "#7de2ab" : valeur < 0 ? "#f0a5b6" : "rgba(255,255,255,0.72)";

  return (
    <span className="text-[12px] font-bold" style={{ color: couleur }}>
      {valeur > 0 ? "+" : ""}
      {valeur} %{" "}
      <span className="font-semibold text-white/50">vs 7 jours avant</span>
    </span>
  );
}

function Chiffre({
  label,
  valeur,
  note,
  evolution,
}: {
  label: string;
  valeur: number | string;
  note?: string;
  evolution?: number | null;
}) {
  return (
    <div className="glass p-4 sm:p-5">
      <p className="eyebrow m-0">{label}</p>
      <p className="m-0 mt-2 text-[clamp(24px,6vw,30px)] font-black leading-none text-white">
        {valeur}
      </p>
      <p className="m-0 mt-1.5 leading-snug">
        {evolution !== undefined ? (
          <Evolution valeur={evolution} />
        ) : (
          <span className="text-[12px] font-semibold text-white/55">{note}</span>
        )}
      </p>
    </div>
  );
}

/** Histogramme fait à la main : pas de bibliothèque pour trente barres. */
function Graphique({ jours, periode }: { jours: Stats["jours"]; periode: Periode }) {
  const max = Math.max(...jours.map((j) => j.vues), 1);
  const premier = jours[0];

  return (
    <div className="glass mt-4 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow m-0">Pages vues, {periode} derniers jours</p>
        <p className="m-0 text-[12px] font-bold text-white/55">Maximum : {max} / jour</p>
      </div>

      <div
        className="flex h-40 items-end gap-[2px]"
        role="img"
        aria-label={`Fréquentation des ${periode} derniers jours`}
      >
        {jours.map((j, i) => {
          const hauteur = (j.vues / max) * 100;
          const date = new Date(j.date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          });
          // La dernière barre est le jour en cours : il n'est pas fini,
          // et l'éclaircir évite de lire sa hauteur comme un effondrement.
          const enCours = i === jours.length - 1;

          return (
            <div
              key={j.date}
              title={`${date} : ${j.vues} vue${j.vues > 1 ? "s" : ""}`}
              style={{ height: `${Math.max(hauteur, 1.5)}%` }}
              className={`min-w-0 flex-1 rounded-t-[3px] bg-linear-to-t transition ${
                enCours
                  ? "from-white/55 to-white"
                  : "from-white/35 to-white/85 hover:from-white/60 hover:to-white"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/40">
        <span>
          {premier
            ? new Date(premier.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })
            : ""}
        </span>
        <span>Aujourd&apos;hui</span>
      </div>
    </div>
  );
}

export default function Frequentation({ stats }: { stats: Stats }) {
  const [periode, setPeriode] = useState<Periode>(30);

  const jours = periode === 30 ? stats.jours : stats.jours.slice(-periode);
  const vues = periode === 30 ? stats.vues30 : stats.vues7;

  return (
    <div>
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Chiffre
          label={`${periode} derniers jours`}
          valeur={vues}
          evolution={stats.evolution}
        />
        {/*
          Les deux suivants n'ont pas d'évolution, et n'en affichent donc
          pas. `getStats()` rend un total sur trente jours pour les clics
          comme pour les comptes, sans découpage par semaine : la seule
          façon d'afficher une flèche ici serait de l'inventer. Leur
          période est écrite en toutes lettres pour qu'on ne les lise pas
          à travers la bascule ci-dessous.
        */}
        <Chiffre
          label="Clics vers les marques"
          valeur={stats.clics30}
          note="sur 30 jours, ce que tu leur apportes"
        />
        <Chiffre label="Nouveaux comptes" valeur={stats.comptes30} note="sur 30 jours" />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
          Période
        </span>
        <div
          role="group"
          aria-label="Période des pages vues"
          className="flex items-center overflow-hidden rounded-full border border-white/25"
        >
          {PERIODES.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriode(p)}
              aria-pressed={periode === p}
              className={`px-3.5 py-1.5 text-[11.5px] font-bold transition ${
                i > 0 ? "border-l border-white/20" : ""
              } ${
                periode === p
                  ? "bg-white text-[var(--color-ink)]"
                  : "text-white/72 hover:bg-white/12 hover:text-white"
              }`}
            >
              {p} j
            </button>
          ))}
        </div>
      </div>

      <Graphique jours={jours} periode={periode} />
    </div>
  );
}
