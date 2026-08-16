/**
 * Lecture du catalogue d'une boutique, quelle que soit sa plateforme.
 *
 * Quatre méthodes, essayées dans l'ordre du plus fiable au plus
 * universel. On ne contourne rien : chacune lit ce que la boutique
 * publie volontairement, soit pour son propre site, soit pour Google.
 *
 *   1. Shopify        /products.json
 *   2. WooCommerce    /wp-json/wc/store/v1/products
 *   3. Big Cartel     /products.json (format différent de Shopify)
 *   4. Données structurées  schema.org/Product en JSON-LD
 *
 * La quatrième marche presque partout : n'importe quelle boutique qui
 * veut apparaître dans les résultats Google avec son prix et sa
 * disponibilité doit publier ces données. C'est devenu un standard de
 * fait, et il nous sert de filet.
 */

import type { CatalogueItem, Resultat, Source } from "./catalogue-commun";

export { cleLien, SOURCE_LABEL } from "./catalogue-commun";
export type { CatalogueItem, Resultat, Source } from "./catalogue-commun";

/* ---------------- utilitaires ---------------- */

export function normalizeShopUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Le plan d'un site liste souvent ses adresses en "www." alors que la
 * personne a collé le domaine nu — ou l'inverse. Comparer les chaînes
 * telles quelles rejetait alors la totalité des pages trouvées.
 */
