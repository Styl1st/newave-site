"use client";

import Link from "next/link";
import { useState } from "react";
import DeleteButton from "@/components/admin/DeleteButton";
import PublishToggle from "@/components/admin/PublishToggle";
import { deleteBrand } from "@/app/admin/actions";
import { vignette } from "@/lib/vignette";
import type { Brand } from "@/lib/types";

/**
 * L'en-tête de la fiche : qui l'on modifie, et où l'on va ensuite.
 *
 * IL RESTE EN HAUT, PARCE QUE LE FORMULAIRE EST LONG. On descend dans
 * « Le classement » et l'on ne sait plus quelle marque on corrige — ce
 * qui arrive vraiment quand on en enchaîne dix. Le nom, l'état et les
 * sorties restent donc sous la main.
 *
 * SAUF SUR TÉLÉPHONE, ET C'EST DÉLIBÉRÉ. La barre du site est déjà
 * collante : deux bandeaux superposés mangent le tiers d'un écran de
 * 390 pixels, et il ne reste plus qu'une fenêtre de trois champs pour
 * remplir un formulaire de vingt. En dessous de `sm`, l'en-tête défile
 * donc avec la page. Ce qui doit rester à portée là-bas, c'est la barre
 * d'enregistrement, et elle est en bas.
 *
 * « SUPPRIMER » EST REPLIÉ. Il n'a rien à faire à côté de « Voir la
 * page » : ce sont deux gestes de gravité incomparable, et une rangée
 * les met à la même distance du doigt. Il vit donc dans le menu, et
 * demande de toute façon deux appuis.
 */
export default function EnteteFiche({
  brand,
  estAdmin,
  /** L'état d'enregistrement, remonté par l'éditeur. */
  enCours,
  enregistre,
}: {
  brand: Brand;
  estAdmin: boolean;
  enCours: boolean;
  enregistre: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const enLigne = brand.status === "published";

  const bouton =
    "rounded-full border border-white/25 bg-white/8 px-3.5 py-2 text-[12px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97]";

  return (
    <header className="mb-4 sm:sticky sm:top-[70px] sm:z-30">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-[20px] border border-white/20 bg-[rgba(var(--voile),0.72)] px-3 py-2.5 backdrop-blur-[20px] sm:px-4">
        {/* Le logo, sur une plaque claire : beaucoup de lettrages sont
            noirs, et posés à même le verre ils disparaissent. */}
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center overflow-hidden rounded-[13px] bg-white/90">
          {brand.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vignette(brand.logo_url, 120, { logo: true })}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="text-[15px] font-black text-[var(--color-ink)]">
              {brand.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          {/* Le fil d'Ariane dit d'où l'on vient, et les deux publics ne
              viennent pas du même endroit : l'administration de sa
              liste, un créateur de sa propre page. */}
          <p className="m-0 truncate text-[10.5px] font-black uppercase tracking-[0.14em] text-white/50">
            {estAdmin ? (
              <>
                <Link href="/admin/marques" className="transition hover:text-white/85">
                  Marques
                </Link>
                <span aria-hidden> / </span>
              </>
            ) : (
              <>
                <Link href={`/marques/${brand.slug}`} className="transition hover:text-white/85">
                  Ma page
                </Link>
                <span aria-hidden> / </span>
              </>
            )}
            Modifier
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 truncate text-[17px] font-extrabold tracking-[-0.02em] text-white sm:text-[19px]">
              {brand.name}
            </h1>

            <span
              className={
                enLigne
                  ? "rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)]"
                  : "rounded-full bg-white/15 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-[0.1em] text-white/80"
              }
            >
              {enLigne ? "En ligne" : "Brouillon"}
            </span>

            <EtatEnregistrement enCours={enCours} enregistre={enregistre} />
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {/* Publier n'appartient qu'à l'administration, et le bouton
              applique la règle commune : c'est `toggleBrandStatus` qui
              relit `obstacleAPublication` avant d'écrire. */}
          {/* Taille normale, et non « compacte » : la version compacte
              est dessinée pour une ligne de liste sur carte claire, et
              son encre sombre disparaîtrait sur ce verre-ci. */}
          {estAdmin && (
            <PublishToggle brandId={brand.id} brandName={brand.name} published={enLigne} />
          )}

          <Link href={`/marques/${brand.slug}`} className={bouton}>
            Voir la page
          </Link>
          <Link href={`/espace-marque/${brand.slug}/pieces`} className={bouton}>
            Pièces
          </Link>
          <Link href={`/espace-marque/${brand.slug}/stats`} className={bouton}>
            Statistiques
          </Link>

          {estAdmin && (
            <div className="relative">
              <button
                type="button"
                aria-label="Autres actions"
                aria-expanded={menu}
                onClick={() => setMenu((o) => !o)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/8 text-[15px] font-black leading-none text-white/80 transition hover:border-white/60 hover:bg-white/18 hover:text-white"
              >
                ⋮
              </button>

              {menu && (
                <>
                  {/* Cliquer à côté referme, comme partout ailleurs. */}
                  <button
                    type="button"
                    aria-label="Fermer le menu"
                    onClick={() => setMenu(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 top-11 z-20 rounded-[16px] border border-white/20 bg-[rgba(var(--voile),0.92)] p-3 shadow-[0_16px_42px_-12px_rgba(var(--voile),0.9)] backdrop-blur-[24px]">
                    <DeleteButton
                      action={deleteBrand}
                      id={brand.id}
                      label="Supprimer la marque"
                      confirmText="Supprimer la marque supprimera aussi ses pièces. Appuie encore pour confirmer."
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * « Enregistrement… », puis « Enregistré ».
 *
 * Trois pixels de vert valent mieux qu'une phrase : ce qu'on veut
 * savoir, c'est si le clic a pris, et on veut le savoir sans quitter
 * des yeux le champ qu'on vient de corriger.
 */
function EtatEnregistrement({ enCours, enregistre }: { enCours: boolean; enregistre: boolean }) {
  const actif = enCours || enregistre;

  /*
   * La zone existe toujours, même vide, et n'apparaît pas au moment où
   * elle a quelque chose à dire : un lecteur d'écran n'annonce que les
   * changements d'une région déjà présente, et une région créée avec
   * son contenu passe en silence.
   */
  return (
    <span
      aria-live="polite"
      className={
        actif
          ? "inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-white/70"
          : "sr-only"
      }
    >
      {actif && (
        <>
          <span
            aria-hidden
            className="h-[7px] w-[7px] rounded-full"
            style={{
              background: enCours ? "rgba(255,255,255,0.55)" : "#57d99a",
              boxShadow: enCours ? undefined : "0 0 0 3px rgba(87,217,154,0.22)",
            }}
          />
          {enCours ? "Enregistrement…" : "Enregistré"}
        </>
      )}
    </span>
  );
}
