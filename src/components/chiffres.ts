/**
 * Les nombres des compteurs, écrits comme on les écrit en français.
 *
 * POURQUOI PAS `Intl.NumberFormat`. Ces compteurs sont calculés sur le
 * serveur, envoyés au navigateur, puis réhydratés par React — qui
 * compare alors le texte rendu des deux côtés. Or Node et un
 * navigateur n'embarquent pas forcément les mêmes données de langue :
 * l'un pose une espace insécable large là où l'autre met une espace
 * fine, et React signale une différence sur un chiffre pourtant
 * identique. Un découpage à la main donne exactement le même texte
 * partout, et c'est tout ce qu'on demande ici.
 *
 * L'espace choisie est la fine insécable (U+202F), celle de la
 * typographie française : elle sépare les tranches sans qu'un retour à
 * la ligne puisse couper le nombre en deux.
 */
export function enChiffres(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}
