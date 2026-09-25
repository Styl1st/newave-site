"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrandGrid from "./BrandGrid";
import { IconLoupe } from "./Icons";
import { SelecteurDensite, useDensite } from "./densite";
import Suggestions from "./recherche/Suggestions";
import Jeton, { type Critere } from "./recherche/Jeton";
import FeuilleRecherche from "./recherche/FeuilleRecherche";
import { useRecherche } from "./recherche/useRecherche";
import { noterRecherche } from "./recherche/historique";
import { declarerChampLocal } from "./recherche/champLocal";
import FeuilleFiltres from "./feuille/FeuilleFiltres";
import type { Brand, Recherche } from "@/lib/types";
import { enSlugDeCategorie } from "@/lib/taxonomy";

/**
 * LE PANNEAU NE PROPOSE PLUS QUE DES STYLES.
 *
 * Il affichait tout à la fois : les styles, ce que la marque vend
 * (familles et types), le vestiaire, la gamme de prix. Plus de cent
 * pastilles, et un panneau qu'il fallait faire défiler pour atteindre
 * la fin. Le vestiaire, la gamme et « Ce qu'elle vend » en sont sortis :
 * chercher une pièce par rayon, par type ou par prix, c'est le rôle de
 * la vitrine (`/pieces`), qui le fait mieux. Les champs restent en base
 * et sur les fiches ; ce sont les FILTRES qui partent.
 *
 * Bijoux, Accessoires et Chaussures restent des catégories de marque
 * (`BRAND_CATEGORIES` n'y touche pas), mais ce sont des produits, pas
 * des styles : on ne les propose pas ici. Un lien `?cat=bijoux` les
 * pose encore, et le jeton s'affiche comme les autres.
 */
const HORS_FILTRE = ["Bijoux", "Accessoires", "Chaussures"];

/**
 * Combien de styles la ligne montre avant « + N autres ». Assez pour que
 * les courants tiennent sans déplier, pas assez pour faire un mur.
 */
const STYLES_VISIBLES = 10;

/** Une liste vide, pour montrer les critères avant que la base réponde. */
const RIEN: Recherche = { marques: [], pieces: [], totalPieces: 0 };

/**
 * « Vêtement » et « vetement » doivent se trouver l'un l'autre.
 *
 * Personne ne tape les accents dans un champ de recherche, et les
 * catégories du catalogue en portent presque toutes.
 */
function sansAccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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
  /** Les jetons, `famille:valeur` séparés par des virgules. */
  f?: string | string[];
  /** La lettre de l'index. */
  lettre?: string | string[];
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
 * Les styles demandés par l'adresse, dans `?f=style:streetwear,…`.
 *
 * `?f=` rouvre l'écran exactement tel qu'il était quand on a copié le
 * lien. C'est ce que `?cat=` faisait déjà ; il continue de marcher.
 *
 * LES ANCIENS JETONS SONT IGNORÉS EN SILENCE. Avant que le panneau ne
 * se réduise aux styles, l'adresse portait aussi `vestiaire:femme`,
 * `prix:premium` ou `vend:hoodies`. Un lien copié à cette époque doit
 * ouvrir l'annuaire sur ses styles, simplement sans le reste, et sans
 * erreur. Même règle pour une famille inconnue ou une valeur de
 * travers : mieux vaut l'annuaire entier qu'une page qui a l'air cassée.
 */
