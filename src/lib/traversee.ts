/**
 * Le passage d'une page à l'autre : quels liens y ont droit.
 * Voir `components/PageTransition` pour le passage lui-même.
 *
 * Le passage prend la main sur le lien : on empêche le navigateur de le
 * suivre, et c'est le routeur qui part, à l'intérieur de la transition.
 * Il ne doit donc viser que ce que le routeur sait faire, c'est-à-dire
 * une PAGE du site. Le reste suit son chemin habituel :
 *   - une route d'API ou de session (`/api/go/…` redirige chez une
 *     marque, `/auth/deconnexion` ferme la session) : le routeur ne les
 *     ouvrirait pas, il les afficherait ;
 *   - un fichier (`/sitemap.xml`, une image) ;
 *   - la même page avec une autre requête ou une ancre : les filtres de
 *     l'annuaire, les onglets d'un profil. Faire reculer la page pour
 *     la reposer à l'identique serait un faux départ.
 */
const PAS_UNE_PAGE = /^\/(api|auth)(\/|$)|\.[a-z0-9]{2,5}$/i;

/**
 * L'adresse où partir en transition, ou `null` si ce lien n'y a pas
 * droit. `ici` est l'emplacement actuel (`window.location`).
 */
export function cibleDeTraversee(
  href: string,
  ici: { pathname: string; origin: string }
): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(href, ici.origin);
  } catch {
    return null;
  }
  if (url.origin !== ici.origin) return null;
  if (PAS_UNE_PAGE.test(url.pathname)) return null;
  if (url.pathname === ici.pathname) return null;
  return url.pathname + url.search + url.hash;
}
