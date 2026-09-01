"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Portal from "./Portal";
import BrandPrefill from "./admin/BrandPrefill";
import ImageUploader from "./admin/ImageUploader";
import VisuelCouverture from "./admin/VisuelCouverture";
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
 *
 * L'ADMINISTRATION SE SERT DU MÊME PANNEAU. Elle avait son formulaire à
 * elle, qui demandait les mêmes choses avec d'autres mots : deux
 * définitions d'une même fiche, dont une seule était corrigée quand on
 * s'apercevait qu'il manquait un champ. Seule la VOIX change ici —
 * « ta démarche » ou « sa démarche » —, jamais les champs, jamais leurs
 * noms, jamais l'action qui enregistre.
 *
 * ET SURTOUT PAS LES DROITS. Cette voix ne donne rien à personne : elle
 * ne fait que choisir des mots. Qui a le droit d'écrire sur quelle
 * marque se décide dans `saveBrandPresentation`, qui relit le rôle en
 * base à chaque envoi. Un visiteur qui rendrait ce panneau visible dans
 * son navigateur n'obtiendrait qu'un formulaire dont l'envoi est refusé.
 */

/** Qui parle : la marque chez elle, ou l'administration. */
type Voix = "gerant" | "administration";

const MOTS: Record<
  Voix,
  {
    bouton: string;
    surtitre: string;
    accrocheLabel: string;
    accrocheAide: string;
    accrochePlaceholder: string;
    demarcheLabel: string;
    demarcheAide: string;
    categoriesLabel: string;
    categoriesAide: string;
    boutiqueAide: string;
    envoyer: string;
  }
> = {
  gerant: {
    bouton: "Modifier ma page",
    surtitre: "Ta page",
    accrocheLabel: "Ta phrase, en une ligne",
    accrocheAide: "Pas un slogan : ce que tu fais, dit simplement.",
    accrochePlaceholder: "Ce que tu fais, en une ligne",
    demarcheLabel: "Ta démarche",
    demarcheAide:
      "Matières, ateliers, quantités, ce que tu refuses de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication.",
    categoriesLabel: "Tes catégories",
    categoriesAide:
      "Coche ce qui te correspond vraiment. En cocher dix pour être partout dessert plus qu'autre chose.",
    boutiqueAide: "Une seule adresse : celle où l'on peut acheter tes pièces.",
    envoyer: "Enregistrer ma page",
  },
  administration: {
    bouton: "Modifier la fiche",
    surtitre: "La fiche",
    accrocheLabel: "La phrase, en une ligne",
    accrocheAide: "Pas un slogan : ce que fait la marque, dit simplement.",
    accrochePlaceholder: "Ce qu'elle fait, en une ligne",
    demarcheLabel: "Sa démarche",
    demarcheAide:
      "Matières, ateliers, quantités, ce qu'elle refuse de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication.",
    categoriesLabel: "Ses catégories",
    categoriesAide:
      "Coche ce qui lui correspond vraiment. En cocher dix pour la mettre partout la dessert plus qu'autre chose.",
    boutiqueAide: "Une seule adresse : celle où l'on peut acheter ses pièces.",
    envoyer: "Enregistrer la fiche",
  },
};

export default function PanneauEdition({
  brand,
  className = "",
  voix = "gerant",
}: {
  brand: Brand;
  /** Ajouté au bouton d'ouverture, pour que la barre du gérant puisse
      lui donner sa largeur sur téléphone. */
  className?: string;
  /** Les mots, et rien d'autre. Voir le commentaire du fichier. */
  voix?: Voix;
}) {
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();

  const mots = MOTS[voix];
  const administration = voix === "administration";

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
        {mots.bouton}
      </button>

      {ouvert && (
        <Portal>
          {/* SUR TÉLÉPHONE, UNE FEUILLE QUI MONTE ; sur ordinateur, un
              panneau qui vient de la droite.
              Un panneau plein écran arrivant par le côté sur un
              téléphone ne se lit pas comme un panneau : il se lit comme
              un changement de page, brutal, et on ne sait plus si l'on
              a quitté sa fiche. La feuille par le bas est le geste que
              tout le monde connaît, et elle laisse voir la page
              au-dessus, donc on sait qu'on n'est pas parti. */}
          <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-stretch sm:justify-end">
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
              aria-label={mots.bouton}
              className="panneau-edition relative flex h-[92svh] w-full flex-col overflow-y-auto rounded-t-[26px] shadow-[0_-18px_50px_rgba(12,4,32,0.5)] backdrop-blur-2xl sm:h-full sm:max-w-xl sm:rounded-none sm:border-l sm:border-white/20 sm:shadow-[-18px_0_50px_rgba(12,4,32,0.55)]"
            >
              {/* La poignée : elle ne fait rien, et c'est très bien.
                  Elle dit « ceci se ferme en tirant vers le bas », ce
                  qu'on essaiera de toute façon. */}
              <span
                aria-hidden
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/30 sm:hidden"
              />

              <div className="panneau-entete sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/15 px-5 py-4 backdrop-blur-xl">
                <div>
                  <p className="eyebrow m-0">{mots.surtitre}</p>
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

                {/* RELIRE LA BOUTIQUE, réservé à l'administration.
                    Le bloc est posé DANS le formulaire, et pas sur la
                    page qui l'ouvre : il remplit les champs en écrivant
                    dedans, et ceux-ci n'existent que panneau ouvert.
                    Ailleurs, il aurait annoncé avoir tout repris sans
                    que rien n'ait bougé.
                    Une marque ne le voit pas : chez elle, ce qu'elle a
                    écrit sur sa propre démarche vaut mieux que ce qu'un
                    robot lit sur sa page d'accueil. */}
                {administration && <BrandPrefill modeCreation={false} />}

                <Text
                  name="tagline"
                  label={mots.accrocheLabel}
                  hint={mots.accrocheAide}
                  defaultValue={brand.tagline}
                  placeholder={mots.accrochePlaceholder}
                />

                <Area
                  name="description"
                  label={mots.demarcheLabel}
                  hint={mots.demarcheAide}
                  rows={9}
                  defaultValue={brand.description}
                />

                <VisuelCouverture
                  image={brand.cover_url}
                  video={brand.cover_video_url}
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
                  label={mots.categoriesLabel}
                  hint={mots.categoriesAide}
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
                  hint={mots.boutiqueAide}
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

                <SubmitBar label={mots.envoyer} />
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
