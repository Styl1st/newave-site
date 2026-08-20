import Link from "next/link";
import { getProfile } from "@/lib/auth";

/**
 * Le raccourci d'ajout, visible seulement par l'administration.
 *
 * POURQUOI SUR LA PAGE PUBLIQUE. On repère une marque en parcourant
 * l'annuaire, pas en ouvrant un tableau de bord. Il fallait quitter la
 * page, aller dans l'administration, retrouver la bonne liste, cliquer
 * sur « nouvelle » : quatre gestes entre l'idée et la saisie, et à ce
 * compte-là on note le nom quelque part et on le fait plus tard, ce qui
 * veut dire jamais.
 *
 * Il ne s'affiche que pour un compte administrateur. Ce n'est pas une
 * mesure de sécurité — la page d'administration se protège elle-même,
 * et les règles de la base derrière elle — mais une question de
 * propreté : un visiteur n'a rien à faire d'un bouton qui le mènerait à
 * une porte fermée.
 *
 * Discret exprès. C'est un outil de travail posé sur une page qui
 * s'adresse d'abord aux visiteurs : il ne doit pas concurrencer le
 * titre ni la première rangée de cartes.
 */
export default async function RaccourciAdmin({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const profil = await getProfile();
  if (profil?.role !== "admin") return null;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/8 px-4 py-2 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {children}
    </Link>
  );
}
