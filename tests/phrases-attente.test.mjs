import { test } from "node:test";
import assert from "node:assert/strict";
import { PHRASES, phraseDeDepart, suiteDePhrases } from "../src/lib/phrases-attente.ts";

test("la première phrase parle de la page demandée", () => {
  assert.equal(phraseDeDepart("/marques"), "On ouvre l'annuaire des marques…");
  assert.equal(phraseDeDepart("/marques/acme"), "On pousse la porte de la boutique…");
  assert.equal(phraseDeDepart("/marques/acme/veste-chore"), "On décroche la pièce du portant…");
  assert.equal(phraseDeDepart("/forum/42"), "On réveille la communauté…");
});

test("une page sans phrase à elle prend la première du vestiaire", () => {
  assert.equal(phraseDeDepart("/inconnue"), PHRASES[0]);
});

test("la suite commence par la phrase d'ouverture, sans doublon", () => {
  for (const graine of [0, 3, 7.9, 123456789, -4]) {
    const suite = suiteDePhrases(PHRASES[2], graine);
    assert.equal(suite[0], PHRASES[2]);
    assert.equal(new Set(suite).size, suite.length);
    assert.equal(suite.length, PHRASES.length);
  }
});

test("deux phrases consécutives ne sont jamais les mêmes, même au rebouclage", () => {
  const suite = suiteDePhrases("On ouvre l'annuaire des marques…", 5);
  for (let i = 0; i < suite.length * 2; i++) {
    assert.notEqual(suite[i % suite.length], suite[(i + 1) % suite.length]);
  }
});
