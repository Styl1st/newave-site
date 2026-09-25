import { PRODUCT_CATEGORIES } from "./taxonomy";

/**
 * Le rayon d'une pièce, c'est-à-dire sa FAMILLE : Hauts, Bas, Vestes…
 *
 * Il se DEVINAIT ici, à partir du seul nom, avec une liste de règles
 * qui ne connaissait que huit mots. Ce travail a déménagé dans
 * `lib/tags`, qui lit d'abord ce que la boutique déclare (type,
 * collections, catégories) et pose en plus un tag fin (T-shirts,
 * Hoodies, Bombers). Les règles de priorité d'ici (« tie-dye » n'est
 * pas une cravate, « short sleeve » n'est pas un short, le denim ne
 * parle qu'en dernier) y ont été reprises une à une.
 *
 * Ce fichier ne garde que ce qui LIT un rayon déjà posé.
 */

/**
 * Range une liste de pièces par rayon, dans l'ordre de la taxonomie.
 *
 * Ce qui n'a pas de rayon n'est pas perdu : ces pièces sont
 * rassemblées à la fin. Une pièce invisible parce que mal classée est
 * un défaut bien pire qu'un rayon approximatif.
 */
export function compterLesRayons(
  pieces: { categories?: string[] | null }[]
): { rayon: string; total: number }[] {
  const compte = new Map<string, number>();

  for (const p of pieces) {
    const rayon = (p.categories ?? []).find((c) =>
      (PRODUCT_CATEGORIES as readonly string[]).includes(c)
    );
    const cle = rayon ?? "Autres";
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }

  const ordre = [...PRODUCT_CATEGORIES, "Autres"];
  return ordre
    .filter((r) => compte.has(r))
    .map((rayon) => ({ rayon, total: compte.get(rayon) ?? 0 }));
}

/** Le rayon d'une pièce, tel qu'on l'affiche. */
export function rayonDe(piece: { categories?: string[] | null }): string {
  return (
    (piece.categories ?? []).find((c) =>
      (PRODUCT_CATEGORIES as readonly string[]).includes(c)
    ) ?? "Autres"
  );
}
