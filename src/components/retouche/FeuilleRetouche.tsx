"use client";

import { useEffect } from "react";
import Portal from "@/components/Portal";
import { Area, Label, Select, Text } from "@/components/admin/fields";
import { vignette } from "@/lib/vignette";
import EnvoiVisuel from "./EnvoiVisuel";
import PastillesCategories from "./PastillesCategories";
import { useRetouche } from "./ContexteRetouche";

/**
 * La retouche, au doigt.
 *
 * POURQUOI ELLE EXISTE ENCORE. L'édition en place est un geste de
 * souris : on survole, un cadre apparaît, on clique dedans, on tape à
 * côté de ce qu'on est en train de lire. Au doigt, il n'y a pas de
 * survol, la cible fait dix-neuf pixels de haut, et le clavier virtuel
 * recouvre la moitié de l'écran — dont, une fois sur deux, le champ
 * qu'on vient d'ouvrir. Sur téléphone, la fiche se retouche donc dans
 * une feuille qui monte, comme avant.
 *
 * ET C'EST LE MÊME BROUILLON. Ce n'est pas un second formulaire : chaque
 * champ d'ici lit et écrit l'objet que la page écrit aussi. Commencer
 * une phrase sur la page, finir dans la feuille, n'enregistrer qu'une
 * fois : rien à réconcilier, il n'y a jamais eu qu'une valeur.
 *
 * LA FEUILLE PLUTÔT QUE LE PANNEAU LATÉRAL. Un panneau plein écran
 * arrivant par le côté ne se lit pas comme un panneau : il se lit comme
 * un changement de page, et l'on ne sait plus si l'on a quitté sa fiche.
 * La feuille par le bas est le geste que tout le monde connaît, et elle
 * laisse voir la page au-dessus.
 *
 * Elle est rendue dans un portail, hors de la page : posée dedans, elle
 * aurait hérité de son plan d'empilement et serait passée sous la barre
 * du haut.
 */

const GAMMES = [
  { valeur: "accessible", libelle: "Accessible" },
  { valeur: "intermediaire", libelle: "Intermédiaire" },
  { valeur: "premium", libelle: "Premium" },
];

