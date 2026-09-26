"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LignePost, { dateCourte } from "./LignePost";
import PostCard, { couverture, porteUneVideo } from "./PostCard";
import { IconLoupe } from "./Icons";
import Suggestions from "./recherche/Suggestions";
import Jeton, { type Critere } from "./recherche/Jeton";
import FeuilleRecherche from "./recherche/FeuilleRecherche";
import { useRecherche } from "./recherche/useRecherche";
import { noterRecherche } from "./recherche/historique";
import { declarerChampLocal } from "./recherche/champLocal";
import FeuilleFiltres from "./feuille/FeuilleFiltres";
import { vignette } from "@/lib/vignette";
import { enSlugDeCategorie } from "@/lib/taxonomy";
import { sansMarquage } from "./TexteRiche";
import type { Post, Recherche } from "@/lib/types";

/**
 * Les publications.
 *
 * CE FICHIER S'APPELLE ENCORE « MOSAÏQUE » ET N'EN EST PLUS UNE. Le nom
 * reste parce que d'autres écrans l'importent sous ce nom-là ; le
 * renommer n'apporterait rien.
 *
 * LA RECHERCHE EST CELLE DE L'ANNUAIRE ET DE LA VITRINE. Il y avait ici
 * un caisson de verre, un champ, un bouton « Format, marque, source »
 * et une barre de thèmes collante : trois outils pour une question, et
 * un troisième dessin de recherche sur le même site. C'est maintenant la
 * ligne de requête des deux autres pages : une loupe, les critères posés
 * en jetons DANS le champ, un trait qui se colore, puis une ligne
 * « Suggéré · Tous les critères ». Qui sait chercher une marque sait
 * chercher un post.
 *
 * DEUX FORMES, UNE SEULE PORTE. `variante="fil"` est la page `/posts`
 * complète. La variante par défaut, « aperçu », ne rend que trois ou
 * quatre cartes : c'est ce que demande une section d'accueil, où un
 * champ de recherche n'aurait aucun sens.
 */

/** Combien de posts d'un coup. Une ligne est haute : douze font déjà
    trois écrans de défilement. */
const LOT = 12;

/** Combien de thèmes le panneau montre avant « + N autres ». La même
    règle que les styles de l'annuaire. */
const THEMES_VISIBLES = 10;

/** En deçà, la recherche prend l'écran entier. Même palier que
    l'annuaire. */
const AU_DOIGT = "(max-width: 639px)";

/** Une liste vide, pour montrer les critères avant que la base réponde. */
const RIEN: Recherche = { marques: [], pieces: [], totalPieces: 0 };

/** Ce qu'une adresse peut déposer dans le champ. Voir l'annuaire. */
const SAISIE_MAX = 80;

type Format = "photo" | "carrousel" | "video";
type Source = "instagram" | "tiktok";
type Tri = "recents" | "anciens" | "hasard";

const FORMATS: { cle: Format; label: string }[] = [
  { cle: "photo", label: "Photo" },
  { cle: "carrousel", label: "Carrousel" },
  { cle: "video", label: "Vidéo" },
];

const SOURCES: { cle: Source; label: string }[] = [
  { cle: "instagram", label: "Instagram" },
  { cle: "tiktok", label: "TikTok" },
];

const TRIS: [Tri, string][] = [
  ["recents", "Récents"],
  ["anciens", "Les plus anciens"],
  ["hasard", "Au hasard"],
];

/** Un post n'a qu'un format : vidéo, plusieurs images, ou une seule. */
function formatDe(post: Post): Format {
  if (porteUneVideo(post)) return "video";
  return (post.images?.length ?? 0) > 1 ? "carrousel" : "photo";
}

function aLaSource(post: Post, s: Source): boolean {
  return Boolean(s === "instagram" ? post.instagram_url : post.tiktok_url);
}

/*
 * LES THÈMES SE CUMULENT EN ET, LE RESTE EN OU.
 *
 * Un post porte plusieurs thèmes : « denim » PUIS « made in france »
 * affine, comme deux styles dans l'annuaire. Il n'a en revanche qu'un
 * format, qu'une marque et qu'une source : dans ces familles-là, un ET
 * ne ramènerait jamais rien, on garde donc le OU — « photo ou vidéo ».
 * Entre deux familles, c'est toujours un ET.
 */
const bonsThemes = (p: Post, themes: string[]) => themes.every((t) => p.keywords.includes(t));
const bonFormat = (p: Post, formats: Format[]) =>
  formats.length === 0 || formats.includes(formatDe(p));
const bonneMarque = (p: Post, marques: string[]) =>
  marques.length === 0 || (p.brand ? marques.includes(p.brand.slug) : false);
