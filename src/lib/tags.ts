import { PRODUCT_CATEGORIES } from "./taxonomy";

/**
 * LES TAGS D'UNE PIÈCE, LUS SUR LE SITE DE LA MARQUE.
 *
 * Deux niveaux, et pas un de plus.
 *
 *   1. LA FAMILLE, c'est le rayon qui existait déjà : Hauts, Bas,
 *      Vestes, Robes, Maille, Chaussures, Bijoux, Accessoires. Elle sert
 *      à naviguer et reste dans la colonne `categories`, si bien que
 *      tout ce qui la lisait continue de marcher.
 *   2. LE TAG FIN, dans `tags` : T-shirts, Hoodies, Bombers, Cargos,
 *      Bagues… C'est lui qui manquait. « Hauts » ne dit pas si la
 *      marque fait des hoodies ou des chemises.
 *
 * S'y ajoutent les TAGS LOCAUX (`tags_locaux`) : les collections de la
 * boutique que ce lexique ne sait pas ranger, « Capsule Nuit »,
 * « Archive », « FW25 ». Ils ne valent que pour la page de leur
 * marque, jusqu'à ce que l'admin les promeuve ou les masque (voir la
 * table `tags_regles` et `/admin/tags`).
 *
 * D'OÙ VIENNENT LES TAGS. De ce que la BOUTIQUE déclare, avant tout :
 * son type de produit, ses collections (le menu qu'on voit sur son
 * site), ses catégories WooCommerce ou Big Cartel, ses étiquettes. Le
 * nom de la pièce vient ensuite, et la description en tout dernier.
 * C'est la marque qui range ses pièces, on ne fait que traduire son
 * rangement dans un vocabulaire commun.
 *
 * POURQUOI UN LEXIQUE, ET PAS LES NOMS BRUTS. Une boutique écrit
 * « OUTERWEAR », une autre « Outwear », une troisième « Vestes &
 * manteaux », une quatrième « Chaquetas ». Reprises telles quelles, ce
 * serait quatre tags pour la même chose, et aucun filtre ne marcherait
 * d'une marque à l'autre. Le lexique les ramène à un seul mot.
 *
 * Ce fichier est pur : pas de réseau, pas de base. La synchro, le
 * reclassement de l'admin et les tests l'appellent de la même façon.
 */

export type Famille = (typeof PRODUCT_CATEGORIES)[number];

const FAMILLES: readonly string[] = PRODUCT_CATEGORIES;

export function estUneFamille(valeur: string | null | undefined): valeur is Famille {
  return Boolean(valeur) && FAMILLES.includes(valeur as string);
}

/** Ce que la boutique déclare d'une pièce, tel qu'on le garde en base. */
export type Rangement = {
  /** Le type de produit (Shopify), ou la catégorie des données Google. */
  type?: string | null;
  /** Les collections (Shopify) ou catégories (WooCommerce, Big Cartel) qui la contiennent. */
  collections?: string[];
  /** Les étiquettes libres de la boutique. Bruyantes : lues en dernier. */
  etiquettes?: string[];
};

/** Une décision de l'admin sur un libellé que le lexique ne connaît pas. */
export type RegleTag = {
  /** Le libellé normalisé (voir `cleDeLibelle`). */
  cle: string;
  decision: "global" | "masque";
  /** Pour `global` : le tag visé, un tag connu, une famille, ou un nouveau nom. */
  tag: string | null;
  /** Pour un nouveau tag : sa famille. */
  famille: string | null;
};

export type Regles = Map<string, RegleTag>;

export type Classement = {
  famille: Famille | null;
  tags: string[];
  locaux: string[];
};

/* ------------------------------------------------------------------
   LE LEXIQUE

   Tout se lit sur un texte NORMALISÉ : minuscules, sans accents, et
   chaque signe remplacé par une espace. « T-Shirt », « tee-shirt » et
   « T SHIRT » deviennent « t shirt » ; « boucles d'oreilles » devient
   « boucles d oreilles ». Les motifs sont écrits pour cette forme-là.

   L'ORDRE EST LA PRIORITÉ, exactement comme dans l'ancien `rayons.ts`.
   On teste du plus spécifique au plus général, famille par famille :
   un « Denim Jacket » est une veste et pas un jean, une « Tee Dress »
   une robe et pas un t-shirt, un « Belt Bag » un sac et pas une
   ceinture. Dans chaque famille, les tags fins passent avant le mot
   générique (« jacket », « top »), qui ne donne que la famille.
   ------------------------------------------------------------------ */

