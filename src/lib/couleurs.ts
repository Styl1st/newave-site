/**
 * LES COULEURS DES PIÈCES : lues une fois, cherchées sans calcul.
 *
 * Le nuancier de la vitrine ne fait tourner aucune IA. Chaque pièce
 * reçoit une ou deux FAMILLES de couleur (« noir », « marine »…) au
 * moment où elle entre au catalogue, et la recherche ne fait ensuite
 * que comparer des mots en base. Rien ne se calcule à la visite.
 *
 * DEUX SOURCES, DANS CET ORDRE.
 *
 *   1. LE NOM DE LA PIÈCE. « Hoodie washed black », « Cargo olive » :
 *      quand la marque l'écrit, c'est la meilleure réponse possible, et
 *      elle ne coûte rien. Un peu plus d'un tiers du catalogue se lit
 *      ainsi.
 *
 *   2. LA PHOTO, à défaut. Une vignette de quelques dizaines de pixels
 *      suffit (voir `couleursDesPixels`) : on télécharge deux ou trois
 *      kilo-octets par pièce, une seule fois dans sa vie.
 *
 * CE FICHIER NE FAIT AUCUNE REQUÊTE et n'importe rien : il se teste tel
 * quel (`tests/couleurs.test.mjs`) et sert aussi bien au serveur qu'à la
 * barre de filtres, qui y prend les noms et les teintes du nuancier.
 */

export type CleCouleur =
  | "noir"
  | "gris"
  | "blanc"
  | "beige"
  | "marron"
  | "kaki"
  | "vert"
  | "bleu"
  | "marine"
  | "violet"
  | "rose"
  | "rouge"
  | "bordeaux"
  | "orange"
  | "jaune"
  | "dore"
  | "argente";

export type Couleur = {
  cle: CleCouleur;
  nom: string;
  /** La pastille du nuancier. */
  hex: string;
  /** Pour les métaux, un reflet plutôt qu'un aplat. */
  reflet?: string;
};

/**
 * Le nuancier, dans l'ordre où il s'affiche : les neutres, les terres,
 * les froids, les chauds, les métaux.
 *
 * Le doré et l'argenté ne viennent que du NOM : sur une photo, un
 * bijou en or ressemble à du jaune ou à du beige, et l'on préfère ne
 * rien dire que dire faux.
 */
export const COULEURS: readonly Couleur[] = [
  { cle: "noir", nom: "Noir", hex: "#16131c" },
  { cle: "gris", nom: "Gris", hex: "#8a8792" },
  { cle: "blanc", nom: "Blanc", hex: "#f1ece2" },
  { cle: "beige", nom: "Beige", hex: "#cdb48d" },
  { cle: "marron", nom: "Marron", hex: "#6b4630" },
  { cle: "kaki", nom: "Kaki", hex: "#6f6b3c" },
  { cle: "vert", nom: "Vert", hex: "#2f6a48" },
  { cle: "bleu", nom: "Bleu", hex: "#4a6fa8" },
  { cle: "marine", nom: "Marine", hex: "#1d2747" },
  { cle: "violet", nom: "Violet", hex: "#7a55b0" },
  { cle: "rose", nom: "Rose", hex: "#eb93b8" },
  { cle: "rouge", nom: "Rouge", hex: "#c4302b" },
  { cle: "bordeaux", nom: "Bordeaux", hex: "#6e1f2e" },
  { cle: "orange", nom: "Orange", hex: "#d9772b" },
  { cle: "jaune", nom: "Jaune", hex: "#e8c547" },
  { cle: "dore", nom: "Doré", hex: "#c9a24a", reflet: "linear-gradient(135deg, #f6e3a1, #b88a2c 55%, #f0d27c)" },
  { cle: "argente", nom: "Argenté", hex: "#c3c6cc", reflet: "linear-gradient(135deg, #ffffff, #9a9ea8 55%, #e8eaee)" },
];

export const CLES_COULEURS: readonly string[] = COULEURS.map((c) => c.cle);

export function estUneCouleur(cle: string): cle is CleCouleur {
  return CLES_COULEURS.includes(cle);
}

/** Au plus deux couleurs par pièce : au-delà, c'est un imprimé. */
export const COULEURS_PAR_PIECE = 2;

/* ==================================================================
   1. LE NOM
   ================================================================== */

