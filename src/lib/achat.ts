/**
 * Les libellés des boutons qui envoient chez la marque.
 *
 * Un même geste garde le même nom partout : le grand bouton de la
 * fiche pièce et la barre collée en bas de l'écran au téléphone disent
 * exactement la même chose, d'où ces fonctions communes.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

export function libelleAchat(piece: { disponible: boolean; retiree: boolean }, marque: string): string {
  if (piece.retiree) return `Voir ce que propose ${marque} aujourd'hui`;
  return piece.disponible ? `Acheter chez ${marque}` : "Voir la fiche chez la marque";
}

/** Vinted, Depop, Etsy... ont leur propre libellé (`plateformeDeVente`). */
export function libelleBoutique(plateforme: { bouton: string } | null | undefined): string {
  return plateforme?.bouton ?? "Voir la boutique";
}
