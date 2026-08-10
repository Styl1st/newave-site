import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Carousel from "@/components/Carousel";
import LikeButton from "@/components/LikeButton";
import SectionAvis from "@/components/SectionAvis";
import ProductCard from "@/components/ProductCard";
import { getProduct, getProductsByBrand } from "@/lib/queries";
import { getCatalogueInsight } from "@/lib/brand-space";
import { getLikeCounts, getMyLikes } from "@/lib/likes";
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
    title: `${product.name}, par ${brand.name}`,
    description: product.description.slice(0, 160) || `${product.name}, ${brand.name}${price ? `, ${price}` : ""}`,
    openGraph: {
      title: `${product.name}, par ${brand.name}`,
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

  /*
   * Les tailles, dédoublonnées à l'affichage.
   *
   * La lecture des boutiques s'en charge désormais, mais les pièces
   * importées avant la correction portent encore des doublons en base :
   * une pièce en trois couleurs et quatre tailles avait douze
   * variantes, donc « Apricot » quatre fois de suite. React refuse deux
   * enfants de même clé, et la liste affichée n'avait aucun sens.
   *
   * Une taille reste disponible dès qu'une seule de ses variantes
   * l'est. Ce filet coûte trois lignes et évite d'attendre le prochain
   * passage de la mise à jour quotidienne.
   */
  const tailles = Array.from(
    product.sizes.reduce((acc, t) => {
      const label = t.label.trim();
      if (label) acc.set(label, (acc.get(label) ?? false) || t.available);
      return acc;
    }, new Map<string, boolean>()),
    ([label, available]) => ({ label, available })
  );

  // Les autres pièces de la marque, sans celle qu'on regarde.
  const [siblingsAll, insight] = await Promise.all([
    getProductsByBrand(brand.id),
    getCatalogueInsight(brand.id),
  ]);
  const siblings = siblingsAll.filter((p) => p.id !== product.id).slice(0, 4);
  const canManage = Boolean(insight);

  // Le cœur manquait ici : on pouvait aimer une pièce depuis la fiche
  // de la marque, mais pas depuis les suggestions au bas d'une pièce.
  const idsCoeurs = [product.id, ...siblings.map((p) => p.id)];
  const [coeurs, mesCoeurs] = await Promise.all([
    getLikeCounts(idsCoeurs),
    getMyLikes(idsCoeurs),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-7 sm:py-11">
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
        {/* Collant : il a déjà sa propre logique de position, une
            animation de défilement par-dessus le ferait vibrer. */}
        <div data-no-reveal className="card-light rise overflow-hidden lg:sticky lg:top-6">
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
            {/* Le nom de la marque, écrit et non plus cliquable : le
                lien du haut mène déjà exactement au même endroit, et
                deux chemins vers la même page ne se choisissent pas,
                ils se subissent. */}
            <p className="eyebrow m-0">{brand.name}</p>
            <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,31px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-[clamp(17px,3.8vw,23px)] font-extrabold text-white">
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
              {!product.retired_at && !product.available && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/80">
                  Épuisé
                </span>
              )}
            </div>

            {/* Le bandeau qui explique. On ne laisse pas quelqu'un
                cliquer vers une page qui n'existe plus sans l'avoir
                prévenu, et on dit pourquoi la fiche est encore là. */}
            {product.retired_at && (
              <div className="mt-5 rounded-[var(--radius)] border border-white/35 bg-white/12 p-4 sm:px-5">
                <p className="m-0 text-[14px] font-extrabold leading-snug text-white">
                  Cette pièce a été retirée et n&apos;est plus disponible sur le site de{" "}
                  {brand.name}.
                </p>
                <p className="m-0 mt-2 text-[13px] leading-relaxed text-white/72">
                  On garde sa fiche : elle fait partie de ce que la marque a créé, et les
                  coups de cœur qu&apos;elle a reçus lui appartiennent. Retirée le{" "}
                  {new Date(product.retired_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              </div>
            )}

            {/* Aimer la pièce depuis sa propre fiche : c'est l'endroit
                le plus évident, et il manquait. */}
            <div className="mt-4">
              <LikeButton
                productId={product.id}
                initialLiked={mesCoeurs.has(product.id)}
                initialCount={coeurs.get(product.id) ?? 0}
              />
            </div>
          </header>

          {/* ---------- tailles ---------- */}
          {tailles.length > 0 && (
            <section className="glass p-4 sm:p-5">
              <p className="eyebrow m-0">{product.size_label}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tailles.map((size) => (
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

          {/* ---------- achat ----------
              Une pièce retirée n'a plus de page chez la marque : on
              renvoie vers la boutique en général plutôt que vers un
              lien qui finirait sur une erreur. */}
          <a
            href={product.retired_at ? `/api/go/marque/${brand.id}` : `/api/go/piece/${product.id}`}
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            data-reveal
            className="card-light flex items-center justify-between gap-4 px-6 py-5"
          >
            <span className="relative z-3">
              <span className="block text-[15px] font-extrabold tracking-[-0.01em]">
                {product.retired_at
                  ? `Voir ce que propose ${brand.name} aujourd'hui`
                  : product.available
                    ? `Acheter chez ${brand.name}`
                    : "Voir la fiche chez la marque"}
              </span>
              <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
                Tu quittes NEWAVE SPHERE
              </span>
            </span>
            <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
          </a>

          {/* ---------- description ---------- */}
          {product.description && (
            <section className="glass p-4 sm:p-5">
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
            {" "}{brand.name}. Ils peuvent avoir changé depuis notre dernière mise à jour, et
            la boutique fait foi.
          </p>
        </div>
      </div>

      <SectionAvis
        cible="piece"
        cibleId={product.id}
        nom={product.name}
        chemin={`/marques/${brand.slug}/${product.slug}`}
      />

      {/* ---------- autres pièces ---------- */}
      {siblings.length > 0 && (
        <section className="mt-10 sm:mt-14">
          <h2 className="m-0 mb-5 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
            Aussi chez {brand.name}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {siblings.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                brandSlug={brand.slug}
                /* Pas de crayon sur ces quatre vignettes. On modifie une
                   pièce depuis sa propre page, où le bouton est en haut
                   et se voit ; le semer sur chaque suggestion ne fait
                   qu'ajouter du bruit à une section qui sert à
                   regarder, pas à travailler. */
                canManage={false}
                likes={{ count: coeurs.get(p.id) ?? 0, liked: mesCoeurs.has(p.id) }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
