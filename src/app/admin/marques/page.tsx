import Link from "next/link";
import RetourEnHaut from "@/components/admin/RetourEnHaut";
import BrandBulkList from "@/components/admin/BrandBulkList";
import { adminGetBrandsDetaillees } from "@/lib/admin-queries";

export default async function AdminBrands() {
  const brands = await adminGetBrandsDetaillees();

  return (
    <>
      {/* Volontairement PAS collante.
          Je l'avais rendue collante pour garder « Nouvelle marque » à
          portée, et c'était une mauvaise réponse : elle venait se poser
          juste sous la barre du site, deux bandeaux superposés qui se
          disputaient le haut de l'écran. Le vrai défaut n'était pas
          l'accès au bouton, c'était d'arriver au milieu de la liste —
          et ça se règle en remontant, ci-dessous. */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
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
      <RetourEnHaut />
      <BrandBulkList brands={brands} />
    </>
  );
}
