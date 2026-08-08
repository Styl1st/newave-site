import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Carousel from "@/components/Carousel";
import ProductCard from "@/components/ProductCard";
import { getProduct, getProductsByBrand } from "@/lib/queries";
import { getCatalogueInsight } from "@/lib/brand-space";
import { IconPencil } from "@/components/Icons";
import { discountPercent, formatPrice } from "@/lib/types";
import BackLink from "@/components/BackLink";

type Props = { params: Promise<{ slug: string; piece: string }> };

/** Rendue à la demande : prix et disponibilités changent chez la marque. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, piece } = await params;
  const found = await getProduct(slug, piece);
  if (!found) return { title: "Pièce introuvable" };

  const { product, brand } = found;
  const price = formatPrice(product.price_cents, product.currency);

  return {
    title: `${product.name} — ${brand.name}`,
    description: product.description.slice(0, 160) || `${product.name}, ${brand.name}${price ? `, ${price}` : ""}`,
    openGraph: {
      title: `${product.name} — ${brand.name}`,
      description: product.description.slice(0, 160),
      images: product.images?.[0] ?? product.image_url ?? undefined,
    },
  };
}

export default async function PiecePage({ params }: Props) {
  const { slug, piece } = await params;
  const found = await getProduct(slug, piece);
  if (!found) notFound();

  const { product, brand } = found;
  const images = product.images?.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : [];

  const price = formatPrice(product.price_cents, product.currency);
  const was = formatPrice(product.compare_at_cents, product.currency);
  const off = discountPercent(product);

  // Les autres pièces de la marque, sans celle qu'on regarde.
  const [siblingsAll, insight] = await Promise.all([
    getProductsByBrand(brand.id),
    getCatalogueInsight(brand.id),
  ]);
  const siblings = siblingsAll.filter((p) => p.id !== product.id).slice(0, 4);
  const canManage = Boolean(insight);

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink href={`/marques/${brand.slug}`}>{brand.name}</BackLink>

        {canManage && (
          <Link
            href={`/espace-marque/${brand.slug}/pieces/${product.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/8 px-4 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97]"
          >
            <IconPencil /> Modifier cette pièce
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        {/* ---------- visuels ---------- */}
        <div className="card-light rise overflow-hidden lg:sticky lg:top-6">
          <div className="relative z-3">
            {images.length > 0 ? (
              <Carousel images={images} alt={product.name} />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-[#e6dcfb]">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7bab]">
                  Visuel à venir
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ---------- informations ---------- */}
        <div className="rise rise-1 flex flex-col gap-6">
          <header>
            <Link
              href={`/marques/${brand.slug}`}
              className="eyebrow transition hover:text-white"
            >
              {brand.name}
            </Link>
            <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,36px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-[clamp(20px,4.5vw,26px)] font-extrabold text-white">
                {price ?? "Prix sur la boutique"}
              </span>
              {was && off !== null && (
                <>
                  <span className="text-[16px] font-semibold text-white/55 line-through">{was}</span>
                  <span className="rounded-full bg-[#c2273f] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white">
                    −{off}%
                  </span>
                </>
              )}
              {!product.available && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/80">
                  Épuisé
                </span>
              )}
            </div>
          </header>

          {/* ---------- tailles ---------- */}
          {product.sizes.length > 0 && (
            <section className="glass p-5 sm:p-6">
              <p className="eyebrow m-0">{product.size_label}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <span
                    key={size.label}
                    className={
                      size.available
                        ? "rounded-[11px] border border-white/45 px-3.5 py-2 text-[13px] font-bold text-white"
                        : "rounded-[11px] border border-white/15 px-3.5 py-2 text-[13px] font-bold text-white/35 line-through"
                    }
                  >
                    {size.label}
                  </span>
                ))}
              </div>
              <p className="m-0 mt-3 text-[12px] leading-relaxed text-white/55">
                Les tailles barrées ne sont plus disponibles chez la marque.
              </p>
            </section>
          )}

          {/* ---------- achat ---------- */}
          <a
            href={`/api/go/piece/${product.id}`}
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            className="card-light flex items-center justify-between gap-4 px-6 py-5"
          >
            <span className="relative z-3">
              <span className="block text-[15px] font-extrabold tracking-[-0.01em]">
                {product.available ? `Acheter chez ${brand.name}` : "Voir la fiche chez la marque"}
              </span>
              <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
                Tu quittes NEWAVE SPHERE
              </span>
            </span>
            <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
          </a>

          {/* ---------- description ---------- */}
          {product.description && (
            <section className="glass p-5 sm:p-6">
              <p className="eyebrow m-0">La pièce</p>
              <p className="m-0 mt-3 whitespace-pre-line text-[15px] leading-[1.7] text-white/90">
                {product.description}
              </p>
            </section>
          )}

          {product.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <p className="m-0 text-[12.5px] leading-relaxed text-white/55">
            Le prix, les tailles et la disponibilité sont ceux communiqués par
            {" "}{brand.name}. Ils peuvent avoir changé depuis notre dernière mise à jour —
            la boutique fait foi.
          </p>
        </div>
      </div>

      {/* ---------- autres pièces ---------- */}
      {siblings.length > 0 && (
        <section className="mt-16">
          <h2 className="m-0 mb-5 text-[clamp(20px,4.6vw,26px)] font-extrabold tracking-[-0.02em] text-white">
            Aussi chez {brand.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {siblings.map((p) => (
              <ProductCard key={p.id} product={p} brandSlug={brand.slug} canManage={canManage} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
