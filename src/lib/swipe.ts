/**
 * LE SWIPE : CE QUE LA PERSONNE GARDE DÉCIDE DE CE QU'ON LUI MONTRE.
 *
 * Pas d'IA, pas de compte, rien côté serveur qui retienne la personne.
 * Son PROFIL vit dans son navigateur : quelques poids par type de pièce,
 * par couleur, par marque et par rayon, plus une idée de son budget.
 * Chaque carte gardée les renforce, chaque carte passée les affaiblit un
 * peu. À chaque nouvelle pile, le serveur pioche quelques centaines de
 * pièces au hasard et les CLASSE avec ce profil (`composerLaPile`).
 *
 * 80 / 20. Quatre cartes sur cinq viennent du haut du classement : ce
 * qui ressemble à ce qu'on a gardé. La cinquième vient exprès d'ailleurs
 * (un rayon, une couleur ou une marque que le profil ne connaît pas) :
 * c'est ce qui donne des idées, et ce qui évite de tourner en rond sur
 * trois hoodies noirs.
 *
 * Ce fichier n'importe rien : il se teste tel quel
 * (`tests/swipe.test.mjs`), et sert au navigateur comme au serveur.
 */

export type Carte = {
  id: string;
  slug: string | null;
  nom: string;
  image: string | null;
  images: string[];
  /** En centimes d'euro quand on sait convertir, sinon dans la devise. */
  prix: number | null;
  devise: string;
  disponible: boolean;
  tags: string[];
  couleurs: string[];
  rayon: string | null;
  marque: string;
  marqueNom: string;
  /** Tirée exprès hors du profil, pour donner des idées. */
  decouverte?: boolean;
};

type Poids = Record<string, number>;

export type Profil = {
  tags: Poids;
  couleurs: Poids;
  marques: Poids;
  rayons: Poids;
  /** La somme des log-prix des pièces gardées, et leur nombre. */
  prix: { somme: number; n: number };
  /** Combien de cartes gardées et passées, en tout. */
  gardees: number;
  passees: number;
  /** Le nom des marques vues, pour l'affichage du profil. */
  noms: Record<string, string>;
};

export const PROFIL_VIDE: Profil = {
  tags: {},
  couleurs: {},
  marques: {},
  rayons: {},
  prix: { somme: 0, n: 0 },
  gardees: 0,
  passees: 0,
  noms: {},
};

/** Ce qu'une carte gardée ajoute, ce qu'une carte passée retire. */
const GAIN = 1;
const PERTE = 0.35;
const PLANCHER = -3;
const PLAFOND = 12;

/** Au-delà, les poids les plus faibles s'oublient : le profil reste petit. */
const CLES_PAR_DIMENSION = 24;

function ajuster(poids: Poids, cles: (string | null | undefined)[], delta: number): Poids {
  const suite = { ...poids };
  for (const cle of cles) {
    if (!cle) continue;
    suite[cle] = Math.max(PLANCHER, Math.min(PLAFOND, (suite[cle] ?? 0) + delta));
  }
  return elaguer(suite);
}

function elaguer(poids: Poids): Poids {
  const entrees = Object.entries(poids).filter(([, v]) => Math.abs(v) > 0.05);
  if (entrees.length <= CLES_PAR_DIMENSION) return Object.fromEntries(entrees);
  return Object.fromEntries(
    entrees.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, CLES_PAR_DIMENSION)
  );
}

/** Le profil après une carte. Ne modifie pas celui qu'on lui donne. */
export function apprendre(profil: Profil, carte: Carte, garde: boolean): Profil {
  const d = garde ? GAIN : -PERTE;
  return {
    tags: ajuster(profil.tags, carte.tags, d),
    couleurs: ajuster(profil.couleurs, carte.couleurs, d),
    marques: ajuster(profil.marques, [carte.marque], d),
    rayons: ajuster(profil.rayons, [carte.rayon], d * 0.6),
    prix:
      garde && carte.prix && carte.prix > 0
        ? { somme: profil.prix.somme + Math.log(carte.prix), n: profil.prix.n + 1 }
        : profil.prix,
    gardees: profil.gardees + (garde ? 1 : 0),
    passees: profil.passees + (garde ? 0 : 1),
    noms: elaguerNoms({ ...profil.noms, [carte.marque]: carte.marqueNom }),
  };
}

function elaguerNoms(noms: Record<string, string>): Record<string, string> {
  const cles = Object.keys(noms);
  return cles.length <= 60 ? noms : Object.fromEntries(cles.slice(-60).map((k) => [k, noms[k]]));
}

/** Un profil reçu de l'extérieur, nettoyé : rien qu'on n'attend, rien de trop gros. */
export function profilSur(brut: unknown): Profil {
  const p = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const poids = (v: unknown): Poids => {
    if (!v || typeof v !== "object") return {};
    const sortie: Poids = {};
    for (const [k, n] of Object.entries(v as Record<string, unknown>).slice(0, 60)) {
      if (typeof n === "number" && Number.isFinite(n) && k.length <= 80) {
        sortie[k] = Math.max(PLANCHER, Math.min(PLAFOND, n));
      }
    }
    return elaguer(sortie);
  };
  const prix = (p.prix && typeof p.prix === "object" ? p.prix : {}) as Record<string, unknown>;
  const n = typeof prix.n === "number" && prix.n > 0 ? Math.min(prix.n, 10_000) : 0;
  const somme = typeof prix.somme === "number" && Number.isFinite(prix.somme) ? prix.somme : 0;
  const entier = (v: unknown) => (typeof v === "number" && v >= 0 ? Math.min(Math.floor(v), 1e6) : 0);
  return {
    tags: poids(p.tags),
    couleurs: poids(p.couleurs),
    marques: poids(p.marques),
    rayons: poids(p.rayons),
    prix: n > 0 ? { somme, n } : { somme: 0, n: 0 },
    gardees: entier(p.gardees),
    passees: entier(p.passees),
    noms: {},
  };
}

