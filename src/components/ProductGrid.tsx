"use client";

import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

/** Grille de pièces avec filtre par marque, catégorie et prix. */
export default function ProductGrid({ products }: { products: Product[] }) {
  const [brand, setBrand] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"defaut" | "prix-asc" | "prix-desc">("defaut");

  const brands = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((p) => {
      if (p.brand) seen.set(p.brand.slug, p.brand.name);
    });
    return Array.from(seen, ([slug, name]) => ({ slug, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [products]);

  const categories = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.categories))).sort(),
    [products]
  );

  const results = useMemo(() => {
    const list = products.filter((p) => {
      if (brand && p.brand?.slug !== brand) return false;
      if (category && !p.categories.includes(category)) return false;
      return true;
    });
    if (sort === "defaut") return list;
    return [...list].sort((a, b) => {
      // Les pièces sans prix affiché finissent toujours en bas.
      const pa = a.price_cents ?? Number.POSITIVE_INFINITY;
      const pb = b.price_cents ?? Number.POSITIVE_INFINITY;
      return sort === "prix-asc" ? pa - pb : pb - pa;
    });
  }, [products, brand, category, sort]);

  const chip =
    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] transition";
  const off = "bg-white/12 text-white/80 hover:bg-white/20 hover:text-white";
  const on = "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]";

  return (
    <>
      <div className="glass mb-8 flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setBrand(null)} className={`${chip} ${brand === null ? on : off}`}>
            Toutes les marques
          </button>
          {brands.map((b) => (
            <button key={b.slug} onClick={() => setBrand(b.slug)} className={`${chip} ${brand === b.slug ? on : off}`}>
              {b.name}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory(null)} className={`${chip} ${category === null ? on : off}`}>
              Toutes catégories
            </button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`${chip} ${category === c ? on : off}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSort("defaut")} className={`${chip} ${sort === "defaut" ? on : off}`}>
            Sélection
          </button>
          <button onClick={() => setSort("prix-asc")} className={`${chip} ${sort === "prix-asc" ? on : off}`}>
            Prix croissant
          </button>
          <button onClick={() => setSort("prix-desc")} className={`${chip} ${sort === "prix-desc" ? on : off}`}>
            Prix décroissant
          </button>
        </div>
      </div>

      <p className="mb-5 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
        {results.length} pièce{results.length > 1 ? "s" : ""}
      </p>

      {results.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Rien ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} showBrand />
          ))}
        </div>
      )}
    </>
  );
}
