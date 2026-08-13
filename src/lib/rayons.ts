import { PRODUCT_CATEGORIES } from "./taxonomy";

/**
 * Deviner le rayon d'une pièce à partir de son nom.
 *
 * Une boutique en ligne ne dit jamais dans quel rayon elle range ses
 * pièces : Shopify livre un titre, un prix, des variantes, et c'est
 * tout. Or quelqu'un qui cherche un t-shirt ne veut pas faire défiler
 * cent quarante pièces pour en trouver douze.
 *
 * On le déduit donc du nom. C'est imparfait par construction, et c'est
 * assumé : mieux vaut un rayon juste quatre fois sur cinq qu'une liste
 * indifférenciée. Deux garde-fous rendent l'erreur peu coûteuse.
 *
 *   — Le rayon deviné n'est posé qu'à la CRÉATION d'une pièce, ou sur
 *     une pièce qui n'en a aucun. Ce qu'un gérant a corrigé à la main
 *     n'est jamais écrasé par une relecture du catalogue.
 *   — Quand rien ne correspond, on ne range nulle part. Inventer un
 *     rayon par défaut mettrait les cartes-cadeaux dans les hauts.
 *
 * L'ORDRE DES RÈGLES COMPTE, et c'est le cœur du fichier. Un
 * « sweatpant » contient « sweat », un « t-shirt » contient « shirt ».
 * On teste donc du plus spécifique au plus général, et la première
 * règle qui répond gagne.
 */

type Regle = { rayon: (typeof PRODUCT_CATEGORIES)[number]; motifs: RegExp };

const REGLES: Regle[] = [
  {
    rayon: "Chaussures",
    motifs:
      /chaussure|sneaker|basket|botte|bottine|\bboot|mocassin|sandale|derby|\bshoe|runner|\bmule|claquette|\bslide\b|espadrille/i,
  },
  {
    rayon: "Bijoux",
    motifs:
      /bijou|collier|bague\b|bracelet|boucle d|pendentif|piercing|necklace|\bring\b|earring|cha[îi]ne\b|\bchain\b/i,
  },
  {
    rayon: "Accessoires",
    motifs:
      /casquette|\bcap\b|bonnet|beanie|\bbob\b|bucket|\bsac\b|\bbag\b|tote|ceinture|\bbelt\b|[ée]charpe|scarf|\bgant|glove|chaussette|\bsock|lunette|porte-cl|portefeuille|wallet|bandana|cravate|\btie\b|pochette|\bcase\b|sticker|patch/i,
  },
  {
    rayon: "Vestes",
    motifs:
      /veste|jacket|manteau|\bcoat\b|blouson|bomber|parka|doudoune|puffer|trench|gilet|\bvest\b|varsity|coach|windbreaker|anorak|softshell|overshirt|surchemise/i,
  },
  { rayon: "Robes", motifs: /\brobe\b|\bdress\b|combinaison/i },
  {
    rayon: "Bas",
    motifs:
      /pantalon|\bjean\b|\bjeans\b|short|jogging|jogger|cargo|chino|trouser|\bpants?\b|sweatpant|jupe|skirt|legging|bermuda|\bbas\b/i,
  },
  {
    rayon: "Maille",
    motifs: /\bpull\b|pull-over|sweater|knit|maille|cardigan|tricot|jumper|laine|mohair|cachemire/i,
  },
  {
    rayon: "Hauts",
    motifs:
      /t-?shirt|\btee\b|\btop\b|chemise|\bshirt\b|d[ée]bardeur|tank|sweat|hoodie|crewneck|polo|blouse|\bbody\b|manches? longues|longsleeve|zip-?up|\bcrop\b/i,
  },
];

/**
 * Le rayon d'une pièce, ou rien.
 *
 * Renvoie un tableau parce que la colonne en base en est un — la même
 * qui sert aux rayons choisis à la main. Un seul rayon à la fois :
 * ranger une pièce à deux endroits ferait douter du classement partout
 * ailleurs.
 */
export function deduireLeRayon(nom: string, description?: string | null): string[] {
  const texte = `${nom} ${description ?? ""}`;

  for (const regle of REGLES) {
    if (regle.motifs.test(texte)) return [regle.rayon];
  }
  return [];
}

/**
 * Range une liste de pièces par rayon, dans l'ordre de la taxonomie.
 *
 * Ce qui n'a pas de rayon n'est pas perdu : ces pièces sont
 * rassemblées à la fin. Une pièce invisible parce que mal classée est
 * un défaut bien pire qu'un rayon approximatif.
 */
export function compterLesRayons(
  pieces: { categories?: string[] | null }[]
): { rayon: string; total: number }[] {
  const compte = new Map<string, number>();

  for (const p of pieces) {
    const rayon = (p.categories ?? []).find((c) =>
      (PRODUCT_CATEGORIES as readonly string[]).includes(c)
    );
    const cle = rayon ?? "Autres";
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }

  const ordre = [...PRODUCT_CATEGORIES, "Autres"];
  return ordre
    .filter((r) => compte.has(r))
    .map((rayon) => ({ rayon, total: compte.get(rayon) ?? 0 }));
}

/** Le rayon d'une pièce, tel qu'on l'affiche. */
export function rayonDe(piece: { categories?: string[] | null }): string {
  return (
    (piece.categories ?? []).find((c) =>
      (PRODUCT_CATEGORIES as readonly string[]).includes(c)
    ) ?? "Autres"
  );
}
