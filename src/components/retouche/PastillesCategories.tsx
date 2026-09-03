"use client";

import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";
import { useRetouche } from "./ContexteRetouche";

/**
 * Les catégories, cochées à la pastille.
 *
 * POURQUOI PAS `admin/CheckGroup`. Il tient ses cases en `defaultChecked`
 * et laisse le formulaire les relire à l'envoi : c'est exactement ce
 * qu'il faut quand il y a un formulaire, et inutilisable quand il y a un
 * brouillon. Cocher une pastille doit s'écrire tout de suite dans
 * l'objet, sinon la page et la feuille se contrediraient — la première
 * montrerait les catégories d'avant, la seconde celles d'après.
 *
 * `withExisting` GARDE CE QUI EST DÉJÀ EN BASE. Une marque peut porter
 * une valeur qui n'est plus au vocabulaire ; sans elle, modifier la
 * fiche la ferait disparaître en silence au premier enregistrement.
 */
export default function PastillesCategories() {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { brouillon, definir } = retouche;
  const toutes = withExisting(BRAND_CATEGORIES, brouillon.categories);

  return (
    <div className="flex flex-wrap gap-2">
      {toutes.map((categorie) => {
        const cochee = brouillon.categories.includes(categorie);
        return (
          <button
            key={categorie}
            type="button"
            aria-pressed={cochee}
            onClick={() =>
              definir(
                "categories",
                cochee
                  ? brouillon.categories.filter((c) => c !== categorie)
                  : [...brouillon.categories, categorie]
              )
            }
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition active:scale-[.97] ${
              cochee
                ? "border-white bg-white text-[var(--color-ink)]"
                : "border-white/30 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
          >
            {categorie}
          </button>
        );
      })}
    </div>
  );
}