function memeSite(a: string, b: string): boolean {
  try {
    const nu = (u: string) => new URL(u).host.replace(/^www\./, "");
    return nu(a) === nu(b);
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/**
 * Le premier candidat qui contient vraiment quelque chose.
 *
 * `a ?? b` ne retient que null et undefined : une boutique qui publie
 * un `sku` PRÉSENT MAIS VIDE passait au travers, et toutes ses pièces
 * repartaient avec le même identifiant — vide. À l'import, chacune
 * écrasait donc la précédente. D'où cette fonction, qui traite la
 * chaîne vide comme une absence.
 */
function identifiant(...candidats: unknown[]): string {
  for (const candidat of candidats) {
    const valeur = String(candidat ?? "").trim();
    if (valeur && valeur !== "undefined" && valeur !== "null") return valeur;
  }
  return "";
}

/** "80,00 €" ou "80.00" -> 8000 centimes. */
function enCentimes(valeur: unknown): number | null {
  if (valeur == null) return null;
  const texte = String(valeur).replace(/[^\d.,]/g, "").replace(",", ".");
  const n = Number(texte);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/*
 * LES EN-TÊTES ENVOYÉS COMPTENT AUTANT QUE L'ADRESSE.
 *
 * Shopify Markets sert des prix différents selon le pays d'où vient la
 * requête. Nos lectures partaient des serveurs américains de Vercel :
 * une boutique qui affiche 109,90 € à un visiteur français nous
 * répondait 130 $US, et l'on convertissait consciencieusement ces
 * dollars en euros pour obtenir 112,71 € — un prix que personne ne
 * paiera jamais.
 *
 * Deux corrections, et il faut les deux. La région d'exécution est
 * passée à Paris dans vercel.json, ce qui donne à Shopify une adresse
 * française à géolocaliser. Et l'on annonce le français ci-dessous, ce
 * dont se servent les boutiques qui décident sur la langue plutôt que
 * sur l'adresse.
 */
const EN_TETES = {
  "User-Agent": "NewaveSphere/1.0 (+https://newavesphere.fr)",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.4",
};

async function lire(url: string, accept = "application/json"): Promise<Response | null> {
  try {
    const r = await fetch(url, {
      headers: { Accept: accept, ...EN_TETES },
      next: { revalidate: 3600 },
    });
    return r.ok ? r : null;
  } catch {
    return null;
  }
}

/**
 * La boutique est-elle FERMÉE VOLONTAIREMENT ?
 *
 * Beaucoup de marques verrouillent leur site avant un drop : une page
 * « new drop loading », un mot de passe, et rien d'autre. Ce n'est pas
 * une panne et ce n'est pas un site illisible — c'est une décision, et
 * elle est temporaire.
 *
 * La distinction compte parce qu'elle change ce qu'on écrit au
 * visiteur. « On n'a pas su lire ce catalogue » laisse penser que la
 * marque est mal fichue ; « la boutique prépare quelque chose » dit la
 * vérité, et donne même envie de revenir.
 *
 * Trois signes, du plus fiable au moins fiable :
 *   — Shopify répond 401 sur ses adresses quand le mot de passe est
 *     posé, et il est le seul à le faire aussi proprement ;
 *   — la page d'accueil renvoie vers /password ;
 *   — le titre ou le contenu annonce l'attente en toutes lettres.
 */
const MOTS_DE_L_ATTENTE =
  /opening soon|coming soon|drop loading|password|bient[oô]t disponible|ouverture prochaine|nous revenons|be right back|under construction|en construction|restock loading/i;

async function boutiqueVerrouillee(base: string): Promise<boolean> {
  try {
    const r = await fetch(`${base}/products.json`, {
      headers: { Accept: "application/json", ...EN_TETES },
      redirect: "follow",
      next: { revalidate: 3600 },
    });

    // Shopify verrouillé : 401 franc, ou redirection vers la page de
    // mot de passe.
    if (r.status === 401 || r.status === 403) return true;
    if (/\/password/i.test(r.url)) return true;
  } catch {
    return false;
  }

  const page = await lire(base, "text/html");
  if (!page) return false;

  try {
    if (/\/password/i.test(page.url)) return true;
    const html = (await page.text()).slice(0, 40000);
    const titre = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
    // Le titre est le signal le plus sûr : une page de vente peut
    // contenir « coming soon » dans un texte, pas dans son titre.
    if (MOTS_DE_L_ATTENTE.test(titre)) return true;
    // À défaut, une page très courte qui ne parle que d'attente.
    if (html.length < 12000 && MOTS_DE_L_ATTENTE.test(html)) return true;
  } catch {
    return false;
  }
  return false;
}

/* ============================================================
   D'OÙ VIENT UNE MARQUE

   Le pays était écrit « France » par défaut, faute de mieux. Sur un
   annuaire qui référence des marques danoises, allemandes et
   américaines, c'est une erreur affichée en toutes lettres sur la
   carte — et une erreur affirmée est bien pire qu'une case vide.

   On cherche donc, dans cet ordre de fiabilité :

     1. ce que le site déclare lui-même en données structurées ;
     2. l'extension de son domaine, qui ne ment quasiment jamais ;
     3. sa monnaie, quand elle ne laisse aucun doute.

   Et si rien ne ressort, ON N'ÉCRIT RIEN. Une fiche sans pays se
   complète en dix secondes à la main ; une fiche qui annonce le mauvais
   pays, personne ne la corrige, parce que personne ne la relit.
   ============================================================ */

/** Les pays qu'on sait nommer, en français, depuis un code ou une extension. */
const PAYS: Record<string, string> = {
  fr: "France", be: "Belgique", ch: "Suisse", lu: "Luxembourg",
  de: "Allemagne", at: "Autriche", nl: "Pays-Bas", dk: "Danemark",
  se: "Suède", no: "Norvège", fi: "Finlande", is: "Islande",
  es: "Espagne", pt: "Portugal", it: "Italie", gr: "Grèce",
  gb: "Royaume-Uni", uk: "Royaume-Uni", ie: "Irlande",
  pl: "Pologne", cz: "Tchéquie", hu: "Hongrie", ro: "Roumanie",
  us: "États-Unis", ca: "Canada", mx: "Mexique", br: "Brésil",
  jp: "Japon", kr: "Corée du Sud", cn: "Chine", hk: "Hong Kong",
  au: "Australie", nz: "Nouvelle-Zélande", za: "Afrique du Sud",
  ma: "Maroc", tn: "Tunisie", dz: "Algérie", sn: "Sénégal",
  tr: "Turquie", il: "Israël", ae: "Émirats arabes unis", in: "Inde",
};

/** Les monnaies qui ne laissent aucun doute sur le pays. */
const PAYS_DE_LA_DEVISE: Record<string, string> = {
  GBP: "Royaume-Uni", DKK: "Danemark", SEK: "Suède", NOK: "Norvège",
  PLN: "Pologne", CZK: "Tchéquie", HUF: "Hongrie", RON: "Roumanie",
  CHF: "Suisse", USD: "États-Unis", CAD: "Canada", AUD: "Australie",
  NZD: "Nouvelle-Zélande", JPY: "Japon", KRW: "Corée du Sud",
  BRL: "Brésil", MXN: "Mexique", TRY: "Turquie", MAD: "Maroc",
  ZAR: "Afrique du Sud", INR: "Inde",
  // L'euro est volontairement absent : vingt pays le partagent, il ne
  // dit donc rien. Mieux vaut ne rien écrire que d'écrire « France ».
};

/** « FR », « fr-FR », « France » -> « France ». Sinon la valeur d'origine. */
export function nommerLePays(brut: string | null | undefined): string | null {
  const valeur = (brut ?? "").trim();
  if (!valeur) return null;

  const code = valeur.toLowerCase().split(/[-_]/).pop() ?? "";
  if (code.length === 2 && PAYS[code]) return PAYS[code];

  // Déjà écrit en toutes lettres : on le garde tel quel, en corrigeant
  // seulement la casse du premier caractère.
  return valeur.charAt(0).toUpperCase() + valeur.slice(1);
}

/**
 * D'où vient l'information, et donc à quel point on peut s'y fier.
 *
 * La distinction n'est pas cosmétique : elle décide si l'on a le droit
 * d'ÉCRASER un pays déjà saisi. Ce que le site déclare et l'extension
 * de son domaine sont des faits ; la monnaie n'est qu'un indice, et un
 * indice ne renverse pas une valeur existante.
 */
export type IndicePays = "declare" | "domaine" | "devise";

export async function deduireLePaysDetaille(
  base: string,
  declare?: string | null
): Promise<{ pays: string; indice: IndicePays } | null> {
  const dit = nommerLePays(declare);
  if (dit) return { pays: dit, indice: "declare" };

  // L'extension du domaine. Une marque danoise sur un .dk n'est pas
  // française, quelle que soit la langue de son site.
  try {
    const hote = new URL(base).hostname.toLowerCase();
    const morceaux = hote.split(".");
    const ext = morceaux[morceaux.length - 1];
    if (PAYS[ext]) return { pays: PAYS[ext], indice: "domaine" };
  } catch {
    // adresse illisible : on continue
  }

  // La monnaie, en dernier recours. `devineLaDevise` renvoie « EUR »
  // par défaut, ce qui n'apprend rien : la table l'ignore.
  const devise = await devineLaDevise(base, "");
  const pays = PAYS_DE_LA_DEVISE[devise];
  return pays ? { pays, indice: "devise" } : null;
}

/**
 * Le pays d'une boutique, ou rien.
 *
 * @param declare ce que le site dit de lui-même, s'il dit quelque chose
 */
export async function deduireLePays(
  base: string,
  declare?: string | null
): Promise<string | null> {
  return (await deduireLePaysDetaille(base, declare))?.pays ?? null;
}

/** Les trois lettres d'un code ISO 4217, et rien d'autre. */
const CODE_DEVISE = /^[A-Z]{3}$/;

/**
 * La devise d'une boutique.
 *
 * C'est le maillon qui manquait, et il coûtait cher : les prix d'une
 * boutique danoise s'affichaient tels quels avec un symbole euro. Un
 * short à 505 couronnes, soit une soixantaine d'euros, devenait
 * « 505 € ». Pas une erreur d'arrondi : un facteur sept, et dans le
 * sens qui fait fuir.
 *
 * La cause est que `/products.json` de Shopify ne dit PAS dans quelle
 * monnaie il compte. Le lecteur écrivait donc « EUR » en dur, faute de
 * mieux. Tant que les marques étaient françaises, personne ne le
 * voyait.
 *
 * Deux sources, dans l'ordre :
 *
 *   1. `/cart.js`, que toute boutique Shopify expose et qui porte la
 *      devise de la boutique. Une requête, du JSON, aucune ambiguïté.
 *   2. la page d'accueil, où la même information traîne sous plusieurs
 *      écritures selon le thème.
 *
 * En dernier recours on garde la valeur par défaut. C'est un pari,
 * mais un pari explicite : mieux vaut une devise supposée qu'une
 * lecture abandonnée.
 */
async function devineLaDevise(base: string, defaut = "EUR"): Promise<string> {
  const panier = await lire(`${base}/cart.js`);
  if (panier) {
    try {
      const p = (await panier.json()) as { currency?: string };
      const code = (p.currency ?? "").toUpperCase();
      if (CODE_DEVISE.test(code)) return code;
    } catch {
      // Réponse illisible : on passe à la source suivante.
    }
  }

  const page = await lire(base, "text/html");
  if (page) {
    try {
      const html = await page.text();
      const pistes = [
        /Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Za-z]{3})"/,
        /"currencyCode"\s*:\s*"([A-Za-z]{3})"/,
        /(?:og:price:currency|product:price:currency|priceCurrency)[^>]{0,60}?content="([A-Za-z]{3})"/i,
        /content="([A-Za-z]{3})"[^>]{0,60}?(?:og:price:currency|product:price:currency|priceCurrency)/i,
      ];
      for (const piste of pistes) {
        const code = html.match(piste)?.[1]?.toUpperCase();
        if (code && CODE_DEVISE.test(code)) return code;
      }
    } catch {
      // Page illisible : on retombe sur la valeur par défaut.
    }
  }

  return defaut;
}

/* ---------------- 1. Shopify ---------------- */

type ShopifyBrut = {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  // Les trois axes que Shopify autorise, alignés sur `options`.
  variants?: ShopifyVariante[];
  images?: { src: string }[];
  options?: { name?: string }[];
};

type ShopifyVariante = {
  title?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  price?: string;
  compare_at_price?: string | null;
  available?: boolean;
};

/** Ce qui, dans le nom d'un axe de variante, désigne bien une taille. */
const AXE_TAILLE = /taille|size|pointure|dimension/i;

/**
 * Nettoie une liste de tailles avant de l'enregistrer.
 *
 * Deux problèmes, et le même symptôme : une fiche qui affiche
 * « Apricot, Apricot, Apricot ».
 *
 * Le premier est que les variantes d'une boutique ne sont pas des
 * tailles mais des combinaisons. Une pièce déclinée en trois couleurs
 * et quatre tailles a douze variantes, et si l'on lit toujours le
 * premier axe, on récupère douze fois trois couleurs. React s'en
 * plaint d'ailleurs à juste titre : deux enfants ne peuvent pas
 * partager la même clé.
 *
 * Le second est que rien ne garantit que le premier axe soit la
 * taille. Beaucoup de boutiques déclarent la couleur en premier.
 *
 * On dédoublonne donc, et une taille reste disponible dès qu'une seule
 * de ses variantes l'est : un pull en taille M existe encore si le
 * rouge est épuisé mais pas le noir.
 */
function normaliserTailles(
  brutes: { label: string; available: boolean }[]
): { label: string; available: boolean }[] {
  const parLabel = new Map<string, boolean>();

  for (const t of brutes) {
    const label = t.label.trim();
    if (!label || label.toLowerCase() === "default title") continue;
    parLabel.set(label, (parLabel.get(label) ?? false) || t.available);
  }

  return Array.from(parLabel, ([label, available]) => ({ label, available }));
}

async function viaShopify(base: string): Promise<CatalogueItem[] | null> {
  const r = await lire(`${base}/products.json?limit=250`);
  if (!r) return null;

  let payload: { products?: ShopifyBrut[] };
  try {
    payload = await r.json();
  } catch {
    return null;
  }
  // Big Cartel répond aussi sur /products.json, mais sans enveloppe.
  if (!Array.isArray(payload?.products)) return null;

  // Une seule fois pour toute la boutique, et seulement maintenant
  // qu'on est sûr d'avoir affaire à du Shopify : inutile de payer une
  // requête pour une adresse qui n'aurait rien donné.
  const devise = await devineLaDevise(base);

  return payload.products.map((p) => {
    const variants = p.variants ?? [];
    const prix = variants.map((v) => enCentimes(v.price)).filter((n): n is number => n !== null);
    const priceCents = prix.length ? Math.min(...prix) : null;

    const barres = variants
      .map((v) => enCentimes(v.compare_at_price))
      .filter((n): n is number => n !== null);
    const maxBarre = barres.length ? Math.max(...barres) : null;

    /*
     * Sur quel axe lire la taille.
     *
     * Shopify aligne option1, option2, option3 sur l'ordre déclaré
     * dans `options`. On cherche celui qui parle de taille ; à défaut
     * on prend le premier, comme avant.
     */
    const axes = p.options ?? [];
    const rang = Math.max(
      0,
      axes.findIndex((o) => AXE_TAILLE.test(o?.name ?? ""))
    );
    const lireAxe = (v: ShopifyVariante) =>
      [v.option1, v.option2, v.option3][rang] ?? v.option1 ?? v.title ?? "";

    return {
      source_id: identifiant(p.id, p.handle, p.title),
      slug: p.handle,
      name: p.title,
      description: stripHtml(p.body_html ?? "").slice(0, 1200),
      price_cents: priceCents,
      compare_at_cents:
        maxBarre !== null && priceCents !== null && maxBarre > priceCents ? maxBarre : null,
      currency: devise,
      sizes: normaliserTailles(
        variants.map((v) => ({ label: lireAxe(v), available: Boolean(v.available) }))
      ),
      size_label: axes[rang]?.name?.trim() || "Taille",
      images: (p.images ?? []).map((i) => i.src).slice(0, 8),
      shop_url: `${base}/products/${p.handle}`,
      available: variants.some((v) => v.available),
    };
  });
}

/* ---------------- 2. WooCommerce ---------------- */

type WooBrut = {
  id: number;
  name: string;
  slug?: string;
  permalink: string;
  short_description?: string;
  description?: string;
  prices?: {
    price?: string;
    regular_price?: string;
    currency_code?: string;
    currency_minor_unit?: number;
  };
  images?: { src: string }[];
  is_in_stock?: boolean;
  attributes?: { name?: string; terms?: { name: string }[] }[];
};

async function viaWooCommerce(base: string): Promise<CatalogueItem[] | null> {
  // L'API Store de WooCommerce est publique par conception : c'est
  // elle qui alimente le panier côté navigateur.
  const r = await lire(`${base}/wp-json/wc/store/v1/products?per_page=100`);
  if (!r) return null;

  let brut: WooBrut[];
  try {
    brut = await r.json();
  } catch {
    return null;
  }
  if (!Array.isArray(brut) || brut.length === 0) return null;

  return brut.map((p) => {
    // WooCommerce renvoie des entiers dans la plus petite unité, avec
    // le nombre de décimales à part : "8000" + 2 => 80,00 €.
    const unite = p.prices?.currency_minor_unit ?? 2;
    const facteur = Math.pow(10, unite - 2);
    const brutPrix = Number(p.prices?.price);
    const brutRegulier = Number(p.prices?.regular_price);
    const price = Number.isFinite(brutPrix) ? Math.round(brutPrix / facteur) : null;
    const regulier = Number.isFinite(brutRegulier) ? Math.round(brutRegulier / facteur) : null;

    const tailles = p.attributes?.find((a) => AXE_TAILLE.test(a.name ?? ""));

    return {
      source_id: identifiant(p.id, p.slug, p.name),
      slug: p.slug || slugify(p.name),
      name: p.name,
      description: stripHtml(p.description || p.short_description || "").slice(0, 1200),
      price_cents: price,
      compare_at_cents: regulier !== null && price !== null && regulier > price ? regulier : null,
      currency: p.prices?.currency_code || "EUR",
      sizes: normaliserTailles(
        (tailles?.terms ?? []).map((t) => ({ label: t.name, available: true }))
      ),
      size_label: tailles?.name ?? "Taille",
      images: (p.images ?? []).map((i) => i.src).slice(0, 8),
      shop_url: p.permalink,
      available: p.is_in_stock !== false,
    };
  });
}

/* ---------------- 3. Big Cartel ---------------- */

type BigCartelBrut = {
  id: number;
  name: string;
  permalink?: string;
  url?: string;
  description?: string;
  price?: number | string;
  status?: string;
  images?: { url?: string; secure_url?: string }[];
  options?: { name?: string; sold_out?: boolean }[];
};

async function viaBigCartel(base: string): Promise<CatalogueItem[] | null> {
  const r = await lire(`${base}/products.json`);
  if (!r) return null;

  let brut: BigCartelBrut[];
  try {
    brut = await r.json();
  } catch {
    return null;
  }
  // Chez Big Cartel la réponse est un tableau nu, pas un objet.
  if (!Array.isArray(brut) || brut.length === 0) return null;

  // Même angle mort que chez Shopify : le catalogue ne dit pas en quoi
  // il compte. Beaucoup de boutiques Big Cartel sont américaines, on
  // ne peut donc pas se contenter de supposer l'euro.
  const devise = await devineLaDevise(base);

  return brut.map((p) => {
    const chemin = p.url ?? (p.permalink ? `/product/${p.permalink}` : "");
    const options = p.options ?? [];
    return {
      source_id: identifiant(p.id, p.permalink, p.name),
      slug: p.permalink || slugify(p.name),
      name: p.name,
      description: stripHtml(p.description ?? "").slice(0, 1200),
      price_cents: enCentimes(p.price),
      compare_at_cents: null,
      currency: devise,
      sizes: normaliserTailles(
        options.map((o) => ({ label: o.name ?? "", available: !o.sold_out }))
      ),
      size_label: "Taille",
      images: p.images?.map((i) => i.secure_url ?? i.url ?? "").filter(Boolean).slice(0, 8) ?? [],
      shop_url: chemin.startsWith("http") ? chemin : `${base}${chemin}`,
      available: p.status !== "sold-out",
    };
  });
}

/* ---------------- 4. Données structurées ---------------- */

type LdProduit = {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string }[];
  url?: string;
  sku?: string;
  offers?:
    | {
        price?: string | number;
        priceCurrency?: string;
        availability?: string;
      }
    | {
        price?: string | number;
        priceCurrency?: string;
        availability?: string;
      }[];
};

