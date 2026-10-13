import Link from "next/link";
import BarreGerant from "@/components/BarreGerant";
import RetourEspace from "@/components/RetourEspace";
import ListeDesPieces from "@/components/espace/ListeDesPieces";
import { getBrandProducts, requireManagedBrand } from "@/lib/brand-space";
import { ilYa, suiviDuCatalogue } from "@/lib/suivi-catalogue";
import { MAX_EN_AVANT } from "@/lib/en-avant";

type Props = {
  params: Promise<{ slug: string }>;
  /** Le bilan d'un import qui vient de se terminer. */
  searchParams: Promise<{ nouvelles?: string; majs?: string }>;
};

export default async function BrandProducts({ params, searchParams }: Props) {
  const { slug } = await params;
  const { nouvelles, majs } = await searchParams;
  const { brand, isAdmin } = await requireManagedBrand(slug);
  const products = await getBrandProducts(brand.id);
  const suivi = suiviDuCatalogue(brand);
  const boutique = (brand.shop_url ?? brand.website_url ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

  const creees = Number(nouvelles ?? 0) || 0;
  const revues = Number(majs ?? 0) || 0;
  const retourImport = nouvelles !== undefined;

  return (
    <>
      <RetourEspace slug={brand.slug} isAdmin={isAdmin} />
      <div className="mb-7">
        {/* Le catalogue est déjà chargé ici : la barre peut donc dire ce
            qui manque avant publication sans une requête de plus. */}
        <BarreGerant brand={brand} pieces={products.length} peutPublier={isAdmin} />
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
        <div>
          <p className="eyebrow m-0">Ton catalogue</p>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            Mes pièces
          </h1>
        </div>
        {/* Côte à côte même au doigt : empilés, ces deux boutons
            repoussaient la liste sous le premier écran. */}
        <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:gap-3">
          <Link
            href={`/espace-marque/${slug}/import`}
            className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-3 py-3 text-center text-[13.5px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97] sm:px-5"
          >
            <span className="sm:hidden">Importer</span>
            <span className="hidden sm:inline">Importer depuis ma boutique</span>
          </Link>
          <Link href={`/espace-marque/${slug}/pieces/nouvelle`} className="card-light px-3 py-3 text-center sm:px-5">
            <span className="relative z-3 text-[13.5px] font-extrabold">Ajouter une pièce</span>
          </Link>
        </div>
      </header>

      {/*
        LA RELECTURE QUOTIDIENNE, DITE UNE FOIS, ICI.

        C'est sur cette page qu'on se demande pourquoi une pièce est
        apparue toute seule, ou pourquoi « Épuisée » est revenu. Sans ce
        bandeau, la seule explication était dans le code.
      */}
      {suivi.auto ? (
        <div className="glass mb-5 flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4">
          <span
            aria-hidden
            className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
            style={{ background: "#7de2ab", boxShadow: "0 0 0 4px rgba(125,226,171,.18)" }}
          />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-bold leading-relaxed text-white">
              Ton catalogue se met à jour tout seul, chaque jour
              {boutique ? <>, depuis {boutique}</> : null}.
            </p>
            <p className="m-0 mt-1 text-[13px] leading-relaxed text-white/72">
              Les nouveautés arrivent en ligne, les ruptures et les retraits suivent ta
              boutique. À toi de choisir les {MAX_EN_AVANT} pièces en tête (l&apos;étoile) et ce
              qui reste en brouillon.
            </p>
          </div>
          {suivi.derniere && (
            <p className="m-0 w-full text-[11.5px] font-bold uppercase tracking-[0.1em] text-white/50 sm:w-auto sm:text-right">
              Dernière lecture {ilYa(suivi.derniere)}
              {suivi.note ? <span className="block normal-case tracking-normal text-white/55">{suivi.note}</span> : null}
            </p>
          )}
        </div>
      ) : (
        products.length > 0 && (
          <p className="m-0 mb-5 text-[13px] leading-relaxed text-white/65">
            Ton catalogue ne se relit pas tout seul : après un nouveau drop,{" "}
            <Link href={`/espace-marque/${slug}/import`} className="font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              réimporte depuis ta boutique
            </Link>
            . Rien n&apos;est dupliqué, les pièces déjà là sont mises à jour.
          </p>
        )
      )}

      {/* Le retour de l'import. Sans lui, on revient sur cette page sans
          savoir si quelque chose s'est passé, et on relance. */}
      {retourImport && (
        <p className="glass m-0 mb-5 px-5 py-3.5 text-[13.5px] leading-relaxed text-white">
          {creees > 0 ? (
            <>
              <strong className="font-extrabold">
                {creees} pièce{creees > 1 ? "s" : ""} importée{creees > 1 ? "s" : ""}
              </strong>
              , en brouillon. Relis-les, puis coche-les et choisis « Mettre en ligne ».
            </>
          ) : (
            <>
              Ton catalogue était déjà à jour. {revues} pièce{revues > 1 ? "s" : ""} revue
              {revues > 1 ? "s" : ""}, aucune nouveauté.
            </>
          )}
        </p>
      )}

      {products.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] leading-relaxed text-white/85">
            Aucune pièce pour l&apos;instant. Importe-les depuis ta boutique en un clic, ou
            ajoute-les une par une.
          </p>
        </div>
      ) : (
        <ListeDesPieces slug={slug} products={products} synchroAuto={suivi.auto} />
      )}
    </>
  );
}