/**
 * Les mots de chaque famille, en français et en anglais, écrits SANS
 * ACCENTS (le texte est aplati avant d'être lu). Les expressions de
 * plusieurs mots passent avant les mots seuls : « bleu marine » est du
 * marine, pas du bleu ; « vert olive » est du kaki.
 *
 * CE QUI N'Y EST PAS, ET POURQUOI. « Or » (la conjonction), « nuit »,
 * « ciel », « forest », « pine », « cherry », « ash », « smoke »,
 * « cafe » : des mots qu'on croise dans des noms de collections bien
 * plus souvent que comme couleurs. Une pièce sans couleur dans son nom
 * passe de toute façon par sa photo.
 */
const EXPRESSIONS: [string, CleCouleur][] = [
  ["bleu marine", "marine"],
  ["navy blue", "marine"],
  ["bleu nuit", "marine"],
  ["dark blue", "marine"],
  ["midnight blue", "marine"],
  ["night blue", "marine"],
  ["vert olive", "kaki"],
  ["vert kaki", "kaki"],
  ["vert militaire", "kaki"],
  ["army green", "kaki"],
  ["olive green", "kaki"],
  ["vert sapin", "vert"],
  ["vert foret", "vert"],
  ["forest green", "vert"],
  ["bottle green", "vert"],
  ["bleu ciel", "bleu"],
  ["sky blue", "bleu"],
  ["baby blue", "bleu"],
  ["light blue", "bleu"],
  ["bleu clair", "bleu"],
  ["bleu canard", "bleu"],
  ["off white", "blanc"],
  ["blanc casse", "blanc"],
  ["vieux rose", "rose"],
  ["sang de boeuf", "bordeaux"],
  ["raw denim", "bleu"],
  ["burnt orange", "orange"],
];

/**
 * Des noms propres qui contiennent une couleur sans en être une : on les
 * efface avant de lire. « T-shirt White | Chrome Hearts » est blanc, pas
 * blanc et argenté ; « Black Friday » n'est pas une teinte.
 */
const NOMS_PROPRES = ["black friday", "chrome hearts", "rolling stone", "pink floyd", "black sabbath", "red hot chili", "green day", "white fox"];

const MOTS: Record<CleCouleur, string[]> = {
  noir: ["black", "noir", "noire", "noirs", "noires", "onyx", "ebony", "ebene"],
  gris: ["grey", "gray", "gris", "grise", "grises", "charcoal", "anthracite", "heather", "chine", "chinee", "graphite", "slate"],
  blanc: ["white", "blanc", "blanche", "blancs", "blanches", "offwhite", "ecru", "cream", "creme", "ivory", "ivoire", "bone", "chalk", "vanilla", "vanille"],
  beige: ["beige", "beiges", "sand", "sable", "camel", "tan", "taupe", "oat", "oatmeal", "nude", "latte", "greige", "mastic", "biscuit"],
  marron: ["brown", "marron", "marrons", "chocolate", "chocolat", "choco", "coffee", "mocha", "moka", "espresso", "cognac", "chestnut", "chataigne", "tobacco", "tabac", "caramel", "cocoa", "cacao", "walnut", "noisette", "hazelnut"],
  kaki: ["khaki", "kaki", "olive", "army", "militaire", "moss"],
  vert: ["green", "vert", "verte", "verts", "vertes", "sage", "sauge", "mint", "menthe", "emerald", "emeraude", "pistachio", "pistache", "jade", "teal", "lime"],
  bleu: ["blue", "bleu", "bleue", "bleus", "bleues", "azure", "azur", "cobalt", "turquoise", "cyan"],
  marine: ["navy", "marine"],
  violet: ["purple", "violet", "violette", "violets", "lilac", "lilas", "lavender", "lavande", "mauve", "plum", "prune", "aubergine", "grape", "amethyst", "amethyste", "parme"],
  rose: ["pink", "rose", "roses", "fuchsia", "fuschia", "magenta", "blush", "salmon", "saumon"],
  rouge: ["red", "rouge", "rouges", "scarlet", "ecarlate", "crimson", "carmin", "vermillon"],
  bordeaux: ["burgundy", "bordeaux", "wine", "maroon", "oxblood", "merlot", "cerise", "grenat"],
  orange: ["orange", "oranges", "rust", "rouille", "terracotta", "brick", "brique", "copper", "cuivre", "apricot", "abricot", "tangerine", "mandarine", "pumpkin"],
  jaune: ["yellow", "jaune", "jaunes", "mustard", "moutarde", "lemon", "citron", "butter", "ochre", "ocre", "canary"],
  dore: ["gold", "golden", "dore", "doree", "dores", "dorees", "laiton", "brass"],
  argente: ["silver", "argent", "argente", "argentee", "argentes", "argentees"],
};

