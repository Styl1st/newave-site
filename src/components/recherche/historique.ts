/**
 * Ce qu'on a cherché, gardé sur l'appareil et nulle part ailleurs.
 *
 * LE BLOC « TU CHERCHAIS » N'EST PAS UNE REQUÊTE. La feuille de
 * recherche occupe tout l'écran dès qu'on touche le champ, et elle est
 * vide tant qu'on n'a pas tapé deux lettres : un écran noir en attendant
 * la première frappe. On y pose donc ce que la personne a cherché la
 * dernière fois — ce qui, sur un annuaire, est très souvent ce qu'elle
 * revient chercher.
 *
 * ON NE LE MONTE PAS AU SERVEUR. Une liste de recherches est un objet
 * intime : elle dit ce qu'on regarde, à quelle heure, et combien de fois
 * on est revenu sur la même marque sans oser cliquer. Elle vit dans le
 * stockage du navigateur, elle ne traverse jamais le réseau, et elle
 * disparaît avec les données du site.
 */

const CLE = "newave:recherches";

/**
 * Six, et pas davantage.
 *
 * Au-delà, la liste ne rend plus service : on ne relit pas quinze
 * anciennes recherches, on en refait une. Elle prendrait en revanche la
 * hauteur de l'écran, en poussant hors de vue les suggestions dès la
 * deuxième lettre.
 */
const MAX = 6;

/** Bornée comme la saisie elle-même : voir `SAISIE_MAX` dans l'annuaire. */
const LONGUEUR_MAX = 80;

export function lireHistorique(): string[] {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return [];
    const liste = JSON.parse(brut);
    if (!Array.isArray(liste)) return [];
    return liste
      .filter((m): m is string => typeof m === "string")
      .map((m) => m.slice(0, LONGUEUR_MAX))
      .slice(0, MAX);
  } catch {
    // navigation privée, stockage refusé : la feuille marche sans.
    return [];
  }
}

/**
 * Range une recherche en tête, sans jamais la garder deux fois.
 *
 * La comparaison ignore la casse : « Pollen » et « pollen » sont la même
 * recherche, et les voir toutes les deux dans la liste donnerait
 * l'impression que le site ne suit pas.
 */
export function noterRecherche(mot: string): string[] {
  const propre = mot.trim().slice(0, LONGUEUR_MAX);
  if (propre.length < 2) return lireHistorique();

  const bas = propre.toLowerCase();
  const liste = [propre, ...lireHistorique().filter((m) => m.toLowerCase() !== bas)].slice(0, MAX);

  try {
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // sans mémoire, la liste vaut au moins pour cette ouverture
  }
  return liste;
}

export function oublierHistorique(): string[] {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // rien à faire de plus : la liste rendue est vide dans tous les cas
  }
  return [];
}
