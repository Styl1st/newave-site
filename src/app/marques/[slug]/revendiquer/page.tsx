import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import BackLink from "@/components/BackLink";
import ClaimForm from "@/components/ClaimForm";
import { getBrand } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { getCatalogueInsight } from "@/lib/brand-space";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Revendiquer une marque", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RevendiquerPage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const profile = await getProfile();
  if (!profile) redirect(`/connexion?suite=/marques/${slug}/revendiquer`);

  // Déjà gérant : la demande n'aurait aucun sens.
  const insight = await getCatalogueInsight(brand.id);
  if (insight) redirect(`/espace-marque/${slug}`);

  return (
    <div className="mx-auto w-full max-w-2xl px-[var(--pad)] py-12">
      <BackLink href={`/marques/${slug}`}>{brand.name}</BackLink>

      <header className="rise mt-6 mb-8">
        <p className="eyebrow m-0">Cette marque est la tienne ?</p>
        <h1 className="m-0 mt-2 text-[clamp(26px,6.4vw,38px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Revendiquer {brand.name}
        </h1>
        <p className="m-0 mt-4 text-[15px] leading-relaxed text-white/84">
          Nous avons créé cette page pour parler de ton travail. Si tu es à la tête de
          la marque, tu peux en reprendre la main : présentation, visuels, pièces. On
          garde un droit de regard éditorial, tu gardes la parole.
        </p>
      </header>

      <div className="rise rise-1">
        <ClaimForm
          brandId={brand.id}
          brandName={brand.name}
          brandSlug={slug}
          displayName={profile.display_name ?? ""}
        />
      </div>
    </div>
  );
}
