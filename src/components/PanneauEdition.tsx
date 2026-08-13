"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Portal from "./Portal";
import ImageUploader from "./admin/ImageUploader";
import SubmitBar from "./admin/SubmitBar";
import { Area, CheckGroup, Select, Text } from "./admin/fields";
import { saveBrandPresentation } from "@/app/espace-marque/actions";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";
import type { Brand } from "@/lib/types";

/**
 * Modifier sa page sans la quitter.
 *
 * Le formulaire vivait sur une page à part, et c'était elle qu'on
 * atteignait en cliquant sur « ma marque » : on arrivait donc sur un
 * écran d'administration au lieu de sa page. Ici, c'est l'inverse. On
 * voit sa page, exactement comme les visiteurs la voient, et on ouvre
 * ce panneau pour la retoucher. C'est le fonctionnement d'un profil,
 * et c'est celui que tout le monde connaît déjà.
 *
 * Le panneau est rendu dans un portail, hors de la page : posé dedans,
 * il aurait hérité de son plan d'empilement et serait passé sous la
 * barre du haut.
 */
export default function PanneauEdition({
  brand,
  className = "",
}: {
  brand: Brand;
  /** Ajouté au bouton d'ouverture, pour que la barre du gérant puisse
      lui donner sa largeur sur téléphone. */
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();

  // Le fond de la page ne défile plus derrière le panneau : sinon on
  // croit faire glisser le formulaire et c'est la page qui bouge.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", onKey);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = precedent;
    };
  }, [ouvert]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white/75 transition hover:bg-white/14 hover:text-white active:scale-[.97] ${className}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Modifier ma page
      </button>

      {ouvert && (
        <Portal>
          <div className="fixed inset-0 z-[90] flex justify-end">
            {/* Le voile. Cliquer à côté ferme, comme partout ailleurs. */}
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setOuvert(false)}
              className="absolute inset-0 bg-[rgba(12,4,32,0.62)] backdrop-blur-[3px]"
            />

            <div
              role="dialog"
              aria-modal
              aria-label="Modifier ma page"
              className="panneau-edition relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[rgba(26,9,64,0.94)] shadow-[-18px_0_50px_rgba(12,4,32,0.55)] backdrop-blur-2xl sm:border-l sm:border-white/20"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/15 bg-[rgba(26,9,64,0.92)] px-5 py-4 backdrop-blur-xl">
                <div>
                  <p className="eyebrow m-0">Ta page</p>
                  <h2 className="m-0 mt-1 text-[17px] font-extrabold text-white">
                    {brand.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  aria-label="Fermer"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/14 text-[15px] font-black text-white ring-1 ring-white/25 transition hover:bg-white/26 active:scale-95"
                >
                  ✕
                </button>
              </div>

              <form
                action={async (formData: FormData) => {
                  const res = await saveBrandPresentation(formData);
                  if (res.ok) {
                    setOuvert(false);
                    router.refresh();
                  }
                }}
                className="flex flex-col gap-6 p-5 pb-10"
              >
                <input type="hidden" name="slug" value={brand.slug} />

                <Text
                  name="tagline"
                  label="Ta phrase, en une ligne"
                  hint="Pas un slogan : ce que tu fais, dit simplement."
                  defaultValue={brand.tagline}
                  placeholder="Ce que tu fais, en une ligne"
                />

                <Area
                  name="description"
                  label="Ta démarche"
                  hint="Matières, ateliers, quantités, ce que tu refuses de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication."
                  rows={9}
                  defaultValue={brand.description}
                />

                <ImageUploader
                  name="cover_url"
                  label="Image de couverture"
                  defaultValue={brand.cover_url}
                  folder={`marques/${brand.slug}`}
                />
                <ImageUploader
                  name="logo_url"
                  label="Logo"
                  defaultValue={brand.logo_url}
                  folder={`marques/${brand.slug}`}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Text name="country" label="Pays" defaultValue={brand.country} />
                  <Text name="city" label="Ville" defaultValue={brand.city ?? ""} placeholder="Paris" />
                </div>

                <Text
                  name="founded_year"
                  label="Année de création"
                  type="number"
                  min={1900}
                  max={2100}
                  defaultValue={brand.founded_year ?? ""}
                />

                <CheckGroup
                  name="categories"
                  label="Tes catégories"
                  hint="Coche ce qui te correspond vraiment. En cocher dix pour être partout dessert plus qu'autre chose."
                  options={withExisting(BRAND_CATEGORIES, brand.categories)}
                  selected={brand.categories}
                />

                <Select name="price_tier" label="Gamme de prix" defaultValue={brand.price_tier}>
                  <option value="accessible">Accessible</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="premium">Premium</option>
                </Select>

                <Text
                  name="shop_url"
                  label="Boutique ou site officiel"
                  hint="Une seule adresse : celle où l'on peut acheter tes pièces."
                  type="url"
                  defaultValue={brand.shop_url ?? brand.website_url ?? ""}
                  placeholder="https://"
                />

                <Text
                  name="instagram"
                  label="Instagram"
                  hint="Sans l'arobase."
                  defaultValue={brand.instagram ?? ""}
                  placeholder="tamarque"
                />

                <SubmitBar label="Enregistrer ma page" />
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
