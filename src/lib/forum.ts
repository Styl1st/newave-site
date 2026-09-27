/**
 * Le forum : rubriques, villes, rémunérations, types, et les petites
 * fonctions d'affichage que le serveur et le navigateur partagent.
 *
 * PAS DE « use server » ICI, et c'est voulu (même raison que
 * `signalement.ts`) : un module serveur ne peut exporter que des
 * fonctions asynchrones, or le formulaire de publication lit ces listes
 * dans le navigateur. Les actions vivent dans `app/forum/actions.ts`,
 * les lectures dans `lib/forum-queries.ts`.
 */

/* ------------------------------------------------------------------
   Les rubriques
   ------------------------------------------------------------------ */

export type RubriqueCle = "casting" | "photo" | "collab" | "evenement" | "idees" | "discussion";

export type CleDetail = "date" | "remuneration" | "profils" | "portfolio" | "dates" | "adresse" | "entree";

export type ChampDetail = {
  cle: CleDetail;
  label: string;
  placeholder: string;
  /** `dates` : un calendrier, du… au… ; `remuneration` : un menu ; sinon du texte. */
  type?: "texte" | "dates" | "remuneration";
};

export type Rubrique = {
  cle: RubriqueCle;
  label: string;
  /** Tirée de la palette du site : rose, bleu, lavande, crème… */
  couleur: string;
  /** Ce qu'on range dedans, sous la tuile du formulaire. */
  description: string;
  /** Le bloc « Détails » du formulaire, et le bandeau de la page annonce. */
  details: ChampDetail[];
};

const DATE: ChampDetail = { cle: "date", label: "Quand", placeholder: "Choisir les dates", type: "dates" };
const REMUNERATION: ChampDetail = {
  cle: "remuneration",
  label: "Rémunération",
  placeholder: "",
  type: "remuneration",
};

export const RUBRIQUES: Rubrique[] = [
  {
    cle: "casting",
    label: "Casting",
    couleur: "#e58ad8",
    description: "Mannequins, modèles mains, figurants",
    details: [DATE, REMUNERATION, { cle: "profils", label: "Profils", placeholder: "Nombre, genre, taille" }],
  },
  {
    cle: "photo",
    label: "Photo & stylisme",
    couleur: "#8fa8f0",
    description: "Photographes, stylistes, MUA",
    details: [DATE, REMUNERATION, { cle: "portfolio", label: "Portfolio", placeholder: "Lien vers ton travail" }],
  },
  {
    cle: "collab",
    label: "Collab",
    couleur: "#b49bf0",
    description: "Capsule, co-branding, atelier partagé",
    details: [],
  },
  {
    cle: "evenement",
    label: "Événement",
    couleur: "#f0a860",
    description: "Pop-up, vente privée, salon",
    details: [
      { cle: "dates", label: "Dates", placeholder: "Choisir les dates", type: "dates" },
      { cle: "adresse", label: "Adresse", placeholder: "12 rue de Charonne, Paris 11e" },
      { cle: "entree", label: "Entrée", placeholder: "Libre, sur inscription…" },
    ],
  },
  {
    cle: "idees",
    label: "Idées pour NEWAVE",
    couleur: "#f2ecff",
    description: "Ce que le site devrait faire",
    details: [],
  },
  {
    cle: "discussion",
    label: "Discussion",
    couleur: "#6fd0b0",
    description: "Questions, retours, entraide",
    details: [],
  },
];

export function rubrique(cle: string): Rubrique {
  return RUBRIQUES.find((r) => r.cle === cle) ?? RUBRIQUES[RUBRIQUES.length - 1];
}

export function estUneRubrique(v: string | null | undefined): v is RubriqueCle {
  return RUBRIQUES.some((r) => r.cle === v);
}

/* ------------------------------------------------------------------
   La rémunération
   ------------------------------------------------------------------ */

export type Remuneration = "remunere" | "echange" | "benevole" | "tenues";

export const REMUNERATIONS: { cle: Remuneration; label: string }[] = [
  { cle: "remunere", label: "Rémunéré" },
  { cle: "echange", label: "Échange" },
  { cle: "tenues", label: "Tenues offertes" },
  { cle: "benevole", label: "Bénévole" },
];

export function libelleRemuneration(cle: string | null | undefined): string | null {
  return REMUNERATIONS.find((r) => r.cle === cle)?.label ?? null;
}

/* ------------------------------------------------------------------
   Les villes

   UNE LISTE FERMÉE, pour que le filtre marche : « Paris », « paris »
   et « Paris 11e » tapés à la main feraient trois villes, et le filtre
   n'en trouverait qu'une. « Autre » reste possible, en texte libre ;
   ces annonces-là se trouvent par la recherche et par « Toutes ».
   ------------------------------------------------------------------ */

