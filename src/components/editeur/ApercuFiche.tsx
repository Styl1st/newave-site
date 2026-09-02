"use client";

import { useState } from "react";
import BrandCard from "@/components/BrandCard";
import type { ValeursFiche } from "@/components/admin/etat-fiche";
import { vignette } from "@/lib/vignette";
import { ACCES_MESSAGE, unAcces } from "@/lib/acces";
import type { Brand } from "@/lib/types";

/**
 * Ce que la saisie en cours donne, pendant qu'on la tape.
 *
 * LE PROBLÈME QU'IL RÈGLE. L'accroche est « affichée sur la carte de
 * l'annuaire », le logo « passe devant la couverture » — c'est écrit
 * dans les aides du formulaire, mais la carte n'était visible nulle
 * part pendant qu'on la rédigeait. On écrivait donc à l'aveugle, on
 * enregistrait, on ouvrait l'annuaire, on revenait corriger.
 *
 * C'EST LA VRAIE CARTE, PAS UNE IMITATION. L'onglet « Carte » rend
 * `BrandCard`, le composant même que l'annuaire affiche, nourri des
 * valeurs relues dans le formulaire. Une reproduction aurait vieilli
 * dès la première retouche de la carte — et l'aperçu aurait alors menti
 * précisément là où on lui fait confiance.
 *
 * L'ONGLET « PAGE » EST UN RÉSUMÉ, ET IL LE DIT. La fiche publique est
 * un composant serveur qui interroge les pièces, les avis et les
 * favoris : elle ne peut pas se rendre à partir d'un formulaire ouvert
 * dans un navigateur. On montre donc ce que la saisie change vraiment
 * en haut de cette page — le visuel, le nom, l'accroche, la démarche —
 * et le bouton « Voir la page » reste là pour le reste.
 */
