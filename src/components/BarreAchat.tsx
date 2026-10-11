"use client";

import { useEffect, useState } from "react";

/**
 * La barre collée en bas de l'écran sur la fiche pièce, au téléphone.
 *
 * Le grand bouton « Acheter chez... » arrive après la photo, le titre,
 * le prix et les tailles, soit à peu près un écran et demi plus bas :
 * pendant qu'on regarde les photos, rien ne rappelait où acheter. La
 * barre reprend le prix et le même libellé que le grand bouton
 * (`libelleAchat`), et s'efface quand celui-ci est à l'écran pour ne
 * pas afficher deux fois la même chose.
 *
 * Elle pose `data-pied="piece"` sur <html> pour que le pied de page et
 * les confirmations se décalent de sa hauteur (voir `--pied`).
 */
export default function BarreAchat({
  href,
  libelle,
  prix,
}: {
  href: string;
  libelle: string;
  prix: string | null;
}) {
  const [principalVisible, setPrincipalVisible] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.dataset.pied) html.dataset.pied = "piece";
    return () => {
      if (html.dataset.pied === "piece") delete html.dataset.pied;
    };
  }, []);

  useEffect(() => {
    const principal = document.querySelector("[data-achat-principal]");
    if (!principal || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([entree]) => setPrincipalVisible(entree.isIntersecting), {
      threshold: 0.2,
    });
    obs.observe(principal);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`barre-achat fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-[rgba(var(--voile),0.9)] px-[var(--pad)] pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] backdrop-blur-xl transition-transform duration-300 sm:hidden ${
        principalVisible ? "pointer-events-none translate-y-full" : "translate-y-0"
      }`}
      aria-hidden={principalVisible || undefined}
      inert={principalVisible || undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-[16px] font-extrabold text-white">{prix ?? "Prix sur la boutique"}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          /* `max-w` + `truncate` : « Acheter chez Protémoa™ Official
             International Store » ne doit pas pousser le prix hors de
             l'écran. */
          className="inline-flex min-h-[44px] max-w-[72%] shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-extrabold text-[var(--color-ink)] active:scale-[.97]"
        >
          <span className="truncate">{libelle}</span>
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    </div>
  );
}