const bonneSource = (p: Post, sources: Source[]) =>
  sources.length === 0 || sources.some((s) => aLaSource(p, s));

function compter<T>(valeurs: T[]): Map<T, number> {
  const compte = new Map<T, number>();
  for (const v of valeurs) compte.set(v, (compte.get(v) ?? 0) + 1);
  return compte;
}

/** Un rang tiré au sort, puis un tri dessus. C'est l'ENDROIT où on
    l'appelle qui compte, pas la méthode : voir `Fil`. */
function melanger<T>(liste: T[]): T[] {
  return liste
    .map((valeur) => ({ valeur, rang: Math.random() }))
    .sort((a, b) => a.rang - b.rang)
    .map(({ valeur }) => valeur);
}

/** « Vêtement » et « vetement » doivent se trouver l'un l'autre. */
function sansAccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Les mots-clés sont en minuscules dans la base ; un jeton commence
    par une capitale, comme les styles de l'annuaire. */
const enTitre = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const cleDuTheme = (t: string) => `theme:${enSlugDeCategorie(t)}`;

/** `marque:aryes` → `["marque", "aryes"]`. */
function decouper(cle: string): [string, string] {
  const i = cle.indexOf(":");
  return [cle.slice(0, i), cle.slice(i + 1)];
}

/* ------------------------------------------------------------------
   L'AMORÇAGE PAR L'ADRESSE

   `/posts?q=denim&f=theme:made-in-france,format:video` rouvre l'écran
   tel qu'on l'a partagé, comme `/marques?f=style:denim`. Les valeurs
   descendent du serveur en propriétés : il les faut au premier rendu.
   Une valeur inconnue est ignorée en silence, pour ne jamais ouvrir
   une page vide sur un lien écrit de travers.
   ------------------------------------------------------------------ */

export type AmorcePosts = {
  q?: string | string[];
  /** Les jetons, `famille:valeur` séparés par des virgules. */
  f?: string | string[];
};

type Filtres = { themes: string[]; formats: Format[]; marques: string[]; sources: Source[] };

function valeursDe(param: string | string[] | undefined): string[] {
  const brut = Array.isArray(param) ? param : [param ?? ""];
  return brut
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function rechercheDemandee(param: string | string[] | undefined): string {
  const [premiere = ""] = Array.isArray(param) ? param : [param ?? ""];
  return premiere.trim().slice(0, SAISIE_MAX);
}

function filtresDemandes(posts: Post[], param: string | string[] | undefined): Filtres {
  const demandes: Filtres = { themes: [], formats: [], marques: [], sources: [] };
  const entrees = valeursDe(param);
  if (entrees.length === 0) return demandes;

  const themes = new Map<string, string>();
  const marques = new Set<string>();
  for (const p of posts) {
    for (const k of p.keywords) themes.set(enSlugDeCategorie(k), k);
    if (p.brand) marques.add(p.brand.slug);
  }

  for (const entree of entrees) {
    const [famille, brut] = decouper(entree.toLowerCase());
    if (!brut) continue;
    if (famille === "theme") {
      const t = themes.get(enSlugDeCategorie(brut));
      if (t && !demandes.themes.includes(t)) demandes.themes.push(t);
    } else if (famille === "format") {
      const f = FORMATS.find((x) => x.cle === brut)?.cle;
      if (f && !demandes.formats.includes(f)) demandes.formats.push(f);
    } else if (famille === "marque") {
      if (marques.has(brut) && !demandes.marques.includes(brut)) demandes.marques.push(brut);
    } else if (famille === "source") {
      const s = SOURCES.find((x) => x.cle === brut)?.cle;
      if (s && !demandes.sources.includes(s)) demandes.sources.push(s);
    }
  }
  return demandes;
}

export default function PostMosaic({
  posts,
  variante = "apercu",
  amorce,
}: {
  posts: Post[];
  /** « fil » = la page `/posts` entière ; « aperçu » = trois cartes. */
  variante?: "fil" | "apercu";
  /** Ce que l'adresse demande. Voir « l'amorçage par l'adresse ». */
  amorce?: AmorcePosts;
}) {
  /* Un aiguillage sans état : les crochets vivent dans l'une ou l'autre
     forme, jamais derrière une condition. */
  return variante === "fil" ? <Fil posts={posts} amorce={amorce} /> : <Apercu posts={posts} />;
}

function Apercu({ posts }: { posts: Post[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} accroche={sansMarquage(p.caption)} />
      ))}
    </div>
  );
}

