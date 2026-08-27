"use client";

import { useEffect, useMemo, useState } from "react";
import BrandGrid from "./BrandGrid";
import { IconChevron, IconFiltre } from "./Icons";
import type { Brand, PriceTier } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";
import { estUnArtiste } from "@/lib/boutiques";
import { AUDIENCES, AUDIENCE_FILTRE, uneAudience, type Audience } from "@/lib/audience";

const TIERS: PriceTier[] = ["accessible", "intermediaire", "premium"];

export default function BrandDirectory({
  brands,
  favoris,
  notes,
}: {
  brands: Brand[];
  /** Les marques déjà suivies, pour allumer la bonne étoile. */
  favoris?: string[];
  /** Les moyennes d'avis, par identifiant de marque. */
  notes?: Record<string, { moyenne: number; avis: number }>;
}) {
  const [query, setQuery] = useState("");
  /*
   * PLUSIEURS CATÉGORIES À LA FOIS, ET ELLES SE CUMULENT.
   *
   * Il n'y en avait qu'une : choisir « Denim » effaçait « Streetwear ».
   * On ne pouvait donc pas chercher une marque qui fait les deux, ce
   * qui est pourtant la façon normale d'affiner une recherche.
   *
   * Le cumul est un ET, pas un OU. Un OU donnerait toutes les marques
   * streetwear PLUS toutes les marques denim, ce qui élargit au lieu de
   * réduire et ne ressemble pas à ce qu'on attend en cochant une case de
   * plus.
   *
   * Le ET a un défaut connu, mener vite à une liste vide, et c'est
   * exactement ce que le comptage plus bas empêche : une puce ne
   * s'affiche que si elle laisse au moins une marque debout. On ne peut
   * donc pas construire une combinaison qui ne donne rien.
   */
  const [choisies, setChoisies] = useState<string[]>([]);

  const basculer = (c: string) =>
    setChoisies((liste) =>
      liste.includes(c) ? liste.filter((x) => x !== c) : [...liste, c]
    );
  const [tier, setTier] = useState<PriceTier | null>(null);
  /*
   * LE VESTIAIRE, ET IL SE CHOISIT SEUL.
   *
   * Une seule valeur à la fois, contrairement aux catégories : personne
   * ne cherche « féminin ET masculin », c'est déjà ce que veut dire ne
   * rien cocher. Une liste à cocher aurait proposé une combinaison qui
   * n'apporte rien.
   *
   * Et il ne se cumule pas non plus AVEC lui-même : « Mixte » est une
   * réponse, pas une absence de réponse. Une marque mixte ne ressort
   * donc pas sous « Femme », sans quoi le filtre ne réduirait presque
   * rien et n'aurait aucun intérêt.
   */
  const [audience, setAudience] = useState<Audience | null>(null);
  const [ouvert, setOuvert] = useState(false);
  /*
   * Marque ou artiste : la distinction la plus utile de l'annuaire.
   *
   * Une marque a une boutique, des tailles, des séries. Un artiste fait
   * lui-même, souvent à l'unité, parfois sans rien vendre en ligne. On
   * ne cherche pas la même chose selon les jours, et noyer les seconds
   * parmi les premiers revenait à les rendre introuvables.
   *
   * L'appartenance ne se coche plus forcément : vendre sur Vinted ou
   * Depop suffit à ranger quelqu'un ici, parce que c'est déjà la
   * réponse à la question. Voir `estUnArtiste`.
   */
  const [genre, setGenre] = useState<"tout" | "marques" | "artistes">("tout");

  // Le compteur sur le bouton : sans lui, un filtre actif derrière un
  // panneau replié devient invisible, et la liste paraît incomplète
  // sans qu'on comprenne pourquoi.
  const actifs = choisies.length + (tier ? 1 : 0) + (audience ? 1 : 0);

  function reinitialiser() {
    setChoisies([]);
    setTier(null);
    setAudience(null);
  }

  /*
   * UN FILTRE QUI NE MÈNE NULLE PART NE DOIT PAS S'AFFICHER.
   *
   * On listait toutes les catégories de l'annuaire, tout le temps. En
   * cliquant sur « Artistes » puis sur une catégorie que seules des
   * marques portent, on tombait sur une grille vide — et rien
   * n'indiquait que c'était la combinaison, et non le site, qui était
   * en cause. Les mêmes trois clics, répétés, finissent par donner
   * l'impression que l'annuaire est à moitié vide.
   *
   * D'où ce découpage en trois temps. La recherche d'abord, l'onglet
   * ensuite, et seulement à partir de ce qu'il en reste on établit les
   * filtres proposés, chacun avec son compte. Un filtre affiché ramène
   * donc toujours au moins une marque, et le chiffre dit combien avant
   * même de cliquer.
   */
  const parRecherche = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q) ||
        b.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [brands, query]);

  // Le compte des onglets s'établit AVANT l'onglet lui-même, sinon
  // « Artistes » afficherait le nombre de marques et inversement.
  const parGenre = useMemo(() => {
    let marques = 0;
    let artistes = 0;
    for (const b of parRecherche) {
      if (estUnArtiste(b)) artistes++;
      else marques++;
    }
    return { tout: parRecherche.length, marques, artistes };
  }, [parRecherche]);

  const base = useMemo(() => {
    if (genre === "tout") return parRecherche;
    const cherche = genre === "artistes";
    return parRecherche.filter((b) => estUnArtiste(b) === cherche);
  }, [parRecherche, genre]);

  /*
   * Chaque famille de filtres se compte SANS elle-même.
   *
   * Les catégories tiennent compte de la gamme choisie, la gamme tient
   * compte de la catégorie, mais aucune ne se filtre par soi : sinon
   * choisir « Streetwear » ferait disparaître toutes les autres
   * catégories, et l'on ne pourrait plus changer d'avis sans repasser
   * par « Tout effacer ».
   */
  const categories = useMemo(() => {
    const compte = new Map<string, number>();
    for (const b of base) {
      if (tier && b.price_tier !== tier) continue;
      if (audience && uneAudience(b.audience) !== audience) continue;
      // On compte SUR LA SÉLECTION EN COURS : le nombre affiché à côté
      // d'une puce est donc « ce qu'il restera si je l'ajoute », et non
      // un total abstrait qui promettrait plus qu'il ne tient.
      if (!choisies.every((c) => b.categories.includes(c))) continue;
      for (const c of b.categories) compte.set(c, (compte.get(c) ?? 0) + 1);
    }
    // Les mieux représentées d'abord : c'est ce qui donne le plus de
    // chances de tomber sur quelque chose au premier clic.
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [base, tier, audience, choisies]);

  const gammes = useMemo(() => {
    const compte = new Map<PriceTier, number>();
    for (const b of base) {
      if (!choisies.every((c) => b.categories.includes(c))) continue;
      if (audience && uneAudience(b.audience) !== audience) continue;
      if (b.price_tier) compte.set(b.price_tier, (compte.get(b.price_tier) ?? 0) + 1);
    }
    // L'ordre reste accessible → premium : un classement par nombre
    // mettrait les prix dans le désordre, ce qui se lit très mal.
    return TIERS.filter((t) => compte.has(t)).map((t) => [t, compte.get(t) ?? 0] as const);
  }, [base, choisies, audience]);

  const vestiaires = useMemo(() => {
    const compte = new Map<Audience, number>();
    for (const b of base) {
      if (tier && b.price_tier !== tier) continue;
      if (!choisies.every((c) => b.categories.includes(c))) continue;
      const a = uneAudience(b.audience);
      compte.set(a, (compte.get(a) ?? 0) + 1);
    }
    // L'ordre de la constante, pas celui des effectifs : « Mixte,
    // Femme, Homme » doit rester au même endroit d'une recherche à
    // l'autre, sinon on clique à côté en revenant.
    return AUDIENCES.filter((a) => compte.has(a)).map((a) => [a, compte.get(a) ?? 0] as const);
  }, [base, tier, choisies]);

  /*
   * Un filtre qui n'a plus d'objet s'efface tout seul.
   *
   * Changer d'onglet avec « Bijoux » coché laissait un filtre actif sur
   * une liste vide, et le compteur du bouton continuait d'annoncer un
   * filtre qu'on ne voyait plus. Pas de boucle possible : ces listes se
   * calculent sans le filtre qu'elles vérifient.
   */
  useEffect(() => {
    const disponibles = new Set(categories.map(([c]) => c));
    setChoisies((liste) =>
      liste.every((c) => disponibles.has(c)) ? liste : liste.filter((c) => disponibles.has(c))
    );
  }, [categories]);

  useEffect(() => {
    if (tier && !gammes.some(([t]) => t === tier)) setTier(null);
  }, [gammes, tier]);

  useEffect(() => {
    if (audience && !vestiaires.some(([a]) => a === audience)) setAudience(null);
  }, [vestiaires, audience]);

  const results = useMemo(
    () =>
      base.filter((b) => {
        if (tier && b.price_tier !== tier) return false;
        if (audience && uneAudience(b.audience) !== audience) return false;
        return choisies.every((c) => b.categories.includes(c));
      }),
    [base, choisies, tier, audience]
  );

  const chip =
    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/80 hover:bg-white/20 hover:text-white";
  const chipOn = "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]";

  return (
    <>
      <div className="glass rise rise-1 mb-8 p-4 sm:p-5">
        <div className="mb-3 flex gap-1 rounded-full border border-white/20 bg-white/8 p-1">
          {(
            [
              ["tout", "Tout"],
              ["marques", "Marques"],
              ["artistes", "Artistes"],
            ] as const
          ).map(([id, libelle]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGenre(id)}
              aria-pressed={genre === id}
              // Un onglet vide reste visible mais devient inerte :
              // le faire disparaître déplacerait les deux autres sous
              // le doigt au moment où l'on tape.
              disabled={parGenre[id] === 0}
              className={`flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold transition disabled:cursor-default disabled:opacity-40 ${
                genre === id
                  ? "bg-white text-[var(--color-ink)]"
                  : "text-white/72 hover:bg-white/12 hover:text-white"
              }`}
            >
              {libelle}
              <span
                className={`ml-1.5 text-[11px] font-black tabular-nums ${
                  genre === id ? "text-[var(--color-ink)]/55" : "text-white/45"
                }`}
              >
                {parGenre[id]}
              </span>
            </button>
          ))}
        </div>

        {/* La recherche reste toujours là : c'est le geste le plus
            fréquent. Les filtres, eux, se déplient — affichés en
            permanence, ils occupaient la moitié d'un écran de
            téléphone avant qu'on ait vu la première marque. */}
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une marque, un style…"
            className="champ min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-controls="filtres"
            className={`inline-flex shrink-0 items-center gap-2 rounded-[13px] px-4 py-3 text-[13px] font-extrabold transition active:scale-[.97] ${
              actifs > 0 || ouvert
                ? "bg-white text-[var(--color-ink)]"
                : "border border-white/40 bg-white/8 text-white hover:bg-white/18"
            }`}
          >
            <IconFiltre />
            <span className="hidden sm:inline">Filtres</span>
            {actifs > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[10.5px] font-black text-white">
                {actifs}
              </span>
            )}
            <IconChevron className={`h-3.5 w-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`} />
          </button>
        </div>

        {actifs > 0 && !ouvert && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Cliquables pour se retirer : quand le panneau est
                replié, c'est le seul moyen d'en enlever une sans tout
                effacer. */}
            {choisies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => basculer(c)}
                aria-label={`Retirer le filtre ${c}`}
                className={`${chip} ${chipOn}`}
              >
                {c}
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            ))}
            {tier && <span className={`${chip} ${chipOn}`}>{PRICE_TIER_LABEL[tier]}</span>}
            <button
              type="button"
              onClick={reinitialiser}
              className="text-[12px] font-bold text-white/70 underline underline-offset-2 hover:text-white"
            >
              Tout effacer
            </button>
          </div>
        )}

        {ouvert && (
          <div id="filtres" className="mt-4 border-t border-white/15 pt-4">
            {/* LE VESTIAIRE PASSE AVANT LE STYLE.
                C'est la première question d'un visiteur en arrivant :
                est-ce que ça s'adresse à moi. On cherche un style DANS
                un vestiaire, jamais l'inverse, donc ce choix vient en
                premier dans le panneau.

                Et il ne s'affiche que si l'annuaire contient vraiment
                plusieurs vestiaires : une seule puce ne serait pas un
                filtre, juste une étiquette sur laquelle cliquer pour
                rien. */}
            {vestiaires.length > 1 && (
              <>
                <p className="eyebrow m-0 mb-2">Vestiaire</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setAudience(null)}
                    className={`${chip} ${audience === null ? chipOn : chipOff}`}
                  >
                    Tout
                  </button>
                  {vestiaires.map(([a, n]) => (
                    <button
                      key={a}
                      onClick={() => setAudience(audience === a ? null : a)}
                      className={`${chip} ${audience === a ? chipOn : chipOff}`}
                    >
                      {AUDIENCE_FILTRE[a]}
                      <span className="ml-1.5 opacity-55 tabular-nums">{n}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Une famille sans aucune option ne s'affiche pas du
                tout : un intertitre suivi d'un seul bouton « Toutes »
                ne renseigne sur rien. */}
            {categories.length > 0 && (
              <>
                <p className="eyebrow m-0 mb-2">
                  Catégorie
                  {choisies.length > 0 && (
                    <span className="ml-2 font-medium normal-case tracking-normal text-white/45">
                      elles se cumulent
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChoisies([])}
                    className={`${chip} ${choisies.length === 0 ? chipOn : chipOff}`}
                  >
                    Toutes
                  </button>
                  {categories.map(([c, n]) => {
                    const active = choisies.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => basculer(c)}
                        aria-pressed={active}
                        className={`${chip} ${active ? chipOn : chipOff}`}
                      >
                        {c}
                        <span className="ml-1.5 opacity-55 tabular-nums">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {gammes.length > 1 && (
              <>
                <p
                  className={`eyebrow m-0 mb-2 ${categories.length > 0 ? "mt-4" : ""}`}
                >
                  Gamme de prix
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTier(null)}
                    className={`${chip} ${tier === null ? chipOn : chipOff}`}
                  >
                    Tous les prix
                  </button>
                  {gammes.map(([t, n]) => (
                    <button
                      key={t}
                      onClick={() => setTier(t)}
                      className={`${chip} ${tier === t ? chipOn : chipOff}`}
                    >
                      {PRICE_TIER_LABEL[t]}
                      <span className="ml-1.5 opacity-55 tabular-nums">{n}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {actifs > 0 && (
              <button
                type="button"
                onClick={reinitialiser}
                className="mt-4 text-[12.5px] font-bold text-white/75 underline underline-offset-2 hover:text-white"
              >
                Tout effacer
              </button>
            )}
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/90">
            Rien ne correspond. Une marque manque à l&apos;appel ?{" "}
            <a href="/candidature" className="font-bold text-white underline underline-offset-2">
              Propose-la
            </a>
            .
          </p>
        </div>
      ) : (
        <BrandGrid
          brands={results}
          favoris={favoris}
          notes={notes}
          memoire="annuaire"
          aside={
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
              {/* Le mot suit l'onglet : afficher « 12 marques » alors
                  qu'on a demandé les artistes se remarque tout de
                  suite, et donne l'impression que le filtre n'a pas
                  été pris en compte. */}
              {results.length}{" "}
              {genre === "artistes"
                ? `artiste${results.length > 1 ? "s" : ""}`
                : `marque${results.length > 1 ? "s" : ""}`}
            </p>
          }
        />
      )}
    </>
  );
}
