import { test } from "node:test";
import assert from "node:assert/strict";
import { libelleAchat, libelleBoutique } from "../src/lib/achat.ts";

test("une pièce disponible s'achète chez la marque", () => {
  assert.equal(libelleAchat({ disponible: true, retiree: false }, "SUPRAM"), "Acheter chez SUPRAM");
});

test("une pièce épuisée renvoie vers sa fiche chez la marque", () => {
  assert.equal(libelleAchat({ disponible: false, retiree: false }, "SUPRAM"), "Voir la fiche chez la marque");
});

test("une pièce retirée renvoie vers ce que la marque propose aujourd'hui", () => {
  assert.equal(libelleAchat({ disponible: true, retiree: true }, "SUPRAM"), "Voir ce que propose SUPRAM aujourd'hui");
});

test("le bouton de la marque reprend la plateforme quand il y en a une", () => {
  assert.equal(libelleBoutique(null), "Voir la boutique");
  assert.equal(libelleBoutique({ bouton: "Voir sa boutique Vinted" }), "Voir sa boutique Vinted");
});
