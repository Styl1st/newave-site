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
      className={`relative rounded-full px-3.5 py-2 text-[13px] font-bold transition ${
        actif
          ? "bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
