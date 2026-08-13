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
  notes,
}: {
  brands: Brand[];
  /** Sous quel nom retenir la densité choisie pour cette liste. */
  memoire?: string;
  aside?: React.ReactNode;
  /** Les marques déjà suivies. Absent = on n'affiche pas l'étoile. */
  favoris?: string[];
  /**
   * Les moyennes, par identifiant de marque.
   *
   * Un objet simple et non une Map : ces données traversent la
   * frontière du serveur vers le navigateur, et un objet est ce qui
   * passe le plus sûrement.
   */
  notes?: Record<string, { moyenne: number; avis: number }>;
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
            <BrandCard
              brand={b}
              note={notes?.[b.id]}
              favori={favoris ? { initial: suivies.has(b.id) } : undefined}
              apercu={
                <button
                  type="button"
                  onClick={() => setOpen(b.slug)}
                  aria-label={`Aperçu des pièces de ${b.name}`}
                  className="puce-apercu inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white transition duration-200 active:scale-95"
                >
                  {/* Un œil : le mot seul ne disait pas qu'on allait
                      regarder sans quitter la page. */}
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  Aperçu
                </button>
              }
            />
          </div>
        ))}
      </Grille>

      {open && <BrandPreview slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}