export default function ApercuFiche({
  brand,
  valeurs,
}: {
  /** La marque telle qu'elle est en base : sert de socle. */
  brand: Brand;
  /**
   * Ce que le formulaire porte à l'instant, déjà relu.
   *
   * Le type vient de `etat-fiche` plutôt que d'être recopié ici : une
   * seconde liste des champs se serait désynchronisée le jour où l'on
   * en ajoute un, et l'aperçu aurait alors ignoré le nouveau sans un mot.
   */
  valeurs: ValeursFiche;
}) {
  const [onglet, setOnglet] = useState<"carte" | "page">("carte");

  /*
   * La fiche telle qu'elle serait si l'on enregistrait maintenant.
   *
   * On part de la marque en base et l'on repose dessus ce que porte le
   * formulaire : les colonnes que l'éditeur ne demande pas — l'identifiant,
   * la date de publication, `website_url` — restent celles de la base,
   * exactement comme l'action serveur les laisse tranquilles.
   */
  const enCours: Brand = {
    ...brand,
    name: valeurs.name || brand.name,
    slug: valeurs.adresse || brand.slug,
    tagline: valeurs.tagline,
    description: valeurs.description,
    country: valeurs.country,
    city: valeurs.city || null,
    founded_year: valeurs.founded_year ? Number(valeurs.founded_year) : null,
    categories: valeurs.categories,
    price_tier: valeurs.price_tier as Brand["price_tier"],
    shop_url: valeurs.shop_url || null,
    instagram: valeurs.instagram || null,
    logo_url: valeurs.logo_url || null,
    cover_url: valeurs.cover_url || null,
    cover_video_url: valeurs.cover_video_url || null,
    featured: valeurs.featured,
    audience: valeurs.audience,
    acces: valeurs.acces,
  };

  const acces = unAcces(enCours.acces);
  const message = acces === "ouvert" ? null : ACCES_MESSAGE[acces];

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/12 bg-[rgba(var(--voile),0.52)] px-3.5 py-2.5">
        <p className="eyebrow m-0">Aperçu</p>

        {/* Deux vues, jamais deux composants pour la même chose : la
            bascule ne fait que choisir laquelle on regarde. */}
        <div
          role="tablist"
          aria-label="Vue de l'aperçu"
          className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5"
        >
          {(["carte", "page"] as const).map((cle) => (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={onglet === cle}
              onClick={() => setOnglet(cle)}
              className={
                onglet === cle
                  ? "rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.07em] text-[var(--color-ink)]"
                  : "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.07em] text-white/65 transition hover:text-white"
              }
            >
              {cle === "carte" ? "Carte" : "Page"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3.5">
        {onglet === "carte" ? (
          /*
           * `pointer-events-none` : la carte porte le lien qui mène à la
           * fiche publique, et un aperçu sur lequel on clique par
           * réflexe emporterait la saisie en cours sans prévenir. On
           * regarde, on ne navigue pas.
           */
          <div className="pointer-events-none select-none">
            <BrandCard brand={enCours} />
          </div>
        ) : (
          <TeteDePage marque={enCours} message={message} />
        )}
      </div>

      <p className="m-0 border-t border-white/12 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-white/50">
        {onglet === "carte"
          ? "La carte de l'annuaire, telle quelle. Le logo passe devant la couverture : c'est lui qu'on reconnaît dans une grille."
          : "Le haut de la page publique, en résumé. Les pièces, les avis et les favoris n'y sont pas : ils ne se devinent pas depuis un formulaire."}
      </p>
    </section>
  );
}

/** Le haut de la fiche publique, réduit à ce que la saisie commande. */
function TeteDePage({
  marque,
  message,
}: {
  marque: Brand;
  message: { titre: string; corps: string } | null;
}) {
  const visuel = marque.cover_url ?? marque.logo_url;
  const origine =
    [marque.city, marque.country].filter(Boolean).join(" · ") ||
    (marque.founded_year ? `Depuis ${marque.founded_year}` : "");

  return (
    <div className="overflow-hidden rounded-[16px] border border-white/16 bg-[rgba(var(--voile),0.42)]">
      <div className="relative aspect-16/9 w-full overflow-hidden bg-[rgba(var(--voile),0.6)]">
        {visuel ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vignette(visuel, 600)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Aucun visuel
          </span>
        )}

        {/* La plaque du bandeau : un lettrage sombre sur une photo
            sombre disparaît, et c'est le nom de la marque qu'on perd. */}
        <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-[10px] bg-[rgba(var(--voile),0.82)] px-2.5 py-1.5 text-[11.5px] font-extrabold text-white backdrop-blur-sm">
          {marque.name || "Sans nom"}
        </span>
      </div>

      <div className="p-3.5">
        {origine && (
          <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/55">
            {origine}
          </p>
        )}

        <p className="m-0 mt-1.5 text-[15px] font-extrabold leading-snug tracking-[-0.02em] text-white">
          {marque.tagline || "Pas encore d'accroche."}
        </p>

        {/* Trois lignes suffisent à voir si le texte tombe juste ; la
            démarche entière se lit dans le champ, à gauche. */}
        <p className="m-0 mt-2 line-clamp-4 text-[12.5px] leading-relaxed text-white/70">
          {marque.description || "Pas encore de description."}
        </p>

        {marque.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {marque.categories.slice(0, 6).map((categorie) => (
              <span
                key={categorie}
                className="rounded-full bg-white/12 px-2.5 py-1 text-[10.5px] font-bold text-white/80"
              >
                {categorie}
              </span>
            ))}
          </div>
        )}

        {/* Ce qui remplace le catalogue quand la boutique n'est pas
            ouverte à qui passe. C'est la conséquence la plus visible du
            champ « Comment on achète », et elle méritait d'être vue
            avant d'enregistrer. */}
        {message && (
          <div className="mt-3 rounded-[12px] border border-white/16 bg-white/8 p-3">
            <p className="m-0 text-[12.5px] font-extrabold text-white">{message.titre}</p>
            <p className="m-0 mt-1 text-[11.5px] leading-relaxed text-white/65">
              {message.corps}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
