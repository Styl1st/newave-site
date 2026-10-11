import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEUIL_PIECES,
  SEUIL_PODIUM,
  chiffresAffiches,
  fenetresDuClassement,
} from "../src/components/coeurs/seuils.ts";

test("les deux seuils valent cent cœurs au départ", () => {
  assert.equal(SEUIL_PODIUM, 100);
  assert.equal(SEUIL_PIECES, 100);
});

test("pièces sous le seuil : pas de fenêtre à choisir, le classement est « depuis toujours »", () => {
  assert.deepEqual(fenetresDuClassement("pieces", "coeurs", 0), []);
  assert.deepEqual(fenetresDuClassement("pieces", "coeurs", 99), []);
});

test("pièces au seuil : sept jours et depuis toujours, les deux vues de la base", () => {
  assert.deepEqual(fenetresDuClassement("pieces", "coeurs", 100), ["semaine", "toujours"]);
  assert.deepEqual(fenetresDuClassement("pieces", "elan", 340), ["semaine", "toujours"]);
});

test("marques : la règle du podium ne change pas", () => {
  assert.deepEqual(fenetresDuClassement("marques", "coeurs", 99), []);
  assert.deepEqual(fenetresDuClassement("marques", "coeurs", 100), ["semaine", "mois", "toujours"]);
});

test("la note ne dépend pas du temps : jamais de fenêtre", () => {
  assert.deepEqual(fenetresDuClassement("pieces", "avis", 1000), []);
  assert.deepEqual(fenetresDuClassement("marques", "avis", 1000), []);
});

test("sous le seuil, les cœurs ne se comptent pas à l'écran", () => {
  assert.equal(chiffresAffiches("pieces", "coeurs", 2), false);
  assert.equal(chiffresAffiches("pieces", "coeurs", 99), false);
  assert.equal(chiffresAffiches("marques", "coeurs", 40), false);
});

test("au seuil, les chiffres reviennent, élan compris", () => {
  assert.equal(chiffresAffiches("pieces", "coeurs", 100), true);
  assert.equal(chiffresAffiches("marques", "coeurs", 100), true);
  assert.equal(chiffresAffiches("marques", "elan", 250), true);
});

test("les notes gardent leurs chiffres : elles ont leur propre minimum d'avis", () => {
  assert.equal(chiffresAffiches("pieces", "avis", 0), true);
  assert.equal(chiffresAffiches("marques", "avis", 0), true);
});
