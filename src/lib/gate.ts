/**
 * Verrou d'acces du site pendant la phase de test.
 *
 * Actif uniquement si la variable SITE_PASSWORD est renseignee.
 * En local, elle est absente : le site s'ouvre normalement.
 *
 * Ce n'est pas de l'authentification — c'est une porte fermee pour que
 * le site ne soit pas lisible par un curieux ou indexe par Google avant
 * l'heure. Les vrais droits restent geres par Supabase.
 */

export const GATE_COOKIE = "nw_acces";

/**
 * On ne stocke jamais le mot de passe dans le cookie, mais son
 * empreinte. Web Crypto fonctionne aussi bien dans le middleware
 * (Edge) que dans une route serveur, contrairement au module crypto.
 */
export async function fingerprint(secret: string): Promise<string> {
  const bytes = new TextEncoder().encode(`newave:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Chemins toujours joignables, sinon on s'enferme dehors. */
export function isOpenPath(pathname: string): boolean {
  return (
    pathname === "/acces" ||
    pathname.startsWith("/api/acces") ||
    pathname.startsWith("/brand/") ||
    pathname === "/robots.txt" ||
    pathname === "/favicon-32.png" ||
    pathname === "/apple-touch-icon.png"
  );
}
