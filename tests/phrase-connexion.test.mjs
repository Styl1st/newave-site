import { test } from "node:test";
import assert from "node:assert/strict";
import { phraseConnexion } from "../src/lib/phrase-connexion.ts";

const DEFAUT = "Ton compte garde tes favoris et t'ouvre le forum, les messages et les avis.";

test("sans page d'origine, la phrase dit tout ce que le compte ouvre", () => {
  assert.equal(phraseConnexion(undefined), DEFAUT);
  assert.equal(phraseConnexion(null), DEFAUT);
  assert.equal(phraseConnexion(""), DEFAUT);
  assert.equal(phraseConnexion("/"), DEFAUT);
});

test("depuis « Publier une annonce », on parle de l'annonce", () => {
  assert.equal(phraseConnexion("/forum/publier"), "Connecte-toi pour publier ton annonce.");
});

test("depuis une autre page du forum, on parle du forum", () => {
  assert.equal(phraseConnexion("/forum"), "Connecte-toi pour répondre, voter et écrire sur le forum.");
  assert.equal(phraseConnexion("/forum/d946b976-test"), "Connecte-toi pour répondre, voter et écrire sur le forum.");
});

test("un préfixe qui ressemble ne suffit pas : /forumx n'est pas le forum", () => {
  assert.equal(phraseConnexion("/forumx"), DEFAUT);
});

test("messages, favoris et compte ont chacun leur phrase, paramètres ignorés", () => {
  assert.equal(phraseConnexion("/messages?avec=abc"), "Connecte-toi pour lire et envoyer tes messages.");
  assert.equal(phraseConnexion("/favoris"), "Connecte-toi pour retrouver tes favoris.");
  assert.equal(phraseConnexion("/compte#apparence"), "Connecte-toi pour accéder à ton compte.");
});

test("côté marque : revendiquer et espace marque passent avant la fiche", () => {
  assert.equal(phraseConnexion("/marques/supram/revendiquer"), "Connecte-toi pour revendiquer la page de ta marque.");
  assert.equal(phraseConnexion("/espace-marque/supram"), "Connecte-toi pour gérer la page de ta marque.");
});

test("depuis une fiche marque, une pièce ou le catalogue, on parle favoris et avis", () => {
  const attendu = "Connecte-toi pour garder tes favoris et donner ton avis.";
  assert.equal(phraseConnexion("/marques/supram"), attendu);
  assert.equal(phraseConnexion("/marques/supram/longsleeve-star"), attendu);
  assert.equal(phraseConnexion("/pieces"), attendu);
  assert.equal(phraseConnexion("/populaires"), attendu);
});

test("une adresse externe n'est jamais lue comme une page du site", () => {
  assert.equal(phraseConnexion("https://exemple.com/forum"), DEFAUT);
  assert.equal(phraseConnexion("//exemple.com/messages"), DEFAUT);
});
