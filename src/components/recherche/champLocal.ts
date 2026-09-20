/**
 * Qui répond à ⌘K sur cette page, du champ ou du pop-up.
 *
 * POURQUOI CE FICHIER EXISTE. Le raccourci est déjà capté à trois
 * endroits : l'accueil (`RechercheAccueil`), l'annuaire
 * (`BrandDirectory`) et la vitrine (`PieceDirectory`). Chacun met le
 * curseur dans SON champ, celui qui est sous les yeux, et c'est le bon
 * comportement — sur l'annuaire, ⌘K doit filtrer la liste qu'on est en
 * train de lire, pas ouvrir une recherche par-dessus.
 *
 * Le pop-up de la barre, lui, écoute la même touche depuis toutes les
 * pages. Sans arbitrage, on obtiendrait deux écouteurs qui se
 * déclenchent sur la même frappe : le champ prend le curseur, le pop-up
 * s'ouvre par-dessus et le lui reprend. Rien ne plante, mais le
 * raccourci ne fait plus deux fois la même chose au même endroit.
 *
 * UN COMPTEUR PLUTÔT QU'UN BOOLÉEN. Pendant une navigation, React monte
 * la page qui arrive avant de démonter celle qui part : deux champs
 * coexistent le temps d'un rendu. Un booléen remis à faux par le
 * démontage du premier laisserait le pop-up reprendre la main alors
 * qu'un champ est bel et bien à l'écran.
 *
 * Il vit en variable de module et non dans un contexte React : le
 * pop-up ne le lit qu'au moment de la frappe, jamais au rendu. Le
 * passer en état ferait rendre la barre entière à chaque changement de
 * page, pour une valeur que personne n'affiche.
 */

let champs = 0;

/**
 * À appeler dans un `useEffect` sans dépendance : la valeur rendue est
 * la fonction de nettoyage, que React appelle au démontage.
 *
 *     useEffect(() => declarerChampLocal(), []);
 */
export function declarerChampLocal(): () => void {
  champs += 1;
  let rendu = false;
  return () => {
    /* Le mode strict du développement monte, démonte et remonte : sans
       ce verrou, le second nettoyage décompterait un champ qui n'a
       jamais été déclaré, et le compteur tomberait sous zéro. */
    if (rendu) return;
    rendu = true;
    champs -= 1;
  };
}

/** Vrai quand la page porte son propre champ de recherche. */
export function aUnChampLocal(): boolean {
  return champs > 0;
}
