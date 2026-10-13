/**
 * LA MISE EN AVANT D'UNE PIÈCE, ET SA LIMITE.
 *
 * La case « Mettre en avant » existait sur chaque pièce sans que rien,
 * nulle part, ne la lise : une marque qui la cochait ne voyait aucun
 * changement. Elle a maintenant un effet, le même partout où les pièces
 * d'une marque se rangent :
 *
 *   — sur la page de la marque, ses pièces en avant viennent en tête ;
 *   — sur l'accueil et dans la vitrine `/pieces`, elles passent avant
 *     les autres pièces de la marque (migration 43 pour la vitrine).
 *
 * QUATRE AU PLUS. Mettre en avant, c'est choisir. Une marque qui
 * pourrait tout cocher reviendrait à l'ordre de sa boutique, en plus
 * bruyant ; et dans la vitrine, une marque à cent pièces « en avant »
 * repousserait toutes les autres. Quatre, c'est une rangée de la page
 * de la marque sur ordinateur, deux sur téléphone.
 */
export const MAX_EN_AVANT = 4;

/** Le message d'une mise en avant refusée, le même partout. */
export function phraseDuMaximum(deja: number): string {
  return deja >= MAX_EN_AVANT
    ? `Tu as déjà ${MAX_EN_AVANT} pièces en avant, le maximum. Retire-en une pour en choisir une autre.`
    : `${MAX_EN_AVANT} pièces en avant au maximum : il ne t'en reste que ${MAX_EN_AVANT - deja} à choisir.`;
}

/**
 * Trie des pièces d'une marque : en avant d'abord, sans changer l'ordre
 * des autres. Le tri de JavaScript est stable : deux pièces de même
 * rang gardent l'ordre reçu (celui de la boutique).
 */
export function enAvantDabord<T extends { featured?: boolean | null }>(pieces: readonly T[]): T[] {
  return pieces.slice().sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}
