/**
 * Un logo de marque, passé en blanc et détouré, pour le ruban de
 * l'accueil.
 *
 * POURQUOI. Le ruban posait chaque logo sur une carte claire. Sans
 * carte, sur le violet du site, les logos tels qu'ils arrivent ne vont
 * pas ensemble : un noir disparaît presque, un blanc ressort, un logo
 * sur fond blanc fait une tache rectangulaire. En blanc, les cent
 * soixante identités se lisent comme une seule affiche.
 *
 * CE QUE FAIT LA FONCTION, DANS L'ORDRE.
 *   1. Un fichier sans transparence est détouré, mais seulement si son
 *      bord est d'une seule couleur, très claire ou très sombre : c'est
 *      le blanc (ou le noir) d'un export. Un bord qui change est une
 *      photo, un bord coloré est un choix de la marque : on refuse.
 *   2. Un logo à deux tons nets (un m noir dans un rond blanc, un texte
 *      blanc dans un rond noir) garderait sinon une forme pleine, sans
 *      son détail : le ton minoritaire devient un jour, on voit le fond
 *      à travers. Un dégradé (un logo chromé) n'a pas deux tons nets, il
 *      reste plein.
 *   3. Tout ce qui reste passe en blanc, transparence gardée.
 *   4. On recadre sur le dessin, puis on refuse ce qui ne fera pas un
 *      logo lisible : trop petit une fois recadré, ou simple aplat.
 *
 * Un refus n'est pas une erreur : le ruban écrit alors le nom de la
 * marque avec la police du site.
 *
 * Module sans dépendance : la route `/api/img` lui passe des pixels
 * décodés par sharp, et les tests le lisent tel quel (`npm test`).
 */

export type ImageRgba = {
  data: Uint8Array | Uint8ClampedArray;
  largeur: number;
  hauteur: number;
};

export type RaisonDuRefus = "trop-petit" | "fond-non-uni" | "fond-colore" | "bloc" | "vide";

export type LogoBlanc =
  | { ok: true; data: Uint8ClampedArray; largeur: number; hauteur: number }
  | { ok: false; raison: RaisonDuRefus };

/** Sous cette opacité, un pixel compte comme transparent. */
const VISIBLE = 24;

/** Une image avec moins de 5 % de pixels transparents est opaque. */
const PART_TRANSPARENTE = 0.05;

/** Le bord d'un fond uni ne s'écarte pas de sa moyenne de plus de ça. */
const DISPERSION_MAX = 20;

/** Un fond « blanc d'export » ou « noir d'export ». */
const FOND_CLAIR = 226;
const FOND_SOMBRE = 34;

/** Sous cet écart au fond, le pixel est du fond ; au-delà du second, du dessin. */
const FOND_CERTAIN = 12;
const DESSIN_CERTAIN = 44;

/** Bandes de luminosité, de 0 à 1. */
const SOMBRE = 0.25;
const CLAIR = 0.75;

/** Deux tons nets : chacun au moins 4 %, et peu de gris entre les deux. */
const PART_DETAIL = 0.04;
const PART_MILIEU_MAX = 0.35;

/** La rampe qui transforme le ton minoritaire en jour, bords adoucis. */
const RAMPE_BAS = 0.35;
const RAMPE_HAUT = 0.78;

/** Recadré, le dessin doit mesurer au moins ça de long. */
const COTE_MIN = 56;

/** Au-delà de 95 % de la boîte couverte, c'est un aplat, pas un logo. */
const COUVERTURE_MAX = 0.95;

function luminosite(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function rampe(bas: number, haut: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - bas) / (haut - bas)));
  return t * t * (3 - 2 * t);
}

