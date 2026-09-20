import { unstable_cache } from "next/cache";
import { createClient } from "./supabase/server";
import { parTranches } from "./stats";
import { createPublicClient } from "./supabase/public";
import { DEMO_BRANDS, DEMO_POSTS, DEMO_PRODUCTS } from "./demo-data";
import { PRODUCT_CATEGORIES } from "./taxonomy";
import type { Brand, Post, Product, Recherche } from "./types";

/**
 * Chaque fonction interroge Supabase et retombe sur les donnees de
 * demonstration si la base n'est pas configuree. Le site ne tombe
 * donc jamais en panne blanche pendant que tu travailles le design.
 */

const BRAND_REF = "brand:brands(id,slug,name)";

/**
 * Une requete qui echoue ne doit pas se transformer en "il n'y a rien".
 * On retombe sur une liste vide pour ne pas casser la page, mais on
 * ecrit la raison dans la console du serveur.
 */
function report(where: string, error: { message: string } | null) {
  if (!error) return;

  /*
   * Certaines erreurs ne viennent pas du site et se cherchent
   * longtemps si le message reste brut.
   *
   * « JWT issued at future » en est le meilleur exemple : le jeton de
   * session porte une date d'émission postérieure à l'heure du serveur
   * qui le vérifie. Rien dans le code ne peut produire cela — c'est
   * l'horloge de la machine qui est désynchronisée. On le dit, plutôt
   * que de laisser chercher dans les requêtes.
   */
  if (/issued at future|iat|clock skew/i.test(error.message)) {
    console.error(
      `[newave] ${where} : ${error.message}\n` +
        "         → L'horloge de cette machine est décalée par rapport à celle de Supabase.\n" +
        "         → Windows : Paramètres › Heure et langue › Synchroniser maintenant.\n" +
        "         → Puis déconnecte-toi et reconnecte-toi pour obtenir un jeton propre."
    );
    return;
  }

  console.error(`[newave] ${where} : ${error.message}`);
}

/* ---------------- marques ---------------- */

/**
 * L'annuaire, avec une minute de mémoire.
 *
 * La page reste rendue à la demande, et il le faut : elle affiche les
 * favoris de la personne connectée, donc la mettre en cache reviendrait
 * à servir les favoris de quelqu'un d'autre. C'est la REQUÊTE qu'on
 * garde, pas la page.
 *
 * Le gain est réel : la liste des marques est identique pour tout le
 * monde et ne change que quand tu publies quelque chose. Sans ce cache,
 * chaque visite rouvrait la même interrogation de la base. Avec, la
 * première la paie et les suivantes sont servies aussitôt.
 *
 * Une minute, parce qu'une marque publiée doit apparaître vite. Le
 * cache est de toute façon vidé à chaque publication, par les appels à
 * revalidatePath("/marques") des actions d'administration.
 *
 * ATTENTION au client utilisé ici, c'est le client PUBLIC et non le
 * client habituel. Ce dernier lit les cookies de la requête, ce que
 * Next.js interdit à l'intérieur d'un cache — et à juste titre : un
 * résultat calculé pour quelqu'un finirait resservi à tout le monde.
 * L'oubli faisait tomber l'accueil et l'annuaire sur la page d'erreur.
 */
const lireLAnnuaire = unstable_cache(
  async (): Promise<Brand[] | null> => {
    const supabase = createPublicClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false });

    report("annuaire des marques", error);
    if (error || !data) return null;
    return data as Brand[];
  },
  ["annuaire-marques"],
  { revalidate: 60, tags: ["marques"] }
);

export async function getBrands(): Promise<Brand[]> {
  return (await lireLAnnuaire()) ?? DEMO_BRANDS;
}

/**
 * Les quatre catégories les mieux fournies, pour « en ce moment ».
 *
 * LE POP-UP DE LA BARRE LES DEMANDE SUR CHAQUE PAGE, d'où ce cache
 * séparé. L'annuaire entier est déjà gardé une minute, mais c'est une
 * liste de cent trente-six fiches complètes : la relire à chaque en-tête
 * pour en tirer quatre mots reviendrait à sortir un carton d'archives
 * pour lire une étiquette. Celui-ci ne garde que les quatre mots.
 *
 * Cinq minutes, et le même marqueur que l'annuaire : une marque publiée
 * vide les deux ensemble.
 */
