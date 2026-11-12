import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseSure, decider, etatDeLaPage, etatDuStatut, photosDe } from "../src/lib/photos-mortes.ts";

const A = "https://cdn.boutique.fr/a.jpg";
const B = "https://cdn.boutique.fr/b.jpg";
const V = "https://cdn.boutique.fr/c.mp4";

const etats = (o) => new Map(Object.entries(o));

test("seuls 404 et 410 prouvent qu'une photo est morte", () => {
  assert.equal(etatDuStatut(404), "morte");
  assert.equal(etatDuStatut(410), "morte");
  assert.equal(etatDuStatut(200), "vivante");
  for (const s of [403, 429, 500, 502, 503]) assert.equal(etatDuStatut(s), "inconnu");
});

test("les adresses lues restent des domaines en https", () => {
  assert.ok(adresseSure(A));
  assert.equal(adresseSure("http://cdn.boutique.fr/a.jpg"), null);
  assert.equal(adresseSure("https://127.0.0.1/a.jpg"), null);
  assert.equal(adresseSure("https://localhost/a.jpg"), null);
  assert.equal(adresseSure("https://[::1]/a.jpg"), null);
  assert.equal(adresseSure("pas une adresse"), null);
});

test("la galerie compte, sinon la photo principale, sans les vidéos", () => {
  assert.deepEqual(photosDe({ images: [A, V, A], image_url: B, source_id: "x" }), [A]);
  assert.deepEqual(photosDe({ images: [], image_url: B, source_id: "x" }), [B]);
  assert.deepEqual(photosDe({ images: null, image_url: null, source_id: "x" }), []);
});

test("toutes mortes : la pièce importée est retirée", () => {
  const p = { images: [A, B], image_url: A, source_id: "x" };
  assert.deepEqual(decider(p, etats({ [A]: "morte", [B]: "morte" })), { action: "retirer" });
});

test("une pièce saisie à la main n'est jamais retirée", () => {
  const p = { images: [A], image_url: A, source_id: null };
  assert.deepEqual(decider(p, etats({ [A]: "morte" })), { action: "rien" });
});

test("une seule photo inconnue suffit à garder la pièce", () => {
  const p = { images: [A, B], image_url: A, source_id: "x" };
  const d = decider(p, etats({ [A]: "morte", [B]: "inconnu" }));
  assert.equal(d.action, "nettoyer");
  assert.deepEqual(d.images, [B]);
  assert.equal(d.image_url, B);
});

test("quelques mortes : la galerie est nettoyée, la photo principale remplacée", () => {
  const p = { images: [A, B, V], image_url: A, source_id: "x" };
  const d = decider(p, etats({ [A]: "morte", [B]: "vivante" }));
  assert.deepEqual(d, { action: "nettoyer", images: [B, V], image_url: B });
});

test("rien de mort : on ne touche à rien", () => {
  const p = { images: [A, B], image_url: A, source_id: "x" };
  assert.deepEqual(decider(p, etats({ [A]: "inconnu", [B]: "vivante" })), { action: "rien" });
});

test("la page de la pièce : introuvable ou renvoyée vers l'accueil, elle a disparu", () => {
  const page = "https://www.boutique.fr/product/spider-bunny";
  assert.equal(etatDeLaPage(404, page, page), "disparue");
  assert.equal(etatDeLaPage(200, "https://www.boutique.fr/", page), "disparue");
  assert.equal(etatDeLaPage(200, page, page), "presente");
  assert.equal(etatDeLaPage(503, page, page), "inconnu");
  assert.equal(etatDeLaPage(200, "https://www.boutique.fr/", "https://www.boutique.fr/"), "presente");
});

test("photos muettes et page disparue : la pièce importée est retirée", () => {
  const p = { images: [A, B], image_url: A, source_id: "x" };
  const e = etats({ [A]: "inconnu", [B]: "inconnu" });
  assert.deepEqual(decider(p, e, "disparue"), { action: "retirer" });
  assert.deepEqual(decider(p, e, "presente"), { action: "rien" });
  assert.deepEqual(decider(p, e), { action: "rien" });
  assert.deepEqual(decider({ ...p, source_id: null }, e, "disparue"), { action: "rien" });
});

test("une seule photo qui s'affiche suffit, même si la page a disparu", () => {
  const p = { images: [A, B], image_url: A, source_id: "x" };
  assert.equal(decider(p, etats({ [A]: "vivante", [B]: "inconnu" }), "disparue").action, "rien");
});
