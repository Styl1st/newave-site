import { test } from "node:test";
import assert from "node:assert/strict";
import { blanchirLogo, tailleOptique } from "../src/lib/logo-blanc.ts";

/* ---- de quoi fabriquer des images RGBA à la main ---- */

function image(largeur, hauteur, [r, g, b, a]) {
  const data = new Uint8ClampedArray(largeur * hauteur * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { data, largeur, hauteur };
}

function peindre(img, x0, y0, x1, y1, [r, g, b, a]) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.largeur + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  return img;
}

/** Un cadre de 8 px d'épaisseur : un dessin qui n'est pas un aplat. */
function cadre(img, x0, y0, x1, y1, couleur) {
  peindre(img, x0, y0, x1, y0 + 8, couleur);
  peindre(img, x0, y1 - 8, x1, y1, couleur);
  peindre(img, x0, y0, x0 + 8, y1, couleur);
  peindre(img, x1 - 8, y0, x1, y1, couleur);
  return img;
}

function pixel(res, x, y) {
  const i = (y * res.largeur + x) * 4;
  return [res.data[i], res.data[i + 1], res.data[i + 2], res.data[i + 3]];
}

const TRANSPARENT = [0, 0, 0, 0];
const NOIR = [0, 0, 0, 255];
const BLANC = [255, 255, 255, 255];

/* ---- blanchirLogo ---- */

test("logo noir sur fond transparent : il passe en blanc, recadré sur le dessin", () => {
  const res = blanchirLogo(cadre(image(200, 100, TRANSPARENT), 50, 20, 150, 80, NOIR));
  assert.equal(res.ok, true);
  assert.equal(res.largeur, 100);
  assert.equal(res.hauteur, 60);
  assert.deepEqual(pixel(res, 0, 0), [255, 255, 255, 255]);
  assert.equal(pixel(res, 50, 30)[3], 0);
});

test("logo noir sur fond blanc opaque : le fond est retiré, le dessin passe en blanc", () => {
  const res = blanchirLogo(cadre(image(200, 100, BLANC), 40, 30, 160, 70, NOIR));
  assert.equal(res.ok, true);
  assert.equal(res.largeur, 120);
  assert.equal(res.hauteur, 40);
  assert.deepEqual(pixel(res, 2, 2), [255, 255, 255, 255]);
  assert.equal(pixel(res, 60, 20)[3], 0);
});

test("logo clair sur fond noir opaque : le fond noir est retiré aussi", () => {
  const res = blanchirLogo(cadre(image(200, 100, NOIR), 40, 30, 160, 70, BLANC));
  assert.equal(res.ok, true);
  assert.equal(res.largeur, 120);
  assert.equal(res.hauteur, 40);
});

test("une photo (bord qui change de couleur) n'est pas un logo", () => {
  const img = image(200, 100, BLANC);
  for (let x = 0; x < 200; x++) {
    peindre(img, x, 0, x + 1, 100, [(x * 37) % 256, (x * 11) % 256, (x * 73) % 256, 255]);
  }
  assert.deepEqual(blanchirLogo(img), { ok: false, raison: "fond-non-uni" });
});

test("un fond uni mais coloré (gris moyen, rouge) est un choix de la marque : on n'y touche pas", () => {
  const gris = cadre(image(200, 100, [128, 128, 128, 255]), 40, 30, 160, 70, NOIR);
  assert.deepEqual(blanchirLogo(gris), { ok: false, raison: "fond-colore" });
  const rouge = cadre(image(200, 100, [200, 30, 40, 255]), 40, 30, 160, 70, BLANC);
  assert.deepEqual(blanchirLogo(rouge), { ok: false, raison: "fond-colore" });
});

test("une icône trop petite ne fait pas un logo lisible", () => {
  const img = cadre(image(47, 42, TRANSPARENT), 5, 5, 42, 37, NOIR);
  assert.deepEqual(blanchirLogo(img), { ok: false, raison: "trop-petit" });
});