export default function FeuilleRetouche() {
  const retouche = useRetouche();
  const feuille = Boolean(retouche?.feuille);
  const champOuvert = retouche?.champOuvert ?? null;
  const fermerFeuille = retouche?.fermerFeuille;

  // Le fond de la page ne défile plus derrière la feuille : sinon on
  // croit faire glisser le formulaire et c'est la page qui bouge.
  useEffect(() => {
    if (!feuille || !fermerFeuille) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && fermerFeuille();
    document.addEventListener("keydown", surTouche);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = precedent;
    };
  }, [feuille, fermerFeuille]);

  /*
   * On vient d'ouvrir la feuille depuis un bloc de la page : c'est SON
   * champ qu'on veut sous les doigts. `focus()` fait défiler la feuille
   * jusqu'à lui — et respecte le réglage « animations réduites » du
   * système, ce qu'un défilement programmé ignorerait.
   */
  useEffect(() => {
    if (!feuille || !champOuvert) return;
    const minuteur = window.setTimeout(() => {
      document.getElementById(champOuvert)?.focus();
    }, 120);
    return () => window.clearTimeout(minuteur);
  }, [feuille, champOuvert]);

  if (!retouche || !feuille) return null;

  const { brouillon, definir, mots, slug, modifications, enCours, enregistrer, annulerTout } =
    retouche;
  const dossier = `marques/${slug}`;
  const apercu = brouillon.cover_video_url || brouillon.cover_url;

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-stretch sm:justify-end">
        {/* Le voile. Cliquer à côté ferme, comme partout ailleurs. */}
        <button
          type="button"
          aria-label="Fermer"
          onClick={retouche.fermerFeuille}
          className="absolute inset-0 bg-[rgba(var(--voile),0.62)] backdrop-blur-[3px]"
        />

        <div
          role="dialog"
          aria-modal
          aria-label={mots.bouton}
          className="panneau-edition relative flex h-[92svh] w-full flex-col overflow-y-auto rounded-t-[26px] shadow-[0_-18px_50px_rgba(12,4,32,0.5)] backdrop-blur-2xl sm:h-full sm:max-w-xl sm:rounded-none sm:border-l sm:border-white/20 sm:shadow-[-18px_0_50px_rgba(12,4,32,0.55)]"
        >
          {/* La poignée : elle ne fait rien, et c'est très bien. Elle dit
              « ceci se ferme en tirant vers le bas », ce qu'on essaiera
              de toute façon. */}
          <span
            aria-hidden
            className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/30 sm:hidden"
          />

          <div className="panneau-entete sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/15 px-5 py-4 backdrop-blur-xl">
            <div className="min-w-0">
              <p className="eyebrow m-0">{mots.surtitre}</p>
              <h2 className="m-0 mt-1 truncate text-[17px] font-extrabold text-white">
                {retouche.nom}
              </h2>
            </div>
            <button
              type="button"
              onClick={retouche.fermerFeuille}
              aria-label="Fermer"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/14 text-[15px] font-black text-white ring-1 ring-white/25 transition hover:bg-white/26 active:scale-95"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-6 p-5 pb-8">
            <Text
              name="tagline"
              label={mots.accrocheLabel}
              hint={mots.accrocheAide}
              value={brouillon.tagline}
              placeholder={mots.accrochePlaceholder}
              onChange={(e) => definir("tagline", e.target.value)}
            />

            <Area
              name="description"
              label={mots.demarcheLabel}
              hint={mots.demarcheAide}
              rows={9}
              value={brouillon.description}
              onChange={(e) => definir("description", e.target.value)}
            />

            {/* ---------- les visuels ---------- */}
            <div>
              <Label
                htmlFor="cover_url"
                hint="Une image ou une vidéo. Les images sont compressées automatiquement."
              >
                Visuel de couverture
              </Label>

              {apercu && (
                <div className="mb-3 overflow-hidden rounded-[13px] border border-white/25">
                  {brouillon.cover_video_url ? (
                    <video
                      src={brouillon.cover_video_url}
                      poster={brouillon.cover_url ? vignette(brouillon.cover_url, 800) : undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="block max-h-64 w-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={vignette(brouillon.cover_url, 800)}
                      alt=""
                      className="block max-h-64 w-full object-cover"
                    />
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <EnvoiVisuel
                  dossier={dossier}
                  libelle="Envoyer une image"
                  className="rounded-full bg-white px-4 py-2.5 text-[12px] font-black text-[var(--color-ink)]"
                  onEnvoye={(adresse) => definir("cover_url", adresse)}
                />
                <EnvoiVisuel
                  dossier={dossier}
                  accepte="video/mp4,video/webm"
                  libelle="Envoyer une vidéo"
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white/85"
                  onEnvoye={(adresse) => definir("cover_video_url", adresse)}
                />
                {brouillon.cover_video_url && (
                  <button
                    type="button"
                    onClick={() => definir("cover_video_url", "")}
                    className="rounded-full px-3 py-2.5 text-[11.5px] font-bold text-white/70 underline decoration-white/40 underline-offset-4"
                  >
                    Retirer l&apos;animation
                  </button>
                )}
              </div>

              <input
                id="cover_url"
                className="champ mt-3"
                value={brouillon.cover_url}
                placeholder="…ou colle l'adresse d'une image"
                onChange={(e) => definir("cover_url", e.target.value)}
              />

              {brouillon.cover_video_url && !brouillon.cover_url && (
                <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white/70">
                  Il manque une image fixe : les cartes de l&apos;annuaire et l&apos;aperçu de
                  partage ne savent pas lire une vidéo.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="logo_url" hint="JPG, PNG ou WebP.">
                Logo
              </Label>

              <div className="flex flex-wrap items-center gap-2">
                <EnvoiVisuel
                  dossier={dossier}
                  libelle={brouillon.logo_url ? "Remplacer le logo" : "Envoyer un logo"}
                  className="rounded-full bg-white px-4 py-2.5 text-[12px] font-black text-[var(--color-ink)]"
                  onEnvoye={(adresse) => definir("logo_url", adresse)}
                />
                {brouillon.logo_url && (
                  <button
                    type="button"
                    onClick={() => definir("logo_url", "")}
                    className="rounded-full px-3 py-2.5 text-[11.5px] font-bold text-white/70 underline decoration-white/40 underline-offset-4"
                  >
                    Retirer
                  </button>
                )}
              </div>

              <input
                id="logo_url"
                className="champ mt-3"
                value={brouillon.logo_url}
                placeholder="…ou colle une adresse"
                onChange={(e) => definir("logo_url", e.target.value)}
              />
            </div>

            {/* La colonne unique est écrite noir sur blanc au premier
                palier : sans elle, la grille se fabrique une colonne
                `auto` taillée sur son enfant le plus large, et un champ
                un peu long fait déborder toute la feuille. */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
              <Text
                name="country"
                label="Pays"
                value={brouillon.country}
                onChange={(e) => definir("country", e.target.value)}
              />
              <Text
                name="city"
                label="Ville"
                value={brouillon.city}
                placeholder="Paris"
                onChange={(e) => definir("city", e.target.value)}
              />
            </div>

            <Text
              name="founded_year"
              label="Année de création"
              type="number"
              min={1900}
              max={2100}
              value={brouillon.founded_year}
              onChange={(e) => definir("founded_year", e.target.value)}
            />

            <div>
              <Label htmlFor="categories" hint={mots.categoriesAide}>
                {mots.categoriesLabel}
              </Label>
              <div id="categories" tabIndex={-1}>
                <PastillesCategories />
              </div>
            </div>

            <Select
              name="price_tier"
              label="Gamme de prix"
              value={brouillon.price_tier}
              onChange={(e) => definir("price_tier", e.target.value)}
            >
              {GAMMES.map((gamme) => (
                <option key={gamme.valeur} value={gamme.valeur}>
                  {gamme.libelle}
                </option>
              ))}
            </Select>

            <Text
              name="shop_url"
              label="Boutique ou site officiel"
              hint={mots.boutiqueAide}
              type="url"
              value={brouillon.shop_url}
              placeholder="https://"
              onChange={(e) => definir("shop_url", e.target.value)}
            />

            <Text
              name="instagram"
              label="Instagram"
              hint="Sans l'arobase."
              value={brouillon.instagram}
              placeholder="tamarque"
              onChange={(e) => definir("instagram", e.target.value)}
            />
          </div>

          {/* L'enregistrement vit AUSSI ici. La barre flottante est sous
              la feuille — c'est le propre d'une feuille de tout
              recouvrir —, et un bouton qu'on ne peut pas atteindre sans
              refermer ce qu'on est en train de remplir n'est pas un
              bouton. */}
          {modifications > 0 && (
            <div className="panneau-entete sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-white/15 px-5 py-3.5 backdrop-blur-xl">
              <p className="m-0 text-[12px] font-bold text-white/80">
                {modifications} modification{modifications > 1 ? "s" : ""} non enregistrée
                {modifications > 1 ? "s" : ""}
              </p>
              <div className="flex flex-1 items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={annulerTout}
                  disabled={enCours}
                  className="rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white/70 transition hover:bg-white/14 hover:text-white active:scale-[.97] disabled:opacity-50"
                >
                  Tout annuler
                </button>
                <button
                  type="button"
                  onClick={enregistrer}
                  disabled={enCours}
                  className="rounded-full bg-white px-4 py-2 text-[12.5px] font-black text-[var(--color-ink)] transition active:scale-[.97] disabled:opacity-60"
                >
                  {enCours ? "Enregistrement…" : mots.envoyer}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
