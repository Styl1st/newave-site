import { Fragment } from "react";
import Link from "next/link";

/**
 * L'état du site, en une ligne.
 *
 * Ces quatre chiffres occupaient quatre grosses cartes en haut de
 * l'écran, à la place de ce qui demande une action. Ils ne demandent
 * rien : ils disent où en est le site. D'où leur passage en bandeau —
 * ils restent lisibles et cliquables, ils ne réclament plus le premier
 * regard.
 */

export type CompteurDeSite = {
  label: string;
  valeur: number;
  /** La précision qui évite d'avoir à ouvrir la page pour la connaître. */
  note: string;
  href: string;
};

export default function EtatDuSite({ compteurs }: { compteurs: CompteurDeSite[] }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-5 rounded-[var(--radius)] border border-white/20 bg-[rgba(8,2,30,0.44)] px-4 py-4 backdrop-blur-[20px] sm:gap-x-6 sm:px-6"
    >
      {compteurs.map((c, i) => (
        <Fragment key={c.label}>
          {/*
            Le filet disparaît avant que la ligne ne se replie.
            Un séparateur vertical qui se retrouve en tête d'un second
            rang ne sépare plus rien : il devient un trait posé au
            hasard. Sous 640px, les compteurs passent à deux par rang et
            l'espacement suffit à les distinguer.
          */}
          {i > 0 && (
            <span aria-hidden className="hidden h-[38px] w-px shrink-0 bg-white/16 sm:block" />
          )}
          <Link
            href={c.href}
            className="min-w-[120px] flex-1 rounded-[10px] px-1.5 py-1 transition hover:bg-white/10 sm:min-w-0"
          >
            <span className="block text-[26px] font-extrabold leading-none tracking-[-0.02em] text-white">
              {c.valeur}
            </span>
            <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/62">
              {c.label}
            </span>
            <span className="mt-1 block text-[11px] font-semibold text-white/50">{c.note}</span>
          </Link>
        </Fragment>
      ))}
    </div>
  );
}