const lireLesCategoriesEnVue = unstable_cache(
  async (): Promise<string[]> => {
    const marques = (await lireLAnnuaire()) ?? DEMO_BRANDS;

    const comptes = new Map<string, number>();
    for (const b of marques) {
      for (const c of b.categories ?? []) comptes.set(c, (comptes.get(c) ?? 0) + 1);
    }

    return [...comptes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([categorie]) => categorie);
  },
  ["categories-en-vue"],
  { revalidate: 300, tags: ["marques"] }
);

export async function categoriesEnVue(): Promise<string[]> {
  return lireLesCategoriesEnVue();
}

export async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_BRANDS.find((b) => b.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return DEMO_BRANDS.find((b) => b.slug === slug) ?? null;
  return (data as Brand) ?? null;
}

/**
 * La fiche d'une marque non publiée, pour son aperçu.
 *
 * Aucune vérification de droits ici, et c'est volontaire : la requête
 * ne filtre pas sur le statut, donc ce sont les règles RLS qui
 * tranchent. Un visiteur reçoit null, un gérant reçoit sa marque, un
 * admin reçoit tout. La sécurité est en base, pas dans ce fichier.
 */
export async function getBrandBrouillon(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (data as Brand) ?? null;
}

/* ---------------- pieces ---------------- */

export async function getProductsByBrand(brandId: string): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_PRODUCTS.filter((p) => p.brand_id === brandId);

  /*
   * PAR TRANCHES, PARCE QUE POSTGREST S'ARRÊTE À MILLE LIGNES SANS LE
   * DIRE. C'est le plafond `max-rows` de Supabase, déjà décrit en long
   * dans `stats.ts` — et déjà payé deux fois, sur les pages vues puis
   * sur les statistiques d'une marque. Il frappe ici pour la même
   * raison : une boutique qui importe onze cents pièces en recevait
   * mille, sans erreur ni avertissement, et son catalogue annonçait
   * « Tout 1000 ». Un compte rond de mille est la signature du
   * plafond, jamais un vrai total.
   *
   * L'ORDRE PORTE UN SECOND CRITÈRE, ET IL N'EST PAS DÉCORATIF. Deux
   * tranches ne se suivent que si la base rend les lignes dans le même
   * ordre à chaque appel. `position` ne suffit pas : elle peut être
   * nulle, ou répétée sur un catalogue importé deux fois, et les
   * lignes à égalité se rangent alors comme la base veut — deux
   * tranches successives se recouvrent, et une pièce apparaît en
   * double pendant qu'une autre disparaît. `id` tranche toujours.
   */
  /* `parTranches` ne regarde que les lignes : on retient l'erreur au
     passage pour ne pas perdre le message dans la console du serveur,
     qui est la seule chose qui distingue « aucune pièce » d'une lecture
     qui a échoué. */
  let echec: { message: string } | null = null;
  const data = await parTranches<Product>((de, a) =>
    supabase
      .from("products")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "published")
      .order("position", { ascending: true })
      .order("id", { ascending: true })
      .range(de, a)
      .then((res) => {
        if (res.error) echec = res.error;
        return res;
      })
  );

  report("pièces de la marque", echec);

  /*
   * Ce qui est encore en vente d'abord, ce qui a été retiré ensuite.
   *
   * Ce tri se fait ici, et non dans la requête, à dessein. Demander à
   * la base de trier sur `retired_at` la rend obligatoire : tant que la
   * migration correspondante n'est pas passée, la requête entière
   * échoue et la marque paraît n'avoir aucune pièce. Un simple ordre
   * d'affichage ne mérite pas de faire tomber toute une page.
   *
   * `select("*")` ramène la colonne quand elle existe ; sinon la valeur
   * est absente, tout est considéré comme en vente, et l'ordre reste
   * celui des positions. Le site fonctionne avant comme après.
   */
  return data
    .slice()
    .sort((a, b) => Number(Boolean(a.retired_at)) - Number(Boolean(b.retired_at)));
}

