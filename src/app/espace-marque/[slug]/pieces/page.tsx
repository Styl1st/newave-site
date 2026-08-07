import Link from "next/link";
import BrandSpaceNav from "@/components/BrandSpaceNav";
import ProductBulkList from "@/components/admin/ProductBulkList";
import { getBrandProducts, requireManagedBrand } from "@/lib/brand-space";

type Props = { params: Promise<{ slug: string }> };

export default async function BrandProducts({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);
  const products = await getBrandProducts(brand.id);

  return (
    <>
      <BrandSpaceNav slug={slug} name={brand.name} isAdmin={isAdmin} published={brand.status === "published"} />

      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Ton catalogue</p>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            Pièces
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/espace-marque/${slug}/import`}
            className="rounded-[var(--radius)] border border-white/40 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-white/12"
          >
            Importer depuis ma boutique
          </Link>
          <Link href={`/espace-marque/${slug}/pieces/nouvelle`} className="card-light px-5 py-3">
            <span className="relative z-3 text-[13.5px] font-extrabold">Nouvelle pièce</span>
          </Link>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] leading-relaxed text-white/85">
            Aucune pièce pour l&apos;instant. Si ta boutique est sur Shopify,
            l&apos;import te fera gagner une heure.
          </p>
        </div>
      ) : (
        <ProductBulkList slug={slug} products={products} />
      )}
    </>
  );
}
