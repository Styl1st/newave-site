import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, formatPrice } from "@/lib/types";

/**
 * Renvoie vers la fiche interne de la pièce quand elle existe, sinon
 * directement vers la boutique — plutôt que de fabriquer un lien mort.
 */
function ProductLink({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function ProductCard({
  product,
  brandSlug,
  showBrand = false,
}: {
  product: Product;
  /** Slug de la marque, pour construire le lien vers la fiche. */
  brandSlug?: string;
  showBrand?: boolean;
}) {
  const price = formatPrice(product.price_cents, product.currency);
  const was = formatPrice(product.compare_at_cents, product.currency);
  const off = discountPercent(product);
  const cover = product.images?.[0] ?? product.image_url;

  const slug = brandSlug ?? product.brand?.slug;
  const internal = Boolean(slug && product.slug);
  const href = internal ? `/marques/${slug}/${product.slug}` : product.shop_url;

  return (
    <div className="card-light group overflow-hidden">
      <div className="relative z-3">
        <ProductLink href={href} external={!internal} className="block">
          <div className="relative aspect-square w-full overflow-hidden bg-[#e6dcfb]">
            {cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cover}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7bab]">
                  Visuel à venir
                </span>
              </div>
            )}

            {off !== null && (
              <span className="absolute left-2.5 top-2.5 rounded-full bg-[#c2273f] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                −{off}%
              </span>
            )}
            {!product.available && (
              <span className="absolute right-2.5 top-2.5 rounded-full bg-[rgba(23,10,51,0.85)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Épuisé
              </span>
            )}
          </div>
        </ProductLink>

        <div className="p-4">
          {showBrand && product.brand && (
            <Link
              href={`/marques/${product.brand.slug}`}
              className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92] hover:text-[var(--color-ink)]"
            >
              {product.brand.name}
            </Link>
          )}

          <ProductLink href={href} external={!internal}>
            <h3 className="m-0 mt-1 text-[14px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-ink)]">
              {product.name}
            </h3>
          </ProductLink>

          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-[13.5px] font-extrabold text-[var(--color-ink)]">
              {price ?? "Prix sur la boutique"}
            </span>
            {was && off !== null && (
              <span className="text-[12px] font-semibold text-[#8a7bab] line-through">{was}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
