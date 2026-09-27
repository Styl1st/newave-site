"use client";

import { IconChevron, IconLoupe } from "@/components/Icons";
import {
  RUBRIQUES,
  TRIS,
  VILLES,
  VILLES_EN_VUE,
  type FiltresForum as Filtres,
  type RubriqueCle,
  type TriForum,
} from "@/lib/forum";

/**
 * Le tri, la ville, la rubrique, et la recherche.
 *
 * DEUX DESSINS, ET LE DÉCOUPAGE EST DANS LA MAQUETTE.
 *
 * En grand : le tri en segmenté, les villes en pastilles sur la même
 * ligne, les rubriques en pastilles de couleur dessous. Tout se voit,
 * rien ne se déplie.
 *
 * Au doigt : PAS DE DÉFILEMENT HORIZONTAL. Une rangée de pastilles
 * qui déborde cache la moitié de ses choix sans rien pour dire qu'ils
 * existent. On garde le segmenté (trois mots tiennent), la recherche
 * pleine largeur, puis deux menus natifs côte à côte : le téléphone
 * ouvre alors sa propre roue, faite pour le pouce.
 */
export default function FiltresForum({
  filtres,
  onChange,
}: {
  filtres: Filtres;
  onChange: (f: Partial<Filtres>) => void;
}) {
  const autresVilles = VILLES.filter((v) => !VILLES_EN_VUE.includes(v));
  const villeHorsPastilles = filtres.ville && !VILLES_EN_VUE.includes(filtres.ville);

  const segmente = (
    <div
      role="group"
      aria-label="Trier les annonces"
      className="flex rounded-full border border-white/18 bg-[rgba(var(--voile),0.42)] p-1"
    >
      {TRIS.map((t) => (
        <button
          key={t.cle}
          type="button"
          onClick={() => onChange({ tri: t.cle as TriForum })}
          aria-pressed={filtres.tri === t.cle}
          className={`min-h-[40px] flex-1 rounded-full px-4 text-[13px] font-extrabold transition md:min-h-[36px] ${
            filtres.tri === t.cle
              ? "bg-white text-[var(--color-ink)] shadow-[0_2px_10px_rgba(23,10,51,0.2)]"
              : "text-white/85 hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const pastille = (actif: boolean) =>
    `inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-extrabold transition active:scale-[.97] ${
      actif
        ? "bg-white text-[var(--color-ink)]"
        : "border border-white/22 bg-white/8 text-white/88 hover:bg-white/16"
    }`;

  const recherche = (
    <label className="relative block">
      <span className="sr-only">Chercher une annonce</span>
      <IconLoupe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
      <input
        type="search"
        value={filtres.q}
        onChange={(e) => onChange({ q: e.target.value.slice(0, 80) })}
        placeholder="Mannequin, pop-up, Lyon…"
        autoComplete="off"
        enterKeyHint="search"
        className="champ champ-loupe w-full"
      />
    </label>
  );

  return (
    <div className="rise rise-1 mb-6">
      {/* ---------------- en grand ---------------- */}
      <div className="hidden md:block">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-white/15 pb-4">
          <div className="w-[300px]">{segmente}</div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1.5">Ville</span>
            <button type="button" onClick={() => onChange({ ville: null })} className={pastille(!filtres.ville)}>
              Toutes
            </button>
            {VILLES_EN_VUE.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ ville: filtres.ville === v ? null : v })}
                aria-pressed={filtres.ville === v}
                className={pastille(filtres.ville === v)}
              >
                {v}
              </button>
            ))}
            {/* Le reste de la liste dans un menu : douze pastilles ne
                tiendraient pas sur la ligne du tri. */}
            <label className={`relative ${pastille(Boolean(villeHorsPastilles))} pr-8`}>
              <span className="sr-only">Autres villes</span>
              <select
                value={villeHorsPastilles ? (filtres.ville as string) : ""}
                onChange={(e) => onChange({ ville: e.target.value || null })}
                className="cursor-pointer appearance-none bg-transparent text-inherit outline-none"
              >
                <option value="" className="text-[#170a33]">Autres</option>
                {autresVilles.map((v) => (
                  <option key={v} value={v} className="text-[#170a33]">
                    {v}
                  </option>
                ))}
              </select>
              <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2" />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <button type="button" onClick={() => onChange({ rubrique: null })} className={pastille(!filtres.rubrique)}>
              Tout
            </button>
            {RUBRIQUES.map((r) => (
              <button
                key={r.cle}
                type="button"
                onClick={() =>
                  onChange({ rubrique: filtres.rubrique === r.cle ? null : (r.cle as RubriqueCle) })
                }
                aria-pressed={filtres.rubrique === r.cle}
                className={pastille(filtres.rubrique === r.cle)}
              >
                <span
                  aria-hidden
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ background: r.couleur, boxShadow: "inset 0 0 0 1px rgba(23,10,51,.22)" }}
                />
                {r.label}
              </button>
            ))}
          </div>
          <div className="w-full max-w-[260px]">{recherche}</div>
        </div>
      </div>

      {/* ---------------- au doigt ---------------- */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {segmente}
        {recherche}
        <div className="grid grid-cols-2 gap-2.5">
          <MenuNatif
            titre="Ville"
            valeur={filtres.ville ?? ""}
            onChange={(v) => onChange({ ville: v || null })}
            options={[{ valeur: "", label: "Toutes" }, ...VILLES.map((v) => ({ valeur: v, label: v }))]}
          />
          <MenuNatif
            titre="Rubrique"
            valeur={filtres.rubrique ?? ""}
            onChange={(v) => onChange({ rubrique: (v || null) as RubriqueCle | null })}
            options={[{ valeur: "", label: "Tout" }, ...RUBRIQUES.map((r) => ({ valeur: r.cle, label: r.label }))]}
            point={RUBRIQUES.find((r) => r.cle === filtres.rubrique)?.couleur ?? "#fff"}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Un menu natif habillé : l'étiquette en petit, la valeur dessous.
 *
 * Le vrai `select` couvre toute la case, transparent : c'est lui qu'on
 * touche, et c'est la roue du téléphone qui s'ouvre. L'habillage n'est
 * qu'un dessin posé derrière.
 */
function MenuNatif({
  titre,
  valeur,
  onChange,
  options,
  point,
}: {
  titre: string;
  valeur: string;
  onChange: (v: string) => void;
  options: { valeur: string; label: string }[];
  point?: string;
}) {
  const choisi = options.find((o) => o.valeur === valeur) ?? options[0];
  return (
    <label className="relative block h-[52px] rounded-[14px] border border-white/22 bg-[rgba(var(--voile),0.42)] px-3.5 py-2">
      <span className="block text-[8.5px] font-black uppercase tracking-[0.18em] text-white/60">{titre}</span>
      <span className="mt-0.5 flex items-center gap-1.5 truncate text-[14px] font-extrabold text-white">
        {point && (
          <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: point }} />
        )}
        {choisi.label}
      </span>
      <IconChevron className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/80" />
      <select
        aria-label={titre}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
