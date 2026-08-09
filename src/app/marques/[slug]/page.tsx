import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogueNotice from "@/components/CatalogueNotice";
import FavoriteButton from "@/components/FavoriteButton";
import Grille from "@/components/Grille";
import SectionAvis from "@/components/SectionAvis";
import PostCard from "@/components/PostCard";
import ProductCard from "@/components/ProductCard";
import { getBrand, getBrandBrouillon, getPostsByBrand, getProductsByBrand } from "@/lib/queries";
import { isFavorite } from "@/lib/favorites";
import { getCatalogueInsight } from "@/lib/brand-space";
import { getLikeCounts, getMyLikes } from "@/lib/likes";
import { PRICE_TIER_LABEL } from "@/lib/types";
import Link from "next/link";
import BackLink from "@/components/BackLink";

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

  // Publiée pour tout le monde, sinon en brouillon pour qui en a le
  // droit — ce sont les règles RLS qui décident, pas ce fichier.
  const brand = (await getBrand(slug)) ?? (await getBrandBrouillon(slug));
  if (!brand) notFound();

  const enApercu = brand.status !== "published";

  const [products, posts, favorited, insight] = await Promise.all([
    getProductsByBrand(brand.id),
    getPostsByBrand(brand.id),
    isFavorite(brand.id),
    getCatalogueInsight(brand.id),
  ]);

  const ids = products.map((p) => p.id);
  const [likeCounts, myLikes] = await Promise.all([getLikeCounts(ids), getMyLikes(ids)]);

  const facts: [string, string | null][] = [
    ["Origine", [brand.city, brand.country].filter(Boolean).join(", ") || null],
    ["Fondée en", brand.founded_year ? String(brand.founded_year) : null],
    ["Gamme de prix", PRICE_TIER_LABEL[brand.price_tier]],
    ["Instagram", brand.instagram ? `@${brand.instagram}` : null],
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-7 sm:py-11">
      {enApercu && (
        <div className="glass mb-6 flex flex-wrap items-center justify-between gap-3 border-white/45 p-4 sm:px-5">
          <p className="m-0 text-[13.5px] leading-relaxed text-white/88">
            <strong className="font-extrabold text-white">Aperçu.</strong> Voici ce que
            verra la communauté. Cette page n&apos;est pas encore publique. Personne
            d&apos;autre que toi ne peut y accéder.
          </p>
          <Link
            href={`/espace-marque/${brand.slug}`}
            className="shrink-0 rounded-full border border-white/40 bg-white/8 px-4 py-2 text-[12px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            Continuer à modifier
          </Link>
        </div>
      )}

      <BackLink href="/marques">Toutes les marques</BackLink>

      <header className="rise mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[clamp(24px,5.6vw,39px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
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

      <div className="glass rise rise-1 mt-6 p-4 sm:p-7">
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
        <section className="rise rise-2 mt-8 sm:mt-11">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow m-0">Le catalogue</p>
              <h2 className="m-0 mt-2 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
                Les pièces
              </h2>
            </div>
          </div>

          <Grille
            variante="pieces"
            memoire="pieces-marque"
            aside={
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                {products.length} pièce{products.length > 1 ? "s" : ""}
              </p>
            }
          >
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                brandSlug={brand.slug}
                canManage={Boolean(insight)}
                likes={{ count: likeCounts.get(p.id) ?? 0, liked: myLikes.has(p.id) }}
              />
            ))}
          </Grille>

          <p className="m-0 mt-5 text-[12.5px] leading-relaxed text-white/55">
            L&apos;achat se fait directement chez {brand.name}. NEWAVE SPHERE ne vend rien.
          </p>
        </section>
      )}

      {(brand.shop_url || brand.website_url) && (
        <a
          href={`/api/go/marque/${brand.id}`}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          data-reveal
          className="card-light mt-8 flex items-center justify-between gap-4 px-6 py-5"
        >
          <span className="relative z-3">
            <span className="block text-[15px] font-extrabold tracking-[-0.01em]">
              {products.length > 0
                ? `Voir toute la boutique ${brand.name}`
                : `Découvrir la boutique ${brand.name}`}
            </span>
            <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              Tu quittes NEWAVE SPHERE
            </span>
          </span>
          <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
        </a>
      )}

      {/* ---------- revendication ----------
          Visible seulement pour qui ne gère pas déjà la marque : le
          fondateur qui découvre sa page doit pouvoir la réclamer sans
          chercher notre adresse email. */}
      {!insight && (
        <section className="glass mt-10 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
          <p className="m-0 max-w-xl text-[13.5px] leading-relaxed text-white/72">
            Tu es à la tête de {brand.name} ? Reprends la main sur cette page :
            présentation, visuels, catalogue.
          </p>
          <Link
            href={`/marques/${brand.slug}/revendiquer`}
            className="shrink-0 rounded-full border border-white/40 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            C&apos;est ma marque
          </Link>
        </section>
      )}

      <SectionAvis
        cible="marque"
        cibleId={brand.id}
        nom={brand.name}
        chemin={`/marques/${brand.slug}`}
      />

      {/* ---------- posts lies ---------- */}
      {posts.length > 0 && (
        <section className="mt-9 sm:mt-12">
          <h2 className="m-0 mb-5 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
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
