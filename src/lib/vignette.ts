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
 * QUAND ON NE CONNAÎT PAS L'HÉBERGEUR, ON PASSE PAR LE NÔTRE. Ajouter
 * un paramètre au hasard à une adresse étrangère ne redimensionne rien
 * et peut casser une adresse signée. Mais Next sait redimensionner
 * lui-même n'importe quelle image distante, et c'est ce qui manquait :
 * les couvertures de marques que tu envoies toi-même sont stockées
 * chez Supabase, qui ne redimensionne pas, et repartaient donc en
 * pleine définition dans chaque carte de l'annuaire. Une quarantaine
 * de marques suffisait à refaire tomber la page.
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

/**
 * Les largeurs que l'optimiseur de Next accepte.
 *
 * Ce n'est pas une préférence, c'est une liste blanche : demander une
 * taille absente répond 400 et l'image ne s'affiche pas du tout. Ce
 * sont les valeurs par défaut de `deviceSizes` et `imageSizes` ; les
 * changer dans `next.config.ts` obligerait à changer celle-ci aussi.
 */
const TAILLES_NEXT = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048];

/**
 * Ce que l'optimiseur ne sait pas traiter, ou n'a aucun intérêt à
 * traiter.
 *
 * Le SVG surtout : Next le refuse par sécurité, et beaucoup de logos de
 * marques en sont. Les faire passer par là les remplacerait tous par
 * une image cassée, ce qui serait un remède bien pire que le mal.
 */
const A_LAISSER = /\.(svg|gif|avif)(\?|#|$)/i;

export function vignette(url: string | null | undefined, largeur: number): string | undefined {
  if (!url) return undefined;

  try {
    const u = new URL(url);

    if (saitRedimensionner(u.hostname)) {
      u.searchParams.set("width", String(Math.round(largeur)));
      return u.toString();
    }

    if (!/^https?:$/.test(u.protocol) || A_LAISSER.test(u.pathname)) return url;

    // La plus petite taille autorisée qui couvre le besoin. Descendre
    // en dessous rendrait l'image floue sur les écrans fins.
    const w = TAILLES_NEXT.find((t) => t >= largeur) ?? TAILLES_NEXT[TAILLES_NEXT.length - 1];
    return `/_next/image?url=${encodeURIComponent(u.toString())}&w=${w}&q=75`;
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
