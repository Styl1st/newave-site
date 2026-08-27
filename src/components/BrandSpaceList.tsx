"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Brand } from "@/lib/types";

/**
 * La liste des marques qu'on gère, avec une recherche.
 *
 * Un créateur en a une ou deux, et la recherche ne lui sert à rien.
 * L'administration, elle, les voit toutes : à trente marques, retrouver
 * la bonne en faisant défiler devient le geste le plus fréquent de la
 * journée. La barre n'apparaît donc qu'à partir du moment où elle
 * apporte quelque chose.
 */

const SEUIL_RECHERCHE = 6;
const PAR_PAGE = 12;

export default function BrandSpaceList({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const [visibles, setVisibles] = useState(PAR_PAGE);

  const resultats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q)
    );
  }, [brands, query]);

  const affichees = resultats.slice(0, visibles);

  return (
    <>
      {brands.length >= SEUIL_RECHERCHE && (
        <div className="glass mb-5 p-4">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibles(PAR_PAGE);
            }}
            placeholder="Chercher une marque…"
            aria-label="Chercher une marque"
            className="champ"
          />
          <p className="m-0 mt-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
            {resultats.length} marque{resultats.length > 1 ? "s" : ""}
            {query && ` sur ${brands.length}`}
          </p>
        </div>
      )}

      {resultats.length === 0 ? (
        <div className="glass p-6 text-center">
          <p className="m-0 text-[14.5px] text-white/85">Aucune marque ne correspond.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {affichees.map((b) => (
            <Link
              key={b.id}
              href={`/espace-marque/${b.slug}`}
              className="card-light flex h-full overflow-hidden"
            >
              <div className="relative z-3 flex w-full items-center gap-3 p-3">
                <span className="visuel h-14 w-14 shrink-0 overflow-hidden rounded-[12px]">
                  {(b.logo_url ?? b.cover_url) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={b.logo_url ?? b.cover_url ?? ""}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92]">
                    {b.status === "published" ? "En ligne" : "En attente de publication"}
                  </span>
                  <span className="mt-0.5 block truncate text-[15px] font-extrabold text-[var(--color-ink)]">
                    {b.name}
                  </span>
                </span>
                <span className="text-[17px] font-black text-[#3a2470]">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {resultats.length > visibles && (
        <button
          type="button"
          onClick={() => setVisibles((n) => n + PAR_PAGE)}
          className="mt-4 w-full rounded-full border border-white/30 px-5 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:bg-white/12 active:scale-[.98]"
        >
          Voir plus de marques ({visibles} sur {resultats.length})
        </button>
      )}
    </>
  );
}
