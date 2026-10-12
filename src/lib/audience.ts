/**
 * À qui une marque s'adresse.
 *
 * POURQUOI CE N'EST PAS UNE CATÉGORIE DE PLUS. Streetwear, Grunge ou
 * Denim disent ce qu'une marque FAIT. Homme ou femme dit à qui elle le
 * fait, et ces deux questions ne se posent pas au même moment : on
 * cherche d'abord un vestiaire, puis un style dedans. Mélangées dans la
 * même rangée de puces, elles s'annulent, parce que cocher « Femme » et
 * « Grunge » aurait alors voulu dire la même chose que cocher deux
 * styles.
 *
 * TROIS VALEURS, ET « MIXTE » EST LA NORMALE. La plupart des marques
 * indépendantes ne segmentent pas : elles font des vêtements, on prend
 * sa taille. Ranger tout le monde dans une case serait leur prêter une
 * intention qu'elles n'ont pas, et fabriquerait une information fausse
 * plutôt que de laisser un blanc.
 *
 * Fichier pur : il sert aux filtres du site comme au formulaire
 * d'administration.
 */

export const AUDIENCES = ["mixte", "femme", "homme"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Le libellé dans le formulaire d'administration. */
export const AUDIENCE_LABEL: Record<Audience, string> = {
  mixte: "Mixte, ou non précisé",
  femme: "Plutôt féminin",
  homme: "Plutôt masculin",
};

/** Une phrase sous le champ, pour ne pas avoir à deviner. */
export const AUDIENCE_AIDE: Record<Audience, string> = {
  mixte: "C'est le cas normal : la marque ne sépare pas ses vêtements par genre.",
  femme: "La marque présente son vestiaire comme féminin, ou ne propose que ça.",
  homme: "La marque présente son vestiaire comme masculin, ou ne propose que ça.",
};

/** Une valeur venue de la base, ramenée à quelque chose de connu. */
export function uneAudience(valeur: string | null | undefined): Audience {
  return AUDIENCES.includes(valeur as Audience) ? (valeur as Audience) : "mixte";
}
