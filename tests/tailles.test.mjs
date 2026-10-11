import { test } from "node:test";
import assert from "node:assert/strict";
import { repartirTailles } from "../src/lib/tailles.ts";

const t = (label, available) => ({ label, available });

test("sépare les tailles en stock des tailles épuisées, dans l'ordre", () => {
  assert.deepEqual(
    repartirTailles([t("XS", false), t("S", false), t("M", true), t("L", true), t("XL", true), t("XXL", true)]),
    { enStock: ["M", "L", "XL", "XXL"], epuisees: ["XS", "S"] }
  );
});

test("tout en stock : rien d'épuisé", () => {
  assert.deepEqual(repartirTailles([t("38", true), t("40", true)]), { enStock: ["38", "40"], epuisees: [] });
});

test("rien en stock : tout est épuisé", () => {
  assert.deepEqual(repartirTailles([t("Unique", false)]), { enStock: [], epuisees: ["Unique"] });
});

test("aucune taille connue : deux listes vides", () => {
  assert.deepEqual(repartirTailles([]), { enStock: [], epuisees: [] });
});
