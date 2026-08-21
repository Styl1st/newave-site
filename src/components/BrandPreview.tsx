"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Portal from "./Portal";
import { discountPercent, formatPrice } from "@/lib/types";
import { jeuDeVignettes, vignette } from "@/lib/vignette";

export type PreviewProduct = {
  id: string;
  slug: string | null;
  name: string;
  price_cents: number | null;
  compare_at_cents: number | null;
  currency: string;
  available: boolean;
  image: string | null;
};

export type PreviewData = {
  brand: { name: string; slug: string; tagline: string };
  total: number;
  products: PreviewProduct[];
};

/**
 * Panneau d'apercu ouvert par survol prolonge sur une carte de marque.
 * Volontairement en lecture seule : il donne envie d'entrer, il ne
 * remplace pas la fiche.
 */
export default function BrandPreview({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);

    fetch(`/api/marques/${slug}/pieces`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: PreviewData) => alive && setData(json))
      .catch(() => alive && setFailed(true));

    return () => {
      alive = false;
    };
  }, [slug]);

  // Échap ferme, et on bloque le défilement de la page derrière.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <Portal>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data ? `Pièces de ${data.brand.name}` : "Aperçu des pièces"}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      /* Le voile prend un peu plus de temps qu'avant : à dix-huit
         centièmes il apparaissait d'un coup, et l'œil lisait ça comme
         un à-coup au moment même où le panneau se met en route. */
      style={{ animation: "fadeIn .3s ease both" }}
    >
      {/* Le voile prend la teinte de l'ambiance au centre et
          s'assombrit sur les bords : la page reste devinée derrière,
          et le panneau semble éclairer ce qu'il recouvre plutôt que
          d'être posé sur un aplat gris. */}
      <div
        className="absolute inset-0 backdrop-blur-lg"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, rgba(var(--voile), .62) 0%, rgba(10, 3, 34, .84) 70%)",
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="panneau-apercu relative flex max-h-[86svh] w-full max-w-4xl flex-col overflow-hidden"
        /*
         * Plus long et plus souple qu'avant. La courbe démarre vite et
         * se pose très progressivement : c'est ce qui donne l'impression
         * d'un objet qui arrive plutôt que d'un calque dont on monte
         * l'opacité.
         *
         * `will-change` prévient le navigateur de préparer son calque
         * AVANT le premier mouvement. Sans lui, la première image du
         * panneau sert à le fabriquer, et c'est elle qu'on voit sauter.
         */
        style={{
          animation: "apercuEntree .52s cubic-bezier(.16,1,.3,1) both",
          willChange: "transform, opacity",
        }}
      >
        {/* ---- en-tête ---- */}
        <div className="apercu-entete relative flex items-start justify-between gap-4 border-b border-white/12 p-6 sm:px-8">
          <div className="min-w-0">
            <p className="eyebrow m-0">Aperçu</p>
            <h2 className="m-0 mt-1.5 truncate text-[clamp(17px,3.6vw,23px)] font-extrabold tracking-[-0.025em] text-white">
              {data?.brand.name ?? "…"}
            </h2>
            {data && (
              <p className="m-0 mt-1 truncate text-[13px] text-white/70">{data.brand.tagline}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition hover:rotate-90 hover:bg-white hover:text-[var(--color-ink)]"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* ---- contenu ---- */}
        <div className="apercu-defilement flex-1 overflow-y-auto p-4 sm:p-7">
          {failed && (
            <p className="m-0 text-center text-[14.5px] text-white/80">
              Impossible de charger les pièces pour l&apos;instant.
            </p>
          )}

          {!data && !failed && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  /* Le retard décale aussi les squelettes : sans lui, huit
                     rectangles pulsent à l'unisson et l'on croit à un
                     bug d'affichage plutôt qu'à un chargement. */
                  className="aspect-square animate-pulse rounded-[14px] bg-white/10"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
          )}

          {data && data.products.length === 0 && (
            <p className="m-0 text-center text-[14.5px] text-white/80">
              Aucune pièce publiée pour cette marque.
            </p>
          )}

          {data && data.products.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.products.map((p, i) => {
                const off = discountPercent(p);
                const price = formatPrice(p.price_cents, p.currency);
                const was = formatPrice(p.compare_at_cents, p.currency);
                const href = p.slug
                  ? `/marques/${data.brand.slug}/${p.slug}`
                  : `/marques/${data.brand.slug}`;

                return (
                  <Link
                    key={p.id}
                    href={href}
                    onClick={onClose}
                    className="apercu-carreau group block"
                    /* Le retard est plafonné à douze vignettes : au-delà,
                       une grille qui se remplit n'est plus élégante, elle
                       est lente, et c'est la dernière ligne qu'on attend
                       en regardant l'écran sans rien faire. */
                    /* Décalage raccourci : la grille entière se pose en
                       moins d'un tiers de seconde au lieu de se dérouler
                       vignette par vignette sous les yeux. */
                    style={{ animationDelay: `${60 + Math.min(i, 11) * 22}ms` }}
                  >
                    <div className="apercu-cadre relative aspect-square overflow-hidden rounded-[14px] bg-white/10">
                      {p.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={vignette(p.image, 320)}
                          srcSet={jeuDeVignettes(p.image, 320)}
                          sizes="(max-width: 640px) 45vw, 220px"
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                        />
                      )}
                      {off !== null && (
                        <span className="absolute left-2 top-2 rounded-full bg-[#c2273f] px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-white">
                          −{off}%
                        </span>
                      )}
                      {!p.available && (
                        <span className="absolute inset-x-0 bottom-0 bg-[rgba(20,8,50,0.75)] py-1.5 text-center text-[9.5px] font-black uppercase tracking-[0.1em] text-white">
                          Épuisé
                        </span>
                      )}
                    </div>

                    <p className="m-0 mt-2 truncate text-[12.5px] font-bold text-white">
                      {p.name}
                    </p>
                    <p className="m-0 mt-0.5 flex items-baseline gap-1.5 text-[12px]">
                      <span className="font-extrabold text-white/90">{price ?? "Prix sur la boutique"}</span>
                      {was && off !== null && (
                        <span className="text-white/45 line-through">{was}</span>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- pied ---- */}
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/12 bg-[rgba(8,2,30,0.38)] p-5 sm:px-8">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
              {data.total} pièce{data.total > 1 ? "s" : ""}
              {data.total > data.products.length && ` · ${data.products.length} affichées`}
            </p>
            <Link href={`/marques/${data.brand.slug}`} className="card-light px-5 py-2.5">
              <span className="relative z-3 text-[13px] font-extrabold">Voir la marque</span>
            </Link>
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
