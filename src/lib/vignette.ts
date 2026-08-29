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

    /*
     * TOUT PASSE EN HTTPS, ET C'EST LA CORRECTION LA PLUS UTILE DE CE
     * FICHIER.
     *
     * Des marques ont enregistré leur adresse en `http` tout court.
     * NEWAVE est servi en `https`, et un navigateur REFUSE de charger
     * une image non chiffrée dans une page chiffrée : il la bloque, sans
     * erreur visible, sans rien dans la console pour le visiteur
     * ordinaire. La carte reste blanche.
     *
     * On ne perd rien à forcer : un hébergeur qui ne sait pas répondre
     * en `https` ne pouvait de toute façon pas afficher cette image chez
     * nous. Au pire elle reste absente, comme avant ; au mieux, et c'est
     * le cas général puisque tous les CDN modernes le savent, elle
     * apparaît enfin.
     */
    u.protocol = "https:";

    /*
     * ON EFFACE LES CONSIGNES DE DÉCOUPE, ET AVANT TOUT LE RESTE.
     *
     * Beaucoup d'adresses enregistrées à l'import portent déjà des
     * paramètres de taille : le logo de Kwest était stocké en
     * `?crop=center&height=32&width=32`, soit la vignette de
     * trente-deux pixels que la boutique utilise dans son onglet.
     *
     * Ce nettoyage était plus bas, dans la branche des hébergeurs qui
     * savent redimensionner. Les LOGOS n'y passent jamais : ils partent
     * par NEWAVE juste au-dessus, et emportaient donc leur `width=32`
     * avec eux. On récupérait fidèlement une image de trente-deux
     * pixels, précisément le cas qu'on voulait corriger.
     *
     * En le remontant ici, il vaut pour tous les chemins. Une adresse
     * de favicon redevient le fichier d'origine.
     */
    for (const cle of ["width", "height", "crop", "size"]) u.searchParams.delete(cle);

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
 * La même adresse, mais demandée en tant que SONDE.
 *
 * UNE SONDE EST UNE IMAGE QU'ON LIT SANS JAMAIS L'AFFICHER. Deux
 * endroits du site en posent une : `Teinte`, qui en tire la couleur
 * dominante d'une carte, et `VisuelAdaptatif`, qui regarde si un logo a
 * un fond transparent. Toutes deux réclament l'image en mode « croisé »
 * (`crossOrigin`), sans quoi la toile refuserait de rendre ses pixels.
 *
 * ET C'EST LÀ QUE LE REPLI DE `/api/img` SE RETOURNE CONTRE NOUS. La
 * route ne casse jamais un visuel : à la moindre contrariété — hôte
 * inconnu, réponse qui n'est pas une image, boutique qui renvoie sa page
 * d'accueil à la place du fichier — elle redirige vers l'adresse
 * d'origine. Pour une balise `img` ordinaire, c'est exactement ce qu'il
 * faut. Pour une demande croisée, c'est fatal : le navigateur suit la
 * redirection, arrive chez un hébergeur qui n'envoie pas d'en-tête
 * `Access-Control-Allow-Origin`, et refuse tout en bloc. La sonde
 * échoue, et surtout elle écrit une erreur CORS rouge dans la console —
 * une par marque concernée, à chaque chargement de l'annuaire.
 *
 * En marquant la demande d'un `s=1`, la route sait qu'elle parle à une
 * sonde et cesse de rediriger : elle répond un pixel transparent, depuis
 * notre propre domaine. La sonde conclut « je n'ai rien pu lire », ce
 * qui est la vérité, et la console reste vide.
 *
 * Une adresse qui ne passe pas par nous est rendue telle quelle : on ne
 * réécrit pas l'adresse d'un hébergeur.
 */
export function enSonde(adresse: string): string {
  try {
    const base = typeof location !== "undefined" ? location.href : "https://newave.invalid";
    const u = new URL(adresse, base);
    if (u.pathname !== "/api/img") return adresse;

    const cible = u.searchParams.get("u");
    if (!cible) return adresse;

    /*
     * `u` DOIT RESTER LE DERNIER PARAMÈTRE, et ce n'est pas cosmétique.
     * `VisuelAdaptatif` reconnaît un JPEG à la terminaison de l'adresse
     * pour s'épargner une lecture inutile — un JPEG ne sait pas être
     * transparent. En laissant `s=1` se ranger à la fin, l'adresse ne se
     * terminait plus par `.jpg` et cette économie disparaissait : une
     * requête de plus par photo, pour une réponse connue d'avance.
     */
    u.searchParams.delete("u");
    u.searchParams.set("s", "1");
    const avant = u.searchParams.toString();

    // Relative : la sonde doit rester sur notre domaine, sinon on
    // recrée le problème qu'on est en train de régler.
    return `${u.pathname}?${avant}&u=${encodeURIComponent(cible)}`;
  } catch {
    return adresse;
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
