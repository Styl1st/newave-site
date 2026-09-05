"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrandGrid from "./BrandGrid";
import { IconChevron, IconFiltre } from "./Icons";
import { SelecteurDensite, useDensite } from "./densite";
import Suggestions from "./recherche/Suggestions";
import FeuilleRecherche from "./recherche/FeuilleRecherche";
import { useRecherche } from "./recherche/useRecherche";
import { noterRecherche } from "./recherche/historique";
import type { Brand, PriceTier } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";
import { estUnArtiste } from "@/lib/boutiques";
import { AUDIENCES, AUDIENCE_FILTRE, uneAudience, type Audience } from "@/lib/audience";
import { enSlugDeCategorie } from "@/lib/taxonomy";

const TIERS: PriceTier[] = ["accessible", "intermediaire", "premium"];

/**
 * En deçà de cette largeur, la recherche prend l'écran entier.
 *
 * C'est le palier `sm` de Tailwind, celui qui décide déjà de la forme de
 * la ligne de marque : une recherche qui changerait de forme à une
 * largeur et une liste à une autre donneraient deux ruptures là où le
 * gabarit n'en prévoit qu'une.
 */
const AU_DOIGT = "(max-width: 639px)";

/**
 * Ce que l'adresse a demandé à l'annuaire.
 *
 * Répété (`?cat=denim&cat=maille`) ou énuméré (`?cat=denim,maille`) :
 * Next remet le premier en tableau et le second en chaîne, d'où les
 * deux formes. Voir `valeursDe`, qui les ramène à une seule.
 */
export type AmorceAnnuaire = {
  cat?: string | string[];
  q?: string | string[];
};

/* ------------------------------------------------------------------
   L'AMORÇAGE PAR L'ADRESSE

   `/marques?cat=streetwear&q=denim` doit arriver filtre posé et champ
   rempli. Ces deux valeurs descendent du serveur en propriétés (voir
   `app/marques/page.tsx`) au lieu d'être lues ici dans un effet : il
   les faut au PREMIER rendu. Lues après coup, la grille complète
   s'afficherait puis se réduirait sous les yeux — et `window` n'existe
   pas au moment où le serveur fabrique ce premier rendu.

   C'est aussi pourquoi `?recherche=1` reste lu à part, plus bas : lui
   ne fait que poser un curseur, ce qui n'a de sens qu'une fois la page
   montée et l'écran mesuré.
   ------------------------------------------------------------------ */