type Mot = {
  /** Le tag fin, ou `null` pour un mot qui ne dit que la famille. */
  tag: string | null;
  famille: Famille | null;
  motif: RegExp;
};

const fin = (tag: string, famille: Famille | null, motif: RegExp): Mot => ({ tag, famille, motif });
const generique = (famille: Famille, motif: RegExp): Mot => ({ tag: null, famille, motif });

/*
 * D'abord ce qui est si précis qu'aucune autre règle ne doit passer
 * devant : un porte-clés n'est pas une bague (« key ring »), un short
 * de bain n'est pas un short, un boxer n'est pas un bas.
 *
 * Ces tags-là n'ont pas toujours de famille. Un ensemble ou un maillot
 * de bain ne rentre dans aucun des huit rayons : la pièce garde alors
 * la famille que le reste de ses indices lui donne, ou aucune.
 */
const TRES_PRECIS: Mot[] = [
  fin("Porte-clés", "Accessoires", /\b(porte cles?|keychains?|key chains?|key rings?|keyrings?|carabiners?|mousquetons?|lanyards?|llaveros?|bag charms?)\b/),
  fin("Maillots de bain", null, /\b(maillots? de bain|swim ?wear|swim ?suits?|swim ?shorts?|swim ?trunks?|board ?shorts?|bikinis?|banadores?)\b/),
  fin("Sous-vêtements", null, /\b(sous vetements?|underwear|boxers?|briefs?|calecons?|slips?(?! ?ons?\b)(?! dress)|ropa interior|lingerie|bras?|bralettes?|soutiens? gorge|thongs?)\b/),
  fin("Ensembles", null, /\b(ensembles?|tracksuits?(?! (jackets?|tops?|pants?|bottoms?|shorts?))|(?<!(bas|haut|veste|pantalon) de )survetements?(?! (vestes?|hauts?|pantalons?))|co ords?|matching sets?|two pieces? sets?|2 pieces? sets?|twin sets?|conjuntos?)\b/),
];

const CHAUSSURES: Mot[] = [
  fin("Sneakers", "Chaussures", /\b(sneakers?|baskets?|trainers?|running shoes?|zapatillas?|tennis shoes?|kicks)\b/),
  fin("Bottes", "Chaussures", /\b(bottes?|bottines?|boots?(?! ?cut)|botas?|stiefel|santiags?)\b/),
  fin("Sandales & claquettes", "Chaussures", /\b(sandales?|sandals?|claquettes?|slides?|mules?|tongs?|flip flops?|sabots?|clogs?|slippers?|chaussons?|crocs)\b/),
  fin("Mocassins & derbies", "Chaussures", /\b(mocassins?|loafers?|derbys?|derbies|richelieus?|brogues?)\b/),
  generique("Chaussures", /\b(chaussures?|shoes?|footwear|zapatos?|schuhe|scarpe|souliers?|calzado)\b/),
];

const BIJOUX: Mot[] = [
  fin("Piercings", "Bijoux", /\b(piercings?|labrets?|septums?|nose rings?|belly rings?)\b/),
  fin("Boucles d'oreilles", "Bijoux", /\b(boucles? d oreilles?|earrings?|ear cuffs?|creoles?|hoops?|studs?|pendientes?|orecchini)\b/),
  fin("Bagues", "Bijoux", /\b((?<!key |o )rings?|bagues?|chevalieres?|anillos?|anelli?|signets?)\b/),
  fin("Bracelets", "Bijoux", /\b(bracelets?|gourmettes?|joncs?|pulseras?|bangles?|bracciali?|armbands?)\b/),
  fin("Colliers", "Bijoux", /\b(colliers?|necklaces?|pendentifs?|pendants?|chokers?|ras du cou|collares?|collane?|sautoirs?|(?<!(wallet|belt|bag|key|keys) )(chaines?|chains?))\b/),
  generique("Bijoux", /\b(bijoux?|jewel(le)?ry|jewels?|joyas?|joyeria|schmuck|gioielli|joaillerie|bijouterie)\b/),
];

