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
    /*
     * TROIS MOTS PIÉGEUX ONT ÉTÉ RESSERRÉS ICI, et ce sont eux qui
     * rangeaient des t-shirts et des jeans dans les accessoires.
     *
     * `tie` attrapait « tie-dye », qui est une teinture et non une
     * cravate. Un t-shirt tie-dye, en streetwear, ce n'est pas un cas
     * rare : c'est un classique.
     *
     * `patch` sans délimiteur attrapait « patchwork », donc une veste
     * en patchwork devenait un accessoire.
     *
     * `case` attrapait « in case of », qui traîne dans une description
     * anglaise sur deux. Une coque de téléphone se dit autrement, et
     * l'on en vend de toute façon très peu ici.
     */
    motifs:
      /casquette|\bcap\b|bonnet|beanie|\bbob\b|bucket|\bsac\b|\bbag\b|\btote\b|ceinture|\bbelt\b|[ée]charpe|scarf|\bgant|glove|chaussette|\bsock|lunette|porte-cl|portefeuille|wallet|bandana|cravate|\btie\b(?!-?\s?dye)|pochette|coque\b|sticker|\bpatch(?:es)?\b/i,
  },
  {
    rayon: "Vestes",
    motifs:
      /veste|jacket|manteau|\bcoat\b|blouson|bomber|parka|doudoune|puffer|trench|gilet|\bvest\b|varsity|coach|windbreaker|anorak|softshell|overshirt|surchemise/i,
  },
  { rayon: "Robes", motifs: /\brobe\b|\bdress\b|combinaison/i },
  {
    rayon: "Bas",
    /*
     * `short` SANS DÉLIMITEUR ÉTAIT LA CAUSE D'UN CLASSEMENT ABSURDE.
     *
     * Il attrapait « short sleeve », qui figure dans la description de
     * presque tous les t-shirts anglophones : la moitié des hauts d'une
     * marque se retrouvait rangée dans les bas. C'est ce qu'on voyait en
     * ouvrant le rayon « Bas » et en tombant sur des tee-shirts.
     *
     * Le mot est donc délimité, et suivi d'un refus explicite quand une
     * histoire de manches le suit.
     *
     * `\bbas\b` a disparu pour une raison voisine : en français, « bas »
     * est neuf fois sur dix une position — « en bas », « le bas du dos »
     * — et une fois sur dix un vêtement. Le garder coûtait plus qu'il ne
     * rapportait.
     */
    motifs:
      /pantalon|\bjeans?\b|\bshorts?\b(?!\s*(?:sleeve|manche))|jogging|jogger|cargo|chino|trouser|\bpants?\b|sweatpant|jupe|skirt|legging|bermuda/i,
  },
  {
    rayon: "Maille",
    motifs: /\bpull\b|pull-over|sweater|knit|maille|cardigan|tricot|jumper|laine|mohair|cachemire/i,
  },
  {
    rayon: "Hauts",
    /*
     * « jersey » et « maillot » manquaient, et c'est ce qui laissait un
     * maillot de foot sans rayon : le nom ne disait rien, on tombait
     * dans la description, et n'importe quel mot y décidait à sa place.
     */
    motifs:
      /t-?shirt|teeshirt|\btee\b|\btop\b|chemise|\bshirt\b|jersey|maillot|d[ée]bardeur|singlet|tank|sweat|hoodie|crewneck|polo|blouse|\bbody\b|manches? longues|longsleeve|zip-?up|\bcrop\b/i,
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
  /*
   * LE NOM D'ABORD, LA DESCRIPTION SEULEMENT À DÉFAUT.
   *
   * Les deux étaient jetés dans la même chaîne, et c'était l'erreur de
   * fond. Une description de boutique parle de coupe, de matière, de
   * livraison, de la pièce avec laquelle on peut la porter : elle
   * contient donc des dizaines de mots qui désignent d'autres
   * vêtements. Un t-shirt dont le texte conseille « à porter avec un
   * jean » finissait dans les bas.
   *
   * Le nom, lui, désigne la pièce et rien d'autre. On l'interroge donc
   * en premier, en entier, et l'on ne descend dans la description que
   * s'il n'a rien donné — un « Chihuahua » sans autre indice, par
   * exemple, où le texte reste le seul recours.
   */
  for (const regle of REGLES) {
    if (regle.motifs.test(nom)) return [regle.rayon];
  }

  const texte = description ?? "";
  if (!texte.trim()) return [];

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
