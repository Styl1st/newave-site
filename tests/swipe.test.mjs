import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROFIL_VIDE,
  apprendre,
  composerLaPile,
  profilConnu,
  profilSur,
  score,
  traitsDuProfil,
} from "../src/lib/swipe.ts";

let n = 0;
function carte(attrs = {}) {
  n++;
  return {
    id: `id-${n}`,
    slug: `p-${n}`,
    nom: `Pièce ${n}`,
    image: null,
    images: [],
    prix: 6000,
    devise: "EUR",
    disponible: true,
    tags: [],
    couleurs: [],
    rayon: "Hauts",
    marque: `marque-${n}`,
    marqueNom: `Marque ${n}`,
    ...attrs,
  };
}

/** Un hasard reproductible. */
function graine(s = 1) {
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

test("garder renforce, passer affaiblit un peu", () => {
  const c = carte({ tags: ["Hoodies"], couleurs: ["noir"], marque: "zoav", marqueNom: "ZOAV" });
  const apres = apprendre(PROFIL_VIDE, c, true);
  assert.equal(apres.tags.Hoodies, 1);
  assert.equal(apres.couleurs.noir, 1);
  assert.equal(apres.marques.zoav, 1);
  assert.equal(apres.gardees, 1);
  const passe = apprendre(apres, c, false);
  assert.ok(passe.tags.Hoodies < 1 && passe.tags.Hoodies > 0);
  assert.equal(passe.passees, 1);
  // Le profil de départ n'a pas bougé.
  assert.deepEqual(PROFIL_VIDE.tags, {});
});

test("une pièce qui ressemble au profil passe devant", () => {
  let p = PROFIL_VIDE;
  for (let i = 0; i < 3; i++) p = apprendre(p, carte({ tags: ["Hoodies"], couleurs: ["noir"] }), true);
  const proche = carte({ tags: ["Hoodies"], couleurs: ["noir"] });
  const loin = carte({ tags: ["Bagues"], couleurs: ["dore"], rayon: "Bijoux" });
  assert.ok(score(p, proche) > score(p, loin));
});

test("le budget compte, une fois qu'on en sait assez", () => {
  let p = PROFIL_VIDE;
  for (let i = 0; i < 3; i++) p = apprendre(p, carte({ prix: 5000 }), true);
  assert.ok(score(p, carte({ prix: 5500 })) > score(p, carte({ prix: 40000 })));
});

test("profil inconnu : du hasard, deux pièces par marque au plus", () => {
  const pioche = Array.from({ length: 60 }, (_, i) => carte({ marque: `m${i % 5}` }));
  const pile = composerLaPile(PROFIL_VIDE, pioche, 16, graine(3));
  assert.ok(!profilConnu(PROFIL_VIDE));
  assert.equal(pile.length, 10); // 5 marques × 2
  const parMarque = {};
  for (const c of pile) parMarque[c.marque] = (parMarque[c.marque] ?? 0) + 1;
  assert.ok(Object.values(parMarque).every((v) => v <= 2));
});

test("profil connu : surtout du proche, et une carte sur cinq d'ailleurs", () => {
  let p = PROFIL_VIDE;
  for (let i = 0; i < 5; i++) {
    p = apprendre(p, carte({ tags: ["Hoodies"], couleurs: ["noir"], rayon: "Hauts" }), true);
  }
  const proches = Array.from({ length: 40 }, () => carte({ tags: ["Hoodies"], couleurs: ["noir"] }));
  const loins = Array.from({ length: 40 }, () =>
    carte({ tags: ["Bagues"], couleurs: ["dore"], rayon: "Bijoux" })
  );
  const pile = composerLaPile(p, [...loins, ...proches], 15, graine(7));
  assert.equal(pile.length, 15);
  const decouvertes = pile.filter((c) => c.decouverte);
  assert.equal(decouvertes.length, 3);
  assert.ok(decouvertes.every((c) => c.rayon === "Bijoux"));
  assert.ok(pile.filter((c) => !c.decouverte).every((c) => c.tags.includes("Hoodies")));
  // La première carte ressemble au profil.
  assert.ok(!pile[0].decouverte);
});

test("un profil reçu de l'extérieur est nettoyé", () => {
  const p = profilSur({ tags: { Hoodies: 999, "": 1, bad: "x" }, prix: { somme: "x", n: -2 }, gardees: 4.7, pirate: true });
  assert.equal(p.tags.Hoodies, 12);
  assert.equal(p.tags.bad, undefined);
  assert.deepEqual(p.prix, { somme: 0, n: 0 });
  assert.equal(p.gardees, 4);
  assert.deepEqual(profilSur(null).tags, {});
});

test("les traits du profil disent ce qu'on a compris", () => {
  let p = PROFIL_VIDE;
  for (let i = 0; i < 3; i++) {
    p = apprendre(p, carte({ tags: ["Hoodies"], couleurs: ["noir"], marque: "zoav", marqueNom: "ZOAV" }), true);
  }
  assert.deepEqual(traitsDuProfil(p, { noir: "Noir" }), ["Hoodies", "noir", "ZOAV"]);
  assert.deepEqual(traitsDuProfil(PROFIL_VIDE), []);
});
