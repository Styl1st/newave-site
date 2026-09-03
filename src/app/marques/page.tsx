import type { Metadata } from "next";
import BrandDirectory, { type AmorceAnnuaire } from "@/components/BrandDirectory";
import RaccourciAdmin from "@/components/RaccourciAdmin";
import { getBrands } from "@/lib/queries";
import { ordonnerLAnnuaire } from "@/lib/melange";
import { getMyFavorites } from "@/lib/favorites";
import { getNotesMarques } from "@/lib/avis";

export const metadata: Metadata = {
  title: "Marques",
  description:
    "L'annuaire des marques indépendantes et émergentes sélectionnées par NEWAVE SPHERE.",
};

/** Les favoris dependent de la session : la page ne peut pas etre figee. */
export const dynamic = "force-dynamic";

/**
 * L'ANNUAIRE SE LAISSE ADRESSER, et c'est ce qui rend possibles tous
 * les liens des autres pages vers une catégorie précise.
 *
 * `?cat=streetwear` ouvre l'annuaire avec le filtre déjà posé,
 * `?q=denim` avec le champ déjà rempli. Un rayon vide, une puce de
 * l'accueil ou une recherche commencée ailleurs aboutissent donc à la
 * bonne liste plutôt qu'à l'annuaire entier, où il faudrait tout
 * refaire à la main.
 *
 * `?recherche=1` reste lu dans `BrandDirectory` : il ne pose pas de
 * filtre, il pose un curseur, et cela ne se décide qu'une fois l'écran
 * mesuré.
 *
 * C'est ICI qu'on lit l'adresse, et pas dans le composant : un filtre
 * doit être posé avant le premier rendu, sinon la grille complète
 * s'affiche puis se réduit sous les yeux. La page est déjà
 * `force-dynamic` pour les favoris, lire son adresse ne lui coûte donc
 * rien de plus.
 */
type Props = { searchParams: Promise<AmorceAnnuaire> };

export default async function BrandsPage({ searchParams }: Props) {
  const { cat, q } = await searchParams;

  /*
   * L'ordre est retiré à chaque visite.
   *
   * Les fiches sortaient de la plus récente à la plus ancienne : les
   * mêmes marques tenaient la première page à chaque passage, et toutes
   * les autres attendaient derrière un bouton que personne ne clique.
   * Voir `ordonnerLAnnuaire` pour le détail, et notamment pourquoi les
   * marques à la une sont mélangées entre elles plutôt que figées.
   */
  const brands = ordonnerLAnnuaire(await getBrands());
  const favoris = await getMyFavorites(brands.map((b) => b.id));

  /*
   * Les moyennes en UNE requête pour toute la page.
   *
   * Elles existaient depuis la migration 14 mais n'étaient lues nulle
   * part : on pouvait noter une marque sans que cela se voie jamais
   * ailleurs que sur sa fiche. Une note qu'on dépose et qui disparaît
   * n'encourage personne à en déposer une deuxième.
   *
   * L'objet plutôt que la Map : ces données descendent jusqu'à un
   * composant client, et un objet simple traverse cette frontière sans
   * discussion.
   */
  const notes = Object.fromEntries(await getNotesMarques(brands.map((b) => b.id)));

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-10">
        <p className="eyebrow m-0">L&apos;annuaire</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Les marques
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Chaque marque ici a été lue, vérifiée et choisie. Pas de classement payant,
          pas de placement déguisé.
        </p>

        {/* Invisible pour les visiteurs. Voir `RaccourciAdmin`. */}
        <div className="mt-5">
          <RaccourciAdmin href="/admin/marques/nouveau">Ajouter une marque</RaccourciAdmin>
        </div>
      </header>

      {/* Les deux paramètres nommés un par un plutôt que l'objet
          entier : la liste de ce que l'annuaire accepte se lit ici,
          sans avoir à ouvrir le composant. */}
      <BrandDirectory
        brands={brands}
        favoris={Array.from(favoris)}
        notes={notes}
        amorce={{ cat, q }}
      />
    </div>
  );
}