/** Le profil sait-il déjà quelque chose ? En deçà, on pioche au hasard. */
export function profilConnu(profil: Profil): boolean {
  return profil.gardees >= 2;
}

/** La ressemblance d'une carte avec le profil. Zéro pour un profil vide. */
export function score(profil: Profil, carte: Carte): number {
  let s = 0;
  for (const t of carte.tags) s += 1.0 * (profil.tags[t] ?? 0);
  for (const c of carte.couleurs) s += 0.8 * (profil.couleurs[c] ?? 0);
  s += 1.2 * (profil.marques[carte.marque] ?? 0);
  if (carte.rayon) s += 0.6 * (profil.rayons[carte.rayon] ?? 0);

  // Le budget : rien sous trois pièces gardées, une pente douce ensuite.
  if (profil.prix.n >= 3 && carte.prix && carte.prix > 0) {
    const median = profil.prix.somme / profil.prix.n;
    s -= 1.2 * Math.abs(Math.log(carte.prix) - median);
  }
  return s;
}

/** Ce que le profil connaît le mieux : de quoi tirer une découverte ailleurs. */
function connu(profil: Profil, carte: Carte): boolean {
  return (
    (profil.marques[carte.marque] ?? 0) > 0 ||
    (carte.rayon !== null && (profil.rayons[carte.rayon] ?? 0) > 0.5) ||
    carte.couleurs.some((c) => (profil.couleurs[c] ?? 0) > 1)
  );
}

/**
 * La pile suivante : `n` cartes tirées de la pioche.
 *
 * Profil inconnu : du hasard, mais varié (deux pièces par marque au plus).
 * Profil connu : le haut du classement, avec un peu de bruit pour que
 * deux piles ne se ressemblent pas, et une carte sur cinq tirée exprès
 * hors du profil.
 */
export function composerLaPile(
  profil: Profil,
  pioche: Carte[],
  n = 16,
  alea: () => number = Math.random
): Carte[] {
  const parMarque = new Map<string, number>();
  const pile: Carte[] = [];
  const prendre = (c: Carte, decouverte = false) => {
    if (pile.length >= n || pile.some((x) => x.id === c.id)) return;
    const deja = parMarque.get(c.marque) ?? 0;
    if (deja >= 2) return;
    parMarque.set(c.marque, deja + 1);
    pile.push(decouverte ? { ...c, decouverte: true } : c);
  };

  if (!profilConnu(profil)) {
    for (const c of melanger(pioche, alea)) prendre(c);
    return pile;
  }

  const notees = pioche
    .map((c) => ({ c, s: score(profil, c) + (alea() - 0.5) * 1.5 }))
    .sort((a, b) => b.s - a.s);

  const decouvertes = Math.max(1, Math.round(n * 0.2));
  const proches = n - decouvertes;

  for (const { c } of notees) {
    if (pile.length >= proches) break;
    prendre(c);
  }

  // Les découvertes : parmi ce que le profil ne connaît pas, et qu'il n'a
  // pas rejeté non plus (un score franchement négatif reste dehors).
  const ailleurs = melanger(
    notees.filter(({ c, s }) => !connu(profil, c) && s > -2).map(({ c }) => c),
    alea
  );
  for (const c of ailleurs) {
    if (pile.length >= n) break;
    prendre(c, true);
  }

  // Une pioche trop maigre : on complète avec le reste du classement.
  for (const { c } of notees) {
    if (pile.length >= n) break;
    prendre(c);
  }

  // Les découvertes au milieu de la pile, pas toutes à la fin.
  return intercaler(pile, alea);
}

function melanger<T>(liste: T[], alea: () => number): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function intercaler(pile: Carte[], alea: () => number): Carte[] {
  const proches = pile.filter((c) => !c.decouverte);
  const ailleurs = pile.filter((c) => c.decouverte);
  const sortie = [...proches];
  for (const d of ailleurs) {
    // Jamais en premier : la première carte doit ressembler au profil.
    const ou = 1 + Math.floor(alea() * Math.max(1, sortie.length));
    sortie.splice(ou, 0, d);
  }
  return sortie;
}

/** Les trois traits les plus nets du profil, pour lui dire ce qu'on a compris. */
export function traitsDuProfil(
  profil: Profil,
  nomsDesCouleurs: Record<string, string> = {}
): string[] {
  const meilleur = (p: Poids) =>
    Object.entries(p)
      .filter(([, v]) => v >= 1.5)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
  const traits: string[] = [];
  const tag = meilleur(profil.tags);
  if (tag) traits.push(tag);
  const couleur = meilleur(profil.couleurs);
  if (couleur) traits.push((nomsDesCouleurs[couleur] ?? couleur).toLowerCase());
  const marque = meilleur(profil.marques);
  if (marque) traits.push(profil.noms[marque] ?? marque);
  return traits;
}
