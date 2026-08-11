import Link from "next/link";
import BarreGerant from "@/components/BarreGerant";
import ProductBulkList from "@/components/admin/ProductBulkList";
import { getBrandProducts, requireManagedBrand } from "@/lib/brand-space";

type Props = {
  params: Promise<{ slug: string }>;
  /** Le bilan d'un import qui vient de se terminer. */
  searchParams: Promise<{ nouvelles?: string; majs?: string }>;
};

export default async function BrandProducts({ params, searchParams }: Props) {
  const { slug } = await params;
  const { nouvelles, majs } = await searchParams;
  const { brand } = await requireManagedBrand(slug);
  const products = await getBrandProducts(brand.id);

  const creees = Number(nouvelles ?? 0) || 0;
  const revues = Number(majs ?? 0) || 0;
  const retourImport = nouvelles !== undefined;

  return (
    <>
      <div className="mb-7">
        <BarreGerant brand={brand} />
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
        <div>
          <p className="eyebrow m-0">Ton catalogue</p>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            Pièces
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/espace-marque/${slug}/import`}
            className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            Importer depuis ma boutique
          </Link>
          <Link href={`/espace-marque/${slug}/pieces/nouvelle`} className="card-light px-5 py-3">
            <span className="relative z-3 text-[13.5px] font-extrabold">Nouvelle pièce</span>
          </Link>
        </div>
      </header>

      {/* Le retour de l'import. Sans lui, on revient sur cette page sans
          savoir si quelque chose s'est passé, et on relance. */}
      {retourImport && (
        <p className="glass m-0 mb-6 px-5 py-3.5 text-[13.5px] leading-relaxed text-white">
          {creees > 0 ? (
            <>
              <strong className="font-extrabold">
                {creees} pièce{creees > 1 ? "s" : ""} importée{creees > 1 ? "s" : ""}
              </strong>
              , en brouillon. Relis-les, puis publie celles que tu gardes.
            </>
          ) : (
            <>
              Ton catalogue était déjà à jour. {revues} pièce{revues > 1 ? "s" : ""} revue
              {revues > 1 ? "s" : ""}, aucune nouveauté.
            </>
          )}
        </p>
      )}

      {products.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] leading-relaxed text-white/85">
            Aucune pièce pour l&apos;instant. Importe-les depuis ta boutique, ou crée-les
            une par une.
          </p>
        </div>
      ) : (
        <ProductBulkList slug={slug} products={products} />
      )}
    </>
  );
}
