"use client";

import Link from "next/link";
import { useState } from "react";
import BrandPreview from "./BrandPreview";
import CouvertureAnimee from "./CouvertureAnimee";
import FavoriteButton from "./FavoriteButton";
import IllustrationMarque from "./IllustrationMarque";
import Teinte from "./Teinte";
import { IconExternal } from "./Icons";
import { vignette } from "@/lib/vignette";
import { ACCES_ETIQUETTE, unAcces } from "@/lib/acces";
import type { Brand } from "@/lib/types";

/**
 * La marque mise en avant sur l'accueil, en grand.
 *
 * C'est la même matière que les cartes de l'annuaire — `card-light`,
 * liseré chromé, bandeau teinté par l'image — mais en seize-neuvièmes
 * et avec de la place pour dire quelque chose. Une carte d'annuaire
 * nomme ; celle-ci présente.
 *
 * LE VISUEL PASSE PAR `IllustrationMarque`, comme dans l'annuaire :
 * l'illustration d'abord, puis les pièces qui défilent. C'est ce qui
 * évite le pire cas d'une mise en avant, une grande image vide pour une
 * marque qui n'a pas de couverture alors que ses pièces sont belles.
 *
 * TROIS SORTIES, ET ELLES NE SE MARCHENT PAS DESSUS : la boutique de la
 * marque (hors du site, en haut), l'aperçu de ses pièces (sans quitter
 * la page, en bas) et sa fiche (toute la carte est cliquable). Le cœur
 * garde son propre clic.
 */
export default function MarqueDeLaSemaine({
  brand,
  favori,
}: {
  brand: Brand;
  /** Présent = on affiche le cœur, avec son état de départ. */
  favori?: { initial: boolean };
}) {
  const [apercu, setApercu] = useState(false);

  /* Même règle que dans l'annuaire : le logo EST l'identité, la
     couverture n'est souvent que la photo d'une pièce prise au hasard
     du catalogue. Voir `BrandCard`. */
  const visuel = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  const acces = unAcces(brand.acces);
  const etiquetteAcces = acces === "ouvert" ? null : ACCES_ETIQUETTE[acces];
  const boutique = brand.shop_url ?? brand.website_url;

  const meta = [
    [brand.city, brand.country].filter(Boolean).join(" · "),
    brand.categories.slice(0, 2).join(" · "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card-light relative flex flex-col overflow-hidden">
      {/* Le lien passe DERRIÈRE la carte plutôt que de l'entourer : un
          bouton ne peut pas vivre dans un lien, et il y en a trois ici. */}
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      <Teinte src={visuel} />

      <div className="pointer-events-none relative z-3 flex flex-1 flex-col">
        <div className="relative aspect-16/9 w-full overflow-hidden rounded-t-[var(--radius)] bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]">
          {brand.cover_video_url ? (
            <CouvertureAnimee
              video={brand.cover_video_url}
              affiche={vignette(brand.cover_url, 900)}
              className="h-full w-full object-cover"
            />
          ) : (
            <IllustrationMarque
              source={visuel}
              estUnLogo={estUnLogo}
              slug={brand.slug}
              nom={brand.name}
            />
          )}

          <span className="badge absolute left-4 top-4">À la une</span>

          {/*
            LE LOGO EN PASTILLE SEULEMENT S'IL N'EST PAS DÉJÀ LE VISUEL.
            Sinon on affiche deux fois la même image, la petite posée sur
            la grande, et la carte a l'air d'un montage raté.
          */}
          {brand.logo_url && brand.cover_url && (
            /* Deux enveloppes, et la seconde n'est pas décorative :
               `plaque-logo` pose son propre fond ET sa propre ombre
               intérieure hors des couches Tailwind, donc une ombre
               portée écrite à côté d'elle serait ignorée. Elle est
               portée par le parent. */
            <span className="absolute bottom-4 left-4 rounded-[18px] shadow-[0_8px_22px_rgba(52,18,110,0.28)]">
              <span className="plaque-logo grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-[18px] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vignette(brand.logo_url, 220, { logo: true })}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </span>
            </span>
          )}

          {/* La boutique est chez la marque, jamais chez nous : le lien
              sort du site, et il le montre. Une boutique fermée renvoie
              vers la fiche, qui explique pourquoi. */}
          {boutique && acces === "ouvert" ? (
            <a
              href={boutique}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="pointer-events-auto absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-[rgba(14,5,38,0.72)] px-4 py-2.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm transition hover:bg-[rgba(14,5,38,0.92)] active:scale-95"
            >
              Voir la boutique
              <IconExternal className="h-3.5 w-3.5" />
            </a>
          ) : (
            etiquetteAcces && (
              <span className="absolute bottom-4 right-4 rounded-full bg-[rgba(14,5,38,0.72)] px-4 py-2.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                {etiquetteAcces}
              </span>
            )
          )}
        </div>

        {/* Le bandeau prend la couleur de l'image au-dessus. Voir `Teinte`. */}
        <div className="pied-carte flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="m-0 text-[clamp(19px,4.4vw,24px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--color-ink)]">
            {brand.name}
          </h3>

          {meta && (
            <p className="m-0 mt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              {meta}
            </p>
          )}

          {brand.tagline && (
            <p className="m-0 mt-3 max-w-[52ch] text-[14.5px] leading-[1.6] text-[#4a3d6e]">
              {brand.tagline}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setApercu(true)}
              aria-label={`Aperçu des pièces de ${brand.name}`}
              /* 44px de haut au doigt, comme tous les boutons de la
                 refonte : le gabarit en donnait 36. */
              className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 text-[11px] font-black uppercase tracking-[0.1em] text-white transition hover:opacity-90 active:scale-95"
            >
              {/* Un œil : le mot seul ne dit pas qu'on va regarder sans
                  quitter la page. Même dessin que dans l'annuaire. */}
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.1}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.6" />
              </svg>
              Aperçu
            </button>

            <Link
              href={`/marques/${brand.slug}`}
              className="pointer-events-auto inline-flex min-h-[44px] items-center text-[13px] font-bold text-[#3a2470] underline decoration-[#3a2470]/40 underline-offset-4 transition hover:decoration-[#3a2470]"
            >
              La fiche complète
            </Link>

            {favori && (
              <span className="pointer-events-auto ml-auto">
                <FavoriteButton
                  brandId={brand.id}
                  initial={favori.initial}
                  etiquette={brand.name}
                  taille="claire"
                />
              </span>
            )}
          </div>
        </div>
      </div>

      {apercu && <BrandPreview slug={brand.slug} onClose={() => setApercu(false)} />}
    </div>
  );
}
