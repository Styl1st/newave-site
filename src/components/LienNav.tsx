"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Un lien de la barre, qui sait s'il est la page courante.
 *
 * Savoir où l'on se trouve est la première chose qu'on demande à une
 * navigation. Sans repère, chaque page ressemble à la précédente et on
 * finit par cliquer deux fois sur le même onglet.
 *
 * Le repère est une pastille pleine plutôt qu'un simple soulignement :
 * sur un fond animé qui change de teinte en permanence, un trait fin
 * disparaît la moitié du temps.
 *
 * Elle était blanche et translucide, ce qui posait le même problème une
 * marche plus haut : dès que le décor passait dans les clairs, la
 * pastille se confondait avec lui. Elle emprunte maintenant les accents
 * du thème (`.nav-actif`), donc une couleur, et elle ne peut plus se
 * fondre dans un fond qui, lui, reste sombre sous la barre.
 */
export default function LienNav({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const chemin = usePathname();

  // L'accueil ne correspond qu'à lui-même : sinon il resterait allumé
  // sur toutes les pages du site.
  const actif = href === "/" ? chemin === "/" : chemin.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      /* 9 px et non 8 : la barre a gagné deux pastilles rondes de
         trente-six, et des onglets plus bas qu'elles se lisaient comme
         une deuxième rangée. */
      /* `whitespace-nowrap` et `shrink-0` : un lien de barre ne se coupe
         jamais en deux lignes. « Coups de cœur » et « À propos » le
         faisaient dès qu'ils apparaissaient à 1024 px — la barre passait
         de 54 à 73 pixels de haut et la pastille de la page active
         devenait un ovale. Un onglet de navigation tient sur une ligne ou
         ne tient pas ; il ne se plie pas. */
      className={`relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-[9px] text-[13px] font-bold transition ${
        actif
          ? "nav-actif text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
