import BrandSpaceNav from "@/components/BrandSpaceNav";
import ShopifyImport from "@/components/admin/ShopifyImport";
import { requireManagedBrand } from "@/lib/brand-space";
import { fetchShopifyCatalogue } from "@/lib/shopify";
import { getBrandProducts } from "@/lib/brand-space";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ boutique?: string }>;
};

export default async function ImportPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { boutique } = await searchParams;
  const { brand, isAdmin } = await requireManagedBrand(slug);

  const shopUrl = boutique ?? brand.shop_url ?? brand.website_url ?? "";
  const result = shopUrl ? await fetchShopifyCatalogue(shopUrl) : null;
  const existing = await getBrandProducts(brand.id);
  const alreadyImported = new Set(
    existing.map((p) => p.source_id).filter((v): v is string => Boolean(v))
  );

  return (
    <>
      <BrandSpaceNav slug={slug} name={brand.name} isAdmin={isAdmin} published={brand.status === "published"} />

      <header className="mb-7">
        <p className="eyebrow m-0">Gain de temps</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
          Importer ton catalogue
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Si ta boutique est sur Shopify, on peut lire son catalogue public et
          reprendre les noms, prix et photos. Tu choisis ce que tu gardes, et tout
          arrive en brouillon — rien ne s&apos;affiche avant que tu l&apos;aies relu.
        </p>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Si ta boutique est ailleurs, ce n&apos;est pas grave : la saisie à la main
          fonctionne exactement pareil.
        </p>
      </header>

      <ShopifyImport
        slug={slug}
        defaultShopUrl={shopUrl}
        result={result}
        alreadyImported={Array.from(alreadyImported)}
      />
    </>
  );
}
