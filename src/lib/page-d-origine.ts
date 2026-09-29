/**
 * Se souvenir de la page d'où l'on est parti vers une marque, pour y revenir.
 *
 * LE BESOIN. On est sur l'annuaire, ou sur la liste des marques de
 * l'administration, ou sur les pièces. On ouvre une marque, on passe
 * par sa fiche, par ses pièces, on corrige un détail… et le seul retour
 * proposé menait à une page fixe (« Toutes les marques »), en haut de
 * la liste. Il fallait enchaîner les « précédent » du navigateur pour
 * retrouver sa page, et recharger pour la voir à jour.
 *
 * LA RÈGLE. Toute page qui n'appartient pas à UNE marque est une page
 * d'origine : on note son adresse (filtres compris) et la hauteur où
 * l'on en est. Les pages d'une marque (sa page publique, ses pièces, son
 * éditeur, ses statistiques) ne notent rien : on peut y circuler autant
 * qu'on veut, le bouton retour ramène toujours là d'où l'on est entré.
 *
 * `sessionStorage` et non `localStorage` : c'est le fil d'UN onglet.
 * Tout passe par des `try` : en navigation privée stricte l'accès peut
 * lever une erreur, et un bouton retour ne doit jamais casser une page.
 */

const CLE = "newave:page-origine";
const DRAPEAU = "newave:retour-origine";

export type PageDOrigine = { url: string; y: number };

/**
 * Cette adresse appartient-elle à une marque ?
 *
 * `/admin/marques/…` aussi : c'est le parcours de création et l'ancienne
 * adresse d'édition, qui renvoie à l'éditeur. Y revenir rouvrirait un
 * formulaire vide au lieu de la liste.
 */
export function estUnePageDeMarque(chemin: string): boolean {
  return (
    /^\/(marques|espace-marque)\/[^/]+/.test(chemin) || /^\/admin\/marques\/.+/.test(chemin)
  );
}

export function lirePageDOrigine(): PageDOrigine | null {
  try {
    const brut = window.sessionStorage.getItem(CLE);
    if (!brut) return null;
    const lu = JSON.parse(brut) as Partial<PageDOrigine>;
    if (typeof lu.url !== "string" || !lu.url.startsWith("/")) return null;
    if (estUnePageDeMarque(lu.url.split(/[?#]/)[0])) return null;
    return { url: lu.url, y: typeof lu.y === "number" && lu.y > 0 ? lu.y : 0 };
  } catch {
    return null;
  }
}

/** Note la page où l'on est, si c'en est une d'origine. */
export function noterIci(): void {
  const chemin = window.location.pathname;
  if (estUnePageDeMarque(chemin)) return;
  try {
    const page: PageDOrigine = {
      url: `${chemin}${window.location.search}`,
      y: Math.round(window.scrollY),
    };
    window.sessionStorage.setItem(CLE, JSON.stringify(page));
  } catch {
    // Pas de mémoire : le bouton retour prendra sa page de repli.
  }
}

/**
 * Le bouton retour a été utilisé : la page d'arrivée doit reprendre la
 * hauteur notée. Sans ce drapeau, on retrouverait sa place même en
 * cliquant « Marques » dans le menu, ce qu'on ne veut pas.
 */
export function marquerLeRetour(): void {
  try {
    window.sessionStorage.setItem(DRAPEAU, "1");
  } catch {
    // Tant pis pour la hauteur : on arrive en haut de la page.
  }
}

/** Lit ET efface le drapeau : il ne sert qu'une fois. */
export function consommerLeRetour(): boolean {
  try {
    const present = window.sessionStorage.getItem(DRAPEAU) === "1";
    window.sessionStorage.removeItem(DRAPEAU);
    return present;
  } catch {
    return false;
  }
}

const PAGES_ADMIN: [string, string][] = [
  ["/admin/marques", "Marques"],
  ["/admin/catalogues", "Catalogues"],
  ["/admin/tags", "Tags"],
  ["/admin/candidatures", "Candidatures"],
  ["/admin/signalements", "Signalements"],
  ["/admin/utilisateurs", "Comptes"],
  ["/admin/posts", "Posts"],
  ["/admin/pile", "La pile"],
];

/** Les mêmes mots que le menu du site. */
const PAGES_DU_SITE: [string, string][] = [
  ["/marques", "Toutes les marques"],
  ["/pieces", "Pièces"],
  ["/posts", "Posts"],
  ["/populaires", "Coups de cœur"],
  ["/forum", "Forum"],
  ["/favoris", "Mes favoris"],
  ["/messages", "Messages"],
  ["/compte", "Mon compte"],
  ["/espace-marque", "Mes marques"],
  ["/candidature", "Proposer une marque"],
  ["/a-propos", "À propos"],
];

const sous = (chemin: string, debut: string) =>
  chemin === debut || chemin.startsWith(`${debut}/`);

/** Ce qu'on écrit sur le bouton, d'après la page où il ramène. */
export function libellePage(url: string): string {
  const chemin = url.split(/[?#]/)[0];
  if (chemin === "/") return "Accueil";
  if (sous(chemin, "/admin")) {
    const page = PAGES_ADMIN.find(([debut]) => sous(chemin, debut));
    return `Admin · ${page ? page[1] : "Tableau de bord"}`;
  }
  return PAGES_DU_SITE.find(([debut]) => sous(chemin, debut))?.[1] ?? "Retour";
}
