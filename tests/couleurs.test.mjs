import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COULEURS,
  couleursDuNom,
  couleursDesPixels,
  indicesDuNom,
  estUneCouleur,
  familleDe,
  versLab,
} from "../src/lib/couleurs.ts";

/* ---------------- le nom ---------------- */

test("le nom dit la couleur, en français comme en anglais", () => {
  assert.deepEqual(couleursDuNom("Hoodie Washed Black"), ["noir"]);
  assert.deepEqual(couleursDuNom("Pull col rond écru"), ["blanc"]);
  assert.deepEqual(couleursDuNom("Cargo olive"), ["kaki"]);
  assert.deepEqual(couleursDuNom("Veste BORDEAUX"), ["bordeaux"]);
  assert.deepEqual(couleursDuNom("Sweat vert sauge"), ["vert"]);
});

test("les expressions passent avant les mots seuls", () => {
  assert.deepEqual(couleursDuNom("Chemise bleu marine"), ["marine"]);
  assert.deepEqual(couleursDuNom("Jacket army green"), ["kaki"]);
  assert.deepEqual(couleursDuNom("Tee off-white"), ["blanc"]);
});

test("deux couleurs au plus, dans l'ordre du nom", () => {
  assert.deepEqual(couleursDuNom("Tee Black/White"), ["noir", "blanc"]);
  assert.deepEqual(couleursDuNom("Striped tee red, white & blue"), ["rouge", "blanc"]);
});

test("un indice faible laisse parler la photo d'abord", () => {
  assert.deepEqual(couleursDuNom("Denim jacket"), []);
  assert.deepEqual(indicesDuNom("Denim jacket"), ["bleu"]);
  assert.deepEqual(couleursDuNom("Black denim jacket"), ["noir"]);
});

test("la couleur d'un détail n'est pas celle de la pièce", () => {
  assert.deepEqual(couleursDuNom("Crown Logo Jorts (Red Logo)"), []);
  assert.deepEqual(couleursDuNom("Chaîne Flower câble Dorée - Motif Rose"), ["dore"]);
  assert.deepEqual(couleursDuNom("Hoodie black, white print"), ["noir"]);
});

test("les noms propres ne sont pas des couleurs", () => {
  assert.deepEqual(couleursDuNom("T-shirt New York White | Chrome Hearts"), ["blanc"]);
  assert.deepEqual(couleursDuNom("Black Friday hoodie"), []);
  assert.deepEqual(couleursDuNom("Night Blue Denim Jorts"), ["marine"]);
});

test("un mot qui contient une couleur n'en est pas une", () => {
  assert.deepEqual(couleursDuNom("Shredded tee"), []);
  assert.deepEqual(couleursDuNom("Tank top Bluebird"), []);
  assert.deepEqual(couleursDuNom("Spider bunny"), []);
  assert.deepEqual(couleursDuNom(""), []);
  assert.deepEqual(couleursDuNom(null), []);
});

test("les métaux ne viennent que du nom", () => {
  assert.deepEqual(couleursDuNom("Chaîne argentée"), ["argente"]);
  assert.deepEqual(couleursDuNom("Gold ring"), ["dore"]);
});

test("toutes les clés sont connues du nuancier", () => {
  for (const c of COULEURS) assert.ok(estUneCouleur(c.cle));
  assert.ok(!estUneCouleur("fuchsia"));
});

/* ---------------- la photo ---------------- */

/** Une image de l × h pixels, fond uni, et une pièce peinte au centre. */
function image(l, h, fond, peindre) {
  const px = new Uint8Array(l * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      const c = peindre(x, y) ?? (typeof fond === "function" ? fond(x, y) : fond);
      px.set(c, (y * l + x) * 3);
    }
  }
  return px;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const auCentre = (couleur, l = 40, h = 40) => (x, y) =>
  x >= l * 0.28 && x < l * 0.72 && y >= h * 0.2 && y < h * 0.82 ? rgb(couleur) : null;

