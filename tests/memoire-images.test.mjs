import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aGarder,
  cleDeMemoire,
  depuisMemoire,
  versMemoire,
  POIDS_MAX_EN_MEMOIRE,
} from "../src/lib/memoire-images.ts";

const UN_AN = "public, max-age=31536000, s-maxage=31536000, immutable";

function reponse(corps, entetes, statut = 200) {
  return new Response(corps, { status: statut, headers: entetes });
}

test("la clé ne retient que ce que la route lit, dans un ordre fixe", () => {
  const a = new URLSearchParams("u=https%3A%2F%2Fx.fr%2Fa.png&w=400&zzz=1");
  const b = new URLSearchParams("w=400&u=https%3A%2F%2Fx.fr%2Fa.png");
  assert.equal(cleDeMemoire(a), cleDeMemoire(b));
  assert.equal(cleDeMemoire(a), "w=400&t=&b=&s=&d=0&u=https://x.fr/a.png");
});

test("chaque variante d'une même image a sa propre clé", () => {
  const u = "u=https%3A%2F%2Fx.fr%2Fa.png";
  const cles = new Set(
    [`${u}&w=400`, `${u}&w=800`, `${u}&b=1`, `${u}&w=400&t=1`, `${u}&w=400&s=1`].map((q) =>
      cleDeMemoire(new URLSearchParams(q))
    )
  );
  assert.equal(cles.size, 5);
  // Le détourage change les pixels rendus : il change aussi la clé.
  const t = new URLSearchParams(`${u}&w=400&t=1`);
  assert.notEqual(cleDeMemoire(t, true), cleDeMemoire(t, false));
});

test("sans adresse, il n'y a rien à garder", () => {
  assert.equal(cleDeMemoire(new URLSearchParams("w=400")), null);
});

test("une vignette calculée se garde, la redirection vers la source non", () => {
  assert.equal(aGarder(reponse("x", { "content-type": "image/webp", "cache-control": UN_AN })), true);
  assert.equal(
    aGarder(reponse(null, { location: "https://x.fr/a.png", "cache-control": "public, max-age=3600" }, 302)),
    false
  );
});

test("le pixel d'un logo inapte au blanc se garde, celui d'un hôte injoignable non", () => {
  const inapte = { "content-type": "image/png", "cache-control": "public, max-age=86400, s-maxage=86400" };
  const injoignable = { "content-type": "image/png", "cache-control": "public, max-age=3600" };
  assert.equal(aGarder(reponse("x", inapte)), true);
  assert.equal(aGarder(reponse("x", injoignable)), false);
});

test("un refus ou une page ne se gardent jamais", () => {
  assert.equal(aGarder(reponse("non", { "content-type": "text/plain", "cache-control": "no-store" }, 400)), false);
  assert.equal(aGarder(reponse("<html>", { "content-type": "text/html", "cache-control": UN_AN })), false);
  assert.equal(aGarder(reponse("x", { "content-type": "image/webp", "cache-control": "private, s-maxage=60" })), false);
});

test("une image ressort de la mémoire octet pour octet, avec ses en-têtes", async () => {
  const octets = new Uint8Array([0, 1, 2, 250, 255, 128, 64]);
  const entetes = {
    "content-type": "image/webp",
    "cache-control": UN_AN,
    "access-control-allow-origin": "*",
    vary: "Sec-Fetch-Dest",
  };
  const rangee = await versMemoire(reponse(octets, entetes));
  assert.ok(rangee);

  // Ce qui est rangé doit survivre à un aller-retour en JSON : c'est
  // ainsi que le cache de données le conserve.
  const relue = depuisMemoire(JSON.parse(JSON.stringify(rangee)));
  assert.equal(relue.status, 200);
  for (const [nom, valeur] of Object.entries(entetes)) assert.equal(relue.headers.get(nom), valeur);
  assert.deepEqual(new Uint8Array(await relue.arrayBuffer()), octets);
});

test("une image trop lourde pour le cache n'est pas rangée", async () => {
  const lourde = new Uint8Array(POIDS_MAX_EN_MEMOIRE + 1);
  assert.equal(await versMemoire(reponse(lourde, { "content-type": "image/webp", "cache-control": UN_AN })), null);
});