/**
 * La vitrine : des pièces de toutes les marques, mélangées.
 *
 * ON PREND QUELQUES PIÈCES DE CHAQUE MARQUE, ET SURTOUT PAS LES PLUS
 * RÉCENTES.
 *
 * C'est ce qu'on faisait, et c'était le bug : les quatre cents pièces
 * les plus récentes. Or un catalogue s'importe d'un bloc, marque par
 * marque. Les quatre cents dernières arrivées, ce sont donc les pièces
 * des trois ou quatre marques importées en dernier, et rien d'autre.
 * Le mélange qui suit avait beau être irréprochable, il ne pouvait
 * mélanger que ces trois marques-là : on tombait sur les mêmes en
 * boucle.
 *
 * `position` est le rang d'une pièce DANS SA MARQUE, à partir de zéro.
 * Demander les rangs inférieurs à dix, c'est donc demander au plus dix
 * pièces à chacune, quelle que soit la taille de son catalogue, et
 * toutes les marques sont servies dans la même requête. Une boutique de
 * six pièces pèse alors autant qu'une de six cents.
 *
 * L'ordre visible est retiré au sort ensuite : voir `repartirParMarque`.
 *
 * Les pièces retirées de la boutique sont écartées : leur fiche reste
 * consultable parce qu'elle porte des coups de cœur, mais une vitrine
 * qui propose ce qui ne se vend plus n'a aucun intérêt.
 */
export async function getVitrine(parMarque = 10): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_PRODUCTS;

  /*
   * ⚠️ `.limit(1500)` NE SUFFISAIT PAS, ET IL ÉTAIT MÊME TROMPEUR.
   *
   * PostgREST s'arrête à mille lignes quoi qu'on demande (le plafond
   * `max-rows`, décrit en long dans `stats.ts`) : une limite écrite à
   * mille cinq cents n'a jamais rendu plus de mille. Avec cent trente-
   * six marques et dix pièces chacune, la vitrine en visait treize cent
   * soixante et en recevait mille — et surtout, sans `order`, ces mille
   * lignes sont celles que la base a sous la main, donc les plus
   * ANCIENNES. Les marques importées en dernier n'apparaissaient plus
   * du tout : très exactement le défaut que `position` était venue
   * corriger, revenu par une autre porte.
   *
   * On demande donc par tranches jusqu'au plafond, qui reste ce qu'il
   * était : une sécurité, pas un critère de choix. Personne ne descend
   * dix mille vignettes, et les envoyer coûterait à chaque visite ce
   * qu'on met des semaines à économiser ailleurs.
   *
   * L'ordre sert au découpage, pas à l'affichage : `repartirParMarque`
   * rebat tout de suite après. Il doit être TOTAL — `brand_id` et
   * `position` se répètent, `id` tranche — sinon deux tranches se
   * recouvrent et une pièce sort en double pendant qu'une autre
   * disparaît.
   */
  const PLAFOND = 1500;
  const TRANCHE = 1000;
  const tout: Product[] = [];

  for (let de = 0; de < PLAFOND; de += TRANCHE) {
    const { data, error } = await supabase
      .from("products")
      .select(`*, ${BRAND_REF}`)
      .eq("status", "published")
      .is("retired_at", null)
      .lt("position", parMarque)
      .order("brand_id", { ascending: true })
      .order("position", { ascending: true })
      .order("id", { ascending: true })
      .range(de, Math.min(de + TRANCHE, PLAFOND) - 1);

    if (error) return DEMO_PRODUCTS;
    if (!data?.length) break;

    tout.push(...(data as unknown as Product[]));
    if (data.length < TRANCHE) break;
  }

  /* Un catalogue vide n'est pas une panne : on rend une liste vide, et
     la page dit qu'il n'y a rien. Le repli sur les données de
     démonstration est réservé à l'erreur, traitée dans la boucle. */
  return tout;
}

/** Ce que le catalogue contient, sans qu'aucune pièce ne descende. */
export type CompteDuCatalogue = {
  /** Pièces publiées, en vente, de marques publiées. */
  pieces: number;
  marques: number;
  /** Par rayon, dans l'ordre de la taxonomie, « Autres » en dernier. */
  rayons: { rayon: string; total: number }[];
};

