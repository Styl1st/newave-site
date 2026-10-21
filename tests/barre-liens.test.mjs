import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * La rangée de liens de la barre ne montre que sa première ligne : ce
 * qui ne tient pas passe à la ligne, hors du cadre, et le menu « Plus »
 * le reprend. Voir `components/LiensBarre`.
 *
 * Ces tests gardent la géométrie qui rend ça vrai. Si la seconde ligne
 * commençait dans le cadre, un lien replié se verrait à moitié sous les
 * autres ; si le rembourrage disparaissait, l'ombre de la page active et
 * le contour du focus seraient rognés.
 */
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const bloc = css.match(/\.barre-liens\s*\{([^}]*)\}/)?.[1] ?? "";
const px = (propriete) => {
  const m = bloc.match(new RegExp(`(?:^|[;\\s])${propriete}:\\s*(-?[\\d.]+)px`));
  return m ? Number(m[1]) : NaN;
};

test("la rangée existe et coupe ce qui dépasse", () => {
  assert.ok(bloc, "règle .barre-liens introuvable");
  assert.match(bloc, /flex-wrap:\s*wrap/);
  assert.match(bloc, /overflow:\s*hidden/);
});

test("la seconde ligne commence sous le bord du cadre", () => {
  const rang = px("--rang");
  const rembourrage = px("padding");
  const ecart = px("row-gap");
  const hauteur = rang + 2 * rembourrage; // height: calc(var(--rang) + 24px)
  assert.match(bloc, new RegExp(`height:\\s*calc\\(var\\(--rang\\)\\s*\\+\\s*${2 * rembourrage}px\\)`));
  assert.ok(rembourrage + rang + ecart > hauteur, "la seconde ligne serait visible");
});

test("le rembourrage laisse la place au focus et est rendu par la marge", () => {
  assert.ok(px("padding") >= 7, "le contour du focus (3 px + 3 px) serait rogné");
  assert.equal(px("margin"), -px("padding"));
});

test("plus de seuils écrits à la main sur les liens de la barre", () => {
  const header = readFileSync(new URL("../src/components/Header.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(header, /hidden (lg|xl):inline-block/);
});
