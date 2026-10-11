/**
 * Les tailles d'une pièce, rangées en deux listes à lire.
 *
 * Elles s'affichaient en pastilles : on tapait dessus, rien ne se
 * passait, et un paragraphe devait expliquer que ce n'étaient pas des
 * boutons. Deux phrases suffisent : « En stock : M, L, XL » et
 * « Épuisé : XS, S ». L'ordre de la boutique est gardé.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */
export function repartirTailles(tailles: { label: string; available: boolean }[]): {
  enStock: string[];
  epuisees: string[];
} {
  return {
    enStock: tailles.filter((t) => t.available).map((t) => t.label),
    epuisees: tailles.filter((t) => !t.available).map((t) => t.label),
  };
}
