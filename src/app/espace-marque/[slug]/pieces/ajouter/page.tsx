import Link from "next/link";
import BrandSpaceNav from "@/components/BrandSpaceNav";
import { requireManagedBrand } from "@/lib/brand-space";
import { IconDownload, IconPlus } from "@/components/Icons";

type Props = { params: Promise<{ slug: string }> };

/**
 * Deux façons d'ajouter des pièces, et on ne choisit pas à sa place.
 *
 * L'import était auparavant caché derrière un onglet qu'il fallait
 * penser à ouvrir, alors que c'est justement le moment où l'on ajoute
 * ses premières pièces qu'on a besoin de l'apprendre. On le propose
 * donc ici, en premier, sans imposer : une marque sans boutique en
 * ligne existe, et la saisie à la main doit rester une porte d'entrée
 * normale, pas un lot de consolation.
 */
export default async function AjouterDesPieces({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);

  const boutique = brand.shop_url ?? brand.website_url;

  return (
    <>
      <BrandSpaceNav
        slug={slug}
        name={brand.name}
        isAdmin={isAdmin}
        published={brand.status === "published"}
      />

      <header className="mb-5 sm:mb-7">
        <p className="eyebrow m-0">Ton catalogue</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Ajouter des pièces
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Deux chemins, et le résultat est le même : tes pièces arrivent en brouillon, et
          tu publies celles que tu gardes.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/espace-marque/${slug}/import`} data-reveal className="card-light group p-6 sm:p-7">
          <span className="relative z-3 flex flex-col gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(23,10,51,0.08)] text-[var(--color-ink)]">
              <IconDownload className="h-5 w-5" />
            </span>
            <span className="text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
              Importer depuis ma boutique
            </span>
            <span className="text-[13.5px] leading-relaxed text-[#4a3a78]">
              Shopify, WooCommerce, Big Cartel et la plupart des autres. On reprend les
              noms, les prix, les tailles et les photos en une lecture.
            </span>
            {boutique && (
              <span className="truncate text-[12px] font-bold text-[#6a5a92]">
                {boutique.replace(/^https?:\/\//, "")}
              </span>
            )}
            <span className="mt-1 inline-flex items-center gap-2 text-[13px] font-black text-[#3a2470]">
              Continuer <span className="transition group-hover:translate-x-1">→</span>
            </span>
          </span>
        </Link>

        <Link
          href={`/espace-marque/${slug}/pieces/nouvelle`}
          data-reveal
          className="card-light group p-6 sm:p-7"
        >
          <span className="relative z-3 flex flex-col gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(23,10,51,0.08)] text-[var(--color-ink)]">
              <IconPlus className="h-5 w-5" />
            </span>
            <span className="text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
              Créer une pièce à la main
            </span>
            <span className="text-[13.5px] leading-relaxed text-[#4a3a78]">
              Pas de boutique en ligne, ou une pièce unique à présenter autrement. Tu
              renseignes le nom, le prix, les tailles et les photos toi-même.
            </span>
            <span className="mt-1 inline-flex items-center gap-2 text-[13px] font-black text-[#3a2470]">
              Continuer <span className="transition group-hover:translate-x-1">→</span>
            </span>
          </span>
        </Link>
      </div>
    </>
  );
}
