/**
 * LA MÉMOIRE DES IMAGES DE `/api/img`, QUI SURVIT AUX DÉPLOIEMENTS.
 *
 * Le problème qu'elle règle. Les réponses de `/api/img` sont gardées un
 * an par le CDN de Vercel, mais la clé de ce cache contient l'adresse du
 * DÉPLOIEMENT : chaque mise en ligne repart d'un cache vide (voir
 * vercel.com/docs/caching/cdn-cache/purge, « Cache keys »). Le premier
 * visiteur après chaque `git push` payait donc, pour chaque visuel, le
 * téléchargement chez la marque et le passage dans sharp : de 0,2 à 1,8
 * seconde par image mesurés sur l'accueil, logos du ruban compris.
 *
 * Le cache de données de Vercel (celui de `unstable_cache`), lui, est
 * gardé d'un déploiement à l'autre. On y range le résultat déjà calculé,
 * octets et en-têtes, et la route le ressert tel quel : même image, même
 * type, mêmes en-têtes, sans retourner chez la marque ni recharger sharp.
 *
 * Ce fichier ne contient que la partie qui ne dépend pas de Next : quoi
 * garder, sous quelle clé, et comment le ranger puis le ressortir. Elle
 * est testée dans `tests/memoire-images.test.mjs`. Le branchement sur
 * `unstable_cache` est dans la route.
 */

/**
 * Au-delà, on ne range pas : le cache de Vercel refuse les entrées de
 * plus de 2 Mo, et le base64 grossit les octets d'un tiers. Une vignette
 * WebP pèse de quelques kilo-octets à quelques centaines : en pratique
 * seules les très grandes largeurs d'une photo chargée passent au-dessus,
 * et elles restent servies normalement, simplement sans mémoire.
 */
export const POIDS_MAX_EN_MEMOIRE = 1_400_000;

/** Ce qui est rangé : de quoi refaire exactement la même réponse. */
export type ImageEnMemoire = {
  statut: number;
  entetes: Record<string, string>;
  /** Les octets de l'image, en base64 : le cache ne range que du JSON. */
  corps: string;
};

/**
 * La clé d'une image, faite des seuls paramètres que la route lit.
 *
 * Un paramètre inconnu ajouté à l'adresse ne doit pas créer une copie
 * de plus de la même image. L'ordre est fixé pour la même raison.
 * `null` quand il n'y a pas d'adresse : la route répond une erreur, il
 * n'y a rien à garder.
 */
export function cleDeMemoire(params: URLSearchParams, detourage = false): string | null {
  const u = params.get("u");
  if (!u) return null;
  const parties = ["w", "t", "b", "s"].map((k) => `${k}=${params.get(k) ?? ""}`);
  // Le détourage change les pixels rendus pour `t=1` : sa valeur fait
  // partie de la clé, sinon l'allumer ressortirait les anciens logos.
  parties.push(`d=${detourage ? 1 : 0}`);
  parties.push(`u=${u}`);
  return parties.join("&");
}

/**
 * Une réponse mérite-t-elle d'être gardée ?
 *
 * Seulement une image servie avec succès ET que la route elle-même
 * annonce comme durable au CDN (`s-maxage`). C'est le cas d'une vignette
 * calculée (un an) et du pixel vide d'un logo qui ne se prête pas au
 * blanc (un jour) : deux réponses qui ne changeront pas d'ici là.
 *
 * Le reste repart tel quel, sans mémoire : la redirection vers la source
 * et le pixel « hébergeur injoignable » (une heure, sans `s-maxage`), qui
 * disent seulement que ça n'a pas marché CETTE fois, et le refus d'une
 * navigation.
 */
export function aGarder(reponse: Response): boolean {
  if (reponse.status !== 200) return false;
  const type = reponse.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return false;
  const cache = reponse.headers.get("cache-control") ?? "";
  return /(^|[\s,])s-maxage=\d+/.test(cache) && !/no-store|private/.test(cache);
}

/** Range une réponse. `null` si elle est trop lourde pour le cache. */
export async function versMemoire(reponse: Response): Promise<ImageEnMemoire | null> {
  const octets = Buffer.from(await reponse.arrayBuffer());
  if (octets.byteLength > POIDS_MAX_EN_MEMOIRE) return null;

  const entetes: Record<string, string> = {};
  reponse.headers.forEach((valeur, nom) => {
    entetes[nom] = valeur;
  });

  return { statut: reponse.status, entetes, corps: octets.toString("base64") };
}

/** Refait la réponse rangée, octet pour octet. */
export function depuisMemoire(garde: ImageEnMemoire): Response {
  return new Response(new Uint8Array(Buffer.from(garde.corps, "base64")), {
    status: garde.statut,
    headers: garde.entetes,
  });
}
