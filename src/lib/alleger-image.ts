/**
 * Alléger une image AVANT de l'envoyer.
 *
 * Une photo prise au téléphone fait aujourd'hui quatre à huit
 * mégaoctets et mesure 4000 pixels de large. Elle est affichée sur le
 * site dans un cadre de 900 pixels au plus. On stockait donc, on
 * servait, et on faisait télécharger vingt fois ce qui était utile —
 * pour un résultat rigoureusement identique à l'œil.
 *
 * Le travail est fait DANS LE NAVIGATEUR, avant l'envoi. Trois raisons,
 * et la dernière est la plus importante :
 *
 *   — le serveur n'a rien à faire, donc rien à payer ;
 *   — l'envoi lui-même devient vingt fois plus rapide, ce qui se
 *     remarque immédiatement sur une connexion mobile ;
 *   — l'octet économisé l'est PARTOUT à la fois : dans le stockage
 *     Supabase, dans la bande passante, et chez chaque visiteur.
 *
 * Le format de sortie est WebP. À qualité perçue égale il pèse environ
 * trente pour cent de moins que le JPEG, et tous les navigateurs en
 * circulation le lisent.
 */

/** Ce qu'on ne touche pas : ces formats ont de bonnes raisons d'exister. */
const INTOUCHABLES = /^image\/(svg\+xml|gif)$/;

export type Allegement = {
  fichier: File;
  /** Vrai si l'image a effectivement été retravaillée. */
  modifie: boolean;
  avant: number;
  apres: number;
};

/**
 * @param maxCote la plus grande dimension autorisée, en pixels
 * @param qualite de 0 à 1
 */
export async function allegerImage(
  fichier: File,
  { maxCote = 1800, qualite = 0.82 }: { maxCote?: number; qualite?: number } = {}
): Promise<Allegement> {
  const inchange: Allegement = {
    fichier,
    modifie: false,
    avant: fichier.size,
    apres: fichier.size,
  };

  /*
   * Un SVG est du texte : le passer dans un canevas le transformerait
   * en pixels, donc lui ferait perdre ce qui fait sa valeur. Un GIF
   * peut être animé, et le canevas n'en garderait que la première
   * image — un logo qui bouge deviendrait fixe sans prévenir.
   */
  if (INTOUCHABLES.test(fichier.type)) return inchange;
  if (!fichier.type.startsWith("image/")) return inchange;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(fichier);
  } catch {
    // Format exotique ou fichier abîmé : on envoie l'original plutôt
    // que de refuser. Mieux vaut une image lourde que pas d'image.
    return inchange;
  }

  const facteur = Math.min(1, maxCote / Math.max(bitmap.width, bitmap.height));
  const largeur = Math.round(bitmap.width * facteur);
  const hauteur = Math.round(bitmap.height * facteur);

  const canevas = document.createElement("canvas");
  canevas.width = largeur;
  canevas.height = hauteur;

  const ctx = canevas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return inchange;
  }

  // Sans ce réglage, une grande photo réduite d'un coup ressort
  // crénelée : le navigateur échantillonne au lieu de moyenner.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canevas.toBlob(resolve, "image/webp", qualite)
  );
  if (!blob) return inchange;

  /*
   * On garde l'original s'il est déjà plus léger.
   *
   * Le cas se produit vraiment : une petite illustration en PNG avec
   * peu de couleurs, ou une image déjà optimisée, ressort parfois plus
   * grosse après une conversion en WebP. Réencoder pour la première
   * fois dégrade sans rien gagner, et deux fois dégrade deux fois.
   */
  if (blob.size >= fichier.size) return inchange;

  const nom = fichier.name.replace(/\.[^.]+$/, "") || "image";
  return {
    fichier: new File([blob], `${nom}.webp`, { type: "image/webp" }),
    modifie: true,
    avant: fichier.size,
    apres: blob.size,
  };
}

/** « 4,2 Mo », « 180 Ko ». */
export function poids(octets: number): string {
  if (octets >= 1024 * 1024) {
    return `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  }
  return `${Math.round(octets / 1024)} Ko`;
}
