"use client";

import { useMemo, useState } from "react";
import BrandGrid from "./BrandGrid";
import { IconChevron, IconFiltre } from "./Icons";
import type { Brand, PriceTier } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";

const TIERS: PriceTier[] = ["accessible", "intermediaire", "premium"];

export default function BrandDirectory({
  brands,
  favoris,
  notes,
}: {
  brands: Brand[];
  /** Les marques déjà suivies, pour allumer la bonne étoile. */
  favoris?: string[];
  /** Les moyennes d'avis, par identifiant de marque. */
  notes?: Record<string, { moyenne: number; avis: number }>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tier, setTier] = useState<PriceTier | null>(null);
  const [ouvert, setOuvert] = useState(false);
  /*
   * Marque ou artiste : la distinction la plus utile de l'annuaire.
   *
   * Une marque a une boutique, des tailles, des séries. Un artiste fait
   * lui-même, souvent à l'unité, parfois sans rien vendre en ligne. On
   * ne cherche pas la même chose selon les jours, et noyer les seconds
   * parmi les premiers revenait à les rendre introuvables.
   */
  const [genre, setGenre] = useState<"tout" | "marques" | "artistes">("tout");

  // Le compteur sur le bouton : sans lui, un filtre actif derrière un
  // panneau replié devient invisible, et la liste paraît incomplète
  // sans qu'on comprenne pourquoi.
  const actifs = (category ? 1 : 0) + (tier ? 1 : 0);

  function reinitialiser() {
    setCategory(null);
    setTier(null);
  }

  const categories = useMemo(
    () => Array.from(new Set(brands.flatMap((b) => b.categories))).sort(),
    [brands]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((b) => {
      const artiste = b.categories.includes("Artiste");
      if (genre === "artistes" && !artiste) return false;
      if (genre === "marques" && artiste) return false;
      if (tier && b.price_tier !== tier) return false;
      if (category && !b.categories.includes(category)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        b.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [brands, query, category, tier, genre]);

  const chip =
    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/80 hover:bg-white/20 hover:text-white";
  const chipOn = "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]";

  return (
    <>
      <div className="glass rise rise-1 mb-8 p-4 sm:p-5">
        <div className="mb-3 flex gap-1 rounded-full border border-white/20 bg-white/8 p-1">
          {(
            [
              ["tout", "Tout"],
              ["marques", "Marques"],
              ["artistes", "Artistes"],
            ] as const
          ).map(([id, libelle]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGenre(id)}
              aria-pressed={genre === id}
              className={`flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold transition ${
                genre === id
                  ? "bg-white text-[var(--color-ink)]"
                  : "text-white/72 hover:bg-white/12 hover:text-white"
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>

        {/* La recherche reste toujours là : c'est le geste le plus
            fréquent. Les filtres, eux, se déplient — affichés en
            permanence, ils occupaient la moitié d'un écran de
            téléphone avant qu'on ait vu la première marque. */}
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une marque, un style…"
            className="min-w-0 flex-1 rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55"
          />
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-controls="filtres"
            className={`inline-flex shrink-0 items-center gap-2 rounded-[13px] px-4 py-3 text-[13px] font-extrabold transition active:scale-[.97] ${
              actifs > 0 || ouvert
                ? "bg-white text-[var(--color-ink)]"
                : "border border-white/40 bg-white/8 text-white hover:bg-white/18"
            }`}
          >
            <IconFiltre />
            <span className="hidden sm:inline">Filtres</span>
            {actifs > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[10.5px] font-black text-white">
                {actifs}
              </span>
            )}
            <IconChevron className={`h-3.5 w-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`} />
          </button>
        </div>

        {actifs > 0 && !ouvert && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {category && (
              <span className={`${chip} ${chipOn}`}>{category}</span>
            )}
            {tier && <span className={`${chip} ${chipOn}`}>{PRICE_TIER_LABEL[tier]}</span>}
            <button
              type="button"
              onClick={reinitialiser}
              className="text-[12px] font-bold text-white/70 underline underline-offset-2 hover:text-white"
            >
              Tout effacer
            </button>
          </div>
        )}

        {ouvert && (
          <div id="filtres" className="mt-4 border-t border-white/15 pt-4">
            <p className="eyebrow m-0 mb-2">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategory(null)} className={`${chip} ${category === null ? chipOn : chipOff}`}>
                Toutes
              </button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`${chip} ${category === c ? chipOn : chipOff}`}>
                  {c}
                </button>
              ))}
            </div>

            <p className="eyebrow m-0 mb-2 mt-4">Gamme de prix</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTier(null)} className={`${chip} ${tier === null ? chipOn : chipOff}`}>
                Tous les prix
              </button>
              {TIERS.map((t) => (
                <button key={t} onClick={() => setTier(t)} className={`${chip} ${tier === t ? chipOn : chipOff}`}>
                  {PRICE_TIER_LABEL[t]}
                </button>
              ))}
            </div>

            {actifs > 0 && (
              <button
                type="button"
                onClick={reinitialiser}
                className="mt-4 text-[12.5px] font-bold text-white/75 underline underline-offset-2 hover:text-white"
              >
                Tout effacer
              </button>
            )}
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/90">
            Rien ne correspond. Une marque manque à l&apos;appel ?{" "}
            <a href="/candidature" className="font-bold text-white underline underline-offset-2">
              Propose-la
            </a>
            .
          </p>
        </div>
      ) : (
        <BrandGrid
          brands={results}
          favoris={favoris}
          notes={notes}
          memoire="annuaire"
          aside={
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
              {results.length} marque{results.length > 1 ? "s" : ""}
            </p>
          }
        />
      )}
    </>
  );
}