function Fil({ posts, amorce }: { posts: Post[]; amorce?: AmorcePosts }) {
  const router = useRouter();

  /* On amorce UNE FOIS, au montage : resynchroniser ferait revenir le
     filtre qu'on vient de retirer, puisque l'adresse le mentionne
     encore à cet instant. */
  const [depart] = useState(() => filtresDemandes(posts, amorce?.f));
  const [query, setQuery] = useState(() => rechercheDemandee(amorce?.q));
  const [themes, setThemes] = useState<string[]>(depart.themes);
  const [formats, setFormats] = useState<Format[]>(depart.formats);
  const [marques, setMarques] = useState<string[]>(depart.marques);
  const [sources, setSources] = useState<Source[]>(depart.sources);
  const [ouvert, setOuvert] = useState(false);
  const [tousLesThemes, setTousLesThemes] = useState(false);
  const [tri, setTri] = useState<Tri>("recents");
  const [ordre, setOrdre] = useState<string[]>([]);
  const [combien, setCombien] = useState(LOT);

  const actifs = themes.length + formats.length + marques.length + sources.length;

  function reinitialiser() {
    setThemes([]);
    setFormats([]);
    setMarques([]);
    setSources([]);
  }

  const basculerTheme = (t: string) =>
    setThemes((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  const basculerFormat = (f: Format) =>
    setFormats((l) => (l.includes(f) ? l.filter((x) => x !== f) : [...l, f]));
  const basculerMarque = (m: string) =>
    setMarques((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  const basculerSource = (s: Source) =>
    setSources((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));

  /*
   * AU DOIGT, LE PANNEAU DEVIENT LA FEUILLE QUI MONTE, et le champ ouvre
   * la recherche plein écran : exactement l'annuaire. On MESURE la
   * largeur plutôt que de rendre le panneau deux fois, pour ne pas
   * doubler les champs aux lecteurs d'écran.
   */
  const [auDoigt, setAuDoigt] = useState(false);
  useEffect(() => {
    const petit = window.matchMedia(AU_DOIGT);
    const mesurer = () => setAuDoigt(petit.matches);
    mesurer();
    petit.addEventListener("change", mesurer);
    return () => petit.removeEventListener("change", mesurer);
  }, []);

  /* En repassant au grand écran, la feuille ouverte flotterait en
     travers de la page : on la referme. */
  useEffect(() => {
    if (!auDoigt) setOuvert(false);
  }, [auDoigt]);

  /* ------------------------------------------------------------------
     La recherche
     ------------------------------------------------------------------ */

  const champ = useRef<HTMLInputElement>(null);
  const bloc = useRef<HTMLDivElement>(null);
  const [panneau, setPanneau] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const fermerLaFeuille = useCallback(() => setFeuille(false), []);

  /* ⌘K met le curseur dans le champ depuis n'importe où dans le fil.
     La page porte son propre champ : le pop-up de la barre lui laisse
     donc la touche. Voir `champLocal`. */
  useEffect(() => declarerChampLocal(), []);

  useEffect(() => {
    const auClavierGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
        setPanneau(true);
      }
    };
    window.addEventListener("keydown", auClavierGlobal);
    return () => window.removeEventListener("keydown", auClavierGlobal);
  }, []);

  /* Fermer en cliquant à côté, et pas au `blur` : le `blur` part avant
     le clic sur une suggestion, qui disparaîtrait sous le doigt. */
  useEffect(() => {
    if (!panneau) return;
    const dehors = (e: MouseEvent) => {
      if (!bloc.current?.contains(e.target as Node)) setPanneau(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [panneau]);

  /* ------------------------------------------------------------------
     Les filtres, comptés sur ce qui reste

     La recherche d'abord, les filtres ensuite. Chaque famille se compte
     SANS ELLE-MÊME pour le format, la marque et la source (un OU : on
     doit pouvoir en ajouter une deuxième), et AVEC les thèmes déjà posés
     pour les thèmes (un ET : une pastille ne s'affiche que si elle
     laisse au moins un post debout). Un chiffre affiché est donc
     toujours ce qu'on obtiendra en cliquant.
     ------------------------------------------------------------------ */

  const parRecherche = useMemo(() => {
    const q = sansAccent(query.trim());
    if (!q) return posts;
    return posts.filter(
      (p) =>
        sansAccent(p.title).includes(q) ||
        sansAccent(p.caption).includes(q) ||
        sansAccent(p.brand?.name ?? "").includes(q) ||
        p.keywords.some((k) => sansAccent(k).includes(q))
    );
  }, [posts, query]);

  const themesDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) =>
        bonsThemes(p, themes) &&
        bonFormat(p, formats) &&
        bonneMarque(p, marques) &&
        bonneSource(p, sources)
    );
    const compte = compter(dedans.flatMap((p) => p.keywords));
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [parRecherche, themes, formats, marques, sources]);

  const formatsDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) => bonsThemes(p, themes) && bonneMarque(p, marques) && bonneSource(p, sources)
    );
    const compte = compter(dedans.map(formatDe));
    return FORMATS.filter((f) => compte.has(f.cle)).map((f) => ({
      ...f,
      total: compte.get(f.cle) ?? 0,
    }));
  }, [parRecherche, themes, marques, sources]);

  const marquesDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) => bonsThemes(p, themes) && bonFormat(p, formats) && bonneSource(p, sources)
    );
    const noms = new Map<string, string>();
    for (const p of dedans) if (p.brand) noms.set(p.brand.slug, p.brand.name);
    const compte = compter(dedans.flatMap((p) => (p.brand ? [p.brand.slug] : [])));
    return [...compte.entries()]
      .map(([slug, total]) => ({ slug, nom: noms.get(slug) ?? slug, total }))
      .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom));
  }, [parRecherche, themes, formats, sources]);

  const sourcesDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) => bonsThemes(p, themes) && bonFormat(p, formats) && bonneMarque(p, marques)
    );
    return SOURCES.map((s) => ({
      ...s,
      total: dedans.filter((p) => aLaSource(p, s.cle)).length,
    })).filter((s) => s.total > 0);
  }, [parRecherche, themes, formats, marques]);

  /*
   * UN JETON NE DISPARAÎT PAS PARCE QU'ON TAPE.
   *
   * Ajouter un filtre ne peut jamais vider la liste : chaque pastille
   * est comptée sur ce qui reste. Seul le TEXTE peut le faire, et
   * effacer alors les jetons en silence (ce que faisait l'ancienne
   * barre) ferait perdre le filtre qu'on voulait justement affiner :
   * on tape trois lettres, « Denim » s'en va, et il ne revient pas
   * quand on efface le mot. Les jetons restent donc, et c'est l'état
   * vide qui dit que la combinaison ne donne rien.
   */

  const resultats = useMemo(
    () =>
      parRecherche.filter(
        (p) =>
          bonsThemes(p, themes) &&
          bonFormat(p, formats) &&
          bonneMarque(p, marques) &&
          bonneSource(p, sources)
      ),
    [parRecherche, themes, formats, marques, sources]
  );

  /*
   * LE TIRAGE AU SORT SE FAIT APRÈS LE MONTAGE, JAMAIS PENDANT LE RENDU.
   *
   * Un `Math.random()` appelé en rendant la page donne un ordre sur le
   * serveur et un autre dans le navigateur, et React repeint la liste
   * entière en signalant une erreur. L'ordre au hasard n'est donc tiré
   * qu'ici, une fois la page vivante.
   */
  useEffect(() => {
    if (tri !== "hasard") return;
    setOrdre(melanger(resultats.map((p) => p.id)));
  }, [tri, resultats]);

  const ordonnes = useMemo(() => {
    // La requête rend déjà les posts du plus récent au plus ancien.
    if (tri === "recents") return resultats;
    if (tri === "anciens") return [...resultats].reverse();
    const rang = new Map(ordre.map((id, i) => [id, i] as const));
    return [...resultats].sort((a, b) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0));
  }, [resultats, tri, ordre]);

  /*
   * LE BANDEAU DU HAUT NE S'AFFICHE QUE S'IL EST VRAI : « le post de la
   * semaine » est le dernier publié, ce que le premier de la liste
   * cesse d'être dès qu'une recherche, un filtre ou un autre tri est en
   * jeu. On saute aussi les posts sans visuel.
   */
  const aLaUne = useMemo(() => {
    if (tri !== "recents") return null;
    if (query.trim() || actifs > 0) return null;
    return ordonnes.find((p) => couverture(p)) ?? null;
  }, [ordonnes, tri, query, actifs]);

  const fil = useMemo(
    () => (aLaUne ? ordonnes.filter((p) => p.id !== aLaUne.id) : ordonnes),
    [ordonnes, aLaUne]
  );

  // Changer de filtre repart du début, sinon on demanderait à la page
  // d'afficher d'un coup tout ce qu'on avait déroulé avant.
  useEffect(() => setCombien(LOT), [fil]);

  const visibles = fil.slice(0, combien);
  const reste = fil.length - visibles.length;

  /* ------------------------------------------------------------------
     LA REQUÊTE : les filtres sont des JETONS posés dans le champ

     Un jeton n'est qu'une façon de MONTRER un filtre posé et de le
     retirer d'un clic ; les listes ci-dessus restent la seule vérité.
     ------------------------------------------------------------------ */

  /** Le jeton visé par le premier retour arrière, pas encore retiré. */
  const [vise, setVise] = useState<string | null>(null);

  /* Les mots exacts derrière les clés : la clé d'un thème est un slug,
     « made-in-france », le filtre porte le mot, « made in france ». */
  const motsDesThemes = useMemo(() => {
    const mots = new Map<string, string>();
    for (const p of posts) for (const k of p.keywords) mots.set(enSlugDeCategorie(k), k);
    return mots;
  }, [posts]);

  const nomsDesMarques = useMemo(() => {
    const noms = new Map<string, string>();
    for (const p of posts) if (p.brand) noms.set(p.brand.slug, p.brand.name);
    return noms;
  }, [posts]);

  const jetons = useMemo<Critere[]>(
    () => [
      ...themes.map((t) => ({ famille: "Thème", valeur: enTitre(t), cle: cleDuTheme(t) })),
      ...formats.map((f) => ({
        famille: "Format",
        valeur: FORMATS.find((x) => x.cle === f)?.label ?? f,
        cle: `format:${f}`,
      })),
      ...marques.map((m) => ({
        famille: "Marque",
        valeur: nomsDesMarques.get(m) ?? m,
        cle: `marque:${m}`,
      })),
      ...sources.map((s) => ({
        famille: "Source",
        valeur: SOURCES.find((x) => x.cle === s)?.label ?? s,
        cle: `source:${s}`,
      })),
    ],
    [themes, formats, marques, sources, nomsDesMarques]
  );

  const poses = useMemo(() => new Set(jetons.map((j) => j.cle)), [jetons]);

  /* Tout ce qu'on peut encore poser, avec son compte. Les thèmes
     d'abord : ce sont eux qu'on cherche le plus souvent. */
  const posables = useMemo<Critere[]>(
    () =>
      [
        ...themesDispo.map(([t, n]) => ({
          famille: "Thème",
          valeur: enTitre(t),
          cle: cleDuTheme(t),
          compte: n,
        })),
        ...marquesDispo.map((m) => ({
          famille: "Marque",
          valeur: m.nom,
          cle: `marque:${m.slug}`,
          compte: m.total,
        })),
        ...formatsDispo.map((f) => ({
          famille: "Format",
          valeur: f.label,
          cle: `format:${f.cle}`,
          compte: f.total,
        })),
        ...sourcesDispo.map((s) => ({
          famille: "Source",
          valeur: s.label,
          cle: `source:${s.cle}`,
          compte: s.total,
        })),
      ].filter((c) => !poses.has(c.cle)),
    [themesDispo, marquesDispo, formatsDispo, sourcesDispo, poses]
  );

  /* Ce que la frappe propose de poser : on tape « den », « Denim »
     devient un jeton d'une touche. Six au plus. */
  const criteresProposes = useMemo(() => {
    const q = sansAccent(query.trim());
    if (!q) return [];
    return posables.filter((c) => sansAccent(c.valeur).includes(q)).slice(0, 6);
  }, [posables, query]);

  /* Et, champ vide, les thèmes les mieux fournis de ce qui reste. */
  const suggeres = useMemo(
    () => posables.filter((c) => c.cle.startsWith("theme:")).slice(0, 5),
    [posables]
  );

  function poser(c: Critere) {
    const [famille, valeur] = decouper(c.cle);
    if (famille === "theme") {
      const t = motsDesThemes.get(valeur);
      if (t) setThemes((l) => (l.includes(t) ? l : [...l, t]));
    } else if (famille === "format") {
      const f = valeur as Format;
      setFormats((l) => (l.includes(f) ? l : [...l, f]));
    } else if (famille === "marque") {
      setMarques((l) => (l.includes(valeur) ? l : [...l, valeur]));
    } else if (famille === "source") {
      const s = valeur as Source;
      setSources((l) => (l.includes(s) ? l : [...l, s]));
    }
    /* Le texte a servi à trouver le critère ; le garder filtrerait deux
       fois sur la même idée. */
    setQuery("");
    setVise(null);
    setFeuille(false);
    if (!window.matchMedia(AU_DOIGT).matches) champ.current?.focus();
  }

  function retirer(c: Critere) {
    const [famille, valeur] = decouper(c.cle);
    if (famille === "theme") setThemes((l) => l.filter((t) => enSlugDeCategorie(t) !== valeur));
    else if (famille === "format") setFormats((l) => l.filter((f) => f !== valeur));
    else if (famille === "marque") setMarques((l) => l.filter((m) => m !== valeur));
    else if (famille === "source") setSources((l) => l.filter((s) => s !== valeur));
    setVise(null);
  }

  /* Le trait est un ornement, pas une jauge : plafonné à 60 %. */
  const remplissage = Math.min(60, jetons.length * 13 + Math.min(query.length, 18) * 1.1);

  /*
   * LA REQUÊTE S'ÉCRIT DANS L'ADRESSE, comme dans l'annuaire : la
   * frappe remplace, le jeton empile, pour que Retour ne remonte pas le
   * texte lettre par lettre.
   */
  const signature = jetons.map((j) => j.cle).join(",");
  const repereEcrit = useRef<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    const q = query.trim();
    if (q) p.set("q", q);
    if (signature) p.set("f", signature);

    const suffixe = p.toString().replace(/%3A/g, ":").replace(/%2C/g, ",");
    const adresse = window.location.pathname + (suffixe ? `?${suffixe}` : "");
    if (adresse === window.location.pathname + window.location.search) return;

    const empile = repereEcrit.current !== null && repereEcrit.current !== signature;
    repereEcrit.current = signature;
    window.history[empile ? "pushState" : "replaceState"](null, "", adresse);
  }, [query, signature]);

  /* Les suggestions et leur clavier : les critères d'abord, puis les
     marques du site. Un critère se POSE, une marque s'OUVRE. */
  const { suggestions, surligne, setSurligne, garni, auClavier } = useRecherche(
    query,
    criteresProposes
  );

  function toucheDansLeChamp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setPanneau(false);
      champ.current?.blur();
      return;
    }

    /* Sur un champ vide, le premier retour arrière VISE le dernier
       jeton, le second le retire. */
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

  /* Au doigt, toucher le champ ouvre la feuille AVANT que le clavier
     monte derrière la page. Voir l'annuaire. */
  function ouvrirAuDoigt(e: React.PointerEvent | React.FocusEvent): boolean {
    if (!window.matchMedia(AU_DOIGT).matches) return false;
    if (e.type === "pointerdown") e.preventDefault();
    else champ.current?.blur();
    setFeuille(true);
    return true;
  }

  /* ------------------------------------------------------------------
     Le panneau « Tous les critères »
     ------------------------------------------------------------------ */

  const themesVisibles = useMemo(() => {
    if (tousLesThemes) return themesDispo;
    /* Un thème posé reste toujours visible, même au-delà du dixième :
       sinon on ne saurait plus où le décocher. */
    const coches = themesDispo.filter(([t]) => themes.includes(t));
    const autres = themesDispo.filter(([t]) => !themes.includes(t));
    return [...coches, ...autres].slice(0, Math.max(THEMES_VISIBLES, coches.length));
  }, [themesDispo, themes, tousLesThemes]);
  const themesCaches = themesDispo.length - themesVisibles.length;

  /* Une famille à une seule valeur n'a rien à trancher : on ne la
     montre que si elle offre un choix, ou si l'on y a déjà posé
     quelque chose (qu'on doit pouvoir retirer). */
  const formatsUtiles = formatsDispo.length > 1 || formats.length > 0;
  const marquesUtiles = marquesDispo.length > 1 || marques.length > 0;
  const sourcesUtiles = sourcesDispo.length > 1 || sources.length > 0;
  const filtrable =
    actifs > 0 || themesDispo.length > 0 || formatsUtiles || marquesUtiles || sourcesUtiles;

  const chip =
    "shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white";
  const chipOn = "cta-barre bg-white font-extrabold text-[var(--color-ink)]";

  const pastille = (
    cle: string,
    libelle: string,
    total: number,
    actif: boolean,
    onClick: () => void
  ) => (
    <button
      key={cle}
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`${chip} ${actif ? chipOn : chipOff}`}
    >
      {libelle}
      <span className="ml-1.5 opacity-55 tabular-nums">{total}</span>
    </button>
  );

  /*
   * LE CONTENU DU PANNEAU, ÉCRIT UNE FOIS : dans le dépli sous la ligne
   * sur grand écran, dans la feuille au doigt, jamais les deux.
   */
  const contenuFiltres = (
    <div className="flex flex-col gap-5">
      {themesDispo.length > 0 && (
        <div>
          <p className="eyebrow m-0 mb-2">Thème</p>
          <div className="flex flex-wrap items-center gap-2">
            {themesVisibles.map(([t, n]) =>
              pastille(t, t, n, themes.includes(t), () => basculerTheme(t))
            )}
            {(themesCaches > 0 || tousLesThemes) && themesDispo.length > THEMES_VISIBLES && (
              <button
                type="button"
                onClick={() => setTousLesThemes((v) => !v)}
                aria-expanded={tousLesThemes}
                className="px-1 text-[13px] font-bold text-white underline underline-offset-4 transition hover:text-white/80"
              >
                {tousLesThemes
                  ? "Réduire"
                  : `+ ${themesCaches} autre${themesCaches > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      )}

      {formatsUtiles && (
        <div>
          <p className="eyebrow m-0 mb-2">Format</p>
          <div className="flex flex-wrap items-center gap-2">
            {formatsDispo.map((f) =>
              pastille(f.cle, f.label, f.total, formats.includes(f.cle), () =>
                basculerFormat(f.cle)
              )
            )}
          </div>
        </div>
      )}

      {marquesUtiles && (
        <div>
          <p className="eyebrow m-0 mb-2">Marque</p>
          <div className="flex flex-wrap items-center gap-2">
            {marquesDispo.map((m) =>
              pastille(m.slug, m.nom, m.total, marques.includes(m.slug), () =>
                basculerMarque(m.slug)
              )
            )}
          </div>
        </div>
      )}

      {sourcesUtiles && (
        <div>
          <p className="eyebrow m-0 mb-2">Source</p>
          <div className="flex flex-wrap items-center gap-2">
            {sourcesDispo.map((s) =>
              pastille(s.cle, s.label, s.total, sources.includes(s.cle), () =>
                basculerSource(s.cle)
              )
            )}
          </div>
        </div>
      )}

      {actifs > 0 && (
        <button
          type="button"
          onClick={reinitialiser}
          className="self-start text-[12.5px] font-bold text-white/75 underline underline-offset-2 hover:text-white"
        >
          Tout effacer
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ---------------- la barre de requête ----------------

          La même que l'annuaire et la vitrine : pas de caisson, une
          loupe, les jetons devant le curseur, un trait de deux pixels. */}
      <div ref={bloc} className="relative z-20 mb-4">
        <div className="flex items-start gap-3">
          <IconLoupe className="mt-[7px] h-[19px] w-[19px] shrink-0 text-white/85" />

          {/* Le clic n'importe où dans la ligne va au champ : l'espace
              entre deux jetons fait partie de la phrase. */}
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
              placeholder={jetons.length > 0 ? "Affiner…" : "Chercher un post, une marque, un thème…"}
              aria-label="Chercher un post"
              autoComplete="off"
              className="requete-champ"
            />
          </div>

          {!query && (
            <span className="requete-touche mt-[7px] hidden shrink-0 sm:block">⌘ K</span>
          )}
        </div>

        <div
          className="requete-trait mt-2.5"
          style={{ "--remplissage": `${remplissage}%` } as React.CSSProperties}
        />

        {/* Les suggestions poussent le contenu au lieu de le recouvrir,
            comme dans l'annuaire : c'est une liste qu'on lit dessous. */}
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
              uniteCompte="posts"
            />
          </div>
        )}

        {/*
         * LA LIGNE DU BAS : à gauche ce qu'on peut ajouter à la requête,
         * à droite l'ordre du fil. C'est la place du rail d'affichage
         * dans l'annuaire ; un fil de lecture n'a pas de densité, mais il
         * a un tri, et c'est le seul autre réglage de la page.
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

            {filtrable && (
              <button
                type="button"
                onClick={() => setOuvert((v) => !v)}
                aria-expanded={ouvert}
                aria-controls="filtres-posts"
                className="text-[13px] font-bold text-white/70 underline underline-offset-[3px] transition hover:text-white"
              >
                Tous les critères
                {actifs > 0 && <span className="ml-1.5 text-white/50">({actifs})</span>}
              </button>
            )}
          </div>

          <div role="group" aria-label="Trier les posts" className="ml-auto flex items-center gap-x-3.5">
            <span
              aria-hidden
              className="hidden text-[9px] font-black uppercase tracking-[0.18em] text-white/66 sm:block"
            >
              Tri
            </span>
            {TRIS.map(([cle, label]) => (
              <button
                key={cle}
                type="button"
                onClick={() => setTri(cle)}
                aria-pressed={tri === cle}
                className={`py-1.5 text-[12.5px] font-bold transition ${
                  tri === cle ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                <span className={tri === cle ? "border-b-[1.5px] border-white pb-[3px]" : ""}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Le dépli des critères, sous le filet. Au doigt, c'est la
            feuille qui monte, plus bas. */}
        {ouvert && !auDoigt && (
          <div id="filtres-posts" className="border-b border-white/14 py-4">
            {contenuFiltres}
          </div>
        )}
      </div>

      <p className="m-0 mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
        {resultats.length} post{resultats.length > 1 ? "s" : ""}
      </p>

      {resultats.length === 0 ? (
        <div className="glass p-8 text-center">
          {/* « Rien ne correspond » et « rien n'existe » n'appellent pas
              la même réponse. */}
          <p className="m-0 text-[15px] text-white/90">
            {posts.length === 0 ? (
              <>Rien n&apos;est encore publié ici. Ça ne saurait tarder.</>
            ) : (
              <>
                Aucun post ne correspond. Essaie avec moins de filtres, ou{" "}
                <Link
                  href="/marques"
                  className="font-bold text-white underline underline-offset-2"
                >
                  va voir les marques
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          {aLaUne && <ALaUne post={aLaUne} />}

          <div className="flex flex-col gap-4">
            {visibles.map((p) => (
              <LignePost key={p.id} post={p} accroche={sansMarquage(p.caption)} />
            ))}
          </div>

          {reste > 0 && (
            <div className="mt-7 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setCombien((n) => n + LOT)}
                className="card-light px-7 py-3.5"
              >
                <span className="relative z-3 text-[14px] font-extrabold">
                  Voir {Math.min(reste, LOT)} post{Math.min(reste, LOT) > 1 ? "s" : ""} de
                  plus
                </span>
              </button>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">
                {visibles.length} sur {fil.length}
              </p>
            </div>
          )}
        </>
      )}

      {/* La recherche au doigt, plein écran : la même que l'annuaire, avec
          les critères du fil en tête. */}
      <FeuilleRecherche
        ouverte={feuille}
        query={query}
        onQuery={setQuery}
        onFermer={fermerLaFeuille}
        criteres={criteresProposes}
        onPoser={poser}
        uniteCompte="posts"
        placeholder="Chercher un post, un thème…"
      />

      {/* Les critères au doigt : la feuille de l'annuaire et de la
          vitrine, et son pied compte les POSTS. */}
      <FeuilleFiltres
        ouvert={auDoigt && ouvert}
        onFermer={() => setOuvert(false)}
        id="filtres-posts"
        pied={
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.98]"
          >
            Voir {resultats.length > 1 ? "les" : "le"} {resultats.length} post
            {resultats.length > 1 ? "s" : ""}
          </button>
        }
      >
        {contenuFiltres}
      </FeuilleFiltres>
    </>
  );
}

/**
 * Le dernier post, en bandeau.
 *
 * Il ne dit rien de plus que sa ligne du fil ; il dit la même chose en
 * grand. C'est tout ce qu'on demande à une une : donner un point
 * d'entrée à qui arrive sans idée précise, et un repère de fraîcheur —
 * on voit du premier coup d'œil de quand date la dernière publication.
 */
function ALaUne({ post }: { post: Post }) {
  const cover = couverture(post);
  const surtitre = ["Le post de la semaine", post.brand?.name]
    .filter(Boolean)
    .join(" · ");

  /*
   * DEUX VOILES, PARCE QUE LE CADRE CHANGE DE FORME.
   *
   * En 21/9 le texte est posé à gauche d'une image très large : le
   * dégradé va de la gauche vers la droite et laisse la photo
   * respirer. Sur un téléphone, le bandeau devient presque un portrait
   * et le texte passe en bas ; le même dégradé oblique y assombrirait
   * le mauvais côté. On en pose donc un par cas plutôt qu'un compromis
   * qui ne rendrait bien nulle part.
   */
  const voileHaut =
    "linear-gradient(0deg, rgba(var(--voile),0.94) 0%, rgba(var(--voile),0.62) 38%, rgba(var(--voile),0.05) 78%)";
  const voileLarge =
    "linear-gradient(74deg, rgba(var(--voile),0.92) 0%, rgba(var(--voile),0.5) 54%, rgba(var(--voile),0) 82%)";

  return (
    <article className="rise rise-2 relative mb-4 overflow-hidden rounded-[22px] shadow-[0_24px_60px_-26px_rgba(20,6,50,0.9)]">
      <Link href={`/posts/${post.slug}`} className="group block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[rgba(var(--voile),0.5)] sm:aspect-[16/9] lg:aspect-[21/9]">
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vignette(cover, 1400)}
              alt={post.image_alt || post.title}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          )}

          <div
            aria-hidden
            className="absolute inset-0 sm:hidden"
            style={{ backgroundImage: voileHaut }}
          />
          <div
            aria-hidden
            className="absolute inset-0 hidden sm:block"
            style={{ backgroundImage: voileLarge }}
          />

          <div className="absolute inset-x-0 bottom-0 max-w-[560px] p-5 sm:p-7 lg:p-10">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.24em] text-white/78">
              {surtitre}
            </p>

            <h2 className="m-0 mt-2.5 text-[clamp(22px,5.6vw,40px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-white">
              {post.title}
            </h2>

            {post.caption && (
              <p className="m-0 mt-3 line-clamp-2 text-[14px] font-medium leading-relaxed text-white/84 sm:text-[15px]">
                {sansMarquage(post.caption)}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {post.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-white/14 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-white/90"
                >
                  {k}
                </span>
              ))}
              {post.published_at && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-white/60">
                  {dateCourte(post.published_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
