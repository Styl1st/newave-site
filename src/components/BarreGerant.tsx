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
 *
 * DEUX MISES EN PAGE, et non une seule qui se replie.
 *
 * Tout tenait dans une pastille unique avec `flex-wrap`. Sur un écran
 * large, une belle barre ; sur un téléphone, cinq éléments qui passent
 * à la ligne dans une forme aux bords arrondis à l'infini — un pâté.
 * Un contour en gélule ne veut rien dire dès qu'il fait deux lignes de
 * haut : le rayon est calculé pour une hauteur, pas pour deux.
 *
 * Sur téléphone on sépare donc franchement : les onglets dans leur
 * propre pastille, qui défile latéralement si l'écran est vraiment
 * étroit, et en dessous les deux actions côte à côte, de largeur
 * égale. C'est exactement la disposition d'un profil Instagram, et
 * elle a l'air voulue au lieu d'avoir l'air d'un débordement.
 *
 * Au-delà de 640 pixels, `sm:contents` fait disparaître les deux
 * conteneurs de la mise en page : les cinq éléments rejoignent la
 * même ligne et l'on retrouve la barre d'origine, inchangée.
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

  /* Les classes sont écrites en toutes lettres, jamais composées : la
     compilation de Tailwind lit le fichier source, elle ne devine pas
     ce qu'un gabarit de chaîne produira à l'exécution. */
  return (
    <div
      data-no-reveal
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5 sm:rounded-full sm:border sm:border-white/20 sm:bg-white/8 sm:p-1.5 sm:backdrop-blur-sm"
    >
      {/* Sur téléphone, cette étiquette coûterait une ligne entière
          pour ne rien apprendre : le titre de la page le dit déjà. */}
      <span className="hidden px-2.5 text-[10.5px] font-black uppercase tracking-[0.16em] text-white/50 sm:inline">
        Ta page
      </span>

      <div className="sans-ascenseur flex items-center gap-1.5 overflow-x-auto rounded-full border border-white/20 bg-white/8 p-1.5 backdrop-blur-sm sm:contents">
        {onglets.map((o) => {
          // « Mes pièces » couvre aussi l'ajout, l'import et la fiche
          // d'une pièce : ce sont des étapes de ce même onglet, pas des
          // ailleurs. Le marquer actif évite de croire qu'on s'est perdu.
          const actif = o.exact ? chemin === o.href : chemin.startsWith(o.href);
          return (
            <Link
              key={o.href}
              href={o.href}
              className={`${base} shrink-0 ${actif ? ici : repos}`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      {/* Une séparation nette entre où l'on va et ce que l'on fait.
          Inutile sur téléphone : les deux blocs sont déjà séparés. */}
      <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-white/20 sm:block" />

      <div className="flex items-stretch gap-2 sm:contents">
        <PanneauEdition
          brand={brand}
          className="flex-1 border border-white/20 bg-white/8 backdrop-blur-sm sm:flex-none sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
        />

        <Link
          href={`/espace-marque/${brand.slug}/pieces/ajouter`}
          className={`${base} flex-1 bg-white text-center text-[var(--color-ink)] hover:opacity-90 sm:flex-none`}
        >
          + Ajouter des pièces
        </Link>
      </div>
    </div>
  );
}
