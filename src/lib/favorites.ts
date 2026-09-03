"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import type { Brand } from "./types";
import { enSlugDeCategorie } from "@/lib/taxonomy";

/**
 * LA RÈGLE DE CE FICHIER, ET ELLE NE SE NÉGOCIE PAS : ON NE DIT JAMAIS
 * QUI A MIS QUOI DE CÔTÉ.
 *
 * Aucune des fonctions publiques ci-dessous ne rend, ne transporte, ni
 * même ne demande au serveur l'identifiant, le nom ou l'adresse de la
 * personne qui a ajouté un favori — sauf `getMyFavorites`, `isFavorite`
 * et `toggleFavorite`, qui ne parlent que de la personne connectée et
 * de ses propres favoris. Tout le reste passe par des agrégats en base,
 * qui ne savent renvoyer que des totaux.
 *
 * Ce n'est pas une précaution de façade. Un favori dit ce qu'on aime, et
 * une liste de favoris rendue publique dit qui l'on est. La table est
 * lisible par son seul propriétaire, et c'est très bien ainsi : les
 * fonctions en base sont la seule porte, et elles ne l'ouvrent que sur
 * des chiffres.
 */

/**
 * Sur quelle fenêtre de temps on compte les cœurs.
 *
 * `toujours` est le comportement d'origine, et le seul qui n'ait besoin
 * de rien en base : un favori ne s'efface pas avec le temps. Les deux
 * autres n'existent QUE pour le sélecteur de période, lequel n'apparaît
 * qu'au-dessus du seuil du podium — inutile de fabriquer un delta
 * hebdomadaire tant que personne ne peut le demander.
 */
export type PeriodeCoeurs = "semaine" | "mois" | "toujours";

/**
 * Un rayon de la ligne du haut : une catégorie, ce qu'elle pèse en
 * cœurs, et combien de marques y sont rangées.
 *
 * `coeurs` À ZÉRO N'EST PAS UN DÉFAUT D'AFFICHAGE, C'EST L'INFORMATION.
 * Un rayon à zéro se présentait exactement comme un rayon à quatre
 * cents : on cliquait, on tombait sur du vide. C'est précisément ce que
 * ce champ permet d'éviter, en envoyant ces rayons-là vers l'annuaire
 * filtré plutôt que vers un classement qui n'existe pas.
 *
 * `slug` est calculé ici et pas dans le composant : c'est lui qui part
 * dans l'adresse `/marques?cat=…`, et une adresse se fabrique là où l'on
 * connaît la donnée, pas là où on la dessine.
 */
export type Rayon = {
  /** Le nom tel qu'il est écrit dans la taxonomie : « Old money ». */
  nom: string;
  /** Le même, tel qu'il voyage dans une adresse : « old-money ». */
  slug: string;
  /** Les cœurs des marques CLASSÉES de ce rayon. Voir `classerLesRayons`. */
  coeurs: number;
  /** Combien de marques publiées y sont rangées, cœurs ou pas. */
  marques: number;
};

/**
 * Une marque qui vient d'être mise de côté.
 *
 * La marque et l'ancienneté, RIEN D'AUTRE. Pas d'identifiant de
 * personne, pas de nom, pas d'initiale : le type lui-même est la
 * garantie, puisqu'il n'a nulle part où loger cette information.
 */
export type MiseDeCote = {
  brand: Brand;
  /** L'horodatage brut, pour l'attribut `dateTime` d'un `<time>`. */
  quand: string;
  /**
   * « il y a 2 jours », calculé SUR LE SERVEUR.
   *
   * Un écart relatif se calcule à l'instant du rendu : le serveur écrit
   * « il y a 2 jours », le navigateur rejoue le calcul quelques secondes
   * plus tard, et si l'on a franchi minuit entre les deux, React trouve
   * deux textes différents et signale une erreur d'hydratation sur toute
   * la page — pour un mot. C'est exactement la raison pour laquelle
   * `LignePost` a renoncé aux dates relatives. Ici on la garde, mais la
   * phrase est fabriquée une seule fois, ici, et voyage comme une chaîne
   * ordinaire : les deux côtés lisent le même texte.
   */
  depuis: string;
};

/** Ce que la page des coups de cœur a besoin de savoir, en une fois. */
export type PaysageDesCoeurs = {
  total: number;
  classement: { brand: Brand; favoris: number }[];
  sansCoeur: Brand[];
  rayons: Rayon[];
};

/**
 * Le classement des marques les plus suivies, depuis toujours.
 *
 * On passe par une fonction en base plutôt que par une lecture
 * directe : la table des favoris n'est lisible que par son
 * propriétaire, et c'est très bien ainsi. La fonction ne rend que des
 * totaux, jamais qui a mis quoi en favori.
 */