test("un dessin minuscule au milieu d'un grand fichier reste trop petit une fois recadré", () => {
  const img = cadre(image(400, 300, TRANSPARENT), 190, 140, 220, 160, NOIR);
  assert.deepEqual(blanchirLogo(img), { ok: false, raison: "trop-petit" });
});

test("une image entièrement transparente est vide", () => {
  assert.deepEqual(blanchirLogo(image(200, 100, TRANSPARENT)), { ok: false, raison: "vide" });
});

test("un aplat plein (rectangle sans détail) n'est pas un logo", () => {
  const img = peindre(image(200, 100, TRANSPARENT), 4, 4, 196, 96, [180, 40, 60, 255]);
  assert.deepEqual(blanchirLogo(img), { ok: false, raison: "bloc" });
});

test("logo clair avec un détail sombre (un m noir dans un rond blanc) : le détail devient un jour", () => {
  const img = peindre(image(120, 120, TRANSPARENT), 10, 10, 110, 110, BLANC);
  peindre(img, 45, 45, 75, 75, NOIR);
  const res = blanchirLogo(img);
  assert.equal(res.ok, true);
  // recadré sur le carré blanc : 100 × 100, le détail au centre
  assert.equal(res.largeur, 100);
  assert.equal(pixel(res, 50, 50)[3], 0);
  assert.deepEqual(pixel(res, 10, 10), [255, 255, 255, 255]);
});

test("logo sombre avec un détail clair (texte blanc dans un rond noir) : le texte devient un jour", () => {
  const img = peindre(image(120, 120, TRANSPARENT), 10, 10, 110, 110, NOIR);
  peindre(img, 45, 45, 75, 75, BLANC);
  const res = blanchirLogo(img);
  assert.equal(res.ok, true);
  assert.equal(pixel(res, 50, 50)[3], 0);
  assert.deepEqual(pixel(res, 10, 10), [255, 255, 255, 255]);
});

test("un logo en dégradé (chromé) reste plein : pas de trous dans les reflets", () => {
  const img = image(200, 100, TRANSPARENT);
  for (let x = 20; x < 180; x++) {
    if (x % 10 >= 6) continue; // des colonnes espacées : un dessin, pas un aplat
    const v = Math.round(60 + ((x - 20) / 160) * 150); // de 60 à 210
    peindre(img, x, 20, x + 1, 80, [v, v, v, 255]);
  }
  const res = blanchirLogo(img);
  assert.equal(res.ok, true);
  for (const x of [0, 40, 80, 120, 150]) assert.equal(pixel(res, x, 30)[3], 255);
});

test("les bords adoucis d'un logo transparent gardent leur demi-transparence", () => {
  const img = cadre(image(200, 100, TRANSPARENT), 50, 20, 150, 80, NOIR);
  peindre(img, 150, 20, 151, 80, [0, 0, 0, 128]);
  const res = blanchirLogo(img);
  assert.equal(res.ok, true);
  assert.equal(res.largeur, 101);
  assert.equal(pixel(res, 100, 10)[3], 128);
});

/* ---- tailleOptique ---- */

test("la taille se règle sur la surface : un mot long et un symbole carré pèsent pareil", () => {
  assert.deepEqual(tailleOptique(900, 100), { largeur: 156, hauteur: 17 });
  assert.deepEqual(tailleOptique(300, 300), { largeur: 50, hauteur: 50 });
});

test("un logo moyen garde ses proportions", () => {
  assert.deepEqual(tailleOptique(183, 100), { largeur: 70, hauteur: 38 });
});

test("bornes : 50 de haut au plus, 17 au moins, 260 de large au plus", () => {
  assert.deepEqual(tailleOptique(100, 300), { largeur: 17, hauteur: 50 });
  assert.deepEqual(tailleOptique(2000, 100), { largeur: 260, hauteur: 13 });
});

test("dimensions absurdes : la boîte d'un symbole carré plutôt qu'une division par zéro", () => {
  assert.deepEqual(tailleOptique(0, 0), { largeur: 50, hauteur: 50 });
  assert.deepEqual(tailleOptique(NaN, 10), { largeur: 50, hauteur: 50 });
});
