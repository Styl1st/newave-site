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

/** Le libellé de la puce, côté visiteur. */
export const AUDIENCE_FILTRE: Record<Audience, string> = {
  mixte: "Mixte",
  femme: "Femme",
  homme: "Homme",
};

/** Une valeur venue de la base, ramenée à quelque chose de connu. */
export function uneAudience(valeur: string | null | undefined): Audience {
  return AUDIENCES.includes(valeur as Audience) ? (valeur as Audience) : "mixte";
}

/*
 * LA DÉDUCTION AUTOMATIQUE, ET SA PRUDENCE.
 *
 * Une boutique range ses pièces en rayons, et ces noms de rayons
 * descendent déjà chez nous avec le catalogue. « Womenswear », « Men's
 * », « Ladies » : quand ils reviennent sans contradiction, on tient une
 * réponse fiable sans avoir à la saisir cent trente-cinq fois.
 *
 * MAIS ON NE TRANCHE QUE SUR UNE MAJORITÉ FRANCHE. Une boutique qui
 * range en « Femme » ET en « Homme » est mixte, et c'est le cas le plus
 * courant. Se tromper ici coûte cher : classer une marque unisexe en
 * « Femme », c'est la faire disparaître pour la moitié des visiteurs.
 * Dans le doute, on laisse « mixte », qui n'exclut personne.
 */

const FEMME =
  /\b(?:women(?:'?s)?(?:wear)?|femme?s?|f[ée]minin\w*|ladies|girls?|dames?|robes?|jupes?|dress(?:es)?|skirts?)\b/gi;

const HOMME = /\b(?:m[ae]n(?:'?s)?(?:wear)?|hommes?|masculin\w*|boys?|gar[çc]ons?)\b/gi;

/** Combien de fois une expression apparaît dans un texte. */
function occurrences(texte: string, motif: RegExp): number {
  return texte.match(motif)?.length ?? 0;
}

/**
 * Ce que dit le catalogue d'une boutique, ou rien du tout.
 *
 * Renvoie `null` quand rien ne permet de trancher, ce qui n'est pas la
 * même chose que « mixte » : l'appelant peut ainsi distinguer une
 * déduction de l'absence de déduction, et ne pas écraser un choix fait
 * à la main.
 */
export function deduireLAudience(texte: string): Audience | null {
  if (!texte.trim()) return null;

  const f = occurrences(texte, FEMME);
  const h = occurrences(texte, HOMME);

  // Rien de significatif : deux ou trois mots isolés dans une
  // description ne suffisent pas à ranger une marque.
  if (f + h < 3) return null;

  // Les deux vestiaires sont représentés : c'est une boutique mixte, et
  // c'est une vraie réponse, pas un échec.
  const total = f + h;
  if (f / total > 0.8) return "femme";
  if (h / total > 0.8) return "homme";
  return "mixte";
}