export async function getMostFavorited(
  limite = 60
): Promise<{ brand: Brand; favoris: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: totaux } = await supabase.rpc("brand_favorite_counts");
  const rows = ((totaux ?? []) as { brand_id: string; favoris: number }[]).slice(0, limite);
  if (rows.length === 0) return [];

  const { data: marques } = await supabase
    .from("brands")
    .select("*")
    .in("id", rows.map((r) => r.brand_id))
    .eq("status", "published");

  const parId = new Map(((marques ?? []) as Brand[]).map((b) => [b.id, b]));

  // On garde l'ordre du classement, pas celui de la seconde requête.
  return rows
    .map((r) => ({ brand: parId.get(r.brand_id), favoris: r.favoris }))
    .filter((x): x is { brand: Brand; favoris: number } => Boolean(x.brand));
}

/**
 * L'état des cœurs sur tout l'annuaire, et pas seulement le haut du
 * classement.
 *
 * POURQUOI CE N'EST PAS UN DÉTAIL. Un podium à trois marches, sur un
 * site qui vient d'ouvrir, met en scène trois marques à deux cœurs
 * chacune : trois voix d'écart y suffiraient à tout renverser, et la
 * page annonce pourtant un classement. Elle ment sans le vouloir.
 *
 * Pour décider de le montrer ou non, il faut le TOTAL — pas les
 * soixante premières lignes. On somme donc l'agrégat entier avant de le
 * tronquer, ce qui ne coûte pas une requête de plus.
 *
 * `sansCoeur` sert l'autre moitié de la réponse : ces marques-là ne sont
 * pas les moins bonnes, juste les moins vues, et une page de classement
 * qui les montre vaut mieux qu'un podium qui les cache.
 *
 * `rayons` NE COÛTE PAS UNE REQUÊTE DE PLUS, ET C'EST VOULU. Le compte
 * de cœurs par catégorie, on l'a déjà entre les mains : l'agrégat donne
 * les totaux, et les fiches déjà lues portent leurs catégories. Aller le
 * redemander en base — un `group by` sur un tableau de catégories — ce
 * serait une troisième requête pour une addition que l'on peut faire
 * ici, sur des données dont on a besoin de toute façon. Le comptage « au
 * fil des lignes » que l'on cherche à éviter, c'est celui qui interroge
 * la base une fois par marque ; celui-ci ne parle à personne.
 */
export async function getPaysageDesCoeurs(
  limite = 60,
  periode: PeriodeCoeurs = "toujours"
): Promise<PaysageDesCoeurs> {
  const vide: PaysageDesCoeurs = { total: 0, classement: [], sansCoeur: [], rayons: [] };

  const supabase = await createClient();
  if (!supabase) return vide;

  const [{ data: totaux }, { data: publiees }] = await Promise.all([
    supabase.rpc("brand_favorite_counts"),
    supabase.from("brands").select("*").eq("status", "published"),
  ]);

  const rows = (totaux ?? []) as { brand_id: string; favoris: number }[];
  const marques = (publiees ?? []) as Brand[];
  const parId = new Map(marques.map((b) => [b.id, b]));

  /* Le total se calcule sur TOUTES les lignes de l'agrégat, avant la
     troncature du classement : c'est lui qui décide des seuils. Et il se
     calcule TOUJOURS sur « depuis toujours », même quand on regarde la
     semaine : sans quoi le sélecteur de période, qui n'apparaît que
     par-dessus cent cœurs, disparaîtrait au premier clic sur « cette
     semaine » — et l'on ne pourrait plus revenir. */
  const total = rows.reduce((n, r) => n + r.favoris, 0);

  /*
   * LA PÉRIODE NE SE CONSTRUIT QU'À LA DEMANDE.
   *
   * Une seconde lecture de l'agrégat, bornée dans le temps, et seulement
   * si quelqu'un a cliqué. Tant que le sélecteur n'apparaît pas, donc
   * tant que l'annuaire n'a pas atteint le seuil, cette branche
   * n'est jamais prise et la page coûte exactement ce qu'elle coûtait.
   *
   * ⚠️ ELLE SUPPOSE QUE `brand_favorite_counts` ACCEPTE UN `p_depuis`
   * facultatif (`create or replace function brand_favorite_counts(
   * p_depuis timestamptz default null)`, qui filtre sur `created_at`
   * quand l'argument est fourni). Si la fonction en base ne le prend pas
   * encore, Postgres répond « function does not exist », `data` est nul,
   * et le classement de la période sort VIDE. C'est le comportement
   * voulu : mieux vaut une liste vide qu'un total de toujours affiché
   * sous l'étiquette « cette semaine ». Sur un classement public, un
   * chiffre faux coûte plus cher qu'un chiffre absent.
   */
  const depuis = debutDe(periode);
  const classes = depuis
    ? (((await supabase.rpc("brand_favorite_counts", { p_depuis: depuis })).data ?? []) as {
        brand_id: string;
        favoris: number;
      }[])
    : rows;

  const classement = classes
    .slice(0, limite)
    .map((r) => ({ brand: parId.get(r.brand_id), favoris: r.favoris }))
    .filter((x): x is { brand: Brand; favoris: number } => Boolean(x.brand));

  /* Une marque absente de l'agrégat n'a jamais été mise de côté. On les
     prend parmi les PUBLIÉES seulement : proposer un brouillon à
     découvrir mènerait à une page que le visiteur ne peut pas voir.

     Sur l'agrégat de TOUJOURS, là encore : une marque suivie l'an
     dernier n'est pas « à découvrir » parce que personne ne l'a suivie
     cette semaine. */
  const avecCoeur = new Set(rows.filter((r) => r.favoris > 0).map((r) => r.brand_id));
  const sansCoeur = marques.filter((b) => !avecCoeur.has(b.id));

  return { total, classement, sansCoeur, rayons: classerLesRayons(classement, marques) };
}