const ACCESSOIRES: Mot[] = [
  fin("Cagoules", "Accessoires", /\b(cagoules?|balaclavas?|ski masks?|passe montagnes?)\b/),
  fin("Bonnets", "Accessoires", /\b(bonnets?|beanies?|tuques?|gorros?|watch caps?)\b/),
  fin("Bobs", "Accessoires", /\b(bobs?(?! (marley|dylan|sponge|l eponge))|bucket( hats?)?|buckets?)\b/),
  fin("Casquettes", "Accessoires", /\b(casquettes?|caps?|snapbacks?|trucker (hats?|caps?)|baseball hats?|dad hats?|5 panels?|five panels?|gorras?|visors?|visieres?)\b/),
  fin("Chapeaux", "Accessoires", /\b(chapeaux?|hats?|fedoras?|berets?)\b/),
  fin("Sacs", "Accessoires", /\b(sacs?|bags?|totes?|backpacks?|bananes?|fanny packs?|bum bags?|sacoches?|pochettes?|pouch(es)?|duffles?(?! coats?)|duffels?(?! coats?)|messengers?|crossbody|cabas|besaces?|bolsos?|mochilas?|rucksacks?)\b/),
  fin("Ceintures", "Accessoires", /\b(ceintures?|belts?|cinturon(es)?|gurtel)\b/),
  fin("Écharpes & foulards", "Accessoires", /\b(echarpes?|scarf|scarves|foulards?|bandanas?|snoods?|cheches?|keffiehs?|tours? de cou|neck warmers?|bufandas?)\b/),
  fin("Gants", "Accessoires", /\b(gants?|gloves?|mitaines?|moufles?|gauntlets?|guantes)\b/),
  fin("Chaussettes", "Accessoires", /\b(chaussettes?|socks?|calcetines?|calze|socken)\b/),
  fin("Lunettes", "Accessoires", /\b(lunettes?|sunglasses|glasses|eyewear|shades|gafas|occhiali)\b/),
  /* « tie » seul n'y est pas : il attrapait « tie-dye », qui est une
     teinture. Un t-shirt tie-dye rangé dans les cravates, c'était le
     défaut le plus visible de l'ancien classement. */
  fin("Cravates", "Accessoires", /\b(cravates?|neck ?ties?|bow ?ties?|noeuds? papillons?)\b/),
  fin("Petite maroquinerie", "Accessoires", /\b(portefeuilles?|wallets?|porte ?cartes?|card ?holders?|cardholders?|porte ?monnaie|coin purses?|carteras?|billeteras?)\b/),
  fin("Stickers & patchs", "Accessoires", /\b(stickers?|autocollants?|pegatinas?|ecussons?|pins|enamel pins?|lapel pins?|patchs?$|patches$)\b/),
  generique("Accessoires", /\b(accessoires?|accessories|accessory|accesorios?|accessori|zubehor|headwear|couvre chefs?)\b/),
];

const VESTES: Mot[] = [
  fin("Vestes en jean", "Vestes", /\b((denim|jeans?) (jackets?|vestes?|truckers?|blousons?)|(vestes?|blousons?) (en )?(jean|denim)|trucker jackets?)\b/),
  fin("Vestes en cuir", "Vestes", /\b((leather|cuir|suede|daim|faux leather|simili cuir) (jackets?|vestes?|blousons?|bombers?)|(vestes?|blousons?) (en )?(cuir|daim|simili)|perfectos?|biker jackets?|moto(rcycle)? jackets?)\b/),
  fin("Bombers", "Vestes", /\b(bombers?|flight jackets?|ma ?1)\b/),
  fin("Gilets sans manches", "Vestes", /\b((puffer|down|padded|quilted|tactical|utility|cargo|fleece|work) vests?|vests?$|gilets? sans manches|gilets? tactiques?|sleeveless (jackets?|puffers?)|body ?warmers?|doudounes? sans manches|chalecos?)\b/),
  fin("Doudounes", "Vestes", /\b(doudounes?|puffers?( jackets?)?|puffy jackets?|down jackets?|padded jackets?|quilted jackets?|plumas|plumiferos?|piumini?)\b/),
  fin("Coupe-vent", "Vestes", /\b(coupe ?vents?|windbreakers?|wind ?breakers?|windrunners?|anoraks?|shell jackets?|rain ?jackets?|raincoats?|impermeables?|k ?ways?|softshells?|cortavientos|wind jackets?)\b/),
  fin("Vestes varsity", "Vestes", /\b(varsity (jackets?|bombers?)|letterman( jackets?)?|college jackets?|teddy jackets?|vestes? (varsity|college|universitaires?|teddy)|varsity$)\b/),
  fin("Surchemises", "Vestes", /\b(overshirts?|over shirts?|surchemises?|shackets?|shirt jackets?|sobrecamisas?)\b/),
  fin("Blazers", "Vestes", /\b(blazers?|vestes? de costume|suit jackets?|vestons?|sport coats?|americanas?)\b/),
  fin("Manteaux", "Vestes", /\b(manteaux?|coats?|overcoats?|topcoats?|parkas?|trench( coats?)?|trenchs?|cabans?|peacoats?|pea coats?|abrigos?|cappott[oi]|mantel|pardessus)\b/),
  generique("Vestes", /\b(vestes?|jackets?|blousons?|outerwear|outwear|outer wear|chaquetas?|cazadoras?|giacc(a|he)|jacken?|chore (coats?|jackets?)|track ?jackets?|coach jackets?|work jackets?|gilets?(?! (en )?(maille|laine|tricot\w*|mohair|cachemire))|chaquetones?)\b/),
];

