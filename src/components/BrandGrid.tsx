"use client";

import { useEffect, useRef, useState } from "react";
import BrandCard from "./BrandCard";
import BrandPreview from "./BrandPreview";
import type { Brand } from "@/lib/types";

const HOVER_DELAY = 1500;

/**
 * Grille de marques avec aperçu des pièces.
 *
 * Le survol prolongé n'existe pas sur mobile, et déclencher un panneau
 * sur un simple effleurement serait pénible : le survol n'arme le
 * minuteur que sur les appareils qui savent réellement survoler, et un
 * bouton « Aperçu » couvre tous les autres cas.
 */
export default function BrandGrid({ brands }: { brands: Brand[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canHover = useRef(false);

  useEffect(() => {
    canHover.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function arm(slug: string) {
    if (!canHover.current || open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(slug), HOVER_DELAY);
  }

  function disarm() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <div
            key={b.id}
            className="group/preview relative"
            onMouseEnter={() => arm(b.slug)}
            onMouseLeave={disarm}
          >
            <BrandCard brand={b} />

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                disarm();
                setOpen(b.slug);
              }}
              className="absolute right-3 top-3 z-10 rounded-full bg-[rgba(20,8,50,0.6)] px-3 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm transition hover:bg-[rgba(20,8,50,0.9)] focus-visible:opacity-100 md:opacity-0 md:group-hover/preview:opacity-100"
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
