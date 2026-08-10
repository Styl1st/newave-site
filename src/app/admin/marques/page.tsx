import Link from "next/link";
import BrandBulkList from "@/components/admin/BrandBulkList";
import { adminGetBrandsDetaillees } from "@/lib/admin-queries";

export default async function AdminBrands() {
  const brands = await adminGetBrandsDetaillees();

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
        <div>
          <p className="eyebrow m-0">Annuaire</p>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            Marques
          </h1>
        </div>
        <Link href="/admin/marques/nouveau" className="card-light px-5 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Nouvelle marque</span>
        </Link>
      </header>

      {/* Le bouton « Retirer » a quitté chaque ligne. Il y répétait
          soixante-dix fois la même action, alors qu'une seule barre,
          en haut, la rend possible sur autant de marques qu'on veut. */}
      <BrandBulkList brands={brands} />
    </>
  );
}
