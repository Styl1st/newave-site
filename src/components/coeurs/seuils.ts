/**
 * Les seuils de la page des coups de cœur.
 *
 * POURQUOI UN FICHIER, ET PAS UNE CONSTANTE DANS LE COMPOSANT. Le seuil
 * décide de trois choses qui ne vivent pas au même endroit : le podium
 * (dans `ClassementMarques`, un composant client), le sélecteur de
 * période (dans la page, un composant serveur) et la barre de
 * progression du rail. Il ne peut donc pas être écrit dans l'un des
 * trois sans que les deux autres aillent le chercher.
 *
 * ET IL NE PEUT PAS ÊTRE EXPORTÉ D'UN FICHIER « use client ». C'est le
 * piège qui a décidé de ce fichier : quand un composant serveur importe
 * quoi que ce soit d'un module marqué `use client`, Next remplace
 * l'import par une RÉFÉRENCE — un objet-marqueur que React saura résoudre
 * dans le navigateur. Pour un composant, c'est exactement ce qu'on veut ;
 * pour un nombre, on récupère cet objet à la place de 100, et
 * `total >= SEUIL_PODIUM` devient faux en silence, sans erreur, sans
 * rien dans la console. Un module ordinaire, lui, est lu des deux côtés
 * et rend bien un nombre.
 *
 * Ces valeurs sont un POINT DE DÉPART, pas une vérité : elles bougeront
 * à mesure que le site se remplit. C'est toute la raison pour laquelle
 * elles sont ici, et non écrites au milieu d'une condition ou d'un JSX.
 */

/**
 * Combien de cœurs il faut sur l'annuaire pour qu'un classement veuille
 * dire quelque chose.
 *
 * En dessous, deux choses disparaissent : le podium — trois voix d'écart
 * y suffiraient à tout renverser — et le sélecteur de période, qui
 * découperait en trois un total déjà trop maigre pour être découpé.
 */
export const SEUIL_PODIUM = 100;

/**
 * Le même seuil, côté pièces : combien de coups de cœur, toutes pièces
 * confondues et depuis l'ouverture, avant que leur classement montre
 * ses chiffres et propose « 7 jours ».
 *
 * Le même nombre que les marques, pour la même raison : en dessous, un
 * seul clic réordonne la liste. Une constante à part quand même, parce
 * que les deux ne se rempliront pas au même rythme.
 */
export const SEUIL_PIECES = 100;

type QuoiClasse = "marques" | "pieces";
type MesureClassee = "coeurs" | "elan" | "avis";
type Fenetre = "semaine" | "mois" | "toujours";

/**
 * Les fenêtres de temps qu'un classement a le droit de proposer.
 *
 *   La note ne dépend pas du temps : jamais de fenêtre.
 *   Les marques : semaine, mois et toujours, au-dessus de `SEUIL_PODIUM`.
 *   Les pièces : semaine et toujours (les deux seules vues de la base),
 *   au-dessus de `SEUIL_PIECES`.
 *
 * Sous le seuil, aucune : la page retombe alors sur « depuis toujours ».
 * Découper un total déjà maigre en sept jours donnait « 2 pièces à
 * 1 cœur », qui se lit comme un classement alors que c'est un hasard.
 *
 * `total` est le nombre de cœurs de TOUT ce qui peut être classé, pas
 * de ce qui est affiché.
 */
export function fenetresDuClassement(quoi: QuoiClasse, mesure: MesureClassee, total: number): Fenetre[] {
  if (mesure === "avis") return [];
  if (quoi === "marques") return total >= SEUIL_PODIUM ? ["semaine", "mois", "toujours"] : [];
  return total >= SEUIL_PIECES ? ["semaine", "toujours"] : [];
}

/**
 * Les cœurs se comptent-ils à l'écran ?
 *
 * Sous le seuil, la page montre ce qui a plu, dans l'ordre, mais sans
 * chiffre : « 1 » au bout de chaque ligne ne disait rien de la pièce,
 * seulement que le site venait d'ouvrir. Les notes gardent les leurs,
 * elles ont leur propre minimum (le nombre d'avis).
 */
export function chiffresAffiches(quoi: QuoiClasse, mesure: MesureClassee, total: number): boolean {
  if (mesure === "avis") return true;
  return total >= (quoi === "marques" ? SEUIL_PODIUM : SEUIL_PIECES);
}

/**
 * Combien de marques à découvrir dans le bloc « Le premier cœur est à
 * prendre ». Quatre, comme la maquette : une rangée sur ordinateur, deux
 * sur téléphone.
 */
export const CARTES_A_DECOUVRIR = 4;

/**
 * Combien de marques sans cœur on descend jusqu'au navigateur.
 *
 * Le bouton « Une autre série » a besoin d'une réserve, mais pas de tout
 * l'annuaire. Sur un site jeune, « sans cœur » veut dire presque toutes
 * les marques : les envoyer entières — description, adresses, visuels —
 * ferait passer plusieurs centaines de kilo-octets dans la page pour un
 * bloc dont on regarde quatre cartes. Six séries suffisent largement à
 * ce qu'on cherche ici, et la phrase du bloc continue d'annoncer le
 * VRAI nombre de marques sans cœur, pas la taille de la réserve.
 */
export const RESERVE_A_DECOUVRIR = CARTES_A_DECOUVRIR * 6;

/**
 * Combien de lignes de classement d'un coup, avant « voir plus ».
 *
 * Le même lot que l'annuaire, et pour la raison qu'explique `BrandGrid` :
 * ce n'est pas du confort de lecture, c'est ce qui empêche un téléphone
 * de recharger la page en boucle. Cent vingt lignes rendues d'un coup,
 * ce sont cent vingt visuels à décoder, et un navigateur mobile vide
 * alors la page pour récupérer sa mémoire.
 *
 * IL EST ICI ET PLUS DANS `ClassementMarques` parce qu'il sert
 * maintenant aux cinq onglets — marques comme pièces. Deux constantes
 * jumelles dans deux fichiers auraient fini par diverger, et l'on aurait
 * eu deux paginations différentes sur une page qu'on vient justement
 * d'uniformiser.
 */
export const LIGNES_PAR_LOT = 24;

/**
 * Combien de « vient d'être mis de côté » dans le rail.
 *
 * Trois. Ce bloc ne raconte pas l'historique du site, il répond à « est-ce
 * que ça bouge ? » — et trois lignes y répondent aussi bien que dix, sans
 * pousser hors de l'écran les deux blocs qui suivent.
 */
export const MISES_DE_COTE_RECENTES = 3;
