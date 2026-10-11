import { test } from "node:test";
import assert from "node:assert/strict";
import { surtitrePost } from "../src/lib/surtitre-post.ts";

const maintenant = new Date("2026-10-11T12:00:00Z");
const ilYa = (jours, heures = 0) =>
  new Date(maintenant.getTime() - (jours * 24 + heures) * 3600 * 1000).toISOString();

test("un post de moins de sept jours reste « le post de la semaine »", () => {
  assert.equal(surtitrePost(ilYa(2), maintenant), "Le post de la semaine");
  assert.equal(surtitrePost(ilYa(6, 23), maintenant), "Le post de la semaine");
});

test("à partir de sept jours, c'est « Dernier post »", () => {
  assert.equal(surtitrePost(ilYa(7), maintenant), "Dernier post");
  assert.equal(surtitrePost(ilYa(48), maintenant), "Dernier post");
});

test("sans date lisible, on ne promet pas la semaine", () => {
  assert.equal(surtitrePost(null, maintenant), "Dernier post");
  assert.equal(surtitrePost(undefined, maintenant), "Dernier post");
  assert.equal(surtitrePost("pas une date", maintenant), "Dernier post");
});