export function blanchirLogo(source: ImageRgba): LogoBlanc {
  const { largeur: l, hauteur: h } = source;
  const px = new Uint8ClampedArray(source.data);
  const n = l * h;
  if (!(n > 0) || px.length < n * 4) return { ok: false, raison: "vide" };

  /* ---- 1. le détourage d'un fichier opaque ---- */

  let transparents = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < VISIBLE) transparents++;

  if (transparents / n < PART_TRANSPARENTE) {
    const bord: number[] = [];
    for (let x = 0; x < l; x++) bord.push(x * 4, ((h - 1) * l + x) * 4);
    for (let y = 1; y < h - 1; y++) bord.push(y * l * 4, (y * l + l - 1) * 4);

    const fond = [0, 1, 2].map((c) => bord.reduce((t, i) => t + px[i + c], 0) / bord.length);
    let dispersion = 0;
    for (const i of bord) {
      for (let c = 0; c < 3; c++) dispersion = Math.max(dispersion, Math.abs(px[i + c] - fond[c]));
    }
    if (dispersion > DISPERSION_MAX) return { ok: false, raison: "fond-non-uni" };

    const clair = fond.every((v) => v > FOND_CLAIR);
    const sombre = fond.every((v) => v < FOND_SOMBRE);
    if (!clair && !sombre) return { ok: false, raison: "fond-colore" };

    for (let i = 0; i < px.length; i += 4) {
      const ecart = Math.max(
        Math.abs(px[i] - fond[0]),
        Math.abs(px[i + 1] - fond[1]),
        Math.abs(px[i + 2] - fond[2])
      );
      if (ecart <= FOND_CERTAIN) px[i + 3] = 0;
      else if (ecart < DESSIN_CERTAIN) {
        px[i + 3] = Math.round(px[i + 3] * ((ecart - FOND_CERTAIN) / (DESSIN_CERTAIN - FOND_CERTAIN)));
      }
    }
  }

  /* ---- 2. deux tons nets ? le minoritaire devient un jour ---- */

  let poids = 0;
  let sombres = 0;
  let clairs = 0;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a < VISIBLE) continue;
    const lum = luminosite(px[i], px[i + 1], px[i + 2]);
    poids += a;
    if (lum < SOMBRE) sombres += a;
    else if (lum > CLAIR) clairs += a;
  }
  if (poids === 0) return { ok: false, raison: "vide" };

  const partSombre = sombres / poids;
  const partClaire = clairs / poids;
  const deuxTons =
    partSombre >= PART_DETAIL &&
    partClaire >= PART_DETAIL &&
    1 - partSombre - partClaire <= PART_MILIEU_MAX;

  if (deuxTons) {
    // Le ton majoritaire reste, l'autre s'efface.
    const garderLeClair = partClaire >= partSombre;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const lum = luminosite(px[i], px[i + 1], px[i + 2]);
      const t = garderLeClair ? lum : 1 - lum;
      px[i + 3] = Math.round(px[i + 3] * rampe(RAMPE_BAS, RAMPE_HAUT, t));
    }
  }

  /* ---- 3. tout en blanc ---- */

  for (let i = 0; i < px.length; i += 4) {
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
  }

  /* ---- 4. recadrer, puis juger ---- */

  let x0 = l;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      if (px[(y * l + x) * 4 + 3] < VISIBLE) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { ok: false, raison: "vide" };

  const lr = x1 - x0 + 1;
  const hr = y1 - y0 + 1;
  if (Math.max(lr, hr) < COTE_MIN) return { ok: false, raison: "trop-petit" };

  const sortie = new Uint8ClampedArray(lr * hr * 4);
  let couverts = 0;
  for (let y = 0; y < hr; y++) {
    const debut = ((y + y0) * l + x0) * 4;
    sortie.set(px.subarray(debut, debut + lr * 4), y * lr * 4);
  }
  for (let i = 3; i < sortie.length; i += 4) if (sortie[i] >= VISIBLE) couverts++;
  if (couverts / (lr * hr) > COUVERTURE_MAX) return { ok: false, raison: "bloc" };

  return { ok: true, data: sortie, largeur: lr, hauteur: hr };
}

/**
 * La taille d'affichage d'un logo, réglée sur sa SURFACE.
 *
 * À hauteur égale, un mot long écrase un symbole carré ; à largeur
 * égale, c'est l'inverse. À surface égale, les deux pèsent pareil dans
 * la bande. Bornes : un mot très long ne passe pas sous 17 px de haut
 * (illisible) ni au-dessus de 260 px de large, un symbole ne dépasse pas
 * 50 px de haut. Les valeurs sont en pixels « de référence » : le ruban
 * les multiplie par un facteur selon l'écran.
 */
export function tailleOptique(
  largeurSource: number,
  hauteurSource: number,
  { aire = 2700, hauteurMin = 17, hauteurMax = 50, largeurMax = 260 } = {}
): { largeur: number; hauteur: number } {
  const valide = largeurSource > 0 && hauteurSource > 0;
  const r = valide ? largeurSource / hauteurSource : 1;

  let largeur = Math.sqrt(aire * r);
  let hauteur = largeur / r;
  if (hauteur > hauteurMax) {
    hauteur = hauteurMax;
    largeur = hauteur * r;
  }
  if (hauteur < hauteurMin) {
    hauteur = hauteurMin;
    largeur = hauteur * r;
  }
  if (largeur > largeurMax) {
    largeur = largeurMax;
    hauteur = largeur / r;
  }
  return { largeur: Math.round(largeur), hauteur: Math.round(hauteur) };
}