export const VILLES = [
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Toulouse",
  "Nice",
  "Strasbourg",
  "Montpellier",
  "Rennes",
  "En ligne",
];

/** Celles qu'on montre en pastilles sur grand écran ; les autres passent par un menu. */
export const VILLES_EN_VUE = ["Paris", "Lyon", "Marseille", "Bordeaux", "Nantes", "En ligne"];

/** « paris », « PARIS » → « Paris » ; une ville hors liste est nettoyée, pas refusée. */
export function villeNormalisee(v: string | null | undefined): string | null {
  const brut = (v ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (!brut) return null;
  const connue = VILLES.find((x) => x.toLowerCase() === brut.toLowerCase());
  if (connue) return connue;
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

/* ------------------------------------------------------------------
   Les dates

   RANGÉES EN INTERVALLE ISO, AFFICHÉES EN FRANÇAIS. « 2026-10-14/
   2026-10-16 » se compare, se trie et se filtrera un jour ; « du 14 au
   16 oct. » se lit. Un seul jour s'écrit sans barre : « 2026-10-14 ».
   Une ancienne valeur en texte libre (d'avant le calendrier) s'affiche
   telle quelle plutôt que de disparaître.
   ------------------------------------------------------------------ */

export const INTERVALLE_ISO = /^(\d{4}-\d{2}-\d{2})(?:\/(\d{4}-\d{2}-\d{2}))?$/;

export type Intervalle = { debut: string; fin: string };

/** « 2026-10-14/2026-10-16 » → { debut, fin } ; un seul jour → debut = fin. */
export function lireDates(v: string | null | undefined): Intervalle | null {
  const m = (v ?? "").match(INTERVALLE_ISO);
  if (!m) return null;
  const debut = m[1];
  const fin = m[2] ?? m[1];
  return debut <= fin ? { debut, fin } : { debut: fin, fin: debut };
}

export function ecrireDates({ debut, fin }: Intervalle): string {
  return debut === fin ? debut : `${debut}/${fin}`;
}

/** « 2026-10-14 » → une date locale, sans décalage de fuseau. */
export function jourLocal(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}

/** Une date locale → « 2026-10-14 ». */
export function isoDuJour(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * « 14 oct. », « 14 – 16 oct. », « 30 sept. – 2 oct. ». L'année ne
 * s'écrit que si elle n'est pas l'année en cours.
 */
export function libelleDates(v: string | null | undefined): string {
  const i = lireDates(v);
  if (!i) return (v ?? "").trim();
  const d = jourLocal(i.debut);
  const f = jourLocal(i.fin);
  const cetteAnnee = new Date().getFullYear();
  const annee = (x: Date) => (x.getFullYear() !== cetteAnnee ? ` ${x.getFullYear()}` : "");
  const mois = (x: Date) => x.toLocaleDateString("fr-FR", { month: "short" });

  if (i.debut === i.fin) return `${d.getDate()} ${mois(d)}${annee(d)}`;
  if (d.getFullYear() === f.getFullYear() && d.getMonth() === f.getMonth()) {
    return `${d.getDate()} – ${f.getDate()} ${mois(f)}${annee(f)}`;
  }
  if (d.getFullYear() === f.getFullYear()) {
    return `${d.getDate()} ${mois(d)} – ${f.getDate()} ${mois(f)}${annee(f)}`;
  }
  return `${d.getDate()} ${mois(d)}${annee(d) || ` ${d.getFullYear()}`} – ${f.getDate()} ${mois(f)} ${f.getFullYear()}`;
}

/* ------------------------------------------------------------------
   Les tris
   ------------------------------------------------------------------ */

export type TriForum = "populaires" | "tendance" | "recentes";

export const TRIS: { cle: TriForum; label: string }[] = [
  { cle: "populaires", label: "Populaires" },
  { cle: "tendance", label: "Tendance" },
  { cle: "recentes", label: "Récentes" },
];

export function estUnTri(v: string | null | undefined): v is TriForum {
  return v === "populaires" || v === "tendance" || v === "recentes";
}

export type FiltresForum = {
  tri: TriForum;
  ville: string | null;
  rubrique: RubriqueCle | null;
  q: string;
};

/** Combien d'annonces par lot. */
export const LOT_FORUM = 24;

/* ------------------------------------------------------------------
   Les limites, recopiées de la migration 37

   La base les impose de toute façon ; les avoir ici permet de les
   dire AVANT l'envoi (compteur de titre, bouton désactivé) au lieu de
   laisser la base refuser après coup.
   ------------------------------------------------------------------ */

export const TITRE_MAX = 90;
export const TEXTE_MAX = 4000;
export const COMMENTAIRE_MAX = 2000;
export const IMAGES_MAX = 4;
export const BIO_MAX = 160;

/**
 * La messagerie privée arrive au lot B. Tant qu'elle n'est pas là, le
 * bouton « Répondre en privé » ne s'affiche pas : un bouton qui ne mène
 * nulle part est pire que pas de bouton.
 */
export const MESSAGERIE_OUVERTE = false;

/* ------------------------------------------------------------------
   Le pseudo
   ------------------------------------------------------------------ */

/** Même règle que la contrainte `profiles_handle_format`. */
export const HANDLE_REGLE = /^[a-z0-9_][a-z0-9._]{1,22}[a-z0-9_]$/;

export const HANDLES_RESERVES = [
  "admin",
  "administrateur",
  "newave",
  "newavesphere",
  "moderation",
  "moderateur",
  "support",
  "forum",
  "messages",
  "membre",
  "equipe",
];

export function handleValide(h: string): boolean {
  return HANDLE_REGLE.test(h) && !HANDLES_RESERVES.includes(h);
}

/**
 * Un pseudo proposé à partir du nom : « Léa Grain » → « lea.grain ».
 * Ce n'est qu'une suggestion, pré-remplie dans le champ.
 */
export function proposerHandle(nom: string | null | undefined): string {
  const base = (nom ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^[.]+|[.]+$/g, "")
    .slice(0, 24)
    .replace(/[.]+$/g, "");
  if (base.length >= 3 && !HANDLES_RESERVES.includes(base)) return base;
  return `${base || "membre"}.${Math.floor(100 + Math.random() * 900)}`.slice(0, 24);
}

/** Ce qu'on tape (« @Lea.Grain ») ramené à ce qu'on range (« lea.grain »). */
export function handleNettoye(h: string): string {
  return h.trim().replace(/^@+/, "").toLowerCase();
}

/* ------------------------------------------------------------------
   Les données
   ------------------------------------------------------------------ */

export type Details = Partial<Record<CleDetail, string>>;

export type AuteurForum = {
  id: string;
  handle: string | null;
  nom: string | null;
  avatar: string | null;
};

export type MarqueForum = { id: string; nom: string; slug: string };

export type Annonce = {
  id: string;
  rubrique: RubriqueCle;
  titre: string;
  /** Le début du texte, dans le fil ; le texte entier sur la page annonce. */
  texte: string;
  ville: string | null;
  images: string[];
  details: Details;
  cloturee: boolean;
  masque: boolean;
  votes: number;
  commentaires: number;
  created_at: string;
  auteur: AuteurForum;
  marque: MarqueForum | null;
  aVote: boolean;
};

export type Commentaire = {
  id: string;
  parentId: string | null;
  texte: string;
  votes: number;
  masque: boolean;
  created_at: string;
  auteur: AuteurForum;
  aVote: boolean;
  reponses: Commentaire[];
};

export type CarteAuteur = {
  votesRecus: number;
  annonces: number;
  reponsesUtiles: number;
};

/** Ce que le forum sait de la personne connectée. */
export type MoiForum = {
  id: string;
  handle: string | null;
  nom: string | null;
  ville: string | null;
  bio: string | null;
  /** Faux tant que la migration 37 n'est pas passée : le forum se tait alors. */
  pret: boolean;
};

/* ------------------------------------------------------------------
   L'affichage
   ------------------------------------------------------------------ */

/** Au nom de la marque, ou « @pseudo ». */
export function signature(a: Pick<Annonce, "marque" | "auteur">): string {
  if (a.marque) return a.marque.nom;
  return a.auteur.handle ? `@${a.auteur.handle}` : a.auteur.nom ?? "Membre";
}

/** « Recherche mannequin… » → « recherche-mannequin ». Décoratif : seul l'identifiant compte. */
export function slugTitre(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function lienAnnonce(a: Pick<Annonce, "id" | "titre">): string {
  const slug = slugTitre(a.titre);
  return `/forum/${a.id}${slug ? `-${slug}` : ""}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** `/forum/[id]-[slug]` : l'identifiant, ou null si l'adresse ne commence pas par un. */
export function idDepuisParam(param: string): string | null {
  const m = decodeURIComponent(param).match(UUID);
  return m ? m[0].toLowerCase() : null;
}

/** « à l'instant », « il y a 3 h », « il y a 2 j », puis la date. */
export function ilYA(iso: string, maintenant: number = Date.now()): string {
  const secondes = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 1000));
  if (secondes < 60) return "à l'instant";
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours < 30) return `il y a ${jours} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Les deux initiales d'un nom, pour les pastilles d'avatar. */
export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? "?").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean);
  const deux = (mots[0]?.[0] ?? "?") + (mots[1]?.[0] ?? mots[0]?.[1] ?? "");
  return deux.toUpperCase();
}
