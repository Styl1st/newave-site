import type { Metadata } from "next";
import PieceDirectory from "@/components/PieceDirectory";
import { enChiffres } from "@/components/chiffres";
import { compterLeCatalogue, getVitrine } from "@/lib/queries";
import { repartirParMarque } from "@/lib/melange";
import { aUneIllustration } from "@/lib/medias";

export const metadata: Metadata = {
  title: "Les pièces",
  description:
    "Un choix de pièces chez toutes les marques de NEWAVE SPHERE, par rayon et par prix : hauts, bas, vestes, chaussures, bijoux et accessoires.",
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

/** `?q=veste` ouvre la vitrine déjà filtrée. Voir `amorce`. */
type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function PiecesPage({ searchParams }: Props) {
  const { q } = await searchParams;

  /* Bornée comme la saisie de l'annuaire : une adresse s'écrit à la
     main, et quelques milliers de caractères collés dans le champ ne
     cherchent rien et débordent la ligne de requête. */
  const amorce = (Array.isArray(q) ? q[0] : q)?.slice(0, 80) ?? "";
  /*
   * Une pièce sans photo n'a rien à faire dans une vitrine. Voir
   * `aUneIllustration` : ce n'est pas une suppression, sa fiche reste
   * accessible.
   */
  const [vitrine, catalogue] = await Promise.all([getVitrine(), compterLeCatalogue()]);
  const pieces = repartirParMarque(vitrine.filter(aUneIllustration));

  /*
   * LES DEUX CHIFFRES DE L'EN-TÊTE DISENT LE CATALOGUE, PAS LA PAGE.
   *
   * Ils comptaient ce que la page avait sous la main, c'est-à-dire la
   * vitrine — dix pièces par marque au plus. « 983 pièces » sur un site
   * qui en porte des milliers : le chiffre était exact et il se lisait
   * quand même comme une panne. Ils viennent maintenant de Postgres,
   * qui compte la table entière sans en descendre une ligne (voir
   * `compterLeCatalogue`), et le mot « au catalogue » dit lequel des
   * deux ensembles on annonce. Celui de la page, lui, est écrit
   * au-dessus de la grille : « 983 pièces · au hasard ».
   *
   * Le repli garde l'ancien calcul : sans base, on compte ce qu'on a,
   * ce qui vaut toujours mieux qu'un zéro.
   *
   * Le gabarit affiche « 1 284 pièces · 136 marques » : ce sont des
   * ordres de grandeur de maquette. Un chiffre figé dans le code
   * devient faux le jour où une marque publie, et personne ne s'en
   * aperçoit — c'est le genre d'erreur qui décrédibilise le reste de la
   * page, puisqu'elle est invérifiable à l'œil.
   */
  const total = catalogue?.pieces ?? pieces.length;
  const marques =
    catalogue?.marques ?? new Set(pieces.map((p) => p.brand?.slug).filter(Boolean)).size;

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      {/* L'identité à gauche, le compte à droite, alignés par le bas.
          Le compte passe sous le texte quand la largeur ne suffit
          plus — c'est la ligne qu'on sacrifie en premier. */}
      <header className="rise mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow m-0">La vitrine</p>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            Les pièces
          </h1>
          {/*
            LA PHRASE DIT LA RÈGLE, PARCE QUE LE COMPTE NE PEUT PAS LA
            DIRE. « Toutes marques confondues » se lisait comme « tout le
            catalogue », et le compte à droite comme le nombre de pièces
            du site. Ce n'en est pas un : la vitrine prend au plus dix
            pièces par marque, sans quoi une boutique de mille pièces
            occuperait la page à elle seule (voir `getVitrine`). Une
            marque dont on voit dix pièces ici peut en avoir onze cents
            sur sa page, et c'est ce que la phrase annonce maintenant.
          */}
          <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
            Jusqu&apos;à dix pièces par marque, dans un ordre qui change à chaque visite.
            Filtre par rayon et par prix, et clique pour arriver chez la marque : son
            catalogue entier est sur sa page.
          </p>
        </div>

        <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/55">
          {enChiffres(total)} pièce{total > 1 ? "s" : ""}
          {catalogue && " au catalogue"} · {enChiffres(marques)} marque
          {marques > 1 ? "s" : ""}
        </p>
      </header>

      {/* Les rayons du catalogue entier, pour que la colonne de filtres
          annonce le site et non l'échantillon. */}
      <PieceDirectory pieces={pieces} rayonsDuCatalogue={catalogue?.rayons} amorce={amorce} />
    </div>
  );
}
