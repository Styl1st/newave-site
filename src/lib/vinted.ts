import type { CatalogueItem, Resultat } from "./catalogue-commun";

/**
 * Lire le profil Vinted d'un créateur.
 *
 * POURQUOI C'EST UN FICHIER À PART. Un profil Vinted n'est pas une
 * boutique : il n'y a ni flux produits, ni plan du site, ni données
 * structurées. Rien de ce que `catalogue.ts` sait faire ne s'applique.
 * En revanche la page est rendue par le serveur de Vinted, donc
 * lisible telle quelle — c'est ce qui rend l'import possible.
 *
 * L'API interne (`/api/v2/users/…/items`) est fermée : elle réclame un
 * jeton de session et répond vide sans lui. On lit donc le HTML public,
 * exactement ce que verrait un visiteur.
 *
 * CE CODE VA CASSER UN JOUR. Vinted refait sa page quand il veut, et
 * aucune de ces formes n'est un contrat. D'où deux précautions qui ne
 * sont pas du zèle : plusieurs façons de lire, essayées dans l'ordre,
 * et un compte rendu qui DIT laquelle a servi. Le jour où la lecture
 * revient vide, on saura si c'est la page qui a changé ou le profil
 * qui est vide, au lieu de chercher à l'aveugle.
 *
 * On reste discret : trois pages au maximum, une requête chacune, et
 * seulement quand quelqu'un le demande. Aucun parcours automatique.
 */

const EN_TETES = {
  "User-Agent": "NewaveSphere/1.0 (+https://newavesphere.fr)",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.4",
};

/** Trois pages, soit une centaine de pièces. Au-delà on insiste trop. */
const PAGES_MAX = 3;

/**
 * La monnaie, d'après le domaine.
 *
 * Vinted tient un site par pays et n'affiche jamais deux monnaies sur
 * la même page. Le domaine est donc plus fiable que n'importe quelle
 * lecture du symbole, d'autant que « 25,00 € » et « 25,00 zł »
 * s'écrivent pareil à la virgule près.
 */
const MONNAIES: Record<string, string> = {
  fr: "EUR",
  be: "EUR",
  es: "EUR",
  it: "EUR",
  de: "EUR",
  at: "EUR",
  nl: "EUR",
  pt: "EUR",
  fi: "EUR",
  gr: "EUR",
  ie: "EUR",
  lu: "EUR",
  sk: "EUR",
  lt: "EUR",
  lv: "EUR",
  ee: "EUR",
  si: "EUR",
  hr: "EUR",
  pl: "PLN",
  cz: "CZK",
  se: "SEK",
  dk: "DKK",
  hu: "HUF",
  ro: "RON",
  uk: "GBP",
  com: "USD",
};

/** L'identifiant du membre, s'il s'agit bien d'un profil Vinted. */
export function membreVinted(url: string | null | undefined): {
  hote: string;
  id: string;
  devise: string;
} | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!/(^|\.)vinted\.[a-z.]+$/i.test(u.hostname)) return null;

    // `/member/12345678-pseudo`, `/member/12345678`, et la même chose
    // précédée d'un code de langue.
    const trouve = u.pathname.match(/\/(?:member|members|users)\/(\d+)/i);
    if (!trouve) return null;

    // `vinted.co.uk` a deux morceaux après le nom : on prend celui qui
    // désigne le pays, pas le `co`.
    const morceaux = u.hostname.toLowerCase().split(".");
    const dernier = morceaux[morceaux.length - 1];
    const pays = dernier === "uk" ? "uk" : dernier;

    return { hote: u.origin, id: trouve[1], devise: MONNAIES[pays] ?? "EUR" };
  } catch {
    return null;
  }
}

/** Est-ce une adresse que ce module sait lire ? */
export function estUnProfilVinted(url: string | null | undefined): boolean {
  return membreVinted(url) !== null;
}

