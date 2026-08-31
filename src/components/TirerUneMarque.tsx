"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

/**
 * « Tirer une marque » : on ouvre une fiche au hasard.
 *
 * POURQUOI UN BOUTON ET NON UN LIEN. Un lien aurait pu porter une
 * adresse tirée au sort par le serveur, sans une ligne de JavaScript.
 * Mais elle aurait été tirée UNE FOIS, au rendu de la page : cliquer
 * deux fois de suite aurait mené deux fois à la même marque, ce qui
 * vide le geste de son sens. Le tirage se fait donc au clic.
 *
 * Et jamais deux fois la même d'affilée : revenir en arrière pour
 * retomber sur la fiche qu'on vient de quitter est le seul résultat
 * qu'un tirage au sort ne doit pas produire.
 */
export default function TirerUneMarque({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  const precedent = useRef<string | null>(null);

  function tirer() {
    if (slugs.length === 0) return;

    let choisi = slugs[Math.floor(Math.random() * slugs.length)];
    if (slugs.length > 1 && choisi === precedent.current) {
      const autres = slugs.filter((s) => s !== choisi);
      choisi = autres[Math.floor(Math.random() * autres.length)];
    }

    precedent.current = choisi;
    router.push(`/marques/${choisi}`);
  }

  return (
    <button
      type="button"
      onClick={tirer}
      disabled={slugs.length === 0}
      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-white px-5 text-[13px] font-extrabold text-[var(--color-ink)] transition hover:bg-white/90 active:scale-[.97] disabled:opacity-50"
    >
      Tirer une marque
    </button>
  );
}
