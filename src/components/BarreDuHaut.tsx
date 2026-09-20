"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoupe } from "./Icons";
import PanneauRecherche from "./recherche/PanneauRecherche";
import { MINIMUM, useRecherche } from "./recherche/useRecherche";
import { aUnChampLocal } from "./recherche/champLocal";
import { lireHistorique, noterRecherche, oublierHistorique } from "./recherche/historique";

/**
 * La barre du haut, et la recherche qui s'ouvre dedans.
 *
 * POURQUOI LA BARRE EST DEVENUE CLIENTE. La loupe menait à
 * `/marques?recherche=1` : on lisait un post, on voulait chercher une
 * marque, et l'on perdait la page. Le raisonnement d'origine se tenait
 * — la recherche vit dans l'annuaire, la loupe y emmenait avec le
 * curseur déjà posé — mais le geste, lui, ne tenait pas : chercher
 * n'est pas une destination, c'est un état.
 *
 * La barre porte donc cet état. Rien ne s'ouvre ailleurs : LA PASTILLE
 * DEVIENT LE CHAMP. Les liens s'effacent, le champ prend leur largeur,
 * le panneau pend sous la barre à ses marges exactes, et la page reste
 * derrière sous un voile léger. Aucune navigation, aucune entrée
 * d'historique : refermer rend la page telle qu'on l'avait laissée.
 *
 * `Header` RESTE UN COMPOSANT SERVEUR et le demeure : c'est lui qui lit
 * la session, ses marques, son rôle. Il passe ici du JSX déjà rendu, en
 * deux morceaux, parce que la loupe se tient AU MILIEU de la barre — le
 * trait, la loupe, le cœur — et qu'un seul bloc ne laisserait pas la
 * place de l'y glisser.
 *
 * LE VOILE EST POSÉ DANS LE `header` ET NON DANS `.barre`. Ce n'est pas
 * un détail de rangement : `.barre` porte un `backdrop-filter`, ce qui
 * en fait le bloc conteneur de ses descendants `fixed`. Un voile écrit
 * dedans prendrait la taille de la barre au lieu de celle de l'écran.
 */

const VOILE = "rgba(9,3,26,.34)";

/**
 * LE POINT DE BASCULE, ET IL VAUT DANS LES DEUX SENS.
 *
 * Le même seuil que la feuille de l'annuaire : au-dessus, le panneau
 * range ses pièces en grille ; en dessous, elles partent en bande qui
 * défile. On MESURE la largeur au lieu de rendre les deux formes et
 * d'en cacher une — deux exemplaires seraient annoncés tous les deux
 * par un lecteur d'écran — et l'on écoute les changements, pour qu'une
 * fenêtre qu'on agrandit ou une tablette qu'on tourne reprenne la forme
 * de sa largeur au lieu de garder celle d'avant.
 */
const AU_DOIGT = "(max-width: 639px)";

/** L'identifiant que le champ désigne par `aria-controls`. */
const PANNEAU = "panneau-recherche-barre";

