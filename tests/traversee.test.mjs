import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cibleDeTraversee } from "../src/lib/traversee.ts";

/*
 * Le passage en profondeur prend la main sur le lien : on empêche le
 * navigateur de le suivre et c'est le routeur qui part. Il ne doit donc
 * viser que des PAGES du site. Voir `lib/traversee` et `PageTransition`.
 */
const ICI = { pathname: "/a-propos", origin: "https://newavesphere.fr" };

test("une autre page du site y a droit, requête et ancre comprises", () => {
  assert.equal(cibleDeTraversee("/marques", ICI), "/marques");
  assert.equal(cibleDeTraversee("/marques/acme?vue=grille#pieces", ICI), "/marques/acme?vue=grille#pieces");
});

test("la même page avec une autre requête ou une ancre n'y a pas droit", () => {
  assert.equal(cibleDeTraversee("/a-propos?x=1", ICI), null);
  assert.equal(cibleDeTraversee("/a-propos#contact", ICI), null);
});

test("les routes d'API, de session et les fichiers suivent leur chemin", () => {
  assert.equal(cibleDeTraversee("/api/go/marque/12", ICI), null);
  assert.equal(cibleDeTraversee("/auth/deconnexion", ICI), null);
  assert.equal(cibleDeTraversee("/sitemap.xml", ICI), null);
  assert.equal(cibleDeTraversee("/brand/logo-white.webp", ICI), null);
});

test("les liens externes ou relatifs au protocole n'y ont pas droit", () => {
  assert.equal(cibleDeTraversee("https://instagram.com/newave", ICI), null);
  assert.equal(cibleDeTraversee("//instagram.com/newave", ICI), null);
  assert.equal(cibleDeTraversee("#haut", ICI), null);
});

/*
 * La géométrie de la transition. La photographie est celle de l'écran
 * (la racine), jamais de <main> : un élément plus haut que l'écran, aux
 * blocs penchés en perspective, était rendu écrasé par Chromium. Et la
 * barre du haut reste photographiée à part, immobile.
 */
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("la transition photographie l'écran, pas <main>", () => {
  assert.doesNotMatch(css, /main\s*\{\s*view-transition-name/);
  assert.match(css, /body > header \{ view-transition-name: barre; \}/);
  assert.match(css, /::view-transition-old\(root\)\s*\{[^}]*page-recule/);
});

test("la page qu'on quitte est figée le temps de la photographie", () => {
  assert.match(css, /\[data-depart\] \* \{ animation-play-state: paused !important; \}/);
  const composant = readFileSync(new URL("../src/components/PageTransition.tsx", import.meta.url), "utf8");
  assert.match(composant, /setAttribute\("data-depart"/);
});
