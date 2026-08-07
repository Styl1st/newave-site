"use client";

import { useState } from "react";
import BrandCard from "./BrandCard";
import BrandPreview from "./BrandPreview";
import type { Brand } from "@/lib/types";

/**
 * Grille de marques avec aperçu des pièces.
 *
 * L'aperçu s'ouvre uniquement au clic sur le bouton, jamais au survol :
 * un panneau qui surgit tout seul pendant qu'on parcourt la liste
 * interrompt plus qu'il n'aide.
 */
export default function BrandGrid({ brands }: { brands: Brand[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <div key={b.id} className="relative">
            <BrandCard brand={b} />

            <button
              type="button"
              onClick={() => setOpen(b.slug)}
              aria-label={`Aperçu des pièces de ${b.name}`}
              className="absolute right-3 top-3 z-10 rounded-full bg-[rgba(20,8,50,0.62)] px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm transition hover:bg-[rgba(20,8,50,0.92)]"
            >
              Aperçu
            </button>
          </div>
        ))}
      </div>

      {open && <BrandPreview slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}
