import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrand, getBrands } from "@/lib/queries";
import { PRICE_TIER_LABEL } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((b) => ({ slug: b.slug }));
}

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

  const facts: [string, string | null][] = [
    ["Origine", [brand.city, brand.country].filter(Boolean).join(", ") || null],
    ["Fondée en", brand.founded_year ? String(brand.founded_year) : null],
    ["Gamme de prix", PRICE_TIER_LABEL[brand.price_tier]],
    ["Instagram", brand.instagram ? `@${brand.instagram}` : null],
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-[var(--pad)] py-12">
      <Link href="/marques" className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:text-white">
        ← Toutes les marques
      </Link>

      <header className="rise mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[clamp(28px,7vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            {brand.name}
          </h1>
          {brand.featured && <span className="badge">À la une</span>}
        </div>
        <p className="m-0 mt-3 text-[clamp(15px,4vw,19px)] leading-relaxed text-white/88">
          {brand.tagline}
        </p>
      </header>

      <div className="glass rise rise-1 mt-8 p-6 sm:p-8">
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
            <span key={c} className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Sortie vers la marque. C'est ici que se branchera le lien d'affiliation :
          on passera l'URL par /api/go?brand=slug pour compter le clic. */}
      {(brand.shop_url || brand.website_url) && (
        <a
          href={brand.shop_url ?? brand.website_url ?? "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="card-light rise rise-2 mt-6 flex items-center justify-between gap-4 px-6 py-5"
        >
          <span className="relative z-3">
            <span className="block text-[15px] font-extrabold tracking-[-0.01em]">
              Découvrir la boutique
            </span>
            <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              Tu quittes NEWAVE SPHERE
            </span>
          </span>
          <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
        </a>
      )}
    </div>
  );
}
