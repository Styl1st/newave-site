import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANNONCES_POUR_FILTRER,
  PASTILLE_COEURS_MIN,
  POSTS_POUR_FILTRER,
  filtresUtiles,
  pastilleMeritee,
} from "../src/lib/seuils.ts";

test("les seuils de départ : 10 annonces, 12 posts, 10 cœurs pour la pastille", () => {
  assert.equal(ANNONCES_POUR_FILTRER, 10);
  assert.equal(POSTS_POUR_FILTRER, 12);
  assert.equal(PASTILLE_COEURS_MIN, 10);
});

test("sous le seuil, sans filtre posé : les filtres restent cachés", () => {
  assert.equal(filtresUtiles(1, ANNONCES_POUR_FILTRER, false), false);
  assert.equal(filtresUtiles(9, ANNONCES_POUR_FILTRER, false), false);
  assert.equal(filtresUtiles(0, POSTS_POUR_FILTRER, false), false);
});

test("à partir du seuil, les filtres apparaissent", () => {
  assert.equal(filtresUtiles(10, ANNONCES_POUR_FILTRER, false), true);
  assert.equal(filtresUtiles(250, ANNONCES_POUR_FILTRER, false), true);
  assert.equal(filtresUtiles(12, POSTS_POUR_FILTRER, false), true);
  assert.equal(filtresUtiles(11, POSTS_POUR_FILTRER, false), false);
});

test("un filtre déjà posé (lien partagé) reste visible, pour qu'on puisse l'enlever", () => {
  assert.equal(filtresUtiles(2, ANNONCES_POUR_FILTRER, true), true);
  assert.equal(filtresUtiles(0, POSTS_POUR_FILTRER, true), true);
});

test("la pastille de classement d'une pièce demande au moins 10 cœurs", () => {
  assert.equal(pastilleMeritee(0), false);
  assert.equal(pastilleMeritee(1), false);
  assert.equal(pastilleMeritee(9), false);
  assert.equal(pastilleMeritee(10), true);
  assert.equal(pastilleMeritee(42), true);
});
