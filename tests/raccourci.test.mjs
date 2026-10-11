import { test } from "node:test";
import assert from "node:assert/strict";
import { toucheCommande, libelleRaccourci } from "../src/lib/raccourci.ts";

test("sur Mac et iPad on montre ⌘", () => {
  assert.equal(toucheCommande({ userAgentDataPlatform: "macOS" }), "⌘");
  assert.equal(toucheCommande({ platform: "MacIntel" }), "⌘");
  assert.equal(toucheCommande({ platform: "iPad" }), "⌘");
  assert.equal(
    toucheCommande({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }),
    "⌘"
  );
});

test("sur Windows, Linux ou inconnu on montre Ctrl", () => {
  assert.equal(toucheCommande({ platform: "Win32" }), "Ctrl");
  assert.equal(toucheCommande({ platform: "Linux x86_64" }), "Ctrl");
  assert.equal(toucheCommande({}), "Ctrl");
});

test("la plateforme déclarée par le navigateur passe avant navigator.platform", () => {
  assert.equal(toucheCommande({ userAgentDataPlatform: "Windows", platform: "MacIntel" }), "Ctrl");
});

test("le libellé colle ⌘ et K sur demande, jamais Ctrl et K", () => {
  assert.equal(libelleRaccourci("⌘"), "⌘ K");
  assert.equal(libelleRaccourci("⌘", { colle: true }), "⌘K");
  assert.equal(libelleRaccourci("Ctrl"), "Ctrl K");
  assert.equal(libelleRaccourci("Ctrl", { colle: true }), "Ctrl K");
});
