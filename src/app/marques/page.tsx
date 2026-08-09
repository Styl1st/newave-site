import type { Metadata } from "next";
import BrandDirectory from "@/components/BrandDirectory";
import { getBrands } from "@/lib/queries";
import { getMyFavorites } from "@/lib/favorites";

export const metadata: Metadata = {
  title: "Marques",
  description:
    "L'annuaire des marques indépendantes et émergentes sélectionnées par NEWAVE SPHERE.",
};

/** Les favoris dependent de la session : la page ne peut pas etre figee. */
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await getBrands();
  const favoris = await getMyFavorites(brands.map((b) => b.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-10">
        <p className="eyebrow m-0">L&apos;annuaire</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Les marques
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Chaque marque ici a été lue, vérifiée et choisie. Pas de classement payant,
          pas de placement déguisé.
        </p>
      </header>

      <BrandDirectory brands={brands} favoris={Array.from(favoris)} />
    </div>
  );
}
