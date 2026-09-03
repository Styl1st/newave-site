/**
 * Ce que la page publique et la retouche doivent écrire pareil.
 *
 * LA RÈGLE DE CET ÉCRAN : hors retouche, pas un pixel ne change. Or
 * deux blocs de la fiche existent en deux exemplaires — celui que le
 * serveur rend pour tout le monde, et celui que la retouche rend pour
 * le gérant. Deux copies de la même longue chaîne de classes, c'est une
 * copie qu'on corrigera et une qu'on oubliera : au premier réglage de
 * marge, la page se mettrait à bouger en entrant en retouche.
 *
 * Elles sont donc écrites ici, une fois, et les deux les lisent. La
 * typographie est séparée du placement parce que le champ ouvert reprend
 * la première — « à sa place et à sa taille » — mais pas la seconde :
 * une marge haute à l'intérieur d'un cadre d'édition décollerait le
 * texte de son étiquette.
 */

/** La colonne de la fiche, telle qu'un visiteur la voit. */
export const SCENE = "mx-auto w-full max-w-5xl px-[var(--pad)] py-7 sm:py-11";

/** L'accroche, sous le nom de la marque. */
export const ACCROCHE_TEXTE = "text-[clamp(15px,4vw,19px)] leading-relaxed text-white/88";
export const ACCROCHE = `m-0 mt-3 max-w-2xl ${ACCROCHE_TEXTE}`;

/**
 * La longueur au-delà de laquelle l'accroche se fait couper.
 *
 * Ce n'est pas une limite de saisie : la carte de l'annuaire coupe à peu
 * près là, et le compteur sert à le savoir AVANT de découvrir sa phrase
 * amputée d'un mot dans une grille. Écrire plus long reste permis.
 */
export const ACCROCHE_IDEALE = 70;

/** La démarche, en tête du bloc de verre. */
export const DEMARCHE_TEXTE = "text-[15.5px] leading-[1.7] text-white/92";
export const DEMARCHE = `m-0 ${DEMARCHE_TEXTE}`;

/** Une pastille de catégorie. */
export const PASTILLE =
  "rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85";

/** Ce qui part. */
export const VERT = "#57d99a";
/** Ce qui retient. */
export const AMBRE = "#f2b03c";
