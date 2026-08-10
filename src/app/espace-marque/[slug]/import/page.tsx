import BrandSpaceNav from "@/components/BrandSpaceNav";
import FormulaireImport from "@/components/admin/FormulaireImport";
import { requireManagedBrand } from "@/lib/brand-space";

/**
 * Parcourir un plan de site demande une trentaine de requêtes : la
 * limite par défaut de Vercel, dix secondes, ne suffirait pas et
 * l'import se couperait en plein milieu. Cette limite vaut aussi pour
 * l'action lancée depuis cette page.
 */
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function ImportPage({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);

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
          Importer tes pièces
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Colle l&apos;adresse de ta boutique, clique une fois. On reprend les noms, les
          prix, les tailles et les photos, et tout arrive en brouillon : rien ne
          s&apos;affiche avant que tu l&apos;aies relu. Tu tries ensuite depuis la page
          Pièces, où tout se publie et se supprime en lot.
        </p>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Réimporter ne crée jamais de doublon : une pièce déjà présente est simplement
          mise à jour, sans toucher au rayon ni à l&apos;état que tu lui as donnés.
        </p>
      </header>

      <FormulaireImport
        slug={slug}
        adresseConnue={brand.shop_url ?? brand.website_url ?? ""}
      />
    </>
  );
}
