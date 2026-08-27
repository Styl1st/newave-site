import type { Metadata } from "next";
import PieceDirectory from "@/components/PieceDirectory";
import { getVitrine } from "@/lib/queries";
import { repartirParMarque } from "@/lib/melange";
import { aUneIllustration } from "@/lib/medias";

export const metadata: Metadata = {
  title: "Les pièces",
  description:
    "Toutes les pièces des marques de NEWAVE SPHERE, par rayon et par prix : hauts, bas, vestes, chaussures, bijoux et accessoires.",
};

/**
 * La vitrine, l'annuaire pris par l'autre bout.
 *
 * L'annuaire répond à « quelle marque ? ». Ce n'est pas la question
 * qu'on se pose le plus souvent : on cherche un jean, une veste, quelque
 * chose à moins de cinquante euros, et l'on découvre la marque au
 * passage. Une page de plus, donc, mais pas un contenu de plus : les
 * mêmes pièces, rangées selon l'autre entrée.
 *
 * L'ordre change à chaque visite, et il ALTERNE LES MARQUES. C'est le
 * point qui compte pour un annuaire de marques émergentes : au hasard
 * pur, celle qui a cent quarante pièces occuperait la moitié du premier
 * écran et celle qui en a six n'apparaîtrait jamais. Voir
 * `repartirParMarque`.
 */
export const dynamic = "force-dynamic";

export default async function PiecesPage() {
  /*
   * Une pièce sans photo n'a rien à faire dans une vitrine. Voir
   * `aUneIllustration` : ce n'est pas une suppression, sa fiche reste
   * accessible.
   */
  const pieces = repartirParMarque((await getVitrine()).filter(aUneIllustration));

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-10">
        <p className="eyebrow m-0">La vitrine</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Les pièces
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Toutes marques confondues, dans un ordre qui change à chaque visite. Filtre par
          rayon et par prix, et clique pour arriver chez la marque.
        </p>
      </header>

      <PieceDirectory pieces={pieces} />
    </div>
  );
}