function estProduit(n: LdProduit): boolean {
  const t = n["@type"];
  return Array.isArray(t) ? t.includes("Product") : t === "Product";
}

/** Aplatit @graph, tableaux et objets imbriqués en une liste de nœuds. */
function aplatir(valeur: unknown, sortie: LdProduit[] = []): LdProduit[] {
  if (!valeur || typeof valeur !== "object") return sortie;
  if (Array.isArray(valeur)) {
    valeur.forEach((v) => aplatir(v, sortie));
    return sortie;
  }
  const noeud = valeur as Record<string, unknown> & LdProduit;
  if (estProduit(noeud)) sortie.push(noeud);
  if (noeud["@graph"]) aplatir(noeud["@graph"], sortie);
  if (Array.isArray((noeud as { itemListElement?: unknown }).itemListElement)) {
    aplatir((noeud as { itemListElement: unknown }).itemListElement, sortie);
  }
  if ((noeud as { item?: unknown }).item) aplatir((noeud as { item: unknown }).item, sortie);
  return sortie;
}

async function viaDonneesStructurees(url: string): Promise<CatalogueItem[] | null> {
  const r = await lire(url, "text/html");
  if (!r) return null;

  const html = await r.text();
  const blocs = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  if (blocs.length === 0) return null;

  const produits: LdProduit[] = [];
  for (const bloc of blocs) {
    try {
      aplatir(JSON.parse(bloc[1].trim()), produits);
    } catch {
      // un bloc mal formé ne doit pas faire échouer les autres
    }
  }
  if (produits.length === 0) return null;

  const base = normalizeShopUrl(url) ?? "";

  return produits.map((p, i) => {
    const offre = Array.isArray(p.offers) ? p.offers[0] : p.offers;
    const images = (Array.isArray(p.image) ? p.image : p.image ? [p.image] : [])
      .map((im) => (typeof im === "string" ? im : im?.url ?? ""))
      .filter(Boolean)
      .slice(0, 8);

    const dispo = String(offre?.availability ?? "").toLowerCase();

    return {
      source_id: identifiant(p.sku, p.url, `${url}#${slugify(p.name ?? "piece")}-${i}`),
      slug: slugify(p.name ?? `piece-${i}`),
      name: p.name ?? "Sans nom",
      description: stripHtml(p.description ?? "").slice(0, 1200),
      price_cents: enCentimes(offre?.price),
      compare_at_cents: null,
      currency: offre?.priceCurrency || "EUR",
      sizes: [],
      size_label: "Taille",
      images,
      shop_url: p.url?.startsWith("http") ? p.url : p.url ? `${base}${p.url}` : url,
      available: !dispo.includes("outofstock") && !dispo.includes("soldout"),
    };
  });
}

