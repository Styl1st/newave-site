/**
 * Le clavier d'une rangée d'onglets, selon le motif ARIA « tabs » :
 * les flèches passent à l'onglet voisin en bouclant, Début et Fin vont
 * aux extrémités. Les autres touches ne font rien (`null`).
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */
export function ongletApresTouche<T extends string>(onglets: readonly T[], courant: string, touche: string): T | null {
  if (onglets.length === 0) return null;
  const i = onglets.indexOf(courant as T);
  const n = onglets.length;
  switch (touche) {
    case "ArrowRight":
      return i < 0 ? onglets[0] : onglets[(i + 1) % n];
    case "ArrowLeft":
      return i < 0 ? onglets[0] : onglets[(i - 1 + n) % n];
    case "Home":
      return onglets[0];
    case "End":
      return onglets[n - 1];
    default:
      return null;
  }
}
