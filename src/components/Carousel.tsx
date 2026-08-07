"use client";

import { useState } from "react";

/**
 * Carrousel simple : defilement horizontal, pastilles de position,
 * fleches au survol. Pas de dependance, pas de JavaScript au chargement.
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
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;

  const clamped = Math.min(index, images.length - 1);
  const go = (n: number) => setIndex((n + images.length) % images.length);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[clamped]} alt={alt} className="block w-full" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(clamped - 1)}
            aria-label="Image précédente"
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-[18px] font-black text-white backdrop-blur-sm transition hover:bg-black/55"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(clamped + 1)}
            aria-label="Image suivante"
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-[18px] font-black text-white backdrop-blur-sm transition hover:bg-black/55"
          >
            ›
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
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