/** Les valeurs d'un paramètre, quelle que soit la façon dont on l'a écrit. */
function valeursDe(param: string | string[] | undefined): string[] {
  const brut = Array.isArray(param) ? param : [param ?? ""];
  return brut
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Les catégories demandées par l'adresse, ramenées au vocabulaire exact
 * des fiches.
 *
 * ON SE RÈGLE SUR LES FICHES, PAS SUR `taxonomy`. Une catégorie de la
 * liste de référence que plus aucune marque ne porte poserait un filtre
 * sans résultat ; à l'inverse une ancienne valeur restée sur une fiche
 * doit rester atteignable par l'adresse comme elle l'est par le
 * panneau. La seule liste qui dit la vérité est celle des marques
 * qu'on a sous la main.
 *
 * UNE CATÉGORIE INCONNUE EST IGNORÉE EN SILENCE, et c'est tout l'objet
 * de cette fonction. Un lien écrit de travers, un rayon renommé depuis
 * qu'on l'a écrit, et le visiteur tomberait sur une grille vide sans
 * rien avoir demandé — une page qui a l'air cassée alors qu'elle a cent
 * trente-six marques à montrer. On préfère l'annuaire entier.
 *
 * La comparaison passe par le slug des DEUX côtés : `?cat=Streetwear`,
 * `?cat=streetwear` et `?cat=sur mesure` trouvent donc leur rayon, au
 * même titre que `sur-mesure`. Une adresse se tape à la main et se
 * recopie de travers ; la casse, les accents et le tiret ne sont pas
 * des raisons suffisantes pour renvoyer quelqu'un ailleurs.
 */
function categoriesDemandees(
  brands: Brand[],
  param: string | string[] | undefined
): string[] {
  const demandees = valeursDe(param).map(enSlugDeCategorie);
  if (demandees.length === 0) return [];

  const connues = new Map<string, string>();
  for (const b of brands) {
    for (const c of b.categories) connues.set(enSlugDeCategorie(c), c);
  }

  // Le `Set` n'est pas une coquetterie : `?cat=denim&cat=Denim` poserait
  // deux fois le même filtre, donc deux puces de même clé côte à côte
  // dans la ligne collante.
  return [
    ...new Set(
      demandees.map((s) => connues.get(s)).filter((c): c is string => Boolean(c))
    ),
  ];
}

/**
 * Combien de caractères une adresse peut déposer dans le champ.
 *
 * Le champ reflète ce que dit l'adresse, et une adresse se fabrique à
 * la main : quelques milliers de caractères collés dedans ne cherchent
 * rien et débordent la mise en page du bloc de recherche.
 */
const SAISIE_MAX = 80;

function rechercheDemandee(param: string | string[] | undefined): string {
  // Pas de découpage sur la virgule ici, contrairement aux catégories :
  // « denim, brut » est une recherche parfaitement légitime.
  const [premiere = ""] = Array.isArray(param) ? param : [param ?? ""];
  return premiere.trim().slice(0, SAISIE_MAX);
}

export default function BrandDirectory({
  brands,
  favoris,
  notes,
  amorce,
}: {
  brands: Brand[];
  /** Les marques déjà suivies, pour allumer la bonne étoile. */
  favoris?: string[];
  /** Les moyennes d'avis, par identifiant de marque. */
  notes?: Record<string, { moyenne: number; avis: number }>;
  /** Ce que l'adresse demande. Voir « l'amorçage par l'adresse ». */
  amorce?: AmorceAnnuaire;
}) {
  /*
   * LA DENSITÉ EST TENUE ICI ET NON DANS LA GRILLE, parce que son rail
   * de boutons est posé dans la ligne de filtres collante, à droite des
   * pastilles. La grille la reçoit et n'affiche plus le sien.
   *
   * L'annuaire ouvre en LISTE. C'est le mode qui répond à ce que fait
   * vraiment quelqu'un sur cette page — chercher parmi cent trente-six
   * marques — et le seul qui montre les pièces sans ouvrir une fiche.
   * Les deux grilles restent à un clic pour qui préfère flâner, et le
   * choix est retenu d'une visite à l'autre.
   */
  const { densite, choisir: choisirDensite, offertes } = useDensite(
    "annuaire",
    "marques",
    "liste"
  );

  /*
   * `?q=` remplit le champ, MAIS NE PREND PAS LE CURSEUR.
   *
   * Donner le focus ouvrirait le panneau de suggestions par-dessus la
   * liste qu'on vient justement de réduire : on cacherait la réponse
   * avec la question. Le champ montre ce qui a été cherché, la liste
   * montre ce que ça donne, et il n'y a rien à faire de plus.
   */
  const [query, setQuery] = useState(() => rechercheDemandee(amorce?.q));
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
   * s'affiche que si elle laisse au moins une marque debout.
   *
   * L'ADRESSE PEUT EN POSER AU DÉPART (`?cat=streetwear`), et elles
   * entrent dans cette liste comme si on venait de les cocher : elles
   * remontent donc en puce dans la ligne collante, avec leur croix, et
   * se retirent d'un clic. Un filtre venu de l'adresse ne doit pas être
   * un filtre à part, sans quoi on installe exactement ce qu'on
   * cherchait à éviter — une liste réduite pour une raison qu'on voit
   * sans pouvoir l'annuler.
   *
   * On amorce UNE FOIS, au montage. Resynchroniser à chaque rendu
   * ferait revenir le filtre que la personne vient de retirer, puisque
   * l'adresse, elle, le mentionne toujours.
   */
  const [choisies, setChoisies] = useState<string[]>(() =>
    categoriesDemandees(brands, amorce?.cat)
  );

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
   * rien cocher.
   */
  const [audience, setAudience] = useState<Audience | null>(null);
  const [ouvert, setOuvert] = useState(false);
  /*
   * Marque ou artiste : la distinction la plus utile de l'annuaire.
   * Une marque a une boutique, des tailles, des séries. Un artiste fait
   * lui-même, souvent à l'unité, parfois sans rien vendre en ligne.
   */
  const [genre, setGenre] = useState<"tout" | "marques" | "artistes">("tout");

  const actifs = choisies.length + (tier ? 1 : 0) + (audience ? 1 : 0);

  function reinitialiser() {
    setChoisies([]);
    setTier(null);
    setAudience(null);
  }

  /* ------------------------------------------------------------------
     La recherche
     ------------------------------------------------------------------ */

  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const bloc = useRef<HTMLDivElement>(null);
  const [panneau, setPanneau] = useState(false);
  /*
   * Au doigt, la recherche prend l'écran : voir `FeuilleRecherche`. Le
   * champ ci-dessous devient alors un bouton — il montre ce qui a été
   * cherché, et le toucher ouvre la feuille.
   */
  const [feuille, setFeuille] = useState(false);
  const fermerLaFeuille = useCallback(() => setFeuille(false), []);

  const { suggestions, surligne, setSurligne, garni, auClavier } = useRecherche(query);

  /*
   * ⌘K, ET C'EST LE GESTE QUI CHANGE LE PLUS CETTE PAGE.
   *
   * Un annuaire de cent trente-six entrées se parcourt mal et se
   * cherche bien. Le raccourci met le curseur dans le champ depuis
   * n'importe où dans la page, sans avoir à remonter : c'est ce qui
   * fait passer la recherche du statut d'outil qu'on va chercher à
   * celui de réflexe.
   *
   * Ctrl aussi bien que ⌘ : le site n'a aucune raison de supposer un
   * Mac, et Ctrl+K n'est réservé nulle part dans un navigateur.
   */
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
        setPanneau(true);
      }
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, []);

  /*
   * LA LOUPE DE LA BARRE ARRIVE ICI AVEC `?recherche=1`.
   *
   * On ne pense à chercher une marque qu'en étant ailleurs sur le site.
   * Le raccourci de la barre emmène donc à l'annuaire, et il serait
   * absurde d'y déposer quelqu'un devant un champ qu'il faut encore
   * aller cliquer.
   *
   * On lit l'adresse directement plutôt que par `useSearchParams` : ce
   * hook fait basculer la page en rendu client tant qu'il n'est pas
   * enveloppé dans un `Suspense`, et il serait dommage de payer ça pour
   * un curseur.
   *
   * Sur téléphone, on n'y pose pas un curseur mais LA FEUILLE. C'était
   * jusqu'ici la seule façon de ne pas faire surgir un clavier par-dessus
   * la liste qu'on venait d'ouvrir : la loupe de la barre emmenait donc
   * quelqu'un devant un champ qu'il fallait encore aller toucher. La
   * feuille lève la contrainte — elle prend l'écran, le clavier ne
   * recouvre plus rien d'utile — et la loupe tient enfin sa promesse.
   *
   * `cat` et `q`, eux, ne passent pas par ici mais par des propriétés
   * venues du serveur : il les faut au premier rendu, alors que ce
   * curseur-là ne peut de toute façon être posé qu'une fois la page
   * montée et l'écran mesuré. Voir « l'amorçage par l'adresse » en tête
   * de fichier.
   */
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("recherche")) return;
    if (window.matchMedia(AU_DOIGT).matches) setFeuille(true);
    else champ.current?.focus();
  }, []);

  /*
   * Fermer en cliquant à côté, et pas au `blur` du champ.
   *
   * Le `blur` part AVANT le clic sur une suggestion : le panneau se
   * démontait sous le doigt, et le lien qu'on visait n'existait plus au
   * moment où le clic arrivait. On ne cliquait donc jamais sur une
   * suggestion, on cliquait toujours dans le vide.
   */
  useEffect(() => {
    if (!panneau) return;
    const dehors = (e: MouseEvent) => {
      if (!bloc.current?.contains(e.target as Node)) setPanneau(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [panneau]);

  function toucheDansLeChamp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setPanneau(false);
      champ.current?.blur();
      return;
    }
    if (!panneau) return;
    auClavier(e, (slug, mot) => {
      noterRecherche(mot);
      router.push(`/marques/${slug}`);
    });
  }

  /*
   * OUVRIR LA FEUILLE AVANT QUE LE CHAMP PRENNE LE CURSEUR.
   *
   * `preventDefault` sur le `pointerdown` empêche le focus, donc le
   * clavier de monter derrière la page : sans lui, on verrait le clavier
   * surgir sur l'annuaire, puis la feuille arriver par-dessus, et le
   * clavier redescendre et remonter. Trois mouvements pour un geste.
   *
   * Le `focus` reste couvert à part, pour la tabulation : on peut
   * atteindre le champ au clavier sans jamais poser un doigt dessus.
   */
  function ouvrirAuDoigt(e: React.PointerEvent | React.FocusEvent): boolean {
    if (!window.matchMedia(AU_DOIGT).matches) return false;
    if (e.type === "pointerdown") e.preventDefault();
    else champ.current?.blur();
    setFeuille(true);
    return true;
  }

  /* ------------------------------------------------------------------
     Les filtres
     ------------------------------------------------------------------ */

  /*
   * UN FILTRE QUI NE MÈNE NULLE PART NE DOIT PAS S'AFFICHER.
   *
   * La recherche d'abord, l'onglet ensuite, et seulement à partir de ce
   * qu'il en reste on établit les filtres proposés, chacun avec son
   * compte. Un filtre affiché ramène donc toujours au moins une marque,
   * et le chiffre dit combien avant même de cliquer.
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
   * Chaque famille de filtres se compte SANS elle-même : sinon choisir
   * « Streetwear » ferait disparaître toutes les autres catégories, et
   * l'on ne pourrait plus changer d'avis sans tout effacer.
   */
  const categories = useMemo(() => {
    const compte = new Map<string, number>();
    for (const b of base) {
      if (tier && b.price_tier !== tier) continue;
      if (audience && uneAudience(b.audience) !== audience) continue;
      if (!choisies.every((c) => b.categories.includes(c))) continue;
      for (const c of b.categories) compte.set(c, (compte.get(c) ?? 0) + 1);
    }
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [base, tier, audience, choisies]);

  const gammes = useMemo(() => {
    const compte = new Map<PriceTier, number>();
    for (const b of base) {
      if (!choisies.every((c) => b.categories.includes(c))) continue;
      if (audience && uneAudience(b.audience) !== audience) continue;
      if (b.price_tier) compte.set(b.price_tier, (compte.get(b.price_tier) ?? 0) + 1);
    }
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
    return AUDIENCES.filter((a) => compte.has(a)).map((a) => [a, compte.get(a) ?? 0] as const);
  }, [base, tier, choisies]);

  /* Un filtre qui n'a plus d'objet s'efface tout seul. Pas de boucle
     possible : ces listes se calculent sans le filtre qu'elles
     vérifient. */
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
    "shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white";
  const chipOn = "bg-white font-extrabold text-[var(--color-ink)]";

  return (
    <>
      {/* ---------------- le bloc de recherche ---------------- */}
      <div
        ref={bloc}
        /* En mode liste, le rail d'index est fixé au bord droit sur
           téléphone : le bloc de recherche lui laisse sa gouttière
           plutôt que de passer dessous. Voir `IndexAlphabet` dans
           `BrandGrid`. */
        className={`glass rise rise-1 relative z-20 mb-4 p-3.5 sm:p-4 ${
          densite === "liste" ? "mr-[30px] sm:mr-0" : ""
        }`}
      >
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={champ}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPanneau(true);
              }}
              onPointerDown={ouvrirAuDoigt}
              onFocus={(e) => {
                if (!ouvrirAuDoigt(e)) setPanneau(true);
              }}
              onKeyDown={toucheDansLeChamp}
              placeholder="Chercher une marque, un style…"
              aria-label="Chercher une marque, une pièce"
              autoComplete="off"
              className="champ w-full pr-16"
            />
            {/* Le raccourci s'efface dès qu'on tape : il rappelle un
                geste, il n'a plus rien à dire une fois le curseur
                dedans. Il ne s'affiche pas non plus au doigt, où il ne
                se tape pas — c'est la loupe de la feuille qui le
                remplace. */}
            {!query && (
              <span className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 text-[10.5px] font-extrabold tracking-[0.06em] text-white/40 sm:block">
                ⌘ K
              </span>
            )}
          </div>

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

        {/* Les suggestions, dans le bloc et non en surimpression : une
            couche flottante par-dessus une page déjà en verre se lit
            très mal, et se ferme au moindre défilement.

            Le rendu est celui de `Suggestions`, partagé avec la feuille
            plein écran du téléphone : deux copies auraient fini par ne
            plus répondre pareil au même mot. */}
        {panneau && garni && suggestions && (
          <div className="mt-3 border-t border-white/16 pt-3">
            <Suggestions
              suggestions={suggestions}
              query={query}
              surligne={surligne}
              onSurligne={setSurligne}
              onOuvrir={noterRecherche}
            />
          </div>
        )}

        {/* Le panneau des filtres fins. Ce qui est dans la ligne
            collante répond à « quel genre de marque » ; ici on répond à
            « pour qui » et « à quel prix », qu'on ne règle qu'une fois. */}
        {ouvert && (
          <div id="filtres" className="mt-4 border-t border-white/15 pt-4">
            {/*
             * LES CATÉGORIES SONT ICI ET NON DANS LA LIGNE COLLANTE.
             *
             * Elles y étaient, avec leur compteur, et c'était le
             * gabarit. Sauf que le gabarit en montrait quatre : l'annuaire
             * en compte plus de quinze. La pilule débordait, il fallait la
             * faire défiler à l'horizontale pour atteindre la dernière, et
             * une barre de défilement en travers d'une barre de filtres,
             * c'est laid et ça se manque au doigt.
             *
             * Le panneau leur donne la place de tenir sur trois lignes,
             * toutes visibles d'un coup. Celles qu'on a choisies remontent
             * dans la ligne collante : c'est là qu'il faut les voir, et
             * c'est là qu'on veut pouvoir les retirer.
             */}
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
                <div className="mb-4 flex flex-wrap gap-2">
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

            {gammes.length > 1 && (
              <>
                <p className="eyebrow m-0 mb-2">Gamme de prix</p>
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

      {/* ---------------- la ligne de filtres, collante ----------------

          ELLE RESTE SOUS LA MAIN PENDANT QU'ON DESCEND, et c'est tout
          l'intérêt : sur cent trente-six marques, l'envie d'affiner
          arrive au milieu de la liste, pas en haut. Il fallait remonter
          jusqu'aux filtres, donc perdre l'endroit où l'on en était.

          Elle se cale sous la barre de navigation, qui est elle-même
          collante : les deux hauteurs sont accordées à la main faute de
          pouvoir les mesurer en CSS. */}
      <div
        className={`sticky top-[70px] z-30 mb-3 sm:top-[86px] ${
          densite === "liste" ? "mr-[30px] sm:mr-0" : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/20 bg-[rgba(8,2,30,0.44)] p-2.5 backdrop-blur-[20px] sm:flex-nowrap sm:rounded-full">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
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
                // Un onglet vide reste visible mais devient inerte : le
                // faire disparaître déplacerait les deux autres sous le
                // doigt au moment où l'on tape.
                disabled={parGenre[id] === 0}
                className={`${chip} disabled:cursor-default disabled:opacity-40 ${
                  genre === id ? chipOn : chipOff
                }`}
              >
                {libelle}
                <span className="ml-1.5 opacity-55 tabular-nums">{parGenre[id]}</span>
              </button>
            ))}

            {/*
             * SEULES LES CATÉGORIES CHOISIES REMONTENT ICI, et elles se
             * retirent d'un clic.
             *
             * C'est le seul endroit où il faut les voir : un filtre actif
             * caché derrière un panneau replié rend la liste incomplète
             * sans qu'on comprenne pourquoi. Le reste du choix se fait
             * dans le panneau, où il y a la place.
             */}
            {choisies.length > 0 && (
              <>
                <span aria-hidden className="mx-0.5 h-[18px] w-px shrink-0 bg-white/20" />
                {choisies.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => basculer(c)}
                    aria-label={`Retirer le filtre ${c}`}
                    className={`${chip} ${chipOn}`}
                  >
                    {c}
                    <span className="ml-1.5 opacity-40">×</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <SelecteurDensite densite={densite} choisir={choisirDensite} offertes={offertes} />
        </div>
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
          densite={densite}
          onDensite={choisirDensite}
          selecteur={false}
          aside={
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
              {/* Le mot suit l'onglet : afficher « 12 marques » alors
                  qu'on a demandé les artistes se remarque tout de suite,
                  et donne l'impression que le filtre n'a pas été pris en
                  compte. */}
              {results.length}{" "}
              {genre === "artistes"
                ? `artiste${results.length > 1 ? "s" : ""}`
                : `marque${results.length > 1 ? "s" : ""}`}
            </p>
          }
        />
      )}

      {/* La recherche au doigt. Elle n'existe que sous `sm` — c'est
          `ouvrirAuDoigt` qui décide de l'ouvrir, et la feuille se
          referme d'elle-même si la fenêtre s'élargit. */}
      <FeuilleRecherche
        ouverte={feuille}
        query={query}
        onQuery={setQuery}
        onFermer={fermerLaFeuille}
      />
    </>
  );
}