test("une pièce marine sur fond blanc de studio est marine", () => {
  const px = image(40, 40, rgb("#f7f7f7"), auCentre("#1f2a4c"));
  assert.deepEqual(couleursDesPixels(px, 40, 40).couleurs, ["marine"]);
});

test("un hoodie noir sur fond gris clair est noir, pas gris", () => {
  const px = image(40, 40, rgb("#d9d9d9"), auCentre("#1b1a1f"));
  assert.deepEqual(couleursDesPixels(px, 40, 40).couleurs, ["noir"]);
});

test("un t-shirt blanc sur fond blanc est blanc", () => {
  // Le t-shirt est à peine plus chaud que le fond, avec un fil d'ombre.
  const px = image(40, 40, rgb("#fbfbfb"), (x, y) => {
    if (x >= 11 && x < 29 && y >= 8 && y < 33) return x === 11 ? rgb("#e2e2e2") : rgb("#f6f5f1");
    return null;
  });
  assert.deepEqual(couleursDesPixels(px, 40, 40).couleurs, ["blanc"]);
});

test("sur une photo en situation, le centre l'emporte sur le décor", () => {
  // Un décor en dégradé vert-gris, et une veste rouge au milieu.
  const decor = (x, y) => [90 + x, 110 + y, 95];
  const px = image(40, 40, decor, auCentre("#c42d2b"));
  assert.equal(couleursDesPixels(px, 40, 40).couleurs[0], "rouge");
});

test("une pièce bicolore rend ses deux couleurs", () => {
  const px = image(40, 40, rgb("#ffffff"), (x, y) => {
    if (y < 8 || y >= 34 || x < 8 || x >= 32) return null;
    return x < 20 ? rgb("#3a5f9a") : rgb("#d6c4a2");
  });
  const { couleurs } = couleursDesPixels(px, 40, 40);
  assert.equal(couleurs.length, 2);
  assert.ok(couleurs.includes("bleu") && couleurs.includes("beige"));
});

test("la teinte rendue est celle de la couleur principale", () => {
  const px = image(40, 40, rgb("#ffffff"), auCentre("#6f6b3c"));
  const lu = couleursDesPixels(px, 40, 40);
  assert.deepEqual(lu.couleurs, ["kaki"]);
  assert.equal(lu.teinte, "#6f6b3c");
});

test("une image trop petite ou tronquée ne rend rien", () => {
  assert.deepEqual(couleursDesPixels(new Uint8Array(12), 2, 2).couleurs, []);
  assert.deepEqual(couleursDesPixels(new Uint8Array(30), 10, 10).couleurs, []);
});

test("les témoins se rangent dans la bonne famille", () => {
  const cas = {
    "#000000": "noir",
    "#808080": "gris",
    "#ffffff": "blanc",
    "#22305a": "marine",
    "#e87ca0": "rose",
    "#e8c547": "jaune",
  };
  for (const [hex, cle] of Object.entries(cas)) {
    assert.equal(familleDe(versLab(...rgb(hex))), cle, hex);
  }
});

test("un bleu pâle reste bleu, pas blanc", () => {
  const px = image(40, 40, rgb("#ffffff"), auCentre("#cfd8e4"));
  assert.deepEqual(couleursDesPixels(px, 40, 40).couleurs, ["bleu"]);
});

test("les reflets gris d'un hoodie noir n'en font pas un hoodie gris", () => {
  // Un tiers de la pièce en gris moyen : des plis, des reflets.
  const px = image(40, 40, rgb("#ffffff"), (x, y) => {
    if (x < 11 || x >= 29 || y < 8 || y >= 33) return null;
    return x % 3 === 0 ? rgb("#5f5f63") : rgb("#19181c");
  });
  assert.deepEqual(couleursDesPixels(px, 40, 40).couleurs, ["noir"]);
});