/**
 * Des indices plus faibles, lus à part (`indicesDuNom`). Un « denim »
 * est souvent bleu, mais pas toujours : un nom qui ne dit que ça laisse
 * d'abord parler la photo, et l'indice ne sert que si elle se tait.
 */
const INDICES: [string, CleCouleur][] = [
  ["denim", "bleu"],
  ["jean", "bleu"],
  ["jeans", "bleu"],
  ["indigo", "bleu"],
  ["chambray", "bleu"],
  ["camo", "kaki"],
  ["camouflage", "kaki"],
  ["natural", "blanc"],
  ["naturel", "blanc"],
  ["undyed", "blanc"],
];

const PAR_MOT = new Map<string, CleCouleur>();
for (const cle of Object.keys(MOTS) as CleCouleur[]) {
  for (const mot of MOTS[cle]) PAR_MOT.set(mot, cle);
}
const PAR_INDICE = new Map<string, CleCouleur>(INDICES);

/**
 * Une couleur suivie de l'un de ces mots est celle d'un DÉTAIL, pas de
 * la pièce : « Jorts (Red Logo) », « Tee black print ». Précédée de
 * « motif », pareil : « Chaîne dorée, motif rose » est dorée.
 */
const DETAILS = new Set([
  "logo", "logos", "print", "prints", "graphic", "graphics", "embroidery", "embroidered",
  "stitch", "stitching", "lettering", "flame", "flames", "text", "font", "details", "detail",
]);
const AVANT_DETAIL = new Set(["motif", "motifs", "logo", "imprime", "broderie"]);

