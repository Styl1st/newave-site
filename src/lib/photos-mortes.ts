/**
 * LES PHOTOS QUI N'EXISTENT PLUS CHEZ LA MARQUE.
 *
 * Une marque retire une pièce de sa boutique : sa photo disparaît de son
 * hébergeur, mais la pièce reste en vitrine jusqu'à la prochaine relecture
 * du catalogue. Entre-temps, on montre un cadre vide.
 *
 * Le navigateur qui voit une photo échouer le signale (voir
 * `lib/image-progressive`). Ce module dit ce que le serveur en fait,
 * sans réseau ni base : de quoi le tester à part.
 *
 * LA RÈGLE, PRUDENTE PAR CONSTRUCTION :
 *   — seule une réponse 404 ou 410 de l'hébergeur prouve qu'une photo
 *     est morte. Une panne, un délai, un 403 ou un 500 ne prouvent rien :
 *     on ne touche à rien ;
 *   — quelques photos mortes sur plusieurs : on les retire de la galerie ;
 *   — toutes mortes : la pièce est retirée de la vitrine (datée, comme
 *     le fait la relecture des catalogues, pas effacée). Si elle revient
 *     dans la boutique, la relecture suivante lève le retrait d'elle-même ;
 *   — aucune photo ne s'affiche, sans preuve qu'elles sont mortes (un
 *     hébergeur qui répond 403 à tout ce qui n'est pas un navigateur,
 *     par exemple) : on regarde alors la PAGE de la pièce chez la marque.
 *     Introuvable (404, 410) ou renvoyée vers l'accueil de la boutique,
 *     la pièce n'est plus en vente : elle est retirée aussi ;
 *   — une pièce saisie à la main (sans `source_id`) n'est jamais retirée :
 *     aucune relecture ne la rétablirait.
 */

/** Une adresse d'image qu'on accepte d'aller lire depuis le serveur. */
export function adresseSure(brute: string): URL | null {
  let u: URL;
  try {
    u = new URL(brute);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return null;
  // Pas d'adresse IP écrite en chiffres : une photo de boutique vit
  // toujours sous un nom de domaine.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":") || h.startsWith("[")) return null;
  return u;
}

/** Une vidéo n'est pas une photo : elle ne compte ni pour ni contre. */
export function estUneVideo(adresse: string): boolean {
  return /\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(adresse);
}

/** Ce qu'une réponse de l'hébergeur prouve. */
export type Etat = "vivante" | "morte" | "inconnu";

export function etatDuStatut(statut: number): Etat {
  if (statut === 404 || statut === 410) return "morte";
  if (statut >= 200 && statut < 300) return "vivante";
  return "inconnu";
}

export type Piece = {
  images: string[] | null;
  image_url: string | null;
  source_id: string | null;
};

/** Ce que dit la page de la pièce chez la marque. */
export type Page = "presente" | "disparue" | "inconnu";

/**
 * La page d'une pièce, d'après la réponse finale et l'adresse où l'ont
 * menée les redirections. Une boutique qui a retiré une pièce répond
 * 404, ou renvoie vers son accueil : Big Cartel, Shopify et WooCommerce
 * font l'un ou l'autre.
 */
export function etatDeLaPage(statut: number, adresseFinale: string, adresseDemandee: string): Page {
  if (statut === 404 || statut === 410) return "disparue";
  if (statut < 200 || statut >= 300) return "inconnu";
  try {
    const fin = new URL(adresseFinale);
    const debut = new URL(adresseDemandee);
    const accueil = fin.pathname === "/" || fin.pathname === "";
    if (accueil && debut.pathname !== "/" && debut.pathname !== "") return "disparue";
  } catch {
    return "inconnu";
  }
  return "presente";
}

export type Decision =
  | { action: "rien" }
  | { action: "nettoyer"; images: string[]; image_url: string | null }
  | { action: "retirer" };

/** Les photos à vérifier : la galerie si elle existe, sinon la photo principale. */
export function photosDe(piece: Piece): string[] {
  const galerie = (piece.images ?? []).filter(Boolean);
  const toutes = galerie.length > 0 ? galerie : piece.image_url ? [piece.image_url] : [];
  return [...new Set(toutes)].filter((a) => !estUneVideo(a));
}

/**
 * Ce qu'on fait de la pièce, d'après l'état de chacune de ses photos.
 * Un seul « inconnu » parmi les autres suffit à ne pas retirer la pièce :
 * on ne sait pas si cette photo-là s'affiche.
 */
export function decider(piece: Piece, etats: Map<string, Etat>, page: Page = "inconnu"): Decision {
  const photos = photosDe(piece);
  const mortes = photos.filter((a) => etats.get(a) === "morte");

  /* Aucune photo ne s'affiche, et la boutique ne vend plus la pièce. */
  const aucuneVivante = photos.length > 0 && photos.every((a) => etats.get(a) !== "vivante");
  if (aucuneVivante && page === "disparue") {
    return piece.source_id ? { action: "retirer" } : { action: "rien" };
  }

  if (mortes.length === 0) return { action: "rien" };

  const restantes = photos.filter((a) => etats.get(a) !== "morte");
  if (restantes.length === 0) {
    return piece.source_id ? { action: "retirer" } : { action: "rien" };
  }

  const mort = new Set(mortes);
  const images = (piece.images ?? []).filter((a) => !mort.has(a));
  const image_url =
    piece.image_url && !mort.has(piece.image_url) ? piece.image_url : (restantes[0] ?? null);
  return { action: "nettoyer", images, image_url };
}