async function lire(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { Accept: "text/html", ...EN_TETES },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/** Décode les entités qu'on croise dans un attribut HTML. */
function detexte(v: string): string {
  return v
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * « 25,00 » ou « 1 234,00 » ou « 25.00 » en centimes.
 *
 * Le séparateur décimal change d'un pays à l'autre et le séparateur
 * de milliers aussi : on ne se fie donc qu'à la POSITION du dernier
 * séparateur, en admettant qu'il précède deux décimales.
 */
function centimes(brut: string): number | null {
  const propre = brut.replace(/[\s  ]/g, "");
  const trouve = propre.match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (!trouve) return null;
  const entiers = Number(trouve[1]);
  const decimales = trouve[2] ? Number(trouve[2].padEnd(2, "0")) : 0;
  if (!Number.isFinite(entiers)) return null;
  return entiers * 100 + decimales;
}

/** Le premier prix d'un bloc, celui de la pièce et non des frais. */
function premierPrix(bloc: string): number | null {
  /*
   * Vinted affiche DEUX prix par vignette : celui du vendeur, puis le
   * même augmenté de la protection acheteur. Le premier est celui qui
   * nous intéresse — c'est celui que la personne a fixé — et il est
   * toujours le plus petit, ce qui donne une seconde façon de vérifier.
   */
  const prix = [...bloc.matchAll(/(\d[\d\s  ]*(?:[.,]\d{1,2})?)\s*(?:€|£|zł|Kč|kr|Ft|lei)/gi)]
    .map((m) => centimes(m[1]))
    .filter((c): c is number => c !== null && c > 0);

  if (prix.length === 0) return null;
  return Math.min(...prix.slice(0, 2));
}

/**
 * Ce que Vinted met dans l'attribut `title` d'une vignette.
 *
 * La forme observée : « Nom de l'article, marque: X, taille: M, état:
 * Très bon état, 25,00 €, 26,95 € frais de protection inclus ». C'est
 * une bénédiction : tout ce dont on a besoin, en clair, dans un seul
 * attribut prévu pour les lecteurs d'écran — donc bien plus stable que
 * les noms de classes, qui changent à chaque refonte.
 */
function depuisLeTitre(titre: string): { nom: string; taille: string; etat: string; marque: string } {
  const morceaux = titre.split(",").map((m) => m.trim());
  const champ = (cle: RegExp) => {
    const trouve = morceaux.find((m) => cle.test(m));
    return trouve ? trouve.replace(cle, "").trim() : "";
  };

  return {
    nom: morceaux[0] ?? "",
    marque: champ(/^(?:marque|brand|marka|märke)\s*:\s*/i),
    taille: champ(/^(?:taille|size|rozmiar|größe|talla|taglia)\s*:\s*/i),
    etat: champ(/^(?:état|etat|condition|stan|zustand|estado|condizioni)\s*:\s*/i),
  };
}

type Brut = { id: string; bloc: string };

/**
 * Découper la page en une vignette par pièce.
 *
 * Deux façons, de la plus solide à la plus approximative. La première
 * s'appuie sur `data-testid`, que Vinted pose pour ses propres tests
 * automatiques : c'est ce qu'il y a de plus stable dans une page web,
 * puisque le casser casse aussi leur chaîne de production.
 */
function decouper(html: string): { vignettes: Brut[]; methode: string } {
  const parTestid = [...html.matchAll(/data-testid="product-item-id-(\d+)"/gi)];

  if (parTestid.length > 0) {
    const vignettes: Brut[] = parTestid.map((m, i) => {
      const debut = m.index ?? 0;
      const fin = i + 1 < parTestid.length ? (parTestid[i + 1].index ?? html.length) : html.length;
      return { id: m[1], bloc: html.slice(debut, fin) };
    });
    return { vignettes, methode: "les vignettes marquées par Vinted" };
  }

  /*
   * Sinon, les liens vers les articles.
   *
   * ATTENTION AU SENS DE LECTURE, et c'est là que la première version
   * se trompait. La photo d'une pièce est écrite AVANT son lien, si
   * bien qu'en remontant en arrière depuis le lien pour l'attraper, on
   * repassait sur la pièce précédente et on lui volait son titre, son
   * prix et sa photo. Deux pièces d'affilée sortaient identiques.
   *
   * Le découpage correct va donc de la FIN du lien précédent à la fin
   * du lien courant : c'est exactement l'espace qu'occupe une vignette,
   * photo comprise, sans jamais mordre sur sa voisine.
   */
  const vus = new Map<string, { debut: number; fin: number }>();
  for (const m of html.matchAll(/\/items\/(\d+)(?:-[^"'\s]*)?/gi)) {
    if (vus.has(m[1])) continue;
    const debut = m.index ?? 0;
    vus.set(m[1], { debut, fin: debut + m[0].length });
  }
  if (vus.size === 0) return { vignettes: [], methode: "" };

  const rangs = [...vus.entries()].sort((a, b) => a[1].debut - b[1].debut);
  const vignettes: Brut[] = rangs.map(([id, place], i) => {
    const depart = i === 0 ? 0 : rangs[i - 1][1].fin;
    // Un peu au-delà du lien : le prix est souvent écrit juste après.
    const arrivee = Math.min(place.fin + 900, html.length);
    return { id, bloc: html.slice(depart, arrivee) };
  });

  return { vignettes, methode: "les liens vers les articles" };
}

function enPiece(brut: Brut, hote: string, devise: string): CatalogueItem | null {
  /*
   * On repart de la BALISE de lien de cette pièce, retrouvée par son
   * identifiant, plutôt que du premier `title=` venu dans le bloc.
   * Une vignette contient plusieurs attributs `title` — celui du
   * vendeur, celui d'un bouton de favori — et prendre le premier
   * donnait un nom d'article qui n'en était pas un.
   */
  const balise =
    brut.bloc.match(new RegExp(`<a[^>]*/items/${brut.id}[^>]*>`, "i"))?.[0] ?? "";

  const lienBrut = balise.match(/href="([^"]+)"/i)?.[1] ?? `/items/${brut.id}`;
  const titre = detexte(balise.match(/title="([^"]{6,})"/i)?.[1] ?? "");
  const { nom, taille, etat, marque } = depuisLeTitre(titre);

  // Le nom, dans l'ordre de ce qui est le moins susceptible d'être un
  // libellé d'interface : le titre annoncé, puis le texte alternatif de
  // la photo, puis la marque à défaut de mieux.
  const alt = detexte(brut.bloc.match(/alt="([^"]{3,})"/i)?.[1] ?? "");
  const propre = (nom || alt || marque).slice(0, 140);
  if (!propre) return null;

  const prix = premierPrix(brut.bloc);

  const images = [...brut.bloc.matchAll(/src="(https:\/\/images\d*\.vinted\.net\/[^"]+)"/gi)]
    .map((m) => detexte(m[1]))
    // Vinted sert plusieurs tailles de la même photo : deux adresses
    // identiques dans la liste feraient deux fois la même vignette.
    .filter((v, i, tout) => tout.indexOf(v) === i)
    .slice(0, 4);

  const lien = lienBrut.startsWith("http") ? lienBrut : `${hote}${lienBrut}`;

  const details = [marque, etat].filter(Boolean).join(" · ");

  return {
    source_id: `vinted-${brut.id}`,
    slug: "",
    name: propre,
    description: details,
    price_cents: prix,
    compare_at_cents: null,
    currency: devise,
    /*
     * Une pièce, une taille, un exemplaire. Ce n'est pas une
     * simplification : sur Vinted, chaque annonce EST un vêtement
     * unique, et présenter un sélecteur de tailles laisserait croire
     * le contraire.
     */
    sizes: taille ? [{ label: taille, available: true }] : [],
    size_label: taille,
    images,
    shop_url: lien.split("?")[0],
    available: true,
  };
}

/**
 * Les pièces d'une page de profil, à partir de son HTML.
 *
 * Séparé de la requête exprès : c'est la partie fragile, celle qui
 * dépend de la forme des pages de Vinted, et donc la seule qu'on ait
 * besoin d'éprouver sur un exemple sans aller sur le réseau.
 */
export function piecesDeLaPage(
  html: string,
  hote: string,
  devise: string
): { items: CatalogueItem[]; methode: string } {
  const decoupe = decouper(html);
  const items = decoupe.vignettes
    .map((v) => enPiece(v, hote, devise))
    .filter((p): p is CatalogueItem => p !== null);
  return { items, methode: decoupe.methode };
}

/** Le catalogue d'un profil Vinted, rangé comme celui d'une boutique. */
export async function lireLeProfilVinted(url: string): Promise<Resultat> {
  const membre = membreVinted(url);
  if (!membre) {
    return { ok: false, error: "Cette adresse n'est pas un profil Vinted." };
  }

  const items: CatalogueItem[] = [];
  const connus = new Set<string>();
  let methode = "";
  let repondu = false;

  for (let page = 1; page <= PAGES_MAX; page++) {
    const html = await lire(`${membre.hote}/member/${membre.id}?page=${page}`);
    if (!html) break;
    repondu = true;

    const decoupe = decouper(html);
    if (decoupe.vignettes.length === 0) break;
    if (!methode) methode = decoupe.methode;

    const avant = items.length;
    for (const vignette of decoupe.vignettes) {
      if (connus.has(vignette.id)) continue;
      connus.add(vignette.id);
      const piece = enPiece(vignette, membre.hote, membre.devise);
      if (piece) items.push(piece);
    }

    // Vinted renvoie la première page quand on demande une page qui
    // n'existe pas : sans ce garde-fou, on tournerait en rond.
    if (items.length === avant) break;
  }

  if (!repondu) {
    return {
      ok: false,
      error:
        "Vinted n'a pas répondu. C'est souvent temporaire : réessaie dans quelques minutes.",
    };
  }

  if (items.length === 0) {
    return {
      ok: false,
      error:
        "Le profil répond, mais aucune pièce n'a pu en être tirée. Soit il est vide, " +
        "soit Vinted a changé la forme de ses pages et il faut revoir la lecture.",
    };
  }

  return { ok: true, source: "vinted", items };
}

/** Ce qui a permis de lire, à écrire dans le compte rendu. */
export function methodeLisible(nombre: number): string {
  return `${nombre} pièce${nombre > 1 ? "s" : ""} lue${nombre > 1 ? "s" : ""} sur Vinted.`;
}
