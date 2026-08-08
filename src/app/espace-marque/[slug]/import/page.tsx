import BrandSpaceNav from "@/components/BrandSpaceNav";
import CatalogueImport from "@/components/admin/CatalogueImport";
import { requireManagedBrand } from "@/lib/brand-space";
import { fetchCatalogue } from "@/lib/catalogue";
import { getBrandProducts } from "@/lib/brand-space";

/**
 * Parcourir un plan de site demande une trentaine de requêtes : la
 * limite par défaut de Vercel, dix secondes, ne suffirait pas et la
 * page se couperait en plein milieu.
 */
export const maxDuration = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ boutique?: string }>;
};

export default async function ImportPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { boutique } = await searchParams;
  const { brand, isAdmin } = await requireManagedBrand(slug);

  const shopUrl = boutique ?? brand.shop_url ?? brand.website_url ?? "";
  const result = shopUrl ? await fetchCatalogue(shopUrl) : null;
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
          Colle l&apos;adresse de ta boutique, ou celle d&apos;une page produit. On lit
          ce qu&apos;elle publie et on reprend les noms, prix et photos. Tu choisis ce
          que tu gardes, et tout arrive en brouillon — rien ne s&apos;affiche avant que
          tu l&apos;aies relu.
        </p>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Shopify, WooCommerce et Big Cartel sont lus directement. Pour les autres,
          on se rabat sur les données que la boutique publie déjà pour Google —
          ça fonctionne dans la plupart des cas. Et si rien ne passe, la saisie à la
          main fonctionne exactement pareil.
        </p>
      </header>

      <CatalogueImport
        slug={slug}
        defaultShopUrl={shopUrl}
        result={result}
        alreadyImported={Array.from(alreadyImported)}
      />
    </>
  );
}
