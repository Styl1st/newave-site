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
 * adresse signée, et une image cassée est bien pire qu'une image
 * lourde.
 *
 * QUAND L'HÉBERGEUR NE SAIT PAS, C'EST NEWAVE QUI LE FAIT.
 *
 * La première tentative passait par l'optimiseur de Next, et elle avait
 * remplacé la moitié des couvertures de l'annuaire par des cadres
 * vides. On sait maintenant pourquoi : sur une offre gratuite, cet
 * optimiseur est plafonné à quelques milliers d'images par mois, et
 * au-delà il répond par une erreur. Avec plusieurs centaines de visuels
 * de marques, le plafond tombe en quelques jours.
 *
 * `/api/img` fait le même travail sans plafond, et surtout elle ne peut
 * pas casser une image : au moindre imprévu elle redirige vers
 * l'adresse d'origine, c'est-à-dire vers le comportement d'avant. Une
 * page un peu lourde reste une page qui marche, et c'est ce principe
 * qui a été gardé.
 *
 * La mémoire se règle donc ailleurs, là où c'est sans risque : la
 * grille n'affiche que vingt-quatre marques à la fois (voir
 * `BrandGrid`), ce qui avait déjà réglé le problème pour les pièces.
 */

/**
 * Les hôtes dont on sait qu'ils redimensionnent avec `width`.
 *
 * ON RECONNAÎT AUSSI SHOPIFY AU CHEMIN, ET PAS SEULEMENT AU DOMAINE.
 * Une boutique un peu installée sert ses images derrière son propre nom
 * — `marque.com/cdn/shop/files/...` — et c'est pourtant le même CDN, qui
 * accepte le même paramètre. En ne regardant que le domaine, on passait
 * à côté de la majorité des boutiques : elles ne comptaient pas comme
 * redimensionnables, donc leurs photos partaient en pleine définition
 * dans des vignettes de trois cents pixels. C'est l'essentiel des
 * « images retaillées dans le navigateur » que signale l'analyse.
 */
function saitRedimensionner(u: URL): boolean {
  const hote = u.hostname;

  if (
    hote === "cdn.shopify.com" ||
    hote.endsWith(".myshopify.com") ||
    hote.endsWith(".cdn.shopify.com")
  ) {
    return true;
  }

  // Le même CDN, derrière le nom de domaine de la boutique.
  if (u.pathname.startsWith("/cdn/shop/") || u.pathname.startsWith("/cdn/shopifycloud/")) {
    return true;
  }

  return false;
}

/** Squarespace redimensionne aussi, mais avec sa propre syntaxe. */
function estSquarespace(u: URL): boolean {
  return u.hostname.endsWith("squarespace-cdn.com");
}

export type OptionsVignette = {
  /**
   * C'est un LOGO de marque, pas une photo.
   *
   * Deux conséquences : on passe toujours par NEWAVE, même chez un
   * hébergeur qui saurait redimensionner, et l'on demande le rognage des
   * marges vides. Un logo exporté pour un en-tête de site traîne
   * souvent des centaines de pixels de blanc autour du mot, et le site
   * le recevait alors comme une bannière à montrer en entier : le nom se
   * retrouvait écrasé en un mince bandeau au milieu de la carte.
   *
   * Le surcoût est modeste : il y a un logo par marque, contre des
   * dizaines de photos par catalogue.
   */
  logo?: boolean;
};

export function vignette(
  url: string | null | undefined,
  largeur: number,
  options: OptionsVignette = {}
): string | undefined {
  if (!url) return undefined;

  try {
    const u = new URL(url);
    const l = Math.round(largeur);

    if (options.logo && process.env.NEXT_PUBLIC_IMAGES_DIRECTES !== "1") {
      return `/api/img?w=${l}&t=1&u=${encodeURIComponent(u.toString())}`;
    }

    if (saitRedimensionner(u)) {
      u.searchParams.set("width", String(l));
      return u.toString();
    }

    if (estSquarespace(u)) {
      /*
       * Squarespace ne connaît qu'une liste de largeurs, et refuse tout
       * ce qui n'en fait pas partie. Demander « 640 » ne renvoie pas une
       * image de 640 pixels : ça renvoie une erreur. On monte donc au
       * palier immédiatement supérieur, quitte à charger un peu plus
       * large que nécessaire.
       */
      const paliers = [100, 300, 500, 750, 1000, 1500, 2500];
      const palier = paliers.find((p) => p >= l) ?? 2500;
      u.searchParams.set("format", `${palier}w`);
      return u.toString();
    }

    /*
     * L'hébergeur ne sait pas redimensionner : on passe par NEWAVE.
     *
     * C'est ce qui ramène quatre-vingt-dix-huit domaines à un seul, et
     * ce qui donne enfin un cache à des images qui n'en avaient aucun.
     * La route ne peut pas casser un visuel : au moindre imprévu elle
     * renvoie vers cette même adresse. Voir `app/api/img/route.ts`.
     *
     * LE COUPE-CIRCUIT. `NEXT_PUBLIC_IMAGES_DIRECTES=1` remet tout le
     * monde en direct, sans toucher au code. Si la route pose un jour un
     * problème en production, c'est une variable à changer, pas un
     * déploiement à défaire.
     */
    if (process.env.NEXT_PUBLIC_IMAGES_DIRECTES === "1") return url;
    return `/api/img?w=${l}&u=${encodeURIComponent(u.toString())}`;
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
  largeur: number,
  options: OptionsVignette = {}
): string | undefined {
  if (!url) return undefined;

  const simple = vignette(url, largeur, options);
  const double = vignette(url, largeur * 2, options);
  // Rien n'a changé : l'hébergeur ne sait pas redimensionner, et
  // proposer deux fois la même adresse n'apporterait rien.
  if (!simple || !double || simple === double) return undefined;

  return `${simple} 1x, ${double} 2x`;
}
