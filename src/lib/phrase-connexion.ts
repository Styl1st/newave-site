/**
 * La phrase sous le titre de la page Connexion, selon la page d'où l'on
 * arrive.
 *
 * POURQUOI ELLE CHANGE. On arrive rarement sur /connexion par hasard :
 * on a voulu publier une annonce, lire un message, garder une marque. La
 * phrase reprend ce geste au lieu de vendre le compte pour une seule
 * raison. L'ancienne disait « Un compte sert à garder tes marques
 * favorites. C'est tout. », ce qui était faux depuis le forum et la
 * messagerie.
 *
 * Seul le chemin compte : paramètres et ancre sont ignorés, et une
 * adresse qui ne commence pas par un seul « / » est traitée comme une
 * arrivée directe.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

const DEFAUT = "Ton compte garde tes favoris et t'ouvre le forum, les messages et les avis.";

/* Du plus précis au plus large : « /forum/publier » avant « /forum »,
   « /marques/x/revendiquer » avant « /marques ». */
const PHRASES: [RegExp, string][] = [
  [/^\/forum\/publier(\/|$)/, "Connecte-toi pour publier ton annonce."],
  [/^\/forum(\/|$)/, "Connecte-toi pour répondre, voter et écrire sur le forum."],
  [/^\/messages(\/|$)/, "Connecte-toi pour lire et envoyer tes messages."],
  [/^\/favoris(\/|$)/, "Connecte-toi pour retrouver tes favoris."],
  [/^\/compte(\/|$)/, "Connecte-toi pour accéder à ton compte."],
  [/^\/espace-marque(\/|$)/, "Connecte-toi pour gérer la page de ta marque."],
  [/^\/marques\/[^/]+\/revendiquer(\/|$)/, "Connecte-toi pour revendiquer la page de ta marque."],
  [/^\/(marques|pieces|populaires)(\/|$)/, "Connecte-toi pour garder tes favoris et donner ton avis."],
];

export function phraseConnexion(suite: string | null | undefined): string {
  if (!suite || !suite.startsWith("/") || suite.startsWith("//")) return DEFAUT;
  const chemin = suite.split(/[?#]/)[0];
  for (const [motif, phrase] of PHRASES) {
    if (motif.test(chemin)) return phrase;
  }
  return DEFAUT;
}
