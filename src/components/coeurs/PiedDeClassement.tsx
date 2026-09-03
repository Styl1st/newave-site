"use client";

import Link from "next/link";
import { LIGNES_PAR_LOT } from "./seuils";

/**
 * Le pied de page d'un classement : ce qu'on voit, ce qui reste, et sa
 * propre liste.
 *
 * IL EST PARTAGÉ PAR LES CINQ ONGLETS, ET C'EST TOUT L'INTÉRÊT. Il était
 * écrit dans `ClassementMarques` seulement ; les quatre autres
 * classements finissaient sur le dernier élément d'une grille, sans
 * compte ni bouton. Deux pieds différents pour une même page, c'est déjà
 * deux pages.
 *
 * LE COMPTE D'ABORD, parce que c'est lui qui décide de cliquer ou
 * d'aller chercher autrement. Et le renvoi vers sa propre liste en
 * dernier : on vient de lire ce que suivent les autres, c'est le moment
 * où l'on pense à la sienne.
 *
 * Il reprend la matière de la ligne de filtres, comme celui de
 * l'annuaire : un bouton en carte claire au bas d'une pile de cartes
 * claires se prend pour une entrée de plus.
 */
export default function PiedDeClassement({
  affichees,
  total,
  onVoirPlus,
}: {
  /** Combien de lignes sont à l'écran, podium compris. */
  affichees: number;
  /**
   * Combien il y en a en tout DANS CE QUI EST FILTRÉ.
   *
   * Le compte suit le rayon choisi, et pas le classement entier :
   * annoncer « 6 sur 40 » sous une liste de six qu'on vient soi-même de
   * filtrer donnerait l'impression qu'il en manque trente-quatre.
   */
  total: number;
  /** Absent = tout est affiché, le bouton disparaît. */
  onVoirPlus?: () => void;
}) {
  const reste = total - affichees;

  return (
    <div className="mt-6 flex flex-col items-center gap-2.5 rounded-[26px] border border-white/20 bg-[rgba(8,2,30,0.44)] px-5 py-4 backdrop-blur-[20px] sm:flex-row sm:justify-center sm:gap-5 sm:rounded-full">
      {/* « affichées » convient aux deux classements sans se conjuguer
          deux fois : une marque et une pièce sont l'une comme l'autre
          féminines. Une seule phrase, donc, plutôt qu'un mot passé en
          prop et accordé à la main. */}
      <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/55">
        {affichees} sur {total} affichée{total > 1 ? "s" : ""}
      </p>

      {reste > 0 && onVoirPlus && (
        <button
          type="button"
          onClick={onVoirPlus}
          className="rounded-full bg-white px-5 py-2 text-[13px] font-extrabold text-[var(--color-ink)] transition active:scale-95"
        >
          Voir {Math.min(reste, LIGNES_PAR_LOT)} place
          {Math.min(reste, LIGNES_PAR_LOT) > 1 ? "s" : ""} de plus
        </button>
      )}

      <Link
        href="/favoris"
        className="text-[12.5px] font-bold text-white/75 underline underline-offset-4 transition hover:text-white"
      >
        Ma liste à moi →
      </Link>
    </div>
  );
}
