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

/**
 * La démarche, posée à même le fond sous l'en-tête.
 *
 * ELLE N'A PLUS DE BLOC DE VERRE. Le cadre violet donnait le même poids
 * à deux lignes de texte qu'à dix, et une bio courte flottait dans une
 * grande boîte presque vide. Sans cadre, le texte prend la place qu'il
 * a, ni plus ni moins, comme les pièces juste en dessous. La largeur est
 * bornée à une soixantaine de signes : au-delà, l'œil perd la ligne
 * suivante en revenant à gauche.
 */
export const DEMARCHE_TEXTE = "text-[16px] leading-[1.75] text-white/92";
export const DEMARCHE = `m-0 max-w-[62ch] ${DEMARCHE_TEXTE}`;

/**
 * Les faits sous la démarche : une seule rangée, sous un filet.
 *
 * Origine, année, gamme, Instagram, puis le style en toutes lettres
 * (« Minimalisme · Maille · Bijoux ») à la place des anciennes
 * pastilles. Le filet n'est tracé que s'il y a un texte au-dessus à
 * séparer.
 */
export const FAITS = "m-0 flex flex-wrap gap-x-10 gap-y-4";
export const FAITS_FILET = "mt-7 border-t border-white/15 pt-5";
export const FAIT_ETIQUETTE =
  "m-0 text-[10px] font-black uppercase tracking-[0.2em] text-white/60";
export const FAIT_VALEUR = "m-0 mt-1 text-[14px] font-bold text-white";

/** Ce qui part. */
export const VERT = "#57d99a";
/** Ce qui retient. */
export const AMBRE = "#f2b03c";
