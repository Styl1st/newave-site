import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogueNotice from "@/components/CatalogueNotice";
import FavoriteButton from "@/components/FavoriteButton";
import PostCard from "@/components/PostCard";
import ProductCard from "@/components/ProductCard";
import { getBrand, getPostsByBrand, getProductsByBrand } from "@/lib/queries";
import { isFavorite } from "@/lib/favorites";
import { getCatalogueInsight } from "@/lib/brand-space";
import { PRICE_TIER_LABEL } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

/**
 * Page rendue a la demande, pas figee a la compilation.
 * Elle affiche l'etat "en favori" de la personne connectee, donc elle
 * depend de la session : la pre-generer n'aurait aucun sens, et les
 * marques ajoutees depuis /admin apparaissent immediatement.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return { title: "Marque introuvable" };
  return {
    title: brand.name,
    description: brand.tagline,
    openGraph: { title: brand.name, description: brand.tagline },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const [products, posts, favorited, insight] = await Promise.all([
    getProductsByBrand(brand.id),
    getPostsByBrand(brand.id),
    isFavorite(brand.id),
    getCatalogueInsight(brand.id),
  ]);

  const facts: [string, string | null][] = [
    ["Origine", [brand.city, brand.country].filter(Boolean).join(", ") || null],
    ["Fondée en", brand.founded_year ? String(brand.founded_year) : null],
    ["Gamme de prix", PRICE_TIER_LABEL[brand.price_tier]],
    ["Instagram", brand.instagram ? `@${brand.instagram}` : null],
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-12">
      <Link
        href="/marques"
        className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:text-white"
      >
        ← Toutes les marques
      </Link>

      <header className="rise mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[clamp(28px,7vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            {brand.name}
          </h1>
          {brand.featured && <span className="badge">À la une</span>}
        </div>
        <p className="m-0 mt-3 max-w-2xl text-[clamp(15px,4vw,19px)] leading-relaxed text-white/88">
          {brand.tagline}
        </p>
        <div className="mt-5">
          <FavoriteButton brandId={brand.id} initial={favorited} />
        </div>
      </header>

      {brand.cover_url && (
        <div className="card-light rise rise-1 mt-8 overflow-hidden">
          <div className="relative z-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.cover_url}
              alt=""
              className="block aspect-16/9 w-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="glass rise rise-1 mt-6 p-6 sm:p-8">
        <p className="m-0 whitespace-pre-line text-[15.5px] leading-[1.7] text-white/92">
          {brand.description}
        </p>

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-4">
          {facts.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="eyebrow m-0">{label}</dt>
                <dd className="m-0 mt-1.5 text-[14px] font-bold text-white">{value}</dd>
              </div>
            ) : null
          )}
        </dl>

        <div className="mt-7 flex flex-wrap gap-1.5">
          {brand.categories.map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {insight && (
        <CatalogueNotice
          slug={brand.slug}
          brandName={brand.name}
          brandPublished={brand.status === "published"}
          insight={insight}
        />
      )}

      {/* ---------- les pieces, juste apres la presentation ----------
          C'est ce que le visiteur est venu voir. La sortie vers la
          boutique arrive apres, une fois qu'il a vu de quoi il s'agit. */}
      {products.length > 0 && (
        <section className="rise rise-2 mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow m-0">Le catalogue</p>
              <h2 className="m-0 mt-2 text-[clamp(20px,4.6vw,26px)] font-extrabold tracking-[-0.02em] text-white">
                Les pièces
              </h2>
            </div>
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
              {products.length} pièce{products.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} brandSlug={brand.slug} />
            ))}
          </div>

          <p className="m-0 mt-5 text-[12.5px] leading-relaxed text-white/55">
            L&apos;achat se fait directement chez {brand.name}. NEWAVE SPHERE ne vend rien.
          </p>
        </section>
      )}

      {(brand.shop_url || brand.website_url) && (
        <a
          href={brand.shop_url ?? brand.website_url ?? "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="card-light mt-8 flex items-center justify-between gap-4 px-6 py-5"
        >
          <span className="relative z-3">
            <span className="block text-[15px] font-extrabold tracking-[-0.01em]">
              {products.length > 0 ? "Voir toute la boutique" : "Découvrir la boutique"}
            </span>
            <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              Tu quittes NEWAVE SPHERE
            </span>
          </span>
          <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
        </a>
      )}

      {/* ---------- posts lies ---------- */}
      {posts.length > 0 && (
        <section className="mt-14">
          <h2 className="m-0 mb-5 text-[clamp(20px,4.6vw,26px)] font-extrabold tracking-[-0.02em] text-white">
            Nos posts sur {brand.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