/* ---------------- 5. Plan du site ----------------
   Pour les boutiques faites main, dont le catalogue est construit par
   JavaScript et n'existe donc pas dans le HTML de la page d'accueil.

   Le plan du site, lui, est un fichier statique : il liste toutes les
   adresses du site, fiches produit comprises. On le lit, on va
   chercher chaque page, et on y récupère les balises que la boutique
   publie pour Google et pour le partage — ce qu'aucun site marchand
   n'omet, sous peine de voir ses liens s'afficher nus sur Instagram.
   ------------------------------------------------------------------ */

const PAGES_MAX = 28;
const PAR_VAGUE = 5;

/** Adresses qui ne sont manifestement pas des fiches produit. */
const HORS_SUJET =
  /\/(panier|cart|checkout|compte|account|login|connexion|inscription|cgv|cgu|mentions|legal|privacy|confidentialite|contact|faq|blog|actualites?|news|search|recherche|tag|categorie|category|collection|page\/\d+)(\/|$|\?)/i;

function balise(html: string, propriete: string): string | null {
  const motifs = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${propriete}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propriete}["']`, "i"),
  ];
  for (const motif of motifs) {
    const trouve = html.match(motif);
    if (trouve?.[1]) return trouve[1].trim();
  }
  return null;
}

/** Lit une page produit : JSON-LD d'abord, balises de partage ensuite. */
async function lirePage(url: string): Promise<CatalogueItem | null> {
  const r = await lire(url, "text/html");
  if (!r) return null;
  const html = await r.text();

  // 1. Données structurées, les plus riches.
  const blocs = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const produits: LdProduit[] = [];
  for (const bloc of blocs) {
    try {
      aplatir(JSON.parse(bloc[1].trim()), produits);
    } catch {
      // bloc mal formé : on passe au suivant
    }
  }

  if (produits.length > 0) {
    const p = produits[0];
    const offre = Array.isArray(p.offers) ? p.offers[0] : p.offers;
    const images = (Array.isArray(p.image) ? p.image : p.image ? [p.image] : [])
      .map((im) => (typeof im === "string" ? im : im?.url ?? ""))
      .filter(Boolean)
      .slice(0, 8);
    const dispo = String(offre?.availability ?? "").toLowerCase();

    return {
      source_id: identifiant(p.sku, url),
      slug: slugify(p.name ?? url),
      name: p.name ?? "Sans nom",
      description: stripHtml(p.description ?? "").slice(0, 1200),
      price_cents: enCentimes(offre?.price),
      compare_at_cents: null,
      currency: offre?.priceCurrency || "EUR",
      sizes: [],
      size_label: "Taille",
      images,
      shop_url: url,
      available: !dispo.includes("outofstock") && !dispo.includes("soldout"),
    };
  }

  // 2. Balises de partage. On exige un prix : sans lui, impossible de
  //    distinguer une fiche produit d'une page « à propos ».
  const prix =
    balise(html, "product:price:amount") ??
    balise(html, "og:price:amount") ??
    balise(html, "twitter:data1");
  const centimes = enCentimes(prix);
  if (centimes === null) return null;

  const titre = balise(html, "og:title") ?? html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null;
  if (!titre) return null;

  const image = balise(html, "og:image");
  const dispo = (balise(html, "product:availability") ?? "").toLowerCase();

  return {
    source_id: url,
    slug: slugify(titre),
    name: titre.trim(),
    description: stripHtml(balise(html, "og:description") ?? balise(html, "description") ?? "").slice(0, 1200),
    price_cents: centimes,
    compare_at_cents: null,
    currency: balise(html, "product:price:currency") ?? "EUR",
    sizes: [],
    size_label: "Taille",
    images: image ? [image] : [],
    shop_url: balise(html, "og:url") ?? url,
    available: !dispo.includes("out") && !dispo.includes("oos"),
  };
}

