/**
 * Les phrases de l'écran d'attente. Voir `components/EcranChargement`.
 *
 * POURQUOI DES PHRASES. Presque toutes les pages du site sont lues à la
 * demande : on attend à chaque changement de page, parfois une seconde.
 * Une roue qui tourne dit « patiente » ; une phrase qui parle de ce
 * qu'on prépare dit « ça arrive, et c'est pour toi ». C'est le même
 * temps d'attente, il paraît plus court quand il y a quelque chose à
 * lire.
 *
 * La première phrase parle de la page qu'on a demandée : on sait où
 * l'on va, l'écran le sait aussi. Les suivantes, s'il faut attendre
 * encore, viennent du vestiaire : des gestes d'atelier et de boutique,
 * dans la voix du site.
 */

/** Par préfixe d'adresse, du plus précis au plus général. */
const CONTEXTE: [RegExp, string][] = [
  [/^\/marques\/[^/]+\/[^/]+/, "On décroche la pièce du portant…"],
  [/^\/marques\/[^/]+/, "On pousse la porte de la boutique…"],
  [/^\/marques/, "On ouvre l'annuaire des marques…"],
  [/^\/pieces/, "On sort les pièces du carton…"],
  [/^\/posts/, "On met les articles sous presse…"],
  [/^\/populaires/, "On compte les coups de cœur…"],
  [/^\/forum/, "On réveille la communauté…"],
  [/^\/messages/, "On relève le courrier…"],
  [/^\/favoris/, "On retrouve tes marques suivies…"],
  [/^\/compte/, "On prépare ton vestiaire…"],
  [/^\/espace-marque/, "On ouvre ton atelier…"],
  [/^\/admin/, "On ouvre l'arrière-boutique…"],
  [/^\/candidature/, "On prépare le formulaire…"],
];

/** Les gestes du vestiaire, pour une attente qui se prolonge. */
export const PHRASES = [
  "On repasse les cols…",
  "On ajuste l'ourlet…",
  "On recoud le dernier bouton…",
  "On cherche ta taille…",
  "On allume la vitrine…",
  "On plie les t-shirts…",
  "On range le portant…",
  "Petit passage en cabine…",
  "On fait briller le chrome…",
  "On accorde les couleurs…",
] as const;

/** La phrase d'ouverture : celle de la page demandée, sinon la première du vestiaire. */
export function phraseDeDepart(chemin: string): string {
  for (const [motif, phrase] of CONTEXTE) if (motif.test(chemin)) return phrase;
  return PHRASES[0];
}

/**
 * La suite des phrases, à partir d'un point de départ.
 *
 * On ne tire pas au sort à chaque tour : deux fois la même phrase de
 * suite se lit comme un écran figé. On fait le tour du vestiaire dans
 * l'ordre, en commençant à un endroit différent à chaque attente, et
 * l'on saute la phrase d'ouverture si elle en fait partie.
 */
export function suiteDePhrases(depart: string, graine: number): string[] {
  const debut = ((Math.floor(graine) % PHRASES.length) + PHRASES.length) % PHRASES.length;
  const tour = [...PHRASES.slice(debut), ...PHRASES.slice(0, debut)].filter((p) => p !== depart);
  return [depart, ...tour];
}