/**
 * LES VRAIS NOMBRES DU CATALOGUE, COMPTÉS PAR POSTGRES.
 *
 * La vitrine ne montre que dix pièces par marque : `pieces.length` y
 * répond « 983 » sur un site qui en porte des milliers, et le chiffre
 * se lit comme un compteur en panne. Il ne peut pas se corriger en
 * rapatriant plus de lignes — PostgREST s'arrête à mille, et personne
 * ne veut télécharger vingt mille pièces pour en afficher trente.
 *
 * On demande donc le comptage à la base. Le total des marques est un
 * `count: "exact", head: true` ordinaire ; celui des rayons passe par
 * une fonction SQL, parce qu'une pièce peut porter deux rayons et que
 * le site n'en retient qu'un — le premier. Huit comptages séparés la
 * compteraient deux fois. Voir `migration-31.sql`, qui explique le
 * détail, et `rayonDe` pour la règle qu'elle reproduit.
 *
 * ⚠️ LA LISTE DES RAYONS PART D'ICI. La fonction SQL n'en connaît
 * aucune : elle reçoit `PRODUCT_CATEGORIES` en argument. C'est ce qui
 * garantit qu'un rayon ajouté à la taxonomie sera compté le jour même,
 * sans migration.
 *
 * Le client PUBLIC, et non le client habituel : ce dernier lit les
 * cookies, ce que Next interdit dans un cache. Même raison que pour
 * l'annuaire, un peu plus haut.
 */
const lireLesComptes = unstable_cache(
  async (): Promise<CompteDuCatalogue | null> => {
    const supabase = createPublicClient();
    if (!supabase) return null;

    const [rayons, marques] = await Promise.all([
      supabase.rpc("compter_les_rayons", { p_rayons: [...PRODUCT_CATEGORIES] }),
      supabase
        .from("brands")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ]);

    report("comptes du catalogue", rayons.error);
    if (rayons.error || !rayons.data) return null;

    const lignes = rayons.data as { rayon: string | null; total: number }[];

    /* `rayon` vaut NULL pour une pièce qui ne porte aucun rayon connu.
       Le nom « Autres » reste du côté du site : la base compte, elle ne
       nomme pas. C'est aussi ce que fait `compterLesRayons`. */
    const parRayon = new Map<string, number>();
    for (const l of lignes) {
      const cle = l.rayon ?? "Autres";
      parRayon.set(cle, (parRayon.get(cle) ?? 0) + l.total);
    }

    const ordre = [...PRODUCT_CATEGORIES, "Autres"];

    return {
      pieces: lignes.reduce((n, l) => n + l.total, 0),
      marques: marques.count ?? 0,
      rayons: ordre
        .filter((r) => parRayon.has(r))
        .map((rayon) => ({ rayon, total: parRayon.get(rayon) ?? 0 })),
    };
  },
  ["comptes-catalogue"],
  /* Cinq minutes : un catalogue ne bouge qu'à l'import, et ces trois
     nombres n'ont pas besoin d'être à la seconde. C'est autant de
     comptages que la base ne refait pas à chaque visite. */
  { revalidate: 300, tags: ["pieces"] }
);

/**
 * Combien de pièces le site porte vraiment, et dans quels rayons.
 *
 * `null` quand la base n'est pas configurée ou que la lecture échoue :
 * la page retombe alors sur ce qu'elle a sous la main, plutôt que
 * d'afficher zéro.
 */
export async function compterLeCatalogue(): Promise<CompteDuCatalogue | null> {
  return lireLesComptes();
}

/**
 * Toutes les pieces, marques confondues.
 * Gardee pour le jour ou tu voudras un inventaire complet.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_PRODUCTS;

  const { data, error } = await supabase
    .from("products")
    .select(`*, ${BRAND_REF}`)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return DEMO_PRODUCTS;
  return data as unknown as Product[];
}

/** Une piece precise, par son adresse au sein d'une marque. */
export async function getProduct(
  brandSlug: string,
  productSlug: string
): Promise<{ product: Product; brand: Brand } | null> {
  const brand = await getBrand(brandSlug);
  if (!brand) return null;

  const supabase = await createClient();
  if (!supabase) {
    const demo = DEMO_PRODUCTS.find(
      (p) => p.brand_id === brand.id && p.slug === productSlug
    );
    return demo ? { product: demo, brand } : null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brand.id)
    .eq("slug", productSlug)
    .eq("status", "published")
    .maybeSingle();

  report("fiche de la pièce", error);
  if (!data) return null;
  return { product: data as Product, brand };
}