const ROBES: Mot[] = [
  fin("Combinaisons", "Robes", /\b(combinaisons?|jumpsuits?|playsuits?|rompers?|overalls?|salopettes?|dungarees?|boiler ?suits?)\b/),
  generique("Robes", /\b(robes?|dress(es)?(?! (shirts?|pants?|shoes?|trousers?|codes?))|vestidos?|kleid(er)?|gowns?|sundress(es)?|minidress(es)?)\b/),
];

const BAS: Mot[] = [
  fin("Shorts", "Bas", /\b(shorts?(?! (sleeve|manche|tee|t shirt|top|coat|jacket|hoodie|dress|robe|skirt))|jorts?|bermudas?|pantalones? cortos?|pantaloncini|kurze hosen?)\b/),
  fin("Joggings", "Bas", /\b(joggings?|joggers?|jogpants?|sweat ?pants?|track ?pants?|tracksuit (pants?|bottoms?)|trackpants?|bas de survetements?|pantalons? de (survetement|jogging)|chandal|jogginghosen?)\b/),
  fin("Jupes", "Bas", /\b(jupes?|skirts?|faldas?|mini ?jupes?|minijupes?)\b/),
  fin("Leggings", "Bas", /\b(leggings?|collants?|tights|cyclistes?)\b/),
  fin("Cargos", "Bas", /\b(cargos?( pants?| trousers?| pantalons?)?|pantalons? cargos?)\b/),
  fin("Jeans", "Bas", /\b(jeans|jean(?! (michel|paul|luc|pierre|baptiste|marc|claude|jacques|louis|philippe|francois))|denim (pants?|trousers?)|pantalons? (en )?(jean|denim)|vaqueros?|selvedge)\b/),
  fin("Pantalons", "Bas", /\b(pantalons?|pants?|trousers?|pantalones?|pantaloni|hosen?|chinos?|slacks|flares?)\b/),
  generique("Bas", /\b(bottoms?|lower ?wear)\b/),
];

const MAILLE: Mot[] = [
  fin("Cardigans", "Maille", /\b(cardigans?|cardis?|gilets? (en )?(maille|laine|tricot\w*|mohair|cachemire)|chaquetas? de punto)\b/),
  fin("Pulls", "Maille", /\b(pulls?(?! (a )?capuche)|pull over|sweaters?(?! vests?)|jumpers?|jerseis|jersei|knit(ted)? (sweaters?|jumpers?)|tricots?|strickpullover|maglion[ei])\b/),
  generique("Maille", /\b(maille|knit\w*|tricot\w*|punto|mohair|cachemire|cashmere|merinos?|alpagas?|alpacas?|laine|wool)\b/),
];

const HAUTS: Mot[] = [
  fin("Manches longues", "Hauts", /\b((long ?sleeves?|longsleeves?|manches? longues?)( (tees?|t shirts?|tee shirts?|shirts?|tops?))?|l s (tees?|t shirts?|tops?))\b/),
  fin("Hoodies", "Hauts", /\b((zip ?(up )?)?hood(ie|ies|y|ys)|(sweats?|pulls?) (a )?capuche|capuches?|sudaderas? (con )?capucha|kapuzen\w*|felpe? con cappuccio)\b/),
  fin("Sweats", "Hauts", /\b(sweat ?shirts?|sweatshirts?|sweats?|crew ?necks?|crewnecks?|sudaderas?|quarter zips?|half zips?|1 4 zips?|felpas?)\b/),
  fin("T-shirts", "Hauts", /\b(t ?shirts?|tee ?shirts?|tees?|tshirts?|camisetas?|magliett[ae]|playeras?)\b/),
  fin("Polos", "Hauts", /\b(polos?)\b/),
  fin("Maillots", "Hauts", /\b(maillots?(?! de bain)|jerseys?|football shirts?|soccer (shirts?|jerseys?)|trikots?)\b/),
  fin("Débardeurs", "Hauts", /\b(debardeurs?|tank ?tops?|tanks?|singlets?|marcels?|camisoles?|caracos?|vest tops?)\b/),
  fin("Crop tops", "Hauts", /\b(crop ?tops?|crops?|cropped tops?)\b/),
  fin("Corsets", "Hauts", /\b(corsets?|bustiers?|corsages?)\b/),
  fin("Bodys", "Hauts", /\b(bodys?|bodysuits?)\b/),
  fin("Chemises", "Hauts", /\b(chemises?|shirts?|button (ups?|downs?)|camisas?|camicie?|hemden?|blouses?|chemisiers?)\b/),
  generique("Hauts", /\b(hauts?|tops?|henleys?|tuniques?|tunics?|upper ?wear)\b/),
];

