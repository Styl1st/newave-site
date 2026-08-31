"use client";

import { useMemo, useState } from "react";
import BrandPreview from "./BrandPreview";
import LigneMarque from "./LigneMarque";
import type { Brand } from "@/lib/types";

/**
 * La liste des marques qu'on suit.
 *
 * C'EST LA LIGNE DE L'ANNUAIRE, ET C'EST VOULU. On a mis ces marques de
 * côté pour y revenir, c'est-à-dire pour voir ce qu'elles ont sorti
 * depuis. Une grille de cartes montre leur logo — qu'on connaît déjà,
 * puisqu'on les a choisies — et cache leurs pièces derrière un clic. La
 * ligne pose quatre pièces récentes dans la liste : la question qu'on se
 * pose en ouvrant ses favoris trouve sa réponse sans qu'on ouvre rien.
 *
 * LE CŒUR RESTE PLEIN ET ACTIF. Toutes les marques de cette page sont
 * en favori, le cœur y est donc toujours allumé — et il reste
 * cliquable, parce que c'est ici qu'on retire quelque chose de sa liste.
 * La ligne disparaîtra au rechargement, pas sous le doigt : un élément
 * qui s'évapore au clic emporte avec lui le moyen d'annuler.
 */

type Tri = "ajout" | "alpha";

export default function ListeFavoris({ brands }: { brands: Brand[] }) {
  const [tri, setTri] = useState<Tri>("ajout");
  const [ouvert, setOuvert] = useState<string | null>(null);

  /*
   * « Ajout récent » n'est pas un tri, c'est l'ordre d'arrivée :
   * `getFavoriteBrands` rend déjà la liste de la plus récente à la plus
   * ancienne. C'est aussi la seule trace de la date qui nous parvienne
   * — la colonne `created_at` sert au tri en base et ne remonte pas
   * jusqu'ici. On respecte donc cet ordre au lieu d'essayer de le
   * reconstituer.
   */
  const listee = useMemo(
    () =>
      tri === "alpha"
        ? [...brands].sort((a, b) =>
            a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
          )
        : brands,
    [brands, tri]
  );

  const pastille =
    "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition";
  const repos = "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white";
  const choisi = "bg-white font-extrabold text-[var(--color-ink)]";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span className="eyebrow shrink-0 text-white/45">Trier</span>
        {(
          [
            ["ajout", "Ajout récent"],
            ["alpha", "A → Z"],
          ] as const
        ).map(([id, libelle]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTri(id)}
            aria-pressed={tri === id}
            className={`${pastille} ${tri === id ? choisi : repos}`}
          >
            {libelle}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {listee.map((brand) => (
          <LigneMarque
            key={brand.id}
            brand={brand}
            favori={{ initial: true }}
            onApercu={() => setOuvert(brand.slug)}
          />
        ))}
      </div>

      {ouvert && <BrandPreview slug={ouvert} onClose={() => setOuvert(null)} />}
    </>
  );
}