async function adressesDuPlan(base: string): Promise<string[]> {
  const candidats = [
    `${base}/sitemap.xml`,
    `${base}/sitemap_index.xml`,
    `${base}/sitemap-index.xml`,
    `${base}/wp-sitemap.xml`,
  ];

  for (const candidat of candidats) {
    const r = await lire(candidat, "application/xml,text/xml");
    if (!r) continue;

    const xml = await r.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    if (locs.length === 0) continue;

    // Un index de plans : on descend d'un niveau, pas plus.
    if (/<sitemapindex/i.test(xml)) {
      const enfants: string[] = [];
      for (const sousPlan of locs.slice(0, 4)) {
        const rr = await lire(sousPlan, "application/xml,text/xml");
        if (!rr) continue;
        const sousXml = await rr.text();
        enfants.push(...[...sousXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]));
      }
      if (enfants.length > 0) return enfants;
      continue;
    }

    return locs;
  }

  return [];
}

async function viaPlanDuSite(base: string): Promise<CatalogueItem[] | null> {
  const toutes = await adressesDuPlan(base);
  if (toutes.length === 0) return null;

  const candidates = toutes
    .filter((u) => memeSite(u, base))
    .filter((u) => {
      const chemin = new URL(u).pathname;
      return chemin.length > 1 && !HORS_SUJET.test(chemin);
    })
    // Les fiches produit sont presque toujours plus profondes que les
    // pages d'accueil de rubrique : on les remonte en premier.
    .sort((a, b) => new URL(b).pathname.split("/").length - new URL(a).pathname.split("/").length)
    .slice(0, PAGES_MAX);

  if (candidates.length === 0) return null;

  const items: CatalogueItem[] = [];
  for (let i = 0; i < candidates.length; i += PAR_VAGUE) {
    // Par petites vagues : trente requêtes simultanées ressemblent à
    // une attaque, et beaucoup d'hébergeurs les bloquent.
    const vague = await Promise.all(candidates.slice(i, i + PAR_VAGUE).map(lirePage));
    items.push(...vague.filter((x): x is CatalogueItem => x !== null));
  }

  return items.length > 0 ? items : null;
}