export default function BarreDuHaut({
  logo,
  navDebut,
  navFin,
  mobileFin,
  enCeMoment,
}: {
  logo: React.ReactNode;
  /** Les liens de pages, jusqu'au trait qui précède la loupe. */
  navDebut: React.ReactNode;
  /** Ce qui suit la loupe : favoris, sa marque, l'appel, le compte. */
  navFin: React.ReactNode;
  /** Au doigt, ce qui suit la loupe : le compte et le menu. */
  mobileFin: React.ReactNode;
  /** Quatre entrées à proposer quand le champ est encore vide. */
  enCeMoment: { label: string; href: string }[];
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [query, setQuery] = useState("");
  const [historique, setHistorique] = useState<string[]>([]);

  const { suggestions, surligne, setSurligne, garni, auClavier } = useRecherche(query);

  const [auDoigt, setAuDoigt] = useState(false);
  useEffect(() => {
    const petit = window.matchMedia(AU_DOIGT);
    const mesurer = () => setAuDoigt(petit.matches);
    mesurer();
    petit.addEventListener("change", mesurer);
    return () => petit.removeEventListener("change", mesurer);
  }, []);

  const fermer = useCallback(() => {
    setOuvert(false);
    /* On repart d'un champ vide : rouvrir la loupe doit proposer
       l'historique, pas la recherche d'il y a trois pages. */
    setQuery("");
  }, []);

  const ouvrir = useCallback(() => {
    setOuvert(true);
    setHistorique(lireHistorique());
  }, []);

  /*
   * LE CLAVIER MONTE AVEC LE PANNEAU, mais pas au même instant.
   * `focus()` sur un nœud qui vient d'apparaître est ignoré par
   * plusieurs navigateurs ; on laisse passer un rendu.
   */
  useEffect(() => {
    if (!ouvert) return;
    const minuteur = window.setTimeout(() => champ.current?.focus(), 40);
    return () => window.clearTimeout(minuteur);
  }, [ouvert]);

  /* Échap referme depuis n'importe où, y compris quand le curseur a
     quitté le champ pour survoler une ligne. */
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert, fermer]);

  /*
   * ⌘K OUVRE LE POP-UP, SAUF LÀ OÙ LA PAGE A DÉJÀ SON CHAMP.
   *
   * L'accueil, l'annuaire et la vitrine captent la même touche pour
   * mettre le curseur dans LEUR champ, et c'est le bon geste : sur
   * l'annuaire, ⌘K doit filtrer la liste qu'on lit. Sans arbitrage, les
   * deux écouteurs partiraient sur la même frappe. Voir `champLocal`.
   *
   * Ctrl aussi bien que ⌘ : rien n'oblige à supposer un Mac.
   */
  useEffect(() => {
    const auRaccourci = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (aUnChampLocal()) return;
      e.preventDefault();
      ouvrir();
    };
    window.addEventListener("keydown", auRaccourci);
    return () => window.removeEventListener("keydown", auRaccourci);
  }, [ouvrir]);

  /** Partir sur un résultat : on note le mot, puis on referme derrière. */
  const partir = useCallback(
    (mot: string) => {
      setHistorique(noterRecherche(mot));
      fermer();
    },
    [fermer]
  );

  /*
   * Le panneau ne s'ouvre que s'il a quelque chose à dire. « Jamais de
   * carte creuse » : sans résultat, sans historique et sans entrée du
   * moment, il ne reste que le champ dans la barre.
   */
  const panneauGarni =
    garni ||
    query.trim().length >= MINIMUM ||
    historique.length > 0 ||
    enCeMoment.length > 0;

  /* Le glyphe vient d'`Icons.tsx` et de nulle part ailleurs : un tracé
     refait à la main dans un composant finit toujours par dériver d'un
     demi-pixel de celui des autres écrans. */
  const loupe = <IconLoupe className="h-[17px] w-[17px]" />;

  return (
    <>
      {/*
       * LE VOILE EST LÉGER ET SANS FLOU, et c'est la promesse de tout le
       * chantier : on doit reconnaître la page qu'on n'a pas quittée.
       * Un flou la transformerait en décor, c'est-à-dire en page
       * perdue.
       */}
      {ouvert && (
        <div
          aria-hidden
          onClick={fermer}
          className="fixed inset-0 z-0"
          style={{ background: VOILE }}
        />
      )}

      <div className="barre relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 py-2 pl-3 pr-2 sm:pl-4 sm:pr-2.5">
        {/* `contents` plutôt qu'un vrai bloc : fermé, le logo reste
            exactement l'enfant qu'il était, sans boîte en plus. */}
        <span className={ouvert ? "hidden shrink-0 sm:block" : "contents"}>{logo}</span>

        {/* Au doigt, le logo se réduit à son sigle : à 402 px, le mot
            entier et un champ confortable ne tiennent pas ensemble. */}
        {ouvert && (
          <Link
            href="/"
            aria-label="Accueil NEWAVE SPHERE"
            className="relative z-2 shrink-0 transition active:scale-95 sm:hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark-white.webp" alt="NEWAVE SPHERE" className="h-7 w-auto" />
          </Link>
        )}

        {ouvert ? (
          <>
            <IconLoupe className="ml-0.5 h-[18px] w-[18px] shrink-0 text-white/85" />

            <input
              ref={champ}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  fermer();
                  return;
                }
                auClavier(e, (slug, mot) => {
                  partir(mot);
                  router.push(`/marques/${slug}`);
                });
              }}
              placeholder="Chercher une marque…"
              aria-label="Chercher une marque, une pièce"
              role="combobox"
              aria-expanded={panneauGarni}
              aria-controls={PANNEAU}
              autoComplete="off"
              enterKeyHint="search"
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[15px] font-medium tracking-[-0.02em] text-white outline-none placeholder:text-white/50 sm:text-[19px]"
            />

            <span className="requete-touche hidden shrink-0 sm:inline-block">Échap</span>

            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer la recherche"
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/14 text-[14px] font-black text-white transition before:absolute before:-inset-1 before:content-[''] hover:bg-white/26 active:scale-95"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            {/* ---------- ordinateur ---------- */}
            <nav className="relative z-2 hidden items-center gap-0.5 md:flex">
              {navDebut}

              {/*
               * LA LOUPE N'EST PLUS UN LIEN, ET C'EST TOUT LE CHANTIER.
               *
               * `/marques?recherche=1` reste une adresse valide — elle
               * se partage, et la feuille plein écran de l'annuaire
               * s'en sert toujours — mais ce bouton-ci n'y va plus : il
               * ouvre un état, qu'un lecteur d'écran lit par
               * `aria-expanded`. Le `shrink-0` reste, sans quoi la
               * pastille s'écrase en ovale dès que la barre se serre.
               */}
              <button
                type="button"
                onClick={ouvrir}
                aria-label="Chercher une marque"
                aria-expanded={false}
                aria-controls={PANNEAU}
                title="Chercher une marque"
                className="puce-barre grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/80 transition hover:text-white active:scale-95"
              >
                {loupe}
              </button>

              {navFin}
            </nav>

            {/* ---------- mobile et tablette ---------- */}
            <div className="relative z-2 flex items-center gap-2 md:hidden">
              {/* Le bouton se voit à trente-six pixels comme ses
                  voisins, mais s'attrape à quarante-quatre : c'est la
                  cible minimale au doigt, et l'agrandir vraiment ferait
                  grossir la pilule. */}
              <button
                type="button"
                onClick={ouvrir}
                aria-label="Chercher une marque"
                aria-expanded={false}
                aria-controls={PANNEAU}
                className="puce-barre relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/85 transition before:absolute before:-inset-1 before:content-[''] active:scale-95"
              >
                {loupe}
              </button>

              {mobileFin}
            </div>
          </>
        )}
      </div>

      {/* Le panneau prend la largeur et les marges de la barre parce
          qu'il en reprend les classes de centrage, et non parce qu'on
          les a mesurées : une mesure se décale au premier changement de
          gabarit. */}
      {ouvert && panneauGarni && (
        <div className="relative z-10 mx-auto mt-2.5 w-full max-w-6xl">
          <PanneauRecherche
            id={PANNEAU}
            query={query}
            suggestions={suggestions}
            garni={garni}
            surligne={surligne}
            onSurligne={setSurligne}
            onOuvrir={partir}
            historique={historique}
            onReprendre={(mot) => {
              setQuery(mot);
              champ.current?.focus();
            }}
            onEffacerHistorique={() => setHistorique(oublierHistorique())}
            enCeMoment={enCeMoment}
            auDoigt={auDoigt}
          />
        </div>
      )}
    </>
  );
}
