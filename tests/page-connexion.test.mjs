import { test } from "node:test";
import assert from "node:assert/strict";
import { estPageConnexion } from "../src/lib/page-connexion.ts";

test("la page de connexion est reconnue, avec ou sans sous-chemin", () => {
  assert.equal(estPageConnexion("/connexion"), true);
  assert.equal(estPageConnexion("/connexion/"), true);
});

test("les autres pages ne le sont pas, même si le nom y ressemble", () => {
  assert.equal(estPageConnexion("/"), false);
  assert.equal(estPageConnexion("/compte"), false);
  assert.equal(estPageConnexion("/connexions"), false);
  assert.equal(estPageConnexion(null), false);
});