/** Minuscules, sans accents, la ponctuation devenue des espaces. */
export function aplatir(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les couleurs qu'un nom déclare, dans l'ordre où il les écrit.
 *
 * « Tee Black/White » rend `["noir", "blanc"]`. Un nom sans couleur rend
 * une liste vide : c'est alors à la photo de parler.
 */
export function couleursDuNom(nom: string | null | undefined): CleCouleur[] {
  if (!nom) return [];
  let plat = ` ${aplatir(nom)} `;
  if (plat.trim() === "") return [];
  for (const propre of NOMS_PROPRES) plat = plat.split(` ${propre} `).join(" ");

  const trouvees: { cle: CleCouleur; ou: number }[] = [];
  let reste = plat;

  for (const [expr, cle] of EXPRESSIONS) {
    const ou = reste.indexOf(` ${expr} `);
    if (ou === -1) continue;
    trouvees.push({ cle, ou });
    // On efface l'expression pour que « marine » ne se relise pas en
    // « bleu » dans « bleu marine ». Même longueur : les positions des
    // autres mots ne bougent pas.
    reste = reste.slice(0, ou + 1) + " ".repeat(expr.length) + reste.slice(ou + 1 + expr.length);
  }

  const mots = reste.split(" ");
  let position = 0;
  for (let k = 0; k < mots.length; k++) {
    const cle = PAR_MOT.get(mots[k]);
    const detail = DETAILS.has(mots[k + 1] ?? "") || AVANT_DETAIL.has(mots[k - 1] ?? "");
    if (cle && !detail) trouvees.push({ cle, ou: position });
    position += mots[k].length + 1;
  }

  const ordre: CleCouleur[] = [];
  for (const { cle } of trouvees.sort((a, b) => a.ou - b.ou)) {
    if (!ordre.includes(cle)) ordre.push(cle);
  }
  return ordre.slice(0, COULEURS_PAR_PIECE);
}

/** Ce que le nom laisse deviner, faute de mieux (« denim », « camo »). */
export function indicesDuNom(nom: string | null | undefined): CleCouleur[] {
  if (!nom) return [];
  const vus: CleCouleur[] = [];
  for (const mot of aplatir(nom).split(" ")) {
    const cle = PAR_INDICE.get(mot);
    if (cle && !vus.includes(cle)) vus.push(cle);
  }
  return vus.slice(0, 1);
}

/* ==================================================================
   2. LA PHOTO
   ================================================================== */

type Lab = [number, number, number];

function lineaire(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function f(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}

/** sRGB vers CIE Lab (D65). */
export function versLab(r: number, g: number, b: number): Lab {
  const R = lineaire(r);
  const G = lineaire(g);
  const B = lineaire(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function ecart(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function hexVersRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Les teintes témoins de chaque famille, telles qu'on les voit sur des
 * photos de vêtements : un noir de coton n'est jamais #000, un bleu de
 * jean délavé est presque gris. Un pixel rejoint la famille du témoin
 * le plus proche.
 */
const TEMOINS: [Exclude<CleCouleur, "dore" | "argente">, string[]][] = [
  ["noir", ["#0d0d0f", "#1a1a1c", "#26262a", "#1e1b18", "#202226"]],
  ["gris", ["#3d3d42", "#58585d", "#78787c", "#9a9a9e", "#b9b9bc", "#6f7175"]],
  ["blanc", ["#ffffff", "#f5f5f3", "#ece8de", "#e4e4e4", "#f3eee2"]],
  ["beige", ["#e0d3bb", "#d6c4a2", "#c6ad86", "#b89b74", "#a8957a", "#cbbd9f"]],
  ["marron", ["#3d2b22", "#4f3324", "#6b4630", "#80553a", "#8f6446", "#5c4033"]],
  ["kaki", ["#4e4d30", "#5d5e3a", "#6f6b3c", "#7f7b4c", "#626348", "#8a8458"]],
  ["vert", ["#1f4430", "#2e5e3e", "#3f7d4f", "#2f8f5b", "#6f9e7a", "#8fbf8f", "#2c6e63", "#9bbfa3", "#cfe0cc", "#bdd6c0"]],
  ["bleu", ["#2b5cc3", "#3a5f9a", "#4a90c8", "#5b7fb5", "#6a8caf", "#8fb0dd", "#a9c6e8", "#2f4f7f", "#33a7b8", "#c9d7e8", "#b7cbe3", "#d3dfee"]],
  ["marine", ["#141b30", "#1b2440", "#22305a", "#2a3550", "#1c2333"]],
  ["violet", ["#4a2a6e", "#5e3a8c", "#7b52b8", "#a58fd4", "#c3b1e6", "#6b3f6e", "#d9cdea", "#cfc3e6"]],
  ["rose", ["#f6c6d0", "#f4a6b8", "#e87ca0", "#d4688c", "#e58ad8", "#c9507c", "#f2b8c6", "#f3d3dc", "#ecc3d0", "#f5dde3"]],
  ["rouge", ["#a82024", "#c0282d", "#d63a30", "#e0473c", "#b3262e"]],
  ["bordeaux", ["#4a1520", "#5a1624", "#6e1f2e", "#7d2638", "#5e1a2a"]],
  ["orange", ["#b5562a", "#c8642e", "#d9622b", "#e07a2b", "#f0954a", "#e8834a"]],
  ["jaune", ["#c9a227", "#d9b23a", "#e8c547", "#f2d03b", "#f6e27a", "#f1dc95", "#f3e7b0", "#efe3a0"]],
];

const TEMOINS_LAB: { cle: CleCouleur; lab: Lab }[] = TEMOINS.flatMap(([cle, hexes]) =>
  hexes.map((h) => {
    const [r, g, b] = hexVersRgb(h);
    return { cle, lab: versLab(r, g, b) };
  })
);

/** La famille dont un pixel est le plus proche. */
export function familleDe(lab: Lab): CleCouleur {
  let meilleure = TEMOINS_LAB[0];
  let plusPetit = Infinity;
  for (const t of TEMOINS_LAB) {
    const d = ecart(lab, t.lab);
    if (d < plusPetit) {
      plusPetit = d;
      meilleure = t;
    }
  }
  return meilleure.cle;
}

export type LectureDePhoto = {
  couleurs: CleCouleur[];
  /** La teinte moyenne de la couleur principale, en #rrggbb. */
  teinte: string | null;
};

function enHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Les couleurs d'une photo, d'après ses pixels bruts (RGB ou RGBA, ligne
 * par ligne). Pensée pour une vignette d'environ 40 pixels de côté.
 *
 * TROIS PIÈGES, ET CE QUI LES DÉJOUE.
 *
 *   LE FOND. Sur une photo de produit, la couleur la plus présente est
 *   presque toujours celle du fond, blanc ou gris de studio. On lit le
 *   pourtour de l'image ; s'il est uni, tout ce qui lui ressemble est
 *   écarté.
 *
 *   LE VÊTEMENT DE LA COULEUR DU FOND. Un t-shirt blanc sur fond blanc :
 *   une fois le fond écarté, il ne reste que des ombres grises. Quand
 *   presque rien ne survit à l'écartement, c'est que la pièce EST de la
 *   couleur du fond, et c'est elle qu'on rend.
 *
 *   LE MANNEQUIN ET LE DÉCOR. Le centre de l'image compte plus que ses
 *   bords, et les tons chair comptent moitié : un beige de peau ne doit
 *   pas faire passer un pull noir pour un pull beige.
 */
export function couleursDesPixels(
  pixels: ArrayLike<number>,
  largeur: number,
  hauteur: number,
  canaux = 3
): LectureDePhoto {
  const vide: LectureDePhoto = { couleurs: [], teinte: null };
  if (largeur < 4 || hauteur < 4 || pixels.length < largeur * hauteur * canaux) return vide;

  const n = largeur * hauteur;
  const labs: Lab[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * canaux;
    labs[i] = versLab(pixels[k], pixels[k + 1], pixels[k + 2]);
  }

  /* ---- le fond : la médiane du pourtour, s'il est uni ---- */
  const bord: Lab[] = [];
  const epaisseur = Math.max(1, Math.round(Math.min(largeur, hauteur) / 16));
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      if (x < epaisseur || y < epaisseur || x >= largeur - epaisseur || y >= hauteur - epaisseur) {
        bord.push(labs[y * largeur + x]);
      }
    }
  }
  const mediane = (k: 0 | 1 | 2) => {
    const v = bord.map((l) => l[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const fond: Lab = [mediane(0), mediane(1), mediane(2)];
  const procheDuFond = bord.filter((l) => ecart(l, fond) < 9).length / bord.length;
  const fondUni = procheDuFond >= 0.6;

  /* ---- les pixels qui restent, pesés ---- */
  const poids = new Map<CleCouleur, number>();
  const sommes = new Map<CleCouleur, [number, number, number]>();
  let total = 0;
  let gardes = 0;

  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      // Le centre pèse jusqu'à trois fois plus que les coins.
      const dx = (x + 0.5) / largeur - 0.5;
      const dy = (y + 0.5) / hauteur - 0.5;
      let w = 1 + 2 * Math.max(0, 1 - Math.hypot(dx * 1.6, dy * 1.3) * 1.6);
      total += w;

      const lab = labs[i];
      if (fondUni && ecart(lab, fond) < 13) continue;

      const k = i * canaux;
      const r = pixels[k];
      const g = pixels[k + 1];
      const b = pixels[k + 2];
      if (estUnTonChair(r, g, b)) w *= 0.5;

      gardes += w;
      const cle = familleDe(lab);
      poids.set(cle, (poids.get(cle) ?? 0) + w);
      const s = sommes.get(cle) ?? [0, 0, 0];
      s[0] += r * w;
      s[1] += g * w;
      s[2] += b * w;
      sommes.set(cle, s);
    }
  }

  // Presque rien n'a survécu au fond : la pièce est de sa couleur.
  if (fondUni && gardes < total * 0.1) {
    const cle = familleDe(fond);
    return { couleurs: [cle], teinte: null };
  }
  if (gardes === 0) return vide;

  const classees = [...poids.entries()].sort((a, b) => b[1] - a[1]);
  const [premiere, poidsPremiere] = classees[0];
  const couleurs: CleCouleur[] = [premiere];
  /*
   * UNE SECONDE COULEUR, SEULEMENT SI ELLE PÈSE. Et le gris doit peser
   * davantage : c'est la couleur des ombres, des plis d'un t-shirt blanc,
   * des reflets d'un hoodie noir. Sans cette marche, le filtre « Gris »
   * ramenait la moitié du catalogue.
   */
  const seconde = classees[1];
  const seuil = seconde?.[0] === "gris" ? 0.4 : 0.24;
  if (seconde && seconde[1] / gardes >= seuil && seconde[1] >= poidsPremiere * 0.45) {
    couleurs.push(seconde[0]);
  }

  const s = sommes.get(premiere) ?? [0, 0, 0];
  return {
    couleurs: couleurs.slice(0, COULEURS_PAR_PIECE),
    teinte: enHex(s[0] / poidsPremiere, s[1] / poidsPremiere, s[2] / poidsPremiere),
  };
}

/**
 * Un ton chair, grossièrement : rouge dominant, puis vert, puis bleu,
 * avec un écart modéré. Volontairement large : on ne l'écarte pas, on
 * lui donne moins de poids.
 */
function estUnTonChair(r: number, g: number, b: number): boolean {
  return r > 95 && g > 40 && b > 20 && r > g && g > b && r - g > 12 && r - b > 30 && r - b < 140 && Math.max(r, g, b) - Math.min(r, g, b) > 15;
}

/** La teinte de référence d'une famille, quand la photo n'a pas été lue. */
export function teinteDe(cle: CleCouleur): string {
  return COULEURS.find((c) => c.cle === cle)?.hex ?? "#888888";
}