/* ---------------- posts ---------------- */

export async function getPosts(limit?: number): Promise<Post[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.slice(0, limit);

  let q = supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  report("liste des posts", error);
  if (error || !data) return DEMO_POSTS.slice(0, limit);
  return data as unknown as Post[];
}

export async function getPost(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return DEMO_POSTS.find((p) => p.slug === slug) ?? null;
  return (data as unknown as Post) ?? null;
}

export async function getPostsByBrand(brandId: string): Promise<Post[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.filter((p) => p.brand_id === brandId);

  const { data, error } = await supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .eq("brand_id", brandId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  report("posts de la marque", error);
  if (error || !data) return [];
  return data as unknown as Post[];
}

/* ---------------- recherche ---------------- */

/* Les formes de la réponse sont dans `types.ts` : un composant client
   les importe, et il ne doit surtout pas importer ce fichier-ci. */
const RIEN: Recherche = { marques: [], pieces: [], posts: [], totalPieces: 0 };

/**
 * COMBIEN DE VIGNETTES DANS LA BANDE, ET POURQUOI HUIT.
 *
 * Elles étaient quatre, ce qui suffisait au panneau de l'annuaire où
 * elles s'enroulent sous les marques. Le pop-up de la barre leur donne
 * une colonne entière, en grille de quatre sur deux rangs : à quatre,
 * la moitié de la colonne restait vide, et le « + 306 » arrivait dès la
 * deuxième pièce. Huit remplissent la grille sans peser — ce sont huit
 * lignes de titre et d'adresse, pas huit fiches.
 */
const PIECES_MONTREES = 8;

/**
 * Trois posts, et c'est un plafond de lecture, pas de base.
 *
 * Le groupe « dans le site » vit sous les marques, dans la colonne de
 * gauche du pop-up. Au-delà de trois lignes il pousse la sortie vers
 * l'annuaire hors du panneau, pour des résultats qui sont presque
 * toujours les moins précis des trois groupes.
 */
const POSTS_MONTRES = 3;

/**
 * CE QUE L'ON LAISSE PASSER DANS UNE RECHERCHE, ET POURQUOI SI PEU.
 *
 * La saisie part dans un filtre PostgREST, où elle est écrite au milieu
 * d'une expression : `name=ilike.%…%`. Une virgule y sépare deux
 * conditions, une parenthèse ouvre un groupe, un point commence un
 * opérateur. Une recherche contenant l'un de ces caractères ne renvoie
 * donc pas « rien », elle renvoie une erreur de syntaxe — et, sur une
 * base moins bien tenue que celle-ci, elle est l'entrée d'une injection.
 *
 * `%` et `_` sont les jokers de `like` : les laisser passer permettrait
 * de demander la base entière en tapant un seul caractère.
 *
 * On ne garde donc que ce qui compose un nom de marque ou de pièce :
 * des lettres — accentuées comprises —, des chiffres, l'espace, le
 * trait d'union et l'apostrophe.
 */
function nettoyerLaRecherche(brut: string): string {
  return brut
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/**
 * Les marques et les pièces qui portent ce mot.
 *
 * SERVIE PAR LE CLIENT PUBLIC, ET C'EST CE QUI LA REND PARTAGEABLE. La
 * réponse ne dépend de personne — ce sont des fiches publiées — donc
 * elle peut être gardée par un cache commun à tous les visiteurs plutôt
 * que recalculée à chaque frappe. Voir les en-têtes de `/api/recherche`.
 *
 * DEUX LETTRES AU MINIMUM. À une seule, on ne cherche pas, on parcourt :
 * la réponse ferait plusieurs centaines de lignes et n'apprendrait rien.
 */
export async function rechercher(brut: string): Promise<Recherche> {
  const q = nettoyerLaRecherche(brut);
  if (q.length < 2) return RIEN;

  const motif = `%${q}%`;
  const bas = q.toLowerCase();

  const supabase = createPublicClient();

  /* Sans base, on cherche dans les données de démonstration : le site
     doit rester utilisable pendant que tu travailles le design. */
  if (!supabase) {
    const marques = DEMO_BRANDS.filter((b) => b.name.toLowerCase().includes(bas));
    const pieces = DEMO_PRODUCTS.filter((p) => p.name.toLowerCase().includes(bas));
    const posts = DEMO_POSTS.filter((p) => p.title.toLowerCase().includes(bas));
    return {
      marques: marques.slice(0, 6).map((b) => ({
        slug: b.slug,
        name: b.name,
        ville: [b.city, b.country].filter(Boolean).join(" · "),
        categorie: b.categories[0] ?? null,
        visuel: b.logo_url ?? b.cover_url,
      })),
      pieces: pieces.slice(0, PIECES_MONTREES).map((p) => ({
        id: p.id,
        adresse: `/marques/${p.brand?.slug ?? ""}/${p.slug ?? p.id}`,
        name: p.name,
        image: p.images?.[0] ?? p.image_url,
      })),
      posts: posts.slice(0, POSTS_MONTRES).map((p) => ({ slug: p.slug, title: p.title })),
      totalPieces: pieces.length,
    };
  }

  const [reponseMarques, reponsePieces, reponsePosts] = await Promise.all([
    supabase
      .from("brands")
      .select("slug,name,city,country,categories,logo_url,cover_url")
      .eq("status", "published")
      .ilike("name", motif)
      .limit(6),
    supabase
      .from("products")
      .select(`id,slug,name,image_url,images, ${BRAND_REF}`, { count: "exact" })
      .eq("status", "published")
      .is("retired_at", null)
      .ilike("name", motif)
      .limit(PIECES_MONTREES),
    /*
     * LES POSTS NE SONT DEMANDÉS QUE POUR LE POP-UP DE LA BARRE, et ils
     * ne coûtent presque rien : le journal compte quelques dizaines
     * d'entrées et l'on n'en ramène que le titre et l'adresse. Les
     * écrans qui ne s'en servent pas — l'annuaire, l'accueil — ignorent
     * simplement le champ.
     */
    supabase
      .from("posts")
      .select("slug,title")
      .eq("status", "published")
      .ilike("title", motif)
      .limit(POSTS_MONTRES),
  ]);

  report("recherche de marques", reponseMarques.error);
  report("recherche de pièces", reponsePieces.error);
  report("recherche de posts", reponsePosts.error);

  type LigneMarque = {
    slug: string;
    name: string;
    city: string | null;
    country: string | null;
    categories: string[] | null;
    logo_url: string | null;
    cover_url: string | null;
  };

  type LignePiece = {
    id: string;
    slug: string | null;
    name: string;
    image_url: string | null;
    images: string[] | null;
    brand: { slug: string; name: string } | null;
  };

  const marques = ((reponseMarques.data ?? []) as LigneMarque[]).map((b) => ({
    slug: b.slug,
    name: b.name,
    ville: [b.city, b.country].filter(Boolean).join(" · "),
    categorie: b.categories?.[0] ?? null,
    visuel: b.logo_url ?? b.cover_url,
  }));

  const pieces = ((reponsePieces.data ?? []) as unknown as LignePiece[])
    /* Une pièce dont on ne connaît plus la marque n'a pas d'adresse :
       l'afficher mènerait à une page qui n'existe pas. */
    .filter((p) => p.brand?.slug)
    .map((p) => ({
      id: p.id,
      adresse: `/marques/${p.brand!.slug}/${p.slug ?? p.id}`,
      name: p.name,
      image: p.images?.[0] ?? p.image_url,
    }));

  const posts = ((reponsePosts.data ?? []) as { slug: string; title: string }[]).map((p) => ({
    slug: p.slug,
    title: p.title,
  }));

  return {
    marques,
    pieces,
    posts,
    totalPieces: reponsePieces.count ?? pieces.length,
  };
}