/**
 * Les rayons, rangés du mieux garni au plus vide.
 *
 * LE COMPTE NE PORTE QUE SUR CE QUI EST CLASSÉ, et c'est la même règle
 * que le compteur en tête de la page des coups de cœur. Il serait facile
 * de sommer l'agrégat entier : le chiffre serait plus gros, et il serait
 * posé au-dessus d'une liste tronquée à soixante lignes. On lirait alors
 * « Streetwear · 42 » puis, en cliquant, un classement qui en montre 30 —
 * sans jamais comprendre d'où vient l'écart. Ce qu'on annonce est donc
 * la somme exacte de ce que le clic va montrer.
 *
 * LE COMPTE DE MARQUES, LUI, PORTE SUR TOUT L'ANNUAIRE. Ce n'est pas une
 * incohérence : il ne répond pas à la même question. « 7 marques à
 * découvrir » parle du rayon dans l'annuaire, pas du classement — c'est
 * justement ce qu'on écrit sur les rayons qui n'ont aucun cœur, et qui
 * mènent à l'annuaire filtré.
 *
 * UNE MARQUE COMPTE DANS CHACUNE DE SES CATÉGORIES. La somme des rayons
 * dépasse donc le total du site, et il ne faut surtout pas s'en servir
 * pour faire un pourcentage. La jauge des pastilles se mesure sur le
 * rayon LE MIEUX GARNI, jamais sur le total.
 */
function classerLesRayons(
  classement: { brand: Brand; favoris: number }[],
  publiees: Brand[]
): Rayon[] {
  const coeurs = new Map<string, number>();
  const combien = new Map<string, number>();

  for (const marque of publiees) {
    for (const categorie of marque.categories ?? []) {
      combien.set(categorie, (combien.get(categorie) ?? 0) + 1);
    }
  }

  for (const { brand, favoris } of classement) {
    if (favoris <= 0) continue;
    for (const categorie of brand.categories ?? []) {
      coeurs.set(categorie, (coeurs.get(categorie) ?? 0) + favoris);
    }
  }

  return [...combien.entries()]
    .map(([nom, marques]) => ({
      nom,
      slug: enSlugDeCategorie(nom),
      coeurs: coeurs.get(nom) ?? 0,
      marques,
    }))
    /* Les cœurs d'abord — « on lit l'ordre avant de lire les mots » —
       puis le nombre de marques, qui départage les rayons à zéro : celui
       qui a le plus à faire découvrir passe devant. Le nom en dernier,
       pour que deux visites donnent le même ordre. */
    .sort(
      (a, b) =>
        b.coeurs - a.coeurs || b.marques - a.marques || a.nom.localeCompare(b.nom, "fr")
    );
}


/** Le début de la fenêtre, ou `null` quand on compte depuis toujours. */
function debutDe(periode: PeriodeCoeurs): string | null {
  if (periode === "toujours") return null;
  const d = new Date();
  d.setDate(d.getDate() - (periode === "semaine" ? 7 : 30));
  return d.toISOString();
}

