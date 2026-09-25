import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import PieceDirectory from "@/components/PieceDirectory";
import { enChiffres } from "@/components/chiffres";
import { compterLeCatalogue, getVitrine, lireUnePageDeVitrine } from "@/lib/queries";
import { repartirParMarque } from "@/lib/melange";
import { aUneIllustration } from "@/lib/medias";
import type { Product } from "@/lib/types";

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
 * ┌─ CE QUI A CHANGÉ, ET C'EST TOUT LE SUJET DE CETTE PAGE ────────────┐
 *
 * Elle descendait un ÉCHANTILLON : dix pièces par marque, plafonné à
 * mille cinq cents lignes, soit douze cent trente pièces sur les
 * vingt-six mille du site. Le navigateur recevait ces douze cent trente
 * et faisait tout le reste — filtres, recherche, tri, pagination — en
 * JavaScript.
 *
 * Trois défauts, et aucun n'était réparable de ce côté-ci :
 *
 *   — le pied annonçait « 24 sur 1 230 » sur une page intitulée « Les
 *     pièces », donc le site paraissait vingt fois plus petit ;
 *   — « moins de 30 € » ne cherchait pas moins de 30 € au catalogue,
 *     mais dans l'échantillon ;
 *   — les vingt-cinq mille autres pièces n'étaient atteignables qu'en
 *     ouvrant les marques une par une.
 *
 * Maintenant, c'est Postgres qui filtre, trie, compte et découpe (voir
 * `vitrine`, migration 33), et cette page ne rend que les VINGT-QUATRE
 * PREMIÈRES pièces. Les suivantes arrivent par `/api/pieces`, à la
 * demande. Le site est entièrement parcourable, et la page est plus
 * légère qu'elle ne l'a jamais été.
 *
 * └────────────────────────────────────────────────────────────────────┘
 *
 * L'ordre change toujours à chaque visite et il ALTERNE TOUJOURS LES
 * MARQUES — au hasard pur, celle qui a quatorze cents pièces occuperait
 * les dix premiers écrans et celle qui en a six n'apparaîtrait jamais.
 * Simplement, ce n'est plus `repartirParMarque` qui s'en charge : ce
 * tour de table a besoin de la liste entière, et la liste entière ne
 * descend plus. C'est l'ordre `position` + graine de la fonction SQL.
 */
export const dynamic = "force-dynamic";

/** Le même premier lot que « Charger 24 de plus ». */
const LOT = 24;

/** `?q=veste` ouvre la vitrine déjà filtrée. Voir `amorce`. */
type Props = { searchParams: Promise<{ q?: string | string[] }> };

/**
 * LE JOUR OÙ LA FONCTION SQL N'EST PAS LÀ.
 *
 * Le code part en ligne avant la migration, et il tourne en
 * démonstration sans base du tout. Dans les deux cas
 * `lireUnePageDeVitrine` rend `null`, et une page des pièces vide
 * serait un désastre pour un défaut d'installation. On retombe donc
 * sur l'ancienne lecture — l'échantillon, mélangé ici — le temps que la
 * migration passe. Le bouton « Charger de plus » se plaindra, lui, et
 * c'est tant mieux : ça se voit et ça se corrige.
 */
async function repli(amorce: string): Promise<{ pieces: Product[]; total: number }> {
  const vitrine = repartirParMarque((await getVitrine()).filter(aUneIllustration));

  const q = amorce.trim().toLowerCase();
  const retenues = q
    ? vitrine.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand?.name ?? "").toLowerCase().includes(q) ||
          p.categories.some((c) => c.toLowerCase().includes(q))
      )
    : vitrine;

  return { pieces: retenues.slice(0, LOT), total: retenues.length };
}

export default async function PiecesPage({ searchParams }: Props) {
  const { q } = await searchParams;

  /* Bornée comme la saisie de l'annuaire : une adresse s'écrit à la
     main, et quelques milliers de caractères collés dans le champ ne
     cherchent rien et débordent la ligne de requête. */
  const amorce = (Array.isArray(q) ? q[0] : q)?.slice(0, 80) ?? "";

  /*
   * LA GRAINE EST TIRÉE ICI, UNE SEULE FOIS, ET ELLE DESCEND AVEC LA
   * PAGE. Elle fixe l'ordre « au hasard » pour toute la visite : les
   * appels suivants la redonnent, donc la page 2 continue la page 1 au
   * lieu d'être rebattue. C'est ce qui empêche une pièce de sortir deux
   * fois pendant qu'une autre ne sort jamais.
   */
  const graine = randomUUID();

  const [premiere, catalogue] = await Promise.all([
    lireUnePageDeVitrine(graine, { q: amorce }, 0, LOT),
    compterLeCatalogue(),
  ]);

  const page = premiere ?? (await repli(amorce));

  /*
   * LES DEUX CHIFFRES DE L'EN-TÊTE DISENT LE CATALOGUE.
   *
   * Ils comptaient ce que la page avait sous la main, c'est-à-dire la
   * vitrine — dix pièces par marque au plus. « 983 pièces » sur un site
   * qui en porte des milliers : le chiffre était exact et il se lisait
   * quand même comme une panne. Ils viennent de Postgres, qui compte la
   * table entière sans en descendre une ligne.
   *
   * `marques` sort de la MÊME liste que le filtre « Marque » de la
   * colonne de gauche — voir `compter_les_marques`, migration 32. Les
   * deux se comptaient séparément et ne tombaient pas juste : l'en-tête
   * annonçait 141 marques et le filtre « Toutes (133) », deux
   * centimètres plus bas.
   *
   * Le repli garde l'ancien calcul : sans base, on compte ce qu'on a,
   * ce qui vaut toujours mieux qu'un zéro.
   */
  const total = catalogue?.pieces ?? page.total;
  const marques =
    catalogue?.marques ?? new Set(page.pieces.map((p) => p.brand?.slug).filter(Boolean)).size;

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
            LA PHRASE A CHANGÉ PARCE QUE LA PAGE A CHANGÉ. Elle
            annonçait « jusqu'à dix pièces par marque » et renvoyait
            chez la marque pour voir son catalogue entier : c'était la
            vérité tant que la page ne descendait qu'un échantillon. Ce
            n'en est plus une. Laisser la phrase reviendrait à
            s'excuser d'une limite qui n'existe plus, et à envoyer
            ailleurs quelqu'un qui est déjà au bon endroit.
          */}
          <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
            Tout le catalogue, toutes marques confondues, dans un ordre qui change à
            chaque visite. Filtre par rayon, par type et par prix, et clique pour arriver
            chez la marque.
          </p>
        </div>

        <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/55">
          {enChiffres(total)} pièce{total > 1 ? "s" : ""}
          {catalogue && " au catalogue"} · {enChiffres(marques)} marque
          {marques > 1 ? "s" : ""}
        </p>
      </header>

      {/* Tout ce qui suit vient de la base : les rayons, les marques, les
          bornes du rail de prix, et les vingt-quatre premières pièces.
          La colonne de filtres annonce ainsi le SITE et non ce que la
          page a sous la main. */}
      <PieceDirectory
        premierLot={page.pieces}
        totalDuPremierLot={page.total}
        graine={graine}
        rayonsDuCatalogue={catalogue?.rayons}
        tagsDuCatalogue={catalogue?.tags}
        marquesDuCatalogue={catalogue?.marquesListe}
        bornesDuCatalogue={catalogue?.prix}
        etatsDuCatalogue={catalogue?.etats}
        amorce={amorce}
      />
    </div>
  );
}
