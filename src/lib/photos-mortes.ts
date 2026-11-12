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
export function decider(piece: Piece, etats: Map<string, Etat>): Decision {
  const photos = photosDe(piece);
  const mortes = photos.filter((a) => etats.get(a) === "morte");
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
