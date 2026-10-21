import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CLE_INTRO, MINUTAGE, SCRIPT_DECISION_INTRO } from "../src/lib/intro.ts";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** La valeur d'une variable du portail dans globals.css, en millisecondes. */
function enMs(nom) {
  const m = css.match(new RegExp(`--${nom}:\\s*([\\d.]+)(ms|s);`));
  assert.ok(m, `--${nom} introuvable dans globals.css`);
  return m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
}

test("le minutage dessiné en CSS est celui que suit le script", () => {
  assert.equal(enMs("allumage"), MINUTAGE.allumage);
  assert.equal(enMs("passage"), MINUTAGE.passage);
  assert.equal(enMs("duree-passage"), MINUTAGE.dureePassage);
});

test("les étapes se suivent dans l'ordre", () => {
  const m = MINUTAGE;
  assert.ok(m.allumage < m.passage, "l'ovale s'allume avant qu'on passe");
  assert.ok(m.envol > m.passage && m.envol < m.passage + m.dureePassage, "le logo part pendant le passage");
  assert.ok(m.contenu > m.envol, "le manifeste monte après le départ du logo");
  assert.ok(m.fin >= m.envol + m.dureeEnvol, "on ne range pas avant que le logo soit posé");
  assert.ok(m.contenu <= 2500, "le contenu arrive en moins de deux secondes et demie");
});

test("le script de décision lit la même clé que le reste du code, et se lit", () => {
  assert.ok(SCRIPT_DECISION_INTRO.includes(`'${CLE_INTRO}'`));
  assert.doesNotThrow(() => new Function(SCRIPT_DECISION_INTRO));
});

test("l'intro ne se joue que sur l'accueil", () => {
  assert.ok(SCRIPT_DECISION_INTRO.includes("l.pathname !== '/'"));
});