const LEXIQUE: Mot[] = [
  ...TRES_PRECIS,
  ...CHAUSSURES,
  ...BIJOUX,
  ...ACCESSOIRES,
  ...VESTES,
  ...ROBES,
  ...BAS,
  ...MAILLE,
  ...HAUTS,
];

/** Les mêmes motifs, en version globale, pour les lectures qui consomment le texte. */
const LEXIQUE_GLOBAL = LEXIQUE.map((m) => ({ ...m, motif: new RegExp(m.motif.source, "g") }));

/**
 * LA MATIÈRE, LUE EN DERNIER ET SUR LE NOM SEULEMENT.
 *
 * « 'Sardinia' Signature Denim » est un jean que rien d'autre ne
 * désigne : c'est ainsi que le streetwear nomme ses bas. Mais le denim
 * est une matière, et une « Denim Jacket » reste une veste : la règle
 * ne parle donc que si aucun mot de vêtement ne l'a fait avant elle.
 */
const MATIERE_DES_BAS = /\bdenims?\b/;

/** Les tags fins connus, dans l'ordre du lexique. Sert aux écrans. */
export const TAGS_CONNUS: { tag: string; famille: Famille | null }[] = LEXIQUE.filter(
  (m): m is Mot & { tag: string } => m.tag !== null
).map((m) => ({ tag: m.tag, famille: m.famille }));

const FAMILLE_DU_TAG = new Map(TAGS_CONNUS.map((t) => [t.tag, t.famille]));

export function familleDuTag(tag: string): Famille | null {
  return FAMILLE_DU_TAG.get(tag) ?? null;
}

/**
 * Le rang d'un tag pour trier une liste : l'ordre du lexique, puis
 * l'alphabet pour les tags créés depuis l'admin.
 */
export function rangDuTag(tag: string): number {
  const i = TAGS_CONNUS.findIndex((t) => t.tag === tag);
  return i < 0 ? TAGS_CONNUS.length : i;
}

/* ------------------------------------------------------------------
   NORMALISATION
   ------------------------------------------------------------------ */

export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les mots qui disent POUR QUI, pas QUOI.
 *
 * « Manteaux et Vestes Femme » et « Manteaux et Vestes Homme » sont le
 * même rayon vu de deux vestiaires. Le vestiaire est déjà un filtre à
 * part (`audience`) : ici, il ne ferait que doubler les tags.
 */
const GENRES =
  /\b(hommes?|femmes?|men|mens|man|women|womens|woman|unisexe?|hombres?|mujer(es)?|herren|damen|uomo|donna|him|her|garcons?|filles?|boys?|girls?)\b/g;

function sansGenre(normalise: string): string {
  return normalise.replace(GENRES, " ").replace(/\s+/g, " ").trim();
}

/** La clé d'un libellé de boutique : ce qui sert à reconnaître deux écritures du même. */
export function cleDeLibelle(libelle: string): string {
  return sansGenre(normaliser(libelle));
}

