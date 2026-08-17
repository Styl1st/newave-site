import Link from "next/link";
import BrandBulkList from "@/components/admin/BrandBulkList";
import { adminGetBrandsDetaillees } from "@/lib/admin-queries";

export default async function AdminBrands() {
  const brands = await adminGetBrandsDetaillees();

  return (
    <>
      {/* COLLANTE, et c'est le remède au vrai défaut.
          Après avoir enregistré une marque, le navigateur restaure la
          position qu'on avait dans la liste : on revient donc au milieu
          de soixante-dix lignes, et il faut remonter pour retrouver
          « Nouvelle marque ». Plutôt que de lutter contre la
          restauration — qui est un bon comportement, elle évite de
          reperdre sa place — on garde le bouton sous la main. */}
      <header className="sticky top-2.5 z-30 mb-5 flex flex-wrap items-end justify-between gap-4 rounded-[18px] bg-[rgba(8,2,30,0.55)] px-3 py-3 backdrop-blur-md sm:mb-7 sm:top-4 sm:px-4">
        <div>
          <p className="eyebrow m-0">Annuaire</p>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            Marques
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/catalogues"
            className="rounded-full border border-white/35 bg-white/8 px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            Mettre à jour les catalogues
          </Link>
          <Link href="/admin/marques/nouveau" className="card-light px-5 py-3">
            <span className="relative z-3 text-[13.5px] font-extrabold">Nouvelle marque</span>
          </Link>
        </div>
      </header>

      {/* Le bouton « Retirer » a quitté chaque ligne. Il y répétait
          soixante-dix fois la même action, alors qu'une seule barre,
          en haut, la rend possible sur autant de marques qu'on veut. */}
      <BrandBulkList brands={brands} />
    </>
  );
}