/* ---------------- orchestration ---------------- */

/**
 * Le site renvoie-t-il la même page pour toutes les adresses ?
 *
 * C'est la signature d'une boutique entièrement construite par
 * JavaScript dans le navigateur : le serveur n'envoie qu'une coquille,
 * identique partout. Rien à lire côté serveur, ni pour nous ni pour
 * un moteur de recherche.
 *
 * On le vérifie en comparant l'accueil à une adresse qui n'existe
 * certainement pas. Si les deux répondent la même chose, le doute
 * n'est plus permis.
 */
async function estUneCoquilleVide(base: string): Promise<boolean> {
  const [accueil, inexistante] = await Promise.all([
    lire(base, "text/html"),
    lire(`${base}/__newave_verification__${Date.now()}`, "text/html"),
  ]);
  if (!accueil || !inexistante) return false;

  const titre = (html: string) => html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const [a, b] = await Promise.all([accueil.text(), inexistante.text()]);

  // Même titre sur une page qui n'existe pas, et aucune donnée
  // structurée nulle part : la coquille est confirmée.
  return titre(a) === titre(b) && titre(a) !== "" && !/application\/ld\+json/i.test(b);
}

export async function fetchCatalogue(entree: string): Promise<Resultat> {
  const base = normalizeShopUrl(entree);
  if (!base) return { ok: false, error: "Cette adresse n'est pas valide." };

  const brut = entree.trim();
  const adressePrecise = brut.startsWith("http") && new URL(brut).pathname.length > 1;

  const tentatives: [Source, () => Promise<CatalogueItem[] | null>][] = [
    ["shopify", () => viaShopify(base)],
    ["woocommerce", () => viaWooCommerce(base)],
    ["bigcartel", () => viaBigCartel(base)],
    // En dernier : la page fournie telle quelle, puis l'accueil.
    ["donnees-structurees", () => viaDonneesStructurees(adressePrecise ? brut : base)],
    // En dernier recours, le plus lent : on parcourt le plan du site.
    ["plan-du-site", () => viaPlanDuSite(base)],
  ];

  for (const [source, methode] of tentatives) {
    const items = await methode();
    if (items && items.length > 0) return { ok: true, source, items };
  }

  // Aucune méthode n'a abouti : on cherche pourquoi, pour dire quelque
  // chose d'utile plutôt qu'un « rien trouvé » qui laisse démuni.

  // La boutique fermée passe en premier : c'est la seule cause qui ne
  // soit pas un défaut, ni du site, ni du nôtre.
  if (await boutiqueVerrouillee(base)) {
    return {
      ok: false,
      verrouillee: true,
      error:
        "Cette boutique est fermée pour le moment — mot de passe ou drop en préparation. " +
        "Rien à corriger : ses pièces réapparaîtront d'elles-mêmes à la réouverture.",
    };
  }

  if (await estUneCoquilleVide(base)) {
    return {
      ok: false,
      error:
        "Cette boutique construit ses pages dans le navigateur : son serveur renvoie la même coquille vide pour toutes les adresses, sans nom de pièce ni prix. Rien n'est lisible depuis l'extérieur, et même Google ne voit que la page d'accueil. Demande à la marque un export de son catalogue, ou saisis les pièces à la main.",
    };
  }

  return {
    ok: false,
    error:
      "Rien n'a pu être lu à cette adresse. Essaie le lien direct d'une page produit. Sinon la saisie à la main reste le plus sûr.",
  };
}


