import { test } from "node:test";
import assert from "node:assert/strict";
import { lienInstagram } from "../src/lib/instagram.ts";

const supram = { handle: "supram", url: "https://www.instagram.com/supram/" };

test("rien de saisi, pas de lien", () => {
  assert.equal(lienInstagram(null), null);
  assert.equal(lienInstagram(undefined), null);
  assert.equal(lienInstagram("   "), null);
});

test("un pseudo nu, avec ou sans @, donne le profil", () => {
  assert.deepEqual(lienInstagram("supram"), supram);
  assert.deepEqual(lienInstagram(" @supram "), supram);
});

test("une adresse de profil collée telle quelle donne le même profil", () => {
  assert.deepEqual(lienInstagram("https://www.instagram.com/supram/"), supram);
  assert.deepEqual(lienInstagram("instagram.com/supram?igsh=abc123"), supram);
  assert.deepEqual(lienInstagram("http://instagram.com/supram/reels/"), supram);
});

test("les points et tirets bas d'un pseudo sont gardés", () => {
  assert.deepEqual(lienInstagram("supram.officiel_"), {
    handle: "supram.officiel_",
    url: "https://www.instagram.com/supram.officiel_/",
  });
});

test("un lien de post ou de reel n'est pas un profil", () => {
  assert.equal(lienInstagram("https://www.instagram.com/p/ABC123/"), null);
  assert.equal(lienInstagram("https://www.instagram.com/reel/XYZ/"), null);
});

test("un pseudo impossible ne donne pas de lien", () => {
  assert.equal(lienInstagram("sup ram"), null);
  assert.equal(lienInstagram("a".repeat(31)), null);
  assert.equal(lienInstagram("https://exemple.com/supram"), null);
});
