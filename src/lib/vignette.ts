/**
 * Demander une image à la taille où on l'affiche.
 *
 * Les visuels des pièces viennent des boutiques, en pleine définition :
 * une photo Shopify fait couramment 2000 pixels de large et un à trois
 * mégaoctets. On les affichait telles quelles dans des vignettes de
 * trois cents pixels.
 *
 * LE POIDS N'EST PAS LE PIRE. Un téléphone doit DÉCOMPRESSER chaque
 * image pour la peindre, et une photo de 2000 × 2500 occupe une
 * vingtaine de mégaoctets en mémoire une fois décodée, quelle que
 * soit la taille à laquelle on la montre. Trente pièces à l'écran et
 * l'on dépasse ce qu'un navigateur mobile s'autorise : il vide alors
 * la page et la recharge. C'est exactement le rechargement en boucle
 * que l'on constate en ajoutant des pièces, et il empire à mesure que
 * le catalogue grossit.
 *
 * Les hébergeurs d'images savent redimensionner à la volée. Il suffit
 * de le leur demander dans l'adresse, et c'est gratuit.
 *
 * QUAND ON NE CONNAÎT PAS L'HÉBERGEUR, ON NE TOUCHE À RIEN. Ajouter un
 * paramètre au hasard ne redimensionne pas, mais peut casser une
 * adresse signée — et une image cassée est bien pire qu'une image
 * lourde.
 */

/** Les hôtes dont on sait qu'ils redimensionnent avec `width`. */
function saitRedimensionner(hote: string): boolean {
  return (
    hote === "cdn.shopify.com" ||
    hote.endsWith(".myshopify.com") ||
    // Les boutiques qui servent leurs images derrière leur propre nom
    // de domaine passent presque toujours par le même CDN Shopify, et
    // acceptent donc le même paramètre.
    hote.endsWith(".cdn.shopify.com")
  );
}

export function vignette(url: string | null | undefined, largeur: number): string | undefined {
  if (!url) return undefined;

  try {
    const u = new URL(url);
    if (!saitRedimensionner(u.hostname)) return url;

    u.searchParams.set("width", String(Math.round(largeur)));
    return u.toString();
  } catch {
    // Adresse relative ou malformée : on la rend telle quelle.
    return url;
  }
}

/**
 * Le jeu d'adresses pour les écrans à forte densité.
 *
 * Sans lui, un téléphone récent afficherait une image prévue pour la
 * moitié de sa finesse réelle. Avec, il choisit lui-même — et sur un
 * écran ordinaire il prend la plus légère.
 */
export function jeuDeVignettes(
  url: string | null | undefined,
  largeur: number
): string | undefined {
  if (!url) return undefined;

  const simple = vignette(url, largeur);
  const double = vignette(url, largeur * 2);
  // Rien n'a changé : l'hébergeur ne sait pas redimensionner, et
  // proposer deux fois la même adresse n'apporterait rien.
  if (!simple || !double || simple === double) return undefined;

  return `${simple} 1x, ${double} 2x`;
}