/**
 * Ce qui vient d'être mis de côté — la marque et l'ancienneté, rien
 * d'autre.
 *
 * ON NE DEMANDE MÊME PAS QUI. Pas « on récupère l'utilisateur puis on le
 * retire avant d'afficher » : la fonction en base ne renvoie que deux
 * colonnes, `brand_id` et `created_at`, et il n'existe donc aucun point
 * du trajet où l'identité aurait pu fuir — ni dans un journal, ni dans
 * une charge utile React, ni dans un cache. Une donnée qu'on ne demande
 * pas est la seule qu'on soit certain de ne pas laisser échapper.
 *
 * ⚠️ ELLE ATTEND UNE FONCTION `brand_favorite_recent(p_limite int)` en
 * base, `security definer`, qui lit la table des favoris — invisible
 * autrement, puisqu'elle n'est lisible que par son propriétaire — et
 * rend `brand_id, created_at` triés du plus récent au plus ancien, SANS
 * `user_id`. Tant qu'elle n'existe pas, `data` est nul, la liste sort
 * vide et le bloc du rail ne s'affiche pas : la page ne montre rien
 * plutôt que d'inventer.
 */
export async function getDerniersFavoris(limite = 3): Promise<MiseDeCote[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase.rpc("brand_favorite_recent", { p_limite: limite });
  const rows = (data ?? []) as { brand_id: string; created_at: string }[];
  if (rows.length === 0) return [];

  const { data: marques } = await supabase
    .from("brands")
    .select("*")
    .in(
      "id",
      rows.map((r) => r.brand_id)
    )
    .eq("status", "published");

  const parId = new Map(((marques ?? []) as Brand[]).map((b) => [b.id, b]));

  /* L'ordre est celui de la base — du plus récent au plus ancien — et
     non celui de la seconde requête. Même précaution que
     `getMostFavorited` : une liste « vient d'être » qui remonte le temps
     à l'envers ne veut rien dire. */
  return rows
    .map((r) => ({
      brand: parId.get(r.brand_id),
      quand: r.created_at,
      depuis: anciennete(r.created_at),
    }))
    .filter((x): x is MiseDeCote => Boolean(x.brand));
}

/**
 * « il y a 2 jours », en français et sans `Intl`.
 *
 * Même raison que `enChiffres` : `Intl.RelativeTimeFormat` n'a pas
 * forcément les mêmes données de langue sous Node et dans un navigateur,
 * et deux textes différents pour un même écart valent une erreur
 * d'hydratation. Écrit à la main, c'est le même texte partout — et de
 * toute façon la phrase est fabriquée ici, sur le serveur, une seule
 * fois.
 */
function anciennete(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";

  const minutes = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.round(heures / 24);
  if (jours < 7) return `il y a ${jours} jour${jours > 1 ? "s" : ""}`;

  const semaines = Math.round(jours / 7);
  if (jours < 31) return `il y a ${semaines} semaine${semaines > 1 ? "s" : ""}`;

  const mois = Math.round(jours / 30);
  if (mois < 12) return `il y a ${mois} mois`;

  const ans = Math.round(jours / 365);
  return `il y a ${ans} an${ans > 1 ? "s" : ""}`;
}

/**
 * Lesquelles de ces marques la personne connectée suit-elle ?
 *
 * Une seule requête pour toute une grille. Appeler isFavorite() sur
 * chaque carte en ferait une par marque, et l'annuaire en compte
 * plusieurs dizaines.
 */
export async function getMyFavorites(brandIds: string[]): Promise<Set<string>> {
  const vide = new Set<string>();
  if (brandIds.length === 0) return vide;

  const supabase = await createClient();
  if (!supabase) return vide;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vide;

  const { data } = await supabase
    .from("favorites")
    .select("brand_id")
    .eq("user_id", user.id)
    .in("brand_id", brandIds);

  return new Set(((data ?? []) as { brand_id: string }[]).map((f) => f.brand_id));
}

/** Cette marque est-elle dans les favoris de la personne connectée ? */
export async function isFavorite(brandId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("brand_id")
    .eq("user_id", user.id)
    .eq("brand_id", brandId)
    .maybeSingle();

  return Boolean(data);
}

/** Ajoute ou retire la marque des favoris. Renvoie le nouvel etat. */
export async function toggleFavorite(
  brandId: string
): Promise<{ ok: boolean; favorited: boolean; reason?: "non-connecte" | "erreur" }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, favorited: false, reason: "erreur" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, favorited: false, reason: "non-connecte" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("brand_id")
    .eq("user_id", user.id)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("brand_id", brandId);
    if (error) return { ok: false, favorited: true, reason: "erreur" };
    revalidatePath("/favoris");
    return { ok: true, favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, brand_id: brandId });
  if (error) return { ok: false, favorited: false, reason: "erreur" };
  revalidatePath("/favoris");
  return { ok: true, favorited: true };
}

/** Les marques mises en favori par la personne connectee. */
export async function getFavoriteBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("favorites")
    .select("brand:brands(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data
    .map((row) => (row as unknown as { brand: Brand | null }).brand)
    .filter((b): b is Brand => Boolean(b));
}
