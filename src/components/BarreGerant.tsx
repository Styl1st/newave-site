"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PanneauEdition from "./PanneauEdition";
import type { Brand } from "@/lib/types";

/**
 * La barre du gérant. Une seule, la même partout.
 *
 * Il y en avait deux : une sur la page publique, une autre sur les
 * écrans de gestion. Elles n'avaient ni les mêmes entrées, ni le même
 * ordre, ni la même allure — au point qu'en cliquant sur « mes
 * pièces » on croyait avoir changé de site. C'est un défaut classique
 * et sévère : la navigation doit dire où l'on est, pas donner
 * l'impression d'un déménagement.
 *
 * Trois onglets, comme sur un profil de réseau social : sa page, ses
 * pièces, ses chiffres. À droite, les deux gestes qu'on vient faire.
 * L'onglet où l'on se trouve est marqué, ce qui remplace avantageusement
 * une deuxième barre censée l'annoncer.
 */
export default function BarreGerant({ brand }: { brand: Brand }) {
  const chemin = usePathname();

  const onglets = [
    { href: `/marques/${brand.slug}`, label: "Ma page", exact: true },
    { href: `/espace-marque/${brand.slug}/pieces`, label: "Mes pièces", exact: false },
    { href: `/espace-marque/${brand.slug}/stats`, label: "Statistiques", exact: true },
  ];

  const base =
    "rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-[.97]";
  const repos = "text-white/75 hover:bg-white/14 hover:text-white";
  const ici = "bg-white/20 text-white";

  return (
    <div
      data-no-reveal
      className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/20 bg-white/8 p-1.5 backdrop-blur-sm"
    >
      <span className="px-2.5 text-[10.5px] font-black uppercase tracking-[0.16em] text-white/50">
        Ta page
      </span>

      {onglets.map((o) => {
        // « Mes pièces » couvre aussi l'ajout, l'import et la fiche
        // d'une pièce : ce sont des étapes de ce même onglet, pas des
        // ailleurs. Le marquer actif évite de croire qu'on s'est perdu.
        const actif = o.exact ? chemin === o.href : chemin.startsWith(o.href);
        return (
          <Link key={o.href} href={o.href} className={`${base} ${actif ? ici : repos}`}>
            {o.label}
          </Link>
        );
      })}

      {/* Une séparation nette entre où l'on va et ce que l'on fait. */}
      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/20" />

      <PanneauEdition brand={brand} />

      <Link
        href={`/espace-marque/${brand.slug}/pieces/ajouter`}
        className={`${base} bg-white text-[var(--color-ink)] hover:opacity-90`}
      >
        + Ajouter des pièces
      </Link>
    </div>
  );
}