/* ============================================================
   IDENTITÉ D'UNE MARQUE

   Avant même de parler de pièces : lire le nom, la description, le
   logo et les réseaux depuis la page d'accueil. Ce sont les mêmes
   balises qui alimentent l'aperçu quand on partage un lien — donc
   présentes sur la quasi-totalité des sites, y compris ceux qui n'ont
   aucun catalogue lisible.
   ============================================================ */

export type Identite = {
  name: string | null;
  description: string | null;
  logo: string | null;
  cover: string | null;
  instagram: string | null;
  shop_url: string;
  city: string | null;
  country: string | null;
  founded_year: number | null;
  categories: string[];
  price_tier: "accessible" | "intermediaire" | "premium" | null;
  /** Ce qui a servi à deviner, pour pouvoir le dire honnêtement. */
  indices: { pieces: number; prixMedian: number | null };
};

/* ---------- déductions ----------
   Ces champs ne se lisent nulle part : on les infère. D'où deux règles
   que je me suis données — ne proposer que ce qui repose sur un signe
   franc, et ne jamais présenter le résultat comme une certitude. */

/** Mots qui trahissent une catégorie, dans le texte du site ou les noms de pièces. */
const INDICES_CATEGORIES: [string, RegExp][] = [
  ["Denim", /\b(denim|jean|jeans)\b/i],
  ["Maille", /\b(maille|knit|tricot|pull|laine|cachemire|mohair)\b/i],
  ["Bijoux", /\b(bijou|bijoux|collier|bague|boucle|argent 925|silver|jewel)\b/i],
  ["Chaussures", /\b(chaussure|sneaker|basket|botte|derbies?)\b/i],
  ["Accessoires", /\b(accessoire|casquette|bob|ceinture|sac|tote|bonnet|\u00e9charpe)\b/i],
  ["Upcycling", /\b(upcycl\w*|recycl\w*|deadstock|seconde main|r\u00e9emploi|surplus)\b/i],
  ["Sur-mesure", /\b(sur[- ]mesure|made to measure|bespoke)\b/i],
  ["Tailoring", /\b(tailoring|tailleur|costume|blazer|veston)\b/i],
  ["Workwear", /\b(workwear|chore|utilitaire|bleu de travail)\b/i],
  ["Techwear", /\b(techwear|imperm\u00e9able|gore[- ]?tex|coupe[- ]vent)\b/i],
  ["Sportswear", /\b(sportswear|running|jogging|training)\b/i],
  ["Streetwear", /\b(streetwear|hoodie|sweat|oversize|skate)\b/i],
  ["Minimalisme", /\b(minimalis\w*|\u00e9pur\w*|essentiel|sobre|intemporel)\b/i],
  ["Vintage", /\b(vintage|archive|friperie)\b/i],
];

function deduireCategories(texte: string): string[] {
  return INDICES_CATEGORIES.filter(([, motif]) => motif.test(texte))
    .map(([nom]) => nom)
    // Au-delà de quatre, on coche tout et plus rien ne veut rien dire.
    .slice(0, 4);
}

/**
 * Gamme de prix, à partir de la MÉDIANE du catalogue.
 *
 * La médiane, pas la moyenne : une marque qui vend cinquante
 * t-shirts à 25 € et un manteau à 600 € n'est pas une marque premium,
 * et la moyenne le prétendrait.
 */
function deduireGamme(centimes: number[]): Identite["price_tier"] {
  if (centimes.length < 2) return null;
  const tries = [...centimes].sort((a, b) => a - b);
  const mediane = tries[Math.floor(tries.length / 2)] / 100;
  if (mediane < 60) return "accessible";
  if (mediane <= 160) return "intermediaire";
  return "premium";
}

/** "depuis 2019", "fondée en 2021", "since 2018"… */
function deduireAnnee(texte: string): number | null {
  const trouve = texte.match(
    /\b(?:depuis|fond\u00e9e? en|cr\u00e9\u00e9e? en|n\u00e9e? en|since|est\. ?|established)\s*(19[89]\d|20[0-4]\d)\b/i
  );
  const annee = trouve ? Number(trouve[1]) : null;
  if (!annee) return null;
  const actuelle = new Date().getFullYear();
  return annee >= 1980 && annee <= actuelle ? annee : null;
}

