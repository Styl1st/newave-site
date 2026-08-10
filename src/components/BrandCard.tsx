import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import type { Brand } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";

export default function BrandCard({
  brand,
  favori,
  apercu,
}: {
  brand: Brand;
  /** Présent = on affiche le cœur, avec son état de départ. */
  favori?: { initial: boolean };
  /** Bouton d'aperçu, posé en bas à gauche du visuel. */
  apercu?: React.ReactNode;
}) {
  const visual = brand.cover_url ?? brand.logo_url;

  /*
   * Une photo de couverture se recadre sans dommage : on cherche une
   * ambiance, pas un cadrage précis. Un logo, non — c'est une marque
   * déposée, dessinée dans un format choisi. Le rogner pour remplir un
   * rectangle en coupe le nom, ce qui est à la fois laid et une petite
   * trahison. On l'affiche donc en entier, quitte à laisser du vide
   * autour.
   */
  const estUnLogo = !brand.cover_url && Boolean(brand.logo_url);

  return (
    /*
     * Le lien passe DERRIÈRE la carte, en calque, plutôt que de
     * l'entourer. Un <button> ne peut pas vivre dans un <a> : le
     * navigateur refuse cette imbrication, et le cœur ci-dessous doit
     * garder son propre clic. Toute la carte reste cliquable.
     */
    <div className="card-light group relative flex h-full flex-col overflow-hidden">
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      <div className="pointer-events-none relative z-3 flex h-full flex-col">
        {/* Le visuel donne le ton avant meme le clic. Sans image, on garde
            un aplat plutot qu'un trou : la grille reste alignee. */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]">
          {visual ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={visual}
              alt={estUnLogo ? brand.name : ""}
              loading="lazy"
              decoding="async"
              className={`h-full w-full transition duration-500 group-hover:scale-[1.04] ${
                estUnLogo ? "object-contain p-6" : "object-cover"
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[#a795c9]">
                {brand.name}
              </span>
            </div>
          )}

          {brand.featured && <span className="badge absolute left-3 top-3">À la une</span>}

          {/* En bas à droite du visuel : le haut est déjà occupé par le
              badge « À la une » et par le bouton d'aperçu, et sur une
              carte étroite les trois se marchaient dessus. */}
          {/* Trois surcouches, trois coins distincts : le badge en
              haut à gauche, l'aperçu en bas à gauche, le cœur en bas à
              droite. Sur une carte étroite, deux d'entre elles au même
              endroit finissaient par se chevaucher. */}
          {apercu && (
            <div className="pointer-events-auto absolute bottom-3 left-3">{apercu}</div>
          )}

          {favori && (
            <div className="pointer-events-auto absolute bottom-3 right-3">
              <FavoriteButton
                brandId={brand.id}
                initial={favori.initial}
                etiquette={brand.name}
                taille="compacte"
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="m-0 truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            {brand.name}
          </h3>
          <p className="m-0 mt-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
            {[brand.city, brand.country].filter(Boolean).join(" · ")}
          </p>

          <p className="m-0 mt-3 flex-1 text-[14px] leading-relaxed text-[#3a2c5e]">
            {brand.tagline}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {brand.categories.slice(0, 2).map((c) => (
              <span
                key={c}
                className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#4a3a78]"
              >
                {c}
              </span>
            ))}
            <span className="ml-auto text-[11px] font-bold text-[#6a5a92]">
              {PRICE_TIER_LABEL[brand.price_tier]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
