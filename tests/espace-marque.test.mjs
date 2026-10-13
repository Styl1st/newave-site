import { test } from "node:test";
import assert from "node:assert/strict";
import { enAvantDabord, MAX_EN_AVANT, phraseDuMaximum } from "../src/lib/en-avant.ts";
import { ilYa, suiviDuCatalogue } from "../src/lib/suivi-catalogue.ts";
import { repartirParMarque } from "../src/lib/melange.ts";

test("les pièces en avant passent d'abord, les autres gardent l'ordre de la boutique", () => {
  const pieces = [
    { id: "a", featured: false },
    { id: "b", featured: true },
    { id: "c", featured: false },
    { id: "d", featured: true },
  ];
  assert.deepEqual(enAvantDabord(pieces).map((p) => p.id), ["b", "d", "a", "c"]);
});

test("le message de la limite dit ce qu'il reste", () => {
  assert.match(phraseDuMaximum(MAX_EN_AVANT), /déjà 4 pièces en avant/);
  assert.match(phraseDuMaximum(2), /il ne t'en reste que 2/);
});

test("au tour de table, chaque marque sert d'abord ce qu'elle a mis en avant", () => {
  const pieces = [];
  for (const marque of ["m1", "m2", "m3"]) {
    for (let i = 0; i < 6; i++) pieces.push({ id: `${marque}-${i}`, brand_id: marque, featured: i === 5 });
  }
  for (let essai = 0; essai < 20; essai++) {
    const premierTour = repartirParMarque(pieces).slice(0, 3);
    assert.ok(premierTour.every((p) => p.featured), "le premier tour ne sert que des pièces en avant");
  }
});

test("le suivi du catalogue se lit sur une fiche qui n'a pas ces colonnes", () => {
  assert.deepEqual(suiviDuCatalogue({}), { auto: false, derniere: null, note: null });
  assert.deepEqual(
    suiviDuCatalogue({ catalogue_auto: true, catalogue_sync_at: "2026-10-12T10:00:00Z", catalogue_sync_note: " 28 pièces revues. " }),
    { auto: true, derniere: "2026-10-12T10:00:00Z", note: "28 pièces revues." }
  );
});

test("la dernière relecture se dit en mots", () => {
  const maintenant = new Date("2026-10-13T12:00:00Z");
  assert.equal(ilYa("2026-10-13T11:58:00Z", maintenant), "il y a 2 min");
  assert.equal(ilYa("2026-10-13T09:00:00Z", maintenant), "il y a 3 h");
  assert.equal(ilYa("2026-10-12T08:00:00Z", maintenant), "hier");
  assert.match(ilYa("2026-10-01T08:00:00Z", maintenant), /^le 1 oct/);
});
