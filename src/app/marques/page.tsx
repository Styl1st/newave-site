import type { Metadata } from "next";
import BrandDirectory from "@/components/BrandDirectory";
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

export default async function BrandsPage() {
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
      </header>

      <BrandDirectory brands={brands} favoris={Array.from(favoris)} notes={notes} />
    </div>
  );
}
