import Link from "next/link";
import BarreGerant from "@/components/BarreGerant";
import RetourEspace from "@/components/RetourEspace";
import FormulaireImport from "@/components/admin/FormulaireImport";
import { requireManagedBrand } from "@/lib/brand-space";
import { suiviDuCatalogue } from "@/lib/suivi-catalogue";

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
  const auto = suiviDuCatalogue(brand).auto;

  return (
    <>
      <RetourEspace
        slug={brand.slug}
        isAdmin={isAdmin}
        vers={{ href: `/espace-marque/${brand.slug}/pieces`, label: "Mes pièces" }}
      />
      <div className="mb-7">
        <BarreGerant brand={brand} peutPublier={isAdmin} />
      </div>

      <header className="mb-5 sm:mb-7">
        <p className="eyebrow m-0">Ton catalogue</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Importer tes pièces
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Colle l&apos;adresse de ta boutique, clique une fois. On reprend les noms, les
          prix, les tailles et les photos. Ce que l&apos;import trouve arrive en brouillon :
          rien ne s&apos;affiche avant que tu l&apos;aies relu, puis tu mets en ligne d&apos;un
          coup depuis Mes pièces.
        </p>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          {auto
            ? "Ensuite, tu n'as plus rien à faire : ton catalogue est relu chaque jour, les nouvelles pièces arrivent directement en ligne et les ruptures suivent ta boutique."
            : "Réimporter ne crée jamais de doublon : une pièce déjà présente est simplement mise à jour, sans toucher au rayon ni à l'état que tu lui as donnés."}
        </p>
      </header>

      <FormulaireImport
        slug={slug}
        adresseConnue={brand.shop_url ?? brand.website_url ?? ""}
      />

      {/* L'autre chemin, au même endroit. Une marque sans boutique en
          ligne, ou une pièce unique, n'a pas à chercher ailleurs. */}
      <p className="m-0 mt-6 text-[13.5px] leading-relaxed text-white/72">
        Pas de boutique en ligne, ou une pièce unique ?{" "}
        <Link
          href={`/espace-marque/${slug}/pieces/nouvelle`}
          className="font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
        >
          Ajoute-la à la main
        </Link>
        .
      </p>
    </>
  );
}