/** Retire le slogan qui suit souvent le nom dans une balise titre. */
function nomPropre(titre: string): string {
  return titre
    .split(/\s+[|\u2013\u2014-]\s+/)[0]
    .replace(/\s*[-–—|]\s*(boutique|shop|store|officiel|official site).*$/i, "")
    .trim()
    .slice(0, 80);
}

/** Rend absolue une adresse relative trouvée dans le HTML. */
function absolue(url: string, base: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

export async function fetchIdentite(entree: string): Promise<Identite | null> {
  const base = normalizeShopUrl(entree);
  if (!base) return null;

  const r = await lire(base, "text/html");
  if (!r) return null;
  const html = await r.text();

  // 1. Données structurées : le plus fiable quand elles existent.
  let ldNom: string | null = null;
  let ldLogo: string | null = null;
  let ldDescription: string | null = null;
  let ldInstagram: string | null = null;
  let ldVille: string | null = null;
  let ldPays: string | null = null;
  let ldAnnee: number | null = null;
  let ldTexteBrut = "";

  for (const bloc of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const noeuds: unknown[] = [];
      const pousser = (v: unknown) => {
        if (!v || typeof v !== "object") return;
        if (Array.isArray(v)) return v.forEach(pousser);
        noeuds.push(v);
        const g = (v as { "@graph"?: unknown })["@graph"];
        if (g) pousser(g);
      };
      pousser(JSON.parse(bloc[1].trim()));

      for (const brut of noeuds) {
        const n = brut as {
          "@type"?: string | string[];
          name?: string;
          description?: string;
          logo?: string | { url?: string };
          sameAs?: string[] | string;
          foundingDate?: string;
          address?: { addressLocality?: string; addressCountry?: string | { name?: string } };
          slogan?: string;
        };
        const types = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
        if (!types.some((t) => t === "Organization" || t === "WebSite" || t === "Store" || t === "OnlineStore")) {
          continue;
        }
        ldNom ??= n.name ?? null;
        ldDescription ??= n.description ?? null;
        ldLogo ??= typeof n.logo === "string" ? n.logo : (n.logo?.url ?? null);
        const liens = Array.isArray(n.sameAs) ? n.sameAs : n.sameAs ? [n.sameAs] : [];
        ldInstagram ??= liens.find((l) => /instagram\.com/i.test(l)) ?? null;

        ldVille ??= n.address?.addressLocality ?? null;
        const pays = n.address?.addressCountry;
        ldPays ??= (typeof pays === "string" ? pays : pays?.name) ?? null;

        const annee = Number(String(n.foundingDate ?? "").slice(0, 4));
        if (!ldAnnee && annee >= 1980 && annee <= new Date().getFullYear()) ldAnnee = annee;

        ldTexteBrut += ` ${n.slogan ?? ""} ${n.description ?? ""}`;
      }
    } catch {
      // bloc mal formé : on passe
    }
  }

  // 2. Balises de partage, présentes presque partout.
  const ogNom = balise(html, "og:site_name") ?? balise(html, "og:title");
  const titreBrut = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";

  // 3. Logo : on prend la plus grande icône disponible, faute de mieux.
  const icones = [
    ...html.matchAll(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/gi),
  ]
    .map((m) => m[0])
    .map((balise) => ({
      href: balise.match(/href=["']([^"']+)["']/i)?.[1] ?? "",
      taille: Number(balise.match(/sizes=["'](\d+)/i)?.[1] ?? 0),
      apple: /apple-touch-icon/i.test(balise),
    }))
    .filter((i) => i.href)
    // Les icônes Apple font 180 px, souvent la meilleure version carrée.
    .sort((a, b) => Number(b.apple) - Number(a.apple) || b.taille - a.taille);

  // 4. Instagram : le premier lien du site qui y mène.
  const instaHtml = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? null;
  const instaLd = ldInstagram?.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? null;

  const nom = ldNom ?? ogNom ?? (titreBrut ? nomPropre(titreBrut) : null);

  const description =
    stripHtml(ldDescription ?? balise(html, "og:description") ?? balise(html, "description") ?? "")
      .slice(0, 900) || null;

  // Le catalogue sert aux déductions. On se limite aux méthodes
  // rapides : parcourir un plan de site prendrait dix secondes de plus
  // pour un champ qu'on ne fait que suggérer.
  let pieces: CatalogueItem[] = [];
  for (const methode of [viaShopify, viaWooCommerce, viaBigCartel]) {
    const trouve = await methode(base);
    if (trouve && trouve.length > 0) {
      pieces = trouve;
      break;
    }
  }

  const prix = pieces.map((p) => p.price_cents).filter((n): n is number => n !== null);

  // Le texte du site, plus les noms des pièces : ensemble ils décrivent
  // mieux la marque que l'un ou l'autre séparément.
  const corpus = [
    nom ?? "",
    description ?? "",
    ldTexteBrut,
    ...pieces.map((p) => `${p.name} ${p.description.slice(0, 200)}`),
  ].join(" ");

  return {
    name: nom ? nomPropre(nom) : null,
    description,
    logo: absolue(ldLogo ?? icones[0]?.href ?? "", base),
    cover: absolue(balise(html, "og:image") ?? "", base),
    instagram: (instaLd ?? instaHtml)?.replace(/\/$/, "") ?? null,
    shop_url: base,
    city: ldVille,
    country: await deduireLePays(base, ldPays),
    founded_year: ldAnnee ?? deduireAnnee(corpus),
    categories: deduireCategories(corpus),
    price_tier: deduireGamme(prix),
    indices: {
      pieces: pieces.length,
      prixMedian: prix.length > 1 ? [...prix].sort((a, b) => a - b)[Math.floor(prix.length / 2)] : null,
    },
  };
}