function stylesDemandes(brands: Brand[], param: string | string[] | undefined): string[] {
  const styles: string[] = [];
  for (const entree of valeursDe(param)) {
    const coupe = entree.indexOf(":");
    if (coupe < 0) continue;
    if (entree.slice(0, coupe).toLowerCase() === "style") {
      styles.push(entree.slice(coupe + 1).toLowerCase());
    }
  }
  return categoriesDemandees(brands, styles);
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
  const [choisies, setChoisies] = useState<string[]>(() => [
    ...new Set([
      ...categoriesDemandees(brands, amorce?.cat),
      ...stylesDemandes(brands, amorce?.f),
    ]),
  ]);

  const basculer = (c: string) =>
    setChoisies((liste) =>
      liste.includes(c) ? liste.filter((x) => x !== c) : [...liste, c]
    );

  /* La ligne de styles est repliée sur ses dix premiers ; « + N autres »
     la déplie en entier. */
  const [tousLesStyles, setTousLesStyles] = useState(false);

  /*
   * La lettre de l'index est tenue ici et non dans la grille : elle part
   * dans l'adresse avec le reste de la requête, et la grille n'a aucune
   * raison de connaître l'adresse.
   */
  const [lettre, setLettre] = useState<string | null>(() => {
    const brut = (Array.isArray(amorce?.lettre) ? amorce.lettre[0] : amorce?.lettre) ?? "";
    const l = brut.trim().toUpperCase();
    return l.length === 1 ? l : null;
  });
  const [ouvert, setOuvert] = useState(false);

  const actifs = choisies.length;

  function reinitialiser() {
    setChoisies([]);
  }

  /*
   * AU DOIGT, LE PANNEAU DEVIENT UNE FEUILLE QUI MONTE.
   *
   * Il se dépliait dans le bloc de recherche, donc AU-DESSUS de la
   * liste : on ouvrait, on cochait, et les marques qu'on venait de
   * réduire partaient un écran et demi plus bas. Il fallait refermer,
   * puis redescendre, pour voir ce qu'on avait fait — et le geste qu'on
   * essaie sans y penser, tirer vers le bas, ne faisait rien puisqu'il
   * n'y avait pas de feuille à tirer.
   *
   * C'est la feuille de la vitrine, à l'identique et par le même
   * composant : deux écrans du même site n'ont aucune raison de se
   * refermer différemment.
   *
   * Au-dessus de 640px le panneau reste où il est. La largeur y suffit,
   * et une feuille par-dessus une page qu'on voit en entier est une
   * cérémonie pour rien.
   *
   * On MESURE la largeur au lieu de rendre le panneau deux fois : les
   * deux porteraient les mêmes champs, et un lecteur d'écran les
   * annoncerait en double.
   */
  const [auDoigt, setAuDoigt] = useState(false);
  useEffect(() => {
    const petit = window.matchMedia(AU_DOIGT);
    const mesurer = () => setAuDoigt(petit.matches);
    mesurer();
    petit.addEventListener("change", mesurer);
    return () => petit.removeEventListener("change", mesurer);
  }, []);

  /* En repassant au grand écran, le panneau redevient lisible dans le
     bloc : laisser la feuille ouverte la ferait flotter en travers. */
  useEffect(() => {
    if (!auDoigt) setOuvert(false);
  }, [auDoigt]);

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

  /*
   * Les suggestions se branchent plus bas, une fois les critères
   * établis : c'est la seule chose que le clavier a besoin de savoir
   * pour distinguer une ligne qui POSE un jeton d'une ligne qui OUVRE
   * une marque. Voir « la requête ».
   */

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
  /* La page porte son propre champ : le pop-up de la barre laisse donc
     ⌘K à celui-ci. Voir `champLocal`. */
  useEffect(() => declarerChampLocal(), []);

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
   * `?recherche=1` OUVRE L'ANNUAIRE LE CURSEUR DÉJÀ DANS LE CHAMP.
   *
   * La loupe de la barre n'y emmène plus : elle ouvre maintenant la
   * recherche sur place, sans quitter la page qu'on lisait (voir
   * `BarreDuHaut`). L'adresse, elle, reste valide et gardée — elle se
   * partage, elle se met en favori, et c'est la seule façon d'arriver
   * sur l'annuaire prêt à taper.
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

    /*
     * LE RETOUR ARRIÈRE VISE AVANT DE RETIRER.
     *
     * Sur un champ vide, la première pression met le dernier jeton en
     * évidence, la seconde le retire. Supprimer dès la première serait
     * le comportement le plus rapide et le plus mauvais : une frappe de
     * trop, et un critère disparaît sans qu'on ait vu lequel.
     */
    if (e.key === "Backspace" && query === "" && jetons.length > 0) {
      e.preventDefault();
      const dernier = jetons[jetons.length - 1];
      if (vise === dernier.cle) retirer(dernier);
      else setVise(dernier.cle);
      return;
    }
    if (vise) setVise(null);

    if (!panneau) return;
    auClavier(
      e,
      (slug, mot) => {
        noterRecherche(mot);
        router.push(`/marques/${slug}`);
      },
      poser
    );
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

  /*
   * MARQUES ET ARTISTES DANS LA MÊME LISTE, SANS ONGLET POUR LES SÉPARER.
   *
   * Le tri existait, mais il n'y a que deux artistes au catalogue : un
   * onglet qui réduit cent trente-sept fiches à deux prend de la place
   * dans la barre collante et n'est presque jamais le geste qu'on veut.
   * Il reviendra quand ils seront assez nombreux pour valoir la ligne.
   */
  const base = parRecherche;

  /*
   * Les styles se comptent sur les marques qui restent : chaque puce dit
   * combien de marques il resterait en la cochant EN PLUS. Comme le
   * cumul est un ET, une puce qui ne laisserait plus personne debout
   * n'apparaît simplement pas.
   */
  const categories = useMemo(() => {
    const compte = new Map<string, number>();
    for (const b of base) {
      if (!choisies.every((c) => b.categories.includes(c))) continue;
      for (const c of b.categories) compte.set(c, (compte.get(c) ?? 0) + 1);
    }
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [base, choisies]);

  /* Un filtre qui n'a plus d'objet s'efface tout seul. Pas de boucle
     possible : la liste se calcule sans le filtre qu'elle vérifie. */
  useEffect(() => {
    const disponibles = new Set(categories.map(([c]) => c));
    setChoisies((liste) =>
      liste.every((c) => disponibles.has(c)) ? liste : liste.filter((c) => disponibles.has(c))
    );
  }, [categories]);

  /*
   * LA LIGNE DE STYLES : LES DIX PLUS FRÉQUENTS, PUIS « + N AUTRES ».
   *
   * Sans les produits (voir `HORS_FILTRE`), dans l'ordre des comptes.
   *
   * UN STYLE COCHÉ RESTE TOUJOURS VISIBLE, même s'il est au-delà du
   * dixième : les cochés remontent en tête. Sinon un style posé depuis
   * l'adresse disparaîtrait de la ligne au premier rendu, et l'on ne
   * saurait plus où le décocher.
   */
  const styles = useMemo(
    () => categories.filter(([c]) => !HORS_FILTRE.includes(c)),
    [categories]
  );
  const stylesVisibles = useMemo(() => {
    if (tousLesStyles) return styles;
    const coches = styles.filter(([c]) => choisies.includes(c));
    const autres = styles.filter(([c]) => !choisies.includes(c));
    return [...coches, ...autres].slice(0, Math.max(STYLES_VISIBLES, coches.length));
  }, [styles, choisies, tousLesStyles]);
  const stylesCaches = styles.length - stylesVisibles.length;

  const results = useMemo(
    () => base.filter((b) => choisies.every((c) => b.categories.includes(c))),
    [base, choisies]
  );

  /* ------------------------------------------------------------------
     LA REQUÊTE

     Les filtres ne sont plus des cases cochées quelque part : ce sont
     des JETONS posés dans le champ. Un jeton n'est qu'une façon de
     MONTRER un style coché, et de le retirer d'un clic : le comptage,
     l'amorçage par l'adresse et l'effacement automatique d'un filtre
     devenu vide passent tous par `choisies`.
     ------------------------------------------------------------------ */

  /** Le jeton visé par le premier retour arrière, pas encore retiré. */
  const [vise, setVise] = useState<string | null>(null);

  const jetons = useMemo<Critere[]>(
    () =>
      choisies.map((c) => ({
        famille: "Style",
        valeur: c,
        cle: `style:${enSlugDeCategorie(c)}`,
      })),
    [choisies]
  );

  const poses = useMemo(() => new Set(jetons.map((j) => j.cle)), [jetons]);

  /*
   * Tout ce qu'on peut encore poser, avec son compte : les styles, et
   * seulement eux. Chacun ramène au moins une marque, puisque la liste
   * est déjà comptée sur ce qu'il reste.
   */
  const posables = useMemo<Critere[]>(
    () =>
      styles
        .map(([c, n]) => ({
          famille: "Style",
          valeur: c,
          cle: `style:${enSlugDeCategorie(c)}`,
          compte: n,
        }))
        .filter((c) => !poses.has(c.cle)),
    [styles, poses]
  );

  /*
   * Ce que la frappe en cours propose de poser. C'est la moitié utile
   * de la liste de suggestions : on tape « den », et « Denim » devient
   * un jeton d'une touche au lieu d'aller le chercher dans un panneau.
   *
   * Six au plus : au-delà, la liste descend sous la ligne de flottaison
   * et pousse les marques, qui sont l'autre moitié de la réponse.
   */
  const criteresProposes = useMemo(() => {
    const q = sansAccent(query.trim());
    if (!q) return [];
    return posables.filter((c) => sansAccent(c.valeur).includes(q)).slice(0, 6);
  }, [posables, query]);

  /*
   * Et ce qu'on propose quand le champ est vide : les styles les mieux
   * fournis de la sélection courante. Ils changent à chaque jeton posé,
   * puisque les comptes sont ceux de ce qu'il reste.
   */
  const suggeres = useMemo(() => posables.slice(0, 5), [posables]);

  const poser = useCallback((c: Critere) => {
    if (c.cle.startsWith("style:")) {
      setChoisies((liste) => (liste.includes(c.valeur) ? liste : [...liste, c.valeur]));
    }
    /* Le texte a servi à trouver le critère ; une fois le jeton posé,
       le garder filtrerait DEUX fois sur la même idée. */
    setQuery("");
    setVise(null);
    champ.current?.focus();
  }, []);

  const retirer = useCallback((c: Critere) => {
    setChoisies((liste) => liste.filter((x) => x !== c.valeur));
    setVise(null);
  }, []);

  /*
   * LE TRAIT EST UN ORNEMENT, PAS UNE JAUGE. Sa portion colorée dit
   * seulement que la requête se remplit ; plafonnée à soixante pour
   * cent, elle ne promet aucune fin — on peut toujours ajouter un
   * critère de plus.
   */
  const remplissage = Math.min(60, jetons.length * 13 + Math.min(query.length, 18) * 1.1);

  /* ------------------------------------------------------------------
     LA REQUÊTE S'ÉCRIT DANS L'ADRESSE

     `?q=den&f=style:streetwear,style:denim&lettre=a` : un lien
     partagé rouvre exactement le même écran. C'est le vrai gain de
     cette barre — une requête qui se lit comme une phrase peut aussi
     s'envoyer, ce qu'un panneau de cases cochées ne savait pas faire.

     LA FRAPPE REMPLACE, LE JETON EMPILE. `pushState` à chaque lettre
     tapée transformerait le bouton Retour en machine à remonter le
     texte caractère par caractère ; on ne l'utilise donc que pour les
     gestes qui comptent, poser ou retirer un critère, et pour la
     lettre d'index.

     On écrit l'historique à la main plutôt que par le routeur : ce
     dernier repasserait par le serveur et refabriquerait la page à
     chaque frappe, pour une adresse dont le contenu ne dépend que de ce
     qui est déjà dans le navigateur.
     ------------------------------------------------------------------ */
  const signature = jetons.map((j) => j.cle).join(",");
  const repereEcrit = useRef<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    const q = query.trim();
    if (q) p.set("q", q);
    if (signature) p.set("f", signature);
    if (lettre) p.set("lettre", lettre);

    /* Les deux-points et les virgules restent lisibles : ils sont
       permis dans une requête, et `f=style%3Adenim` ne se copie pas
       dans un message sans avoir l'air d'une erreur. */
    const suffixe = p.toString().replace(/%3A/g, ":").replace(/%2C/g, ",");
    const adresse = window.location.pathname + (suffixe ? `?${suffixe}` : "");
    if (adresse === window.location.pathname + window.location.search) return;

    const repere = `${signature}|${lettre ?? ""}`;
    const empile = repereEcrit.current !== null && repereEcrit.current !== repere;
    repereEcrit.current = repere;
    window.history[empile ? "pushState" : "replaceState"](null, "", adresse);
  }, [query, signature, lettre]);

  /*
   * La liste de suggestions et sa navigation au clavier. Elle reçoit
   * les critères posables : les flèches parcourent alors une seule
   * liste, critères puis marques, et Entrée fait ce que dit la ligne.
   */
  const { suggestions, surligne, setSurligne, garni, auClavier } = useRecherche(
    query,
    criteresProposes
  );

  const chip =
    "shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white";
  const chipOn = "cta-barre bg-white font-extrabold text-[var(--color-ink)]";


  /*
   * LE CONTENU DU PANNEAU, ÉCRIT UNE FOIS.
   *
   * Il est monté soit dans le bloc de recherche sur grand écran, soit
   * dans la feuille au doigt — jamais les deux : deux exemplaires
   * doubleraient les champs pour les lecteurs d'écran, et les deux
   * copies finiraient par ne plus répondre pareil au même clic.
   */
  const contenuFiltres = (
    <>
          {/*
           * UNE SEULE LIGNE DE STYLES, QUI PASSE À LA LIGNE.
           *
           * Plus de titre de groupe ni de colonnes : le panneau ne
           * propose plus que des styles, les dix plus fréquents d'abord,
           * puis « + N autres » pour le reste. Ceux qu'on a choisis
           * remontent aussi dans la ligne collante, en jetons : c'est là
           * qu'il faut les voir, et là qu'on veut pouvoir les retirer.
           *
           * Plus de bouton « Toutes » en tête : « Tout effacer » et les
           * croix des jetons font déjà ce travail.
           */}
          {styles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {stylesVisibles.map(([c, n]) => {
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
              {(stylesCaches > 0 || tousLesStyles) && styles.length > STYLES_VISIBLES && (
                <button
                  type="button"
                  onClick={() => setTousLesStyles((v) => !v)}
                  aria-expanded={tousLesStyles}
                  className="px-1 text-[13px] font-bold text-white underline underline-offset-4 transition hover:text-white/80"
                >
                  {tousLesStyles ? "Réduire" : `+ ${stylesCaches} autre${stylesCaches > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
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
    </>
  );

  return (
    <>
      {/* ---------------- la barre de requête ----------------

          PLUS AUCUN CAISSON, ET C'EST LE CŒUR DE LA REFONTE.

          Il y avait deux plaques de verre pleine largeur empilées :
          l'une pour un champ et un bouton, l'autre pour les filtres
          dépliés. Beaucoup de surface, peu de contenu, et surtout deux
          outils côte à côte pour une seule question — « quelle marque
          je cherche ». Les critères entrent maintenant DANS le champ,
          devant le curseur de saisie : une seule ligne à regarder, une
          requête qui se lit comme une phrase.

          Ce qui tenait le tout est un trait de deux pixels, dont la
          portion gauche se colore à mesure que la requête se remplit.
          Le reste s'accroche à des filets d'un pixel. */}
      <div ref={bloc} className="relative z-20 mb-4">
        <div className="flex items-start gap-3">
          <IconLoupe className="mt-[7px] h-[19px] w-[19px] shrink-0 text-white/85" />

          {/*
           * Le champ et les jetons partagent la même ligne, et le clic
           * n'importe où dedans va au champ : la zone entre deux jetons
           * fait partie de la phrase qu'on écrit, elle doit répondre
           * comme le champ lui-même.
           */}
          <div
            onClick={() => {
              if (!auDoigt) champ.current?.focus();
            }}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
          >
            {jetons.map((j) => (
              <Jeton
                key={j.cle}
                critere={j}
                vise={vise === j.cle}
                onRetirer={() => retirer(j)}
              />
            ))}

            <input
              ref={champ}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVise(null);
                setPanneau(true);
              }}
              onPointerDown={ouvrirAuDoigt}
              onFocus={(e) => {
                if (!ouvrirAuDoigt(e)) setPanneau(true);
              }}
              onKeyDown={toucheDansLeChamp}
              placeholder={jetons.length > 0 ? "Affiner…" : "Chercher une marque, un style…"}
              aria-label="Chercher une marque, une pièce"
              autoComplete="off"
              className="requete-champ"
            />
          </div>

          {/* Le raccourci s'efface dès qu'on tape : il rappelle un
              geste, il n'a plus rien à dire une fois le curseur dedans.
              Il ne s'affiche pas non plus au doigt, où il ne se tape
              pas — c'est la loupe de la feuille qui le remplace. */}
          {!query && (
            <span className="requete-touche mt-[7px] hidden shrink-0 sm:block">⌘ K</span>
          )}
        </div>

        <div
          className="requete-trait mt-2.5"
          style={{ "--remplissage": `${remplissage}%` } as React.CSSProperties}
        />

        {/* Les suggestions poussent le contenu au lieu de le recouvrir :
            une couche flottante par-dessus une page déjà en verre se lit
            très mal, et se ferme au moindre défilement.

            Le rendu est celui de `Suggestions`, partagé avec la feuille
            plein écran du téléphone : deux copies auraient fini par ne
            plus répondre pareil au même mot. */}
        {panneau && garni && (
          <div className="max-h-[320px] overflow-y-auto overscroll-contain border-b border-white/14 py-2">
            <Suggestions
              suggestions={suggestions ?? RIEN}
              query={query}
              surligne={surligne}
              onSurligne={setSurligne}
              onOuvrir={noterRecherche}
              criteres={criteresProposes}
              onPoser={poser}
            />
          </div>
        )}

        {/*
         * LA LIGNE DU BAS PORTE DEUX CHOSES QUI N'ONT RIEN À VOIR, et
         * c'est voulu : à gauche ce qu'on peut ajouter à la requête, à
         * droite la façon de regarder le résultat. Ce sont les deux
         * seuls réglages qui restent une fois les caissons partis, et
         * ils tiennent sur une ligne.
         *
         * Les critères suggérés s'effacent dès qu'on tape — la liste de
         * suggestions dit alors quelque chose de plus précis, et les
         * deux à la fois feraient deux listes concurrentes. Le rail
         * d'affichage, lui, ne bouge jamais : il n'a aucune raison de
         * disparaître parce qu'on cherche.
         */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/14 py-2.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            {!query && suggeres.length > 0 && (
              <>
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/66">
                  Suggéré
                </span>
                {suggeres.map((c) => (
                  <button
                    key={c.cle}
                    type="button"
                    onClick={() => poser(c)}
                    className="text-[13px] font-semibold text-white/85 transition hover:text-white"
                  >
                    {c.valeur}
                    <sup className="ml-[3px] text-[9px] font-bold text-white/50">{c.compte}</sup>
                  </button>
                ))}
              </>
            )}

            {/* Le dépli remplace le panneau : même contenu, sans la
                plaque de verre autour ni le bouton qui l'ouvrait. Au
                doigt, c'est toujours la feuille qui monte. */}
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              aria-expanded={ouvert}
              aria-controls="filtres"
              className="text-[13px] font-bold text-white/70 underline underline-offset-[3px] transition hover:text-white"
            >
              Tous les critères
              {actifs > 0 && <span className="ml-1.5 text-white/50">({actifs})</span>}
            </button>
          </div>

          <SelecteurDensite
            densite={densite}
            choisir={choisirDensite}
            offertes={offertes}
            className="ml-auto"
          />
        </div>

        {/* Le dépli des filtres fins, sous le filet. Au doigt il n'est
            pas là : il monte en feuille, plus bas. */}
        {ouvert && !auDoigt && (
          <div id="filtres" className="border-b border-white/14 py-4">
            {contenuFiltres}
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
          densite={densite}
          onDensite={choisirDensite}
          lettre={lettre}
          onLettre={setLettre}
          /* La largeur est déjà mesurée ici pour la feuille de recherche :
             l'index s'en sert pour choisir sa forme, et les deux
             basculent donc au même pixel. Voir `IndexAlphabet`. */
          auDoigt={auDoigt}
          selecteur={false}
          aside={
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
              {results.length} marque{results.length > 1 ? "s" : ""}
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

      {/* Les filtres fins au doigt. Même composant, même geste et même
          seuil que la vitrine : elle se referme en la tirant vers le
          bas, en touchant à côté, ou par son pied.

          Le pied compte les MARQUES, pas les pièces — c'est ce que la
          page affiche derrière, et c'est ce qui remplace le retour
          immédiat qu'on a sur grand écran, où le panneau ne recouvre
          rien. */}
      <FeuilleFiltres
        ouvert={auDoigt && ouvert}
        onFermer={() => setOuvert(false)}
        id="filtres"
        pied={
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.98]"
          >
            Voir {results.length > 1 ? "les" : "la"} {results.length} marque
            {results.length > 1 ? "s" : ""}
          </button>
        }
      >
        {contenuFiltres}
      </FeuilleFiltres>
    </>
  );
}
