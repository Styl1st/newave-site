"use client";

import { useState } from "react";
import BrandCard from "./BrandCard";
import BrandPreview from "./BrandPreview";
import Grille from "./Grille";
import type { Brand } from "@/lib/types";

/**
 * Grille de marques avec aperçu des pièces.
 *
 * L'aperçu s'ouvre uniquement au clic sur le bouton, jamais au survol :
 * un panneau qui surgit tout seul pendant qu'on parcourt la liste
 * interrompt plus qu'il n'aide.
 */
export default function BrandGrid({
  brands,
  memoire = "marques",
  aside,
  favoris,
}: {
  brands: Brand[];
  /** Sous quel nom retenir la densité choisie pour cette liste. */
  memoire?: string;
  aside?: React.ReactNode;
  /** Les marques déjà suivies. Absent = on n'affiche pas l'étoile. */
  favoris?: string[];
}) {
  const suivies = new Set(favoris ?? []);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <Grille variante="marques" memoire={memoire} aside={aside}>
        {brands.map((b) => (
          /* `data-reveal` déplace l'animation de défilement sur
             l'ensemble carte + bouton. Quand seule la carte bougeait,
             le bouton restait en place et venait flotter au-dessus de
             la carte de la ligne du dessus. */
          <div key={b.id} data-reveal className="relative h-full">
            <BrandCard brand={b} favori={favoris ? { initial: suivies.has(b.id) } : undefined} />

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
      </Grille>

      {open && <BrandPreview slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}
