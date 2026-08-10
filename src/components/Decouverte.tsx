"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Brand } from "@/lib/types";

/**
 * « Découvre de nouvelles marques ! »
 *
 * Une bande qui défile toute seule, de la gauche vers la droite. Rien
 * à ouvrir, rien à cliquer pour voir : c'est un présentoir, pas un
 * menu. Chaque geste demandé en plus est un visiteur perdu.
 *
 * L'ordre est tiré au sort. La mise en avant est éditoriale et
 * assumée ailleurs sur la page ; ici personne n'est favorisé — c'est
 * le seul endroit du site où une marque arrivée hier a exactement les
 * mêmes chances d'être vue qu'une autre.
 */

const COMBIEN = 14;

function melanger<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function Vignette({ brand }: { brand: Brand }) {
  const visuel = brand.cover_url ?? brand.logo_url;
  // Un logo se montre en entier, une photo se recadre. Voir BrandCard.
  const estUnLogo = !brand.cover_url && Boolean(brand.logo_url);

  return (
    <Link
      href={`/marques/${brand.slug}`}
      className="card-light w-[38vw] max-w-[190px] shrink-0 overflow-hidden sm:w-[190px]"
    >
      <span className="relative z-3 block">
        <span className="visuel block aspect-4/3 w-full overflow-hidden">
          {visuel ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={visuel}
              alt={estUnLogo ? brand.name : ""}
              loading="lazy"
              decoding="async"
              className={`h-full w-full ${estUnLogo ? "object-contain p-4" : "object-cover"}`}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#a795c9]">
              {brand.name}
            </span>
          )}
        </span>
        <span className="block p-3">
          <span className="block truncate text-[13px] font-extrabold text-[var(--color-ink)]">
            {brand.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-bold uppercase tracking-[0.1em] text-[#6a5a92]">
            {[brand.city, brand.country].filter(Boolean).join(" · ") || "Indépendante"}
          </span>
        </span>
      </span>
    </Link>
  );
}

export default function Decouverte({ brands }: { brands: Brand[] }) {
  /*
   * Le premier rendu est volontairement dans l'ordre reçu, identique
   * sur le serveur et dans le navigateur. Le tirage vient juste après,
   * une fois la page adoptée par React : un Math.random() joué des
   * deux côtés donnerait deux ordres différents.
   */
  const [tirage, setTirage] = useState<Brand[]>(() => brands.slice(0, COMBIEN));

  useEffect(() => {
    setTirage(melanger(brands).slice(0, COMBIEN));
  }, [brands]);

  if (brands.length === 0) return null;

  // Assez lent pour qu'on ait le temps de lire un nom au passage.
  const duree = Math.max(26, tirage.length * 4.5);

  return (
    <section className="py-6">
      <div className="glass overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4 pb-3 sm:px-6 sm:pt-5">
          <p className="m-0 text-[clamp(15px,3.6vw,19px)] font-extrabold tracking-[-0.01em] text-white">
            Découvre de nouvelles marques !
          </p>
          <Link
            href="/marques"
            className="text-[12.5px] font-bold text-white/75 underline underline-offset-4 transition hover:text-white"
          >
            Tout l&apos;annuaire
          </Link>
        </div>

        {/*
          Le ruban est doublé. C'est ce qui rend le défilement sans
          fin : la piste glisse d'exactement une moitié, et au moment
          où l'animation reboucle, la seconde copie se trouve pile là
          où était la première. La couture est invisible.
        */}
        <div className="ruban px-4 pb-4 sm:px-6 sm:pb-5">
          <div className="piste flex w-max" style={{ animationDuration: `${duree}s` }}>
            {/* Deux moitiés STRICTEMENT identiques, chacune avec son
                espace final. C'est la condition pour que le retour à
                zéro passe inaperçu : la piste glisse d'exactement 50 %
                de sa largeur, donc la seconde copie doit se retrouver
                pile là où était la première. Avec un espacement posé
                sur la piste entière, il manquait un demi-écart au
                bouclage, et la couture se voyait à chaque tour. */}
            {[0, 1].map((copie) => (
              <div key={copie} aria-hidden={copie === 1} className="flex shrink-0 gap-3 pr-3">
                {tirage.map((b) => (
                  <Vignette key={`${copie}-${b.id}`} brand={b} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
