"use client";

import { useMemo, useState } from "react";
import BrandCard from "./BrandCard";
import type { Brand, PriceTier } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";

const TIERS: PriceTier[] = ["accessible", "intermediaire", "premium"];

export default function BrandDirectory({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tier, setTier] = useState<PriceTier | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(brands.flatMap((b) => b.categories))).sort(),
    [brands]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.filter((b) => {
      if (tier && b.price_tier !== tier) return false;
      if (category && !b.categories.includes(category)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        b.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [brands, query, category, tier]);

  const chip =
    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/80 hover:bg-white/20 hover:text-white";
  const chipOn = "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]";

  return (
    <>
      <div className="glass rise rise-1 mb-8 p-5 sm:p-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher une marque, une matière, un style…"
          className="w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setCategory(null)} className={`${chip} ${category === null ? chipOn : chipOff}`}>
            Toutes
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`${chip} ${category === c ? chipOn : chipOff}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setTier(null)} className={`${chip} ${tier === null ? chipOn : chipOff}`}>
            Tous les prix
          </button>
          {TIERS.map((t) => (
            <button key={t} onClick={() => setTier(t)} className={`${chip} ${tier === t ? chipOn : chipOff}`}>
              {PRICE_TIER_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-5 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
        {results.length} marque{results.length > 1 ? "s" : ""}
      </p>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </div>
      )}
    </>
  );
}
