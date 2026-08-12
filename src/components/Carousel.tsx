"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carrousel à défilement natif.
 *
 * La version précédente remplaçait l'adresse d'une seule image. Sur
 * téléphone, cela voulait dire : pas de glissement du doigt, un blanc
 * à chaque changement le temps que la nouvelle image se charge, et
 * aucun élan. Ici, toutes les images sont réellement présentes côte à
 * côte dans une bande qu'on fait défiler.
 *
 * C'est le navigateur qui gère le geste, l'inertie et l'aimantation —
 * il le fait mieux que n'importe quel code, et sans rien écouter en
 * permanence. On ne lit la position que pour allumer la bonne pastille.
 */
export default function Carousel({
  images,
  alt,
  className = "",
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const bande = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const relire = useCallback(() => {
    const el = bande.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    const el = bande.current;
    if (!el) return;
    el.addEventListener("scroll", relire, { passive: true });
    return () => el.removeEventListener("scroll", relire);
  }, [relire]);

  if (images.length === 0) return null;

  const clamped = Math.min(index, images.length - 1);

  function aller(n: number) {
    const el = bande.current;
    if (!el) return;
    const cible = (n + images.length) % images.length;
    el.scrollTo({ left: cible * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={bande}
        /*
         * `pan-x pan-y`, et les deux sont indispensables.
         *
         * Il n'y avait que `pan-y`, ce qui voulait dire : le navigateur
         * ne prend en charge que le geste vertical sur cet élément. Le
         * geste horizontal n'était donc transmis à personne, et le
         * carrousel refusait de tourner au doigt. C'est le défaut
         * constaté sur téléphone.
         *
         * Avec les deux axes déclarés, le navigateur reconnaît la
         * direction dominante du geste : horizontal, il fait tourner
         * les images ; vertical, il laisse la page défiler. C'est
         * exactement ce qu'on veut, et c'est lui qui décide, pas nous.
         */
        style={{ touchAction: "pan-x pan-y" }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={src + i} className="visuel w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={i === 0 ? alt : ""}
              /* La première est celle qu'on voit tout de suite : elle
                 se charge sans attendre, les autres à l'approche. */
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="block w-full"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/*
            `z-10` n'est pas décoratif : sans lui, ces boutons ne
            servaient à rien sur ordinateur.

            Les images portent `z-index: 1` — c'est ce qui les fait
            passer devant le dégradé d'attente pendant leur chargement.
            Les flèches, elles, n'avaient aucun rang, donc zéro. Une
            image opaque et large comme la bande se posait donc par
            dessus : on la faisait glisser au doigt sans problème, mais
            le clic sur la flèche atterrissait sur l'image. Le geste
            marchait, le bouton non, exactement comme constaté.
          */}
          <button
            type="button"
            onClick={() => aller(clamped - 1)}
            aria-label="Image précédente"
            className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-[18px] font-black text-white backdrop-blur-sm transition hover:bg-black/55 sm:grid"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => aller(clamped + 1)}
            aria-label="Image suivante"
            className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-[18px] font-black text-white backdrop-blur-sm transition hover:bg-black/55 sm:grid"
          >
            ›
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => aller(i)}
                aria-label={`Image ${i + 1} sur ${images.length}`}
                aria-current={i === clamped}
                className={`h-1.5 rounded-full transition-all ${
                  i === clamped ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
