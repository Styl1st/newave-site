import { test } from "node:test";
import assert from "node:assert/strict";
import { ongletApresTouche } from "../src/lib/onglets.ts";

const ONGLETS = ["connexion", "inscription"];

test("les flèches passent à l'onglet voisin et bouclent", () => {
  assert.equal(ongletApresTouche(ONGLETS, "connexion", "ArrowRight"), "inscription");
  assert.equal(ongletApresTouche(ONGLETS, "inscription", "ArrowRight"), "connexion");
  assert.equal(ongletApresTouche(ONGLETS, "connexion", "ArrowLeft"), "inscription");
  assert.equal(ongletApresTouche(ONGLETS, "inscription", "ArrowLeft"), "connexion");
});

test("Début et Fin vont au premier et au dernier onglet", () => {
  assert.equal(ongletApresTouche(ONGLETS, "inscription", "Home"), "connexion");
  assert.equal(ongletApresTouche(ONGLETS, "connexion", "End"), "inscription");
});

test("les autres touches ne changent rien", () => {
  assert.equal(ongletApresTouche(ONGLETS, "connexion", "Enter"), null);
  assert.equal(ongletApresTouche(ONGLETS, "connexion", "a"), null);
});

test("un onglet inconnu repart du premier", () => {
  assert.equal(ongletApresTouche(ONGLETS, "oubli", "ArrowRight"), "connexion");
});
