"use client";

import { forwardRef } from "react";
import Raccourci from "@/components/Raccourci";
import { enChiffres } from "./chiffres";

/**
 * LE PIED D'UNE LISTE QUI SE CHARGE PAR TRANCHES : pièces, marques,
 * posts, annonces du forum.
 *
 * Il était une pilule de verre de bord à bord, un bouton blanc posé au
 * milieu : une boîte de plus en bas d'une page qui n'en a plus. Il ne
 * reste qu'un trait et un mot.
 *
 *   — LE TRAIT dit où l'on en est : il se remplit de ce qui est déjà
 *     affiché sur le total, et s'allume aux couleurs de l'ambiance.
 *   — LE MOT est le bouton, écrit en lettres creuses comme les rayons de
 *     la vitrine. Il se remplit au survol, et sa flèche descend : on
 *     comprend qu'il fait venir la suite SOUS lui.
 *   — Dessous, en petit, le compte exact, et le raccourci de recherche
 *     pour qui cherche quelque chose de précis.
 *
 * Pendant le chargement, le trait respire et le mot s'éteint : rien ne
 * saute, et un second clic ne part pas.
 */
type Props = {
  /** Combien sont affichés, sur combien. */
  affiches: number;
  total: number;
  /** Ce que le bouton fera venir, déjà accordé : « 24 pièces ». */
  prochain: string;
  /** « affichées », « affichés ». */
  accord?: string;
  onCharger: () => void;
  enCours?: boolean;
  /** La tranche précédente n'est pas venue : on le dit à la place du raccourci. */
  panne?: boolean;
  /** Le raccourci de recherche, sur ordinateur. */
  raccourci?: boolean;
};

const SuiteDeListe = forwardRef<HTMLDivElement, Props>(function SuiteDeListe(
  { affiches, total, prochain, accord = "affichées", onCharger, enCours = false, panne = false, raccourci = true },
  ref
) {
  const part = total > 0 ? Math.min(1, affiches / total) : 0;
  return (
    <div ref={ref} className="suite" data-en-cours={enCours ? "" : undefined}>
      <div
        className="suite-trait"
        role="progressbar"
        aria-label="Avancée dans la liste"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={affiches}
        style={{ "--part": part } as React.CSSProperties}
      />
      <button type="button" onClick={onCharger} disabled={enCours} className="suite-bouton">
        <span className="suite-mot">{enCours ? "Ça arrive…" : `${prochain} de plus`}</span>
        <svg className="suite-fleche" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p className="suite-compte">
        {enChiffres(affiches)} sur {enChiffres(total)} {accord}
        {panne ? (
          <span className="suite-panne"> · la suite n&apos;a pas répondu, reclique pour réessayer</span>
        ) : (
          raccourci && (
            <span className="suite-raccourci">
              {" "}
              · ou tape <Raccourci colle /> pour chercher
            </span>
          )
        )}
      </p>
    </div>
  );
});

export default SuiteDeListe;

/** La fin de la liste : le trait plein, et ce qu'on peut faire ensuite. */
export function FinDeListe({ texte, children }: { texte: string; children?: React.ReactNode }) {
  return (
    <div className="suite">
      <div className="suite-trait" aria-hidden="true" style={{ "--part": 1 } as React.CSSProperties} />
      <p className="suite-compte suite-fin">{texte}</p>
      {children}
    </div>
  );
}
