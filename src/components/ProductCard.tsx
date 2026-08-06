import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";

export default function ProductCard({
  product,
  showBrand = false,
}: {
  product: Product;
  showBrand?: boolean;
}) {
  const price = formatPrice(product.price_cents, product.currency);

  return (
    <div className="card-light group overflow-hidden">
      <div className="relative z-3">
        <a
          href={product.shop_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block"
        >
          <div className="relative aspect-square w-full overflow-hidden bg-[#e6dcfb]">
            {product.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.image_url}
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
          </div>
        </a>

        <div className="p-4">
          {showBrand && product.brand && (
            <Link
              href={`/marques/${product.brand.slug}`}
              className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92] hover:text-[var(--color-ink)]"
            >
              {product.brand.name}
            </Link>
          )}
          <a href={product.shop_url} target="_blank" rel="noopener noreferrer sponsored">
            <h3 className="m-0 mt-1 text-[14px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-ink)]">
              {product.name}
            </h3>
          </a>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[13.5px] font-extrabold text-[var(--color-ink)]">
              {price ?? "Prix sur la boutique"}
            </span>
            <a
              href={product.shop_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6a5a92] underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              Voir
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
