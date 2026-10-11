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
 * UN MOT PAR GESTE : on SUIT une marque, on donne un COUP DE CŒUR à
 * une pièce. Les phrases parlaient de « favoris » pour les deux, le
 * même cœur portait quatre noms sur le site.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

const DEFAUT =
  "Ton compte garde les marques que tu suis et tes coups de cœur, et t'ouvre le forum, les messages et les avis.";

/* Du plus précis au plus large : « /forum/publier » avant « /forum »,
   « /marques/x/revendiquer » avant la page d'une pièce
   (« /marques/x/y »), elle-même avant « /marques ». */
const PHRASES: [RegExp, string][] = [
  [/^\/forum\/publier(\/|$)/, "Connecte-toi pour publier ton annonce."],
  [/^\/forum(\/|$)/, "Connecte-toi pour répondre, voter et écrire sur le forum."],
  [/^\/messages(\/|$)/, "Connecte-toi pour lire et envoyer tes messages."],
  [/^\/favoris(\/|$)/, "Connecte-toi pour retrouver les marques que tu suis."],
  [/^\/compte(\/|$)/, "Connecte-toi pour accéder à ton compte."],
  [/^\/espace-marque(\/|$)/, "Connecte-toi pour gérer la page de ta marque."],
  [/^\/marques\/[^/]+\/revendiquer(\/|$)/, "Connecte-toi pour revendiquer la page de ta marque."],
  [/^\/(marques\/[^/]+\/[^/]+|pieces)(\/|$)/, "Connecte-toi pour garder tes coups de cœur et donner ton avis."],
  [/^\/marques(\/|$)/, "Connecte-toi pour suivre des marques et donner ton avis."],
  [/^\/populaires(\/|$)/, "Connecte-toi pour suivre des marques et donner tes coups de cœur."],
];

export function phraseConnexion(suite: string | null | undefined): string {
  if (!suite || !suite.startsWith("/") || suite.startsWith("//")) return DEFAUT;
  const chemin = suite.split(/[?#]/)[0];
  for (const [motif, phrase] of PHRASES) {
    if (motif.test(chemin)) return phrase;
  }
  return DEFAUT;
}
