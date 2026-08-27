import Link from "next/link";
import { IconPencil } from "./Icons";
import LikeButton from "./LikeButton";
import Etoiles from "./Etoiles";
import Teinte from "./Teinte";
import VignetteDefilante from "./VignetteDefilante";
import { estUneVideo } from "@/lib/medias";
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
  // Le lien posé en calque n'a pas de texte visible : son intitulé doit
  // donc lui être donné, sans quoi un lecteur d'écran annonce « lien »
  // et rien d'autre.
  "aria-label": etiquette,
}: {
  href: string;
  external: boolean;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={className}
        aria-label={etiquette}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} aria-label={etiquette}>
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
  /*
   * Toutes les photos, et non plus la seule première.
   *
   * `images` est le carrousel de la fiche ; `image_url` la vignette
   * retenue pour les listes. Une pièce importée d'une boutique a
   * presque toujours les deux, une pièce saisie à la main parfois
   * seulement la seconde.
   */
  /*
   * ET SEULEMENT LES PHOTOS. Une pièce peut porter une vidéo dans son
   * carrousel, et la fiche sait l'afficher ; une balise `img`, non.
   * Feuilleter jusqu'à elle donnait un cadre cassé au milieu de la
   * série. Elle reste visible sur la fiche, qui a le lecteur qu'il
   * faut.
   */
  const visuels = (product.images?.length ? product.images : [product.image_url])
    .filter((m): m is string => Boolean(m) && !estUneVideo(m));
  const cover = visuels[0];

  const slug = brandSlug ?? product.brand?.slug;
  const internal = Boolean(slug && product.slug);
  // Sans fiche interne, on sort par le compteur de clics.
  const href = internal ? `/marques/${slug}/${product.slug}` : `/api/go/piece/${product.id}`;

  // Hauteur pleine et colonne : sans ça, un nom sur deux lignes
  // décalait le prix et le cœur d'une carte à l'autre.
  return (
    /*
     * `carte-eco` : la carte se retire du travail du navigateur dès
     * qu'elle sort de l'écran. C'est ce qui permet d'en empiler des
     * centaines sans que l'onglet tombe. Voir globals.css.
     */
    <div className="card-light carte-eco group flex h-full flex-col overflow-hidden">
      {/* L'adresse d'origine : `Teinte` en réclame lui-même une version
          minuscule, qu'il ne sert à rien d'aller chercher en grand. */}
      <Teinte src={cover} />

      <div className="relative z-3 flex flex-1 flex-col">
        <div className="visuel relative aspect-square w-full overflow-hidden rounded-t-[var(--radius)]">
            {cover ? (
              /* Les flèches de défilement sont des BOUTONS, et un bouton
                 ne peut pas vivre dans un lien : le navigateur refuse
                 cette imbrication. Le lien vers la fiche est donc posé
                 en calque par-dessus la photo, plus bas, exactement
                 comme sur les cartes de marque. */
              <VignetteDefilante
                images={visuels}
                alt={product.name}
                className={product.retired_at ? "opacity-70 grayscale-[.35]" : ""}
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
          {/*
            LE CŒUR SUR LA PHOTO.
            Il était en bas de la carte, à côté du prix, et il fallait
            donc lire la fiche jusqu'au bout pour le trouver. Or on
            reconnaît une pièce qu'on aime à l'image, pas à son nom :
            le geste appartient à la photo. Quatre coins, quatre rôles,
            comme sur les cartes de marque : la remise en haut à
            gauche, le crayon en haut à droite, l'état en bas à gauche,
            le cœur en bas à droite.

            `z-3` le place au-dessus du lien qui recouvre la photo,
            sans quoi cliquer dessus ouvrirait la fiche.
          */}
          {likes && (
            <div className="absolute bottom-2.5 right-2.5 z-3">
              <LikeButton
                productId={product.id}
                initialLiked={likes.liked}
                initialCount={likes.count}
                taille="pastille"
              />
            </div>
          )}

          {/* Le lien recouvre la photo entière, sous les flèches. Toute
              la vignette reste cliquable, et les flèches gardent leur
              propre clic. */}
          <ProductLink
            href={href}
            external={!internal}
            className="absolute inset-0 z-1"
            aria-label={product.name}
          >
            <span className="sr-only">{product.name}</span>
          </ProductLink>
        </div>

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
        {/* Le bandeau prend la couleur de la photo au-dessus de lui.
            Voir `Teinte` et `.pied-carte`. */}
        <div className="piece-infos pied-carte flex flex-1 flex-col p-4">
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

          </div>
        </div>
      </div>
    </div>
  );
}
