import Link from "next/link";
import { IconPencil } from "./Icons";
import LikeButton from "./LikeButton";
import Etoiles from "./Etoiles";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import type { Product } from "@/lib/types";
import { discountPercent, formatPrice, prixAffiche } from "@/lib/types";

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
  canManage = false,
  likes,
  note,
}: {
  product: Product;
  /** Slug de la marque, pour construire le lien vers la fiche. */
  brandSlug?: string;
  showBrand?: boolean;
  /** Affiche le crayon d'édition. Réservé à l'admin et aux gérants. */
  canManage?: boolean;
  /** Coups de cœur. Absent = le bouton ne s'affiche pas. */
  likes?: { count: number; liked: boolean };
  /**
   * La moyenne des avis.
   *
   * Elle vit sous le nom, et non sur le visuel comme pour une marque :
   * les quatre coins de l'image sont déjà pris par la remise, la
   * mention « épuisé », le crayon et le cœur. Une cinquième pastille
   * aurait transformé la photo en tableau de bord.
   */
  note?: { moyenne: number; avis: number };
}) {
  const prix = prixAffiche(product);
  const was = formatPrice(product.compare_at_cents, product.currency);
  const off = discountPercent(product);
  const cover = product.images?.[0] ?? product.image_url;

  const slug = brandSlug ?? product.brand?.slug;
  const internal = Boolean(slug && product.slug);
  // Sans fiche interne, on sort par le compteur de clics.
  const href = internal ? `/marques/${slug}/${product.slug}` : `/api/go/piece/${product.id}`;

  // Hauteur pleine et colonne : sans ça, un nom sur deux lignes
  // décalait le prix et le cœur d'une carte à l'autre.
  return (
    <div className="card-light group flex h-full flex-col overflow-hidden">
      <div className="relative z-3 flex flex-1 flex-col">
        <ProductLink href={href} external={!internal} className="block">
          <div className="visuel relative aspect-square w-full overflow-hidden rounded-t-[var(--radius)]">
            {cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                /* On demande l'image à la taille où on la montre. Une
                   photo de boutique fait 2000 pixels de large et pèse
                   vingt mégaoctets une fois décodée en mémoire : trente
                   vignettes suffisaient à faire recharger la page sur
                   un téléphone. Voir lib/vignette.ts. */
                src={vignette(cover, 400)}
                srcSet={jeuDeVignettes(cover, 400)}
                sizes="(max-width: 640px) 45vw, 300px"
                alt={product.name}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${
                  product.retired_at ? "opacity-70 grayscale-[.35]" : ""
                }`}
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
            {/* Retirée l'emporte sur épuisée : une pièce qui n'est plus
                sur la boutique ne reviendra pas en stock. */}
            {product.retired_at ? (
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(23,10,51,0.9)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Retirée
              </span>
            ) : (
              !product.available && (
                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(23,10,51,0.85)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                  Épuisé
                </span>
              )
            )}
          </div>
        </ProductLink>

        {canManage && brandSlug && (
          <Link
            href={`/espace-marque/${brandSlug}/pieces/${product.id}`}
            aria-label={`Modifier ${product.name}`}
            title="Modifier cette pièce"
            className="absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-[rgba(20,8,50,0.7)] text-white backdrop-blur-sm transition hover:bg-[rgba(20,8,50,0.95)] active:scale-95"
          >
            <IconPencil className="h-4 w-4" />
          </Link>
        )}

        {/* `piece-infos` sert de prise au mode grille serrée : c'est le
            CSS qui resserre ce bloc, la carte n'a pas à savoir dans
            quelle densité elle est affichée. */}
        <div className="piece-infos flex flex-1 flex-col p-4">
          {showBrand && product.brand && (
            <Link
              href={`/marques/${product.brand.slug}`}
              className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92] hover:text-[var(--color-ink)]"
            >
              {product.brand.name}
            </Link>
          )}

          <ProductLink href={href} external={!internal}>
            <h3 className="m-0 mt-1 line-clamp-2 text-[14px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-ink)]">
              {product.name}
            </h3>
          </ProductLink>

          {/* Jamais la moyenne sans le nombre d'avis : « 5 sur 5 » ne
              veut rien dire tant qu'on ignore si c'est une personne ou
              deux cents. */}
          {note && note.avis > 0 && (
            <span className="mt-1.5 flex items-center gap-1.5">
              <Etoiles note={note.moyenne} taille="petite" />
              <span className="text-[11px] font-bold text-[#6a5a92]">({note.avis})</span>
            </span>
          )}

          <div className="pied mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="prix text-[13.5px] font-extrabold text-[var(--color-ink)]">
                {prix.principal ?? "Prix sur la boutique"}
              </span>
              {/* Le prix réellement demandé par la marque, quand il
                  n'est pas en euros. Notre conversion aide à comparer,
                  elle ne remplace pas ce qui sera payé. */}
              {prix.origine && (
                <span className="text-[11.5px] font-semibold text-[#8a7bab]">{prix.origine}</span>
              )}
              {was && off !== null && (
                <span className="text-[12px] font-semibold text-[#8a7bab] line-through">{was}</span>
              )}
            </span>

            {likes && (
              <LikeButton
                productId={product.id}
                initialLiked={likes.liked}
                initialCount={likes.count}
                taille="compact"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
