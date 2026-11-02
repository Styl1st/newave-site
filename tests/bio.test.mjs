import { test } from "node:test";
import assert from "node:assert/strict";
import { bioPublique, estUneNoteDeRecherche } from "../src/lib/bio.ts";

test("les notes de recherche de l'import ne passent pas pour une bio", () => {
  for (const note of [
    "vitrine Shopify repérée, sans domaine propre",
    "rien trouvé, présence Instagram uniquement",
    "Instagram et TikTok uniquement, aucun domaine",
    "bettermestudios.store, à confirmer d'un coup d'œil",
    "ikiway.com est un cabinet de recrutement, sans rapport",
    "crayonne.eu n'est pas un site actif malgré le pseudo",
    "insecuree.hu n'est pas référencé (à vérifier à la main)",
    "boutique du projet lowlife (osquinn / Planet Zero), renvoie bien vers @04lowlife",
    "HUNI Design, de Mona Thomas : @huniworldwide est bien son compte de marque",
    "site en JavaScript pur : le catalogue ne peut pas être lu automatiquement",
    "hodparis.com est une autre marque (prêt-à-porter femme, @hodparisofficiel)",
    "@petales_d_ame existe mais c'est un autre pseudo : rien de sûr",
  ]) {
    assert.equal(estUneNoteDeRecherche(note), true, note);
    assert.equal(bioPublique(note), "", note);
  }
});

test("une vraie bio reste affichée, telle quelle", () => {
  for (const bio of [
    "Label français au vocabulaire épuré : chemises, pantalons, mailles et bijoux en argent.",
    "Un travail du denim brut et des coupes larges, pensé pour durer plus d'une saison.",
    "made in paris, depuis 2019",
    "Marque repérée par la presse dès sa première collection.",
    "Disponible uniquement en ligne.",
  ]) {
    assert.equal(estUneNoteDeRecherche(bio), false, bio);
    assert.equal(bioPublique(bio), bio.trim(), bio);
  }
});

test("un texte long ou sur plusieurs lignes est un texte rédigé, pas une note", () => {
  const long = `${"Une marque qui prend son temps. ".repeat(8)}Rien trouvé de mieux ailleurs, à confirmer en boutique.`;
  assert.equal(estUneNoteDeRecherche(long), false);
  assert.equal(estUneNoteDeRecherche("Notre histoire.\nrien trouvé de pareil ailleurs"), false);
});

test("une bio absente reste absente", () => {
  assert.equal(bioPublique(null), "");
  assert.equal(bioPublique("   "), "");
});