/** Un libellé présentable, pour l'affichage d'un tag local. */
function libellePropre(brut: string): string {
  return brut
    .replace(/[™®©]/g, "")
    .replace(/\b(hommes?|femmes?|men'?s?|women'?s?|unisexe?)\b/gi, "")
    .replace(/[\s|/,;-]+$/g, "")
    .replace(/^[\s|/,;-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

/* ------------------------------------------------------------------
   LES COLLECTIONS QUI NE DISENT RIEN

   Une boutique a toujours des collections qui ne rangent pas : « All »,
   « Best sellers », « Nouveautés », « Soldes », « Page d'accueil », et
   parfois des collections cachées pour ses publicités (« ads avril 26 »,
   « catalogue stock hors bijoux » : vu tel quel sur une marque de
   l'annuaire). Elles ne font ni un tag, ni un indice.
   ------------------------------------------------------------------ */

const REBUT_EXACT = new Set([
  "all", "tout", "tous", "toutes", "shop", "boutique", "store", "collection", "collections",
  "home", "products", "product", "produits", "produit", "articles", "article", "items",
  "vetements", "clothing", "clothes", "apparel", "ropa", "mode", "fashion", "new", "news",
  "latest", "featured", "selection", "trending", "populaires", "populaire", "favoris",
  "favorites", "kids", "enfant", "enfants", "default", "uncategorized", "non classe",
  "sin categoria", "allgemein", "autres", "other", "others", "misc", "divers", "main",
  "principal", "general", "online store", "vetement", "stock", "sale", "sales",
]);

const REBUT_MOTIF =
  /\b(ads?|facebook|meta|google|tiktok|instagram|insta|klaviyo|pinterest|feed|merchant|upsells?|cross ?sells?|wholesale|b2b|hidden|tests?|drafts?|brouillons?|sales?|soldes?|rebajas|outlet|promos?|promotions?|black friday|cyber monday|best ?sell\w*|meilleures? ventes?|top ventes?|nouveautes?|novedades|new (in|arrivals?|products?|releases?|drops?|collection|season)|just (in|dropped)|last (units?|chance|pieces?)|derniere chance|dernieres? pieces|restocks?|back in stock|available|disponibles?|in stock|en stock|sold ?outs?|epuises?|gift ?cards?|cartes? cadeaux?|e ?gift|coming soon|bientot|pre ?orders?|precommandes?|pre ?ventes?|preventes?|bundles?|all products|all items|shop all|view all|voir tout|tout voir|tout le catalogue|toutes les collections|tous les produits|catalogues?|catalog|frontpage|front page|home ?page|accueil|page principale)\b/;

/** « All pants », « Tous les hauts » : une famille entière, pas un tag. */
const PREFIXE_TOUT = /^(all|shop|shop all|tous les|toutes les|tout les|todos los|todas las|voir tous les|voir toutes les) /;

/**
 * Le libellé est-il de ceux qui ne rangent rien ?
 *
 * Exporté pour la lecture des collections : inutile de télécharger les
 * pièces d'une collection « Soldes » pour la jeter ensuite.
 */
export function libelleSansInteret(libelle: string): boolean {
  const n = cleDeLibelle(libelle);
  if (n.length < 2 || /^[0-9 ]+$/.test(n)) return true;
  if (REBUT_EXACT.has(n)) return true;
  if (PREFIXE_TOUT.test(n)) {
    // « All pants » range, « All products » ne range rien.
    const reste = n.replace(PREFIXE_TOUT, "");
    return !LEXIQUE.some((m) => m.motif.test(reste));
  }
  return REBUT_MOTIF.test(n);
}

/* ------------------------------------------------------------------
   LIRE UN LIBELLÉ DÉCLARÉ PAR LA BOUTIQUE

   Un libellé (type, collection, catégorie, étiquette) peut dire :
     - un tag fin     « Hoodies », « TEES », « PANTALONES CORTOS »
     - une famille    « Outerwear », « Tops », « JEWELRY »
     - plusieurs choses à la fois, qu'on ne peut pas départager pour
       une pièce donnée : « HOODIES / ZIP-UPS / CREWNECKS » contient
       des hoodies ET des sweats, « Bijoux et Accessoires » deux
       familles. On n'en garde que ce qui est commun à tous.
     - rien du lexique : c'est un candidat au tag local.
   ------------------------------------------------------------------ */

export type Lecture =
  | { sorte: "rebut" }
  | { sorte: "masque" }
  | { sorte: "tag"; tag: string; famille: Famille | null }
  | { sorte: "famille"; famille: Famille }
  | { sorte: "ambigu" }
  | { sorte: "local"; libelle: string; cle: string };

/** Ce qu'un libellé exact veut dire, quand le motif général se tromperait. */
const EXACTS: Record<string, Famille> = {
  tops: "Hauts",
  top: "Hauts",
  hauts: "Hauts",
  haut: "Hauts",
  shirts: "Hauts",
  bas: "Bas",
  bottoms: "Bas",
  bottom: "Bas",
  knitwear: "Maille",
  knit: "Maille",
  outerwear: "Vestes",
};

function lireRegle(regle: RegleTag): Lecture {
  if (regle.decision === "masque" || !regle.tag) return { sorte: "masque" };
  if (estUneFamille(regle.tag)) return { sorte: "famille", famille: regle.tag };
  if (FAMILLE_DU_TAG.has(regle.tag)) {
    return { sorte: "tag", tag: regle.tag, famille: FAMILLE_DU_TAG.get(regle.tag) ?? null };
  }
  return {
    sorte: "tag",
    tag: regle.tag,
    famille: estUneFamille(regle.famille) ? regle.famille : null,
  };
}

/** Tous les mots du lexique présents, chacun consommant le texte qu'il a reconnu. */
function toutLire(normalise: string): Mot[] {
  let reste = ` ${normalise} `;
  const trouves: Mot[] = [];
  for (const mot of LEXIQUE_GLOBAL) {
    mot.motif.lastIndex = 0;
    let vu = false;
    /* On efface ce qui a été reconnu, en gardant la longueur : « denim
       jackets » ne doit pas laisser traîner « jackets » pour la règle
       générique des vestes, ni « long sleeve tee » un « tee ». */
    reste = reste.replace(mot.motif, (m) => {
      vu = true;
      return " ".repeat(m.length);
    });
    if (vu) trouves.push(mot);
  }
  return trouves;
}

export function lireLibelle(
  brut: string,
  regles?: Regles | null,
  /** Faux pour le type et les étiquettes : seules les collections font des tags locaux. */
  peutEtreLocal = true
): Lecture {
  const n = cleDeLibelle(brut);
  if (!n) return { sorte: "rebut" };

  // « All pants » : la famille, et rien de plus fin.
  if (PREFIXE_TOUT.test(n)) {
    const familles = new Set(
      toutLire(n.replace(PREFIXE_TOUT, "")).map((m) => m.famille).filter(Boolean)
    );
    if (familles.size === 1) return { sorte: "famille", famille: [...familles][0] as Famille };
    return { sorte: "rebut" };
  }

  if (libelleSansInteret(brut)) return { sorte: "rebut" };

  const regle = regles?.get(n);
  if (regle) return lireRegle(regle);

  if (EXACTS[n]) return { sorte: "famille", famille: EXACTS[n] };

  const trouves = toutLire(n);
  if (trouves.length === 0) {
    const libelle = libellePropre(brut);
    return peutEtreLocal && libelle.length >= 2
      ? { sorte: "local", libelle, cle: n }
      : { sorte: "rebut" };
  }

  const tags = [...new Set(trouves.filter((m) => m.tag).map((m) => m.tag as string))];
  const generiques = trouves.filter((m) => !m.tag);

  // Un seul tag fin, et aucun mot générique à côté : « TEES », « Hoodies ».
  if (tags.length === 1 && generiques.length === 0) {
    return { sorte: "tag", tag: tags[0], famille: FAMILLE_DU_TAG.get(tags[0]) ?? null };
  }

  // Sinon, ce qui est commun à tout le libellé : sa famille, si elle est unique.
  const familles = new Set(trouves.map((m) => m.famille).filter(Boolean));
  if (familles.size === 1) return { sorte: "famille", famille: [...familles][0] as Famille };
  return { sorte: "ambigu" };
}

/* ------------------------------------------------------------------
   LE NOM : LE PREMIER MOT QUI PARLE
   ------------------------------------------------------------------ */

function premier(normalise: string): Mot | null {
  for (const mot of LEXIQUE) if (mot.motif.test(normalise)) return mot;
  return null;
}

/* ------------------------------------------------------------------
   CLASSER UNE PIÈCE
   ------------------------------------------------------------------ */

type Candidat = { tag: string; famille: Famille | null };

function familleDe(l: Lecture | null): Famille | null {
  if (!l) return null;
  if (l.sorte === "famille") return l.famille;
  if (l.sorte === "tag") return l.famille;
  return null;
}

/** La famille sur laquelle tous les libellés s'accordent, ou rien. */
function familleCommune(lectures: Lecture[]): Famille | null {
  const familles = new Set(lectures.map(familleDe).filter((f): f is Famille => f !== null));
  return familles.size === 1 ? [...familles][0] : null;
}

/**
 * Le tag fin qu'une liste de libellés désigne, compatible avec la
 * famille qu'on a déjà.
 *
 * Plusieurs tags de la même famille : on prend le plus précis dans
 * l'ordre du lexique (une pièce rangée à la fois dans « Tees » et
 * « Long sleeves » est une manche longue). Plusieurs familles : on ne
 * tranche pas.
 */
function tagCommun(lectures: Lecture[], famille: Famille | null): Candidat | null {
  const candidats = lectures
    .filter((l): l is Extract<Lecture, { sorte: "tag" }> => l.sorte === "tag")
    .filter((l) => !famille || l.famille === null || l.famille === famille);
  if (candidats.length === 0) return null;

  const familles = new Set(candidats.map((c) => c.famille).filter(Boolean));
  if (familles.size > 1) return null;

  return candidats.sort((a, b) => rangDuTag(a.tag) - rangDuTag(b.tag))[0];
}

export type PieceAClasser = {
  nom: string;
  description?: string | null;
  rangement?: Rangement | null;
};

/**
 * La famille, le tag fin et les tags locaux d'une pièce.
 *
 * L'ORDRE DES SOURCES, pour le tag fin :
 *   1. le TYPE que la boutique a donné à la pièce (« Hoodie », « SHORT »),
 *      parce qu'elle l'a écrit pour cette pièce et pour rien d'autre ;
 *   2. le NOM, qui désigne la pièce ;
 *   3. les COLLECTIONS qui la contiennent, à condition qu'elles ne
 *      contredisent pas la famille déjà connue ;
 *   4. les ÉTIQUETTES, en dernier : on y a vu une « TWEED PANT »
 *      étiquetée « jackets ».
 *
 * LA FAMILLE suit le tag fin quand il y en a un. Sans lui : le type,
 * le nom, les collections, les étiquettes, la matière, puis la
 * description, dans cet ordre.
 *
 * UN SEUL TAG FIN PAR PIÈCE, comme un seul rayon. Une pièce comptée
 * dans deux tags ferait mentir tous les compteurs.
 */
export function classerLaPiece(piece: PieceAClasser, regles?: Regles | null): Classement {
  const r = piece.rangement ?? {};
  const nom = normaliser(piece.nom ?? "");

  const parNom = premier(nom);
  const parType = r.type ? lireLibelle(r.type, regles, false) : null;
  const parCollections = (r.collections ?? []).map((c) => lireLibelle(c, regles, true));
  const parEtiquettes = (r.etiquettes ?? []).map((e) => lireLibelle(e, regles, false));

  const indice = familleDe(parType) ?? parNom?.famille ?? null;

  let tag: Candidat | null = null;
  if (parType?.sorte === "tag") tag = { tag: parType.tag, famille: parType.famille };
  else if (parNom?.tag) tag = { tag: parNom.tag, famille: parNom.famille };
  else {
    tag =
      tagCommun(parCollections, indice) ??
      tagCommun(parEtiquettes, indice ?? familleCommune(parCollections));
  }

  let famille: Famille | null =
    tag?.famille ??
    familleDe(parType) ??
    parNom?.famille ??
    familleCommune(parCollections) ??
    familleCommune(parEtiquettes) ??
    null;

  /* « Dust Denim » : un bas dont le nom ne dit que la matière. C'est un
     jean, que la famille vienne de la matière ou d'une collection
     « All pants ». */
  if (!tag && (!famille || famille === "Bas") && MATIERE_DES_BAS.test(nom)) {
    famille = "Bas";
    tag = { tag: "Jeans", famille: "Bas" };
  }

  if (!famille && piece.description) {
    famille = premier(normaliser(piece.description))?.famille ?? null;
  }

  const locaux = new Map<string, string>();
  for (const l of parCollections) {
    if (l.sorte === "local" && !locaux.has(l.cle)) locaux.set(l.cle, l.libelle);
  }

  return { famille, tags: tag ? [tag.tag] : [], locaux: [...locaux.values()] };
}

/**
 * Pose une famille dans une liste de catégories sans perdre le reste.
 *
 * La colonne peut porter autre chose qu'un rayon ; l'ancien reclassement
 * prenait déjà soin de ne pas l'effacer au passage.
 */
export function avecLaFamille(categories: string[] | null | undefined, famille: Famille | null): string[] {
  const autres = (categories ?? []).filter((c) => !estUneFamille(c));
  return famille ? [famille, ...autres] : autres;
}

/** Transforme les règles lues en base en table de consultation. */
export function tableDesRegles(lignes: RegleTag[] | null | undefined): Regles {
  return new Map((lignes ?? []).map((r) => [r.cle, r]));
}
