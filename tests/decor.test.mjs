import { test } from "node:test";
import assert from "node:assert/strict";
import { decorPourChemin } from "../src/lib/decor.ts";

test("l'accueil garde le décor en grand", () => {
  assert.equal(decorPourChemin("/"), "plein");
});

test("la page d'accès, plein écran, le garde aussi", () => {
  assert.equal(decorPourChemin("/acces"), "plein");
});

test("les pages de contenu ont un décor discret", () => {
  for (const chemin of ["/marques", "/marques/supram", "/pieces", "/posts/old-time-fever", "/forum", "/compte"]) {
    assert.equal(decorPourChemin(chemin), "discret", chemin);
  }
});

test("sans chemin connu, on reste discret", () => {
  assert.equal(decorPourChemin(""), "discret");
  assert.equal(decorPourChemin(null), "discret");
  assert.equal(decorPourChemin(undefined), "discret");
});
