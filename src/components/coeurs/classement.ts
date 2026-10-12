import type { PeriodeCoeurs } from "@/lib/favorites";
import type { Brand, Product } from "@/lib/types";

/**
 * Le vocabulaire commun aux CINQ classements de la page des coups de
 * cœur.
 *
 * POURQUOI CE FICHIER EXISTE. La page a longtemps eu deux allures : un
 * onglet — les marques les plus suivies — habillé en rayons, podium,
 * lignes et colonne de contexte ; les quatre autres en grilles de
 * cartes. Le beau était donc caché derrière le troisième onglet, et
 * changer de classement changeait de page. Ce module est ce qui permet
 * aux cinq de partager le même gabarit sans partager leurs chiffres.
 *
 * ⚠️ UNIFIER L'APPARENCE N'EST PAS MÉLANGER LES MESURES, et c'est la
 * seule chose à retenir d'ici. Les trois gestes du site — le coup de
 * cœur sur une pièce, le favori sur une marque, l'avis noté — ne
 * s'additionnent JAMAIS (voir le commentaire d'`ONGLETS` dans la page).
 * D'où `Mesure` : chaque onglet déclare ce qu'il compte, chaque ligne ne
 * porte qu'un seul nombre, et rien ici ne sait fabriquer un score
 * composite. Un type qui n'a pas de place pour un mélange est la
 * meilleure garantie qu'il n'y en aura pas.
 *
 * ⚠️ ET RIEN NE TRANSPORTE D'IDENTITÉ. Aucun des types ci-dessous n'a
 * de champ où loger qui a mis quoi de côté ou qui a aimé quoi. C'est la
 * règle de `lib/favorites.ts`, et elle vaut jusque dans les formes que
 * l'on descend au navigateur.
 */

/**
 * Ce que compte l'onglet en cours.
 *
 * Deux valeurs seulement, parce qu'il n'y a que deux vocabulaires : on
 * compte des cœurs — les favoris d'une marque, les coups de cœur d'une
 * pièce — ou l'on compte des avis, qui portent une note. Les cinq
 * onglets se répartissent entre les deux, et aucune ligne n'affiche les
 * deux à la fois.
 */
export type Mesure = "coeurs" | "avis" | "elan";

/**
 * Ce qu'on classe : des marques ou des pièces.
 *
 * C'est la première des trois questions de la phrase — quoi, par quoi,
 * sur quand — et la seule qui décide de la FORME des entrées. Les deux
 * autres ne changent que le nombre au bout de la ligne.
 */
export const QUOIS = ["pieces", "marques"] as const;
export type Quoi = (typeof QUOIS)[number];

/**
 * L'ÉLAN : LA PART, PAS LE VOLUME.
 *
 * Une marque qui reçoit trente cœurs cette semaine sur trente-cinq
 * depuis toujours vient d'arriver ; une autre qui en reçoit trente sur
 * mille deux cents ne fait que continuer. Le volume les met côte à côte,
 * la part les sépare.
 *
 * Les trois nombres voyagent ensemble parce qu'ils se vérifient l'un
 * l'autre : `part` est ce qui ordonne et ce qui s'affiche, `fenetre` est
 * ce que la ligne de rayons additionne — on n'additionne pas des
 * pourcentages — et `total` est ce qui rend la part lisible en survol.
 * Ce n'est pas un score composite : c'est une seule mesure qui a besoin
 * de deux chiffres pour être honnête.
 */
export type Elan = {
  /** Les cœurs reçus sur la fenêtre choisie. */
  fenetre: number;
  /** Le total de l'entrée, toutes fenêtres confondues. */
  total: number;
  /** La part, de 0 à 100. */
  part: number;
};

/** Le mot de chaque réglage, tel qu'il se lit dans la phrase. */
export const MOT_DU_QUOI: Record<Quoi, string> = {
  marques: "marques",
  pieces: "pièces",
};

export const MOT_DE_LA_MESURE_LUE: Record<Mesure, string> = {
  coeurs: "cœurs",
  elan: "élan",
  avis: "note",
};

export const MOT_DE_LA_PERIODE: Record<PeriodeCoeurs, string> = {
  semaine: "7 jours",
  mois: "30 jours",
  toujours: "toujours",
};

/**
 * Le petit mot qui relie la mesure à la fenêtre.
 *
 * « sur 7 jours » mais « DEPUIS toujours » : avec un seul connecteur,
 * la phrase disait « sur depuis toujours ». Il appartient donc à la
 * fenêtre, pas à la phrase.
 */
export const LIEN_DE_LA_PERIODE: Record<PeriodeCoeurs, string> = {
  semaine: "sur",
  mois: "sur",
  toujours: "depuis",
};

/**
 * Le mot de la mesure DANS L'ADRESSE, et l'inverse.
 *
 * `note` dehors, `avis` dedans : l'adresse parle la langue de la phrase
 * — « classées par note » — et le code garde le nom du champ qu'il lit.
 * La table est écrite dans les deux sens ici plutôt que devinée à deux
 * endroits.
 */
export const MESURE_URL: Record<Mesure, string> = {
  coeurs: "coeurs",
  elan: "elan",
  avis: "note",
};

/**
 * La mesure demandée par l'adresse, ou les cœurs.
 *
 * En toutes lettres et jamais par transtypage : `?mesure=` est une
 * chaîne que n'importe qui peut écrire à la main, et un `as Mesure` la
 * ferait passer pour une valeur du type sans que rien ne l'ait
 * vérifiée. Elle finirait dans un `Record` et rendrait `undefined`.
 * Même règle que `laPeriode`.
 */
export function laMesure(valeur: string | undefined): Mesure {
  if (valeur === "note") return "avis";
  if (valeur === "elan") return "elan";
  return "coeurs";
}

export function leQuoi(valeur: string | undefined): Quoi {
  return valeur === "marques" ? "marques" : "pieces";
}

/** Une note moyenne ET le nombre d'avis qui la fabrique. */
export type NoteAffichee = {
  /** De 1 à 10, soit de 0,5 à 5 étoiles. La division appartient à l'affichage. */
  moyenne: number;
  /**
   * Combien de personnes ont noté.
   *
   * Il ne quitte jamais la moyenne : « 5 sur 5 » ne veut rien dire tant
   * qu'on ignore si c'est une personne ou deux cents. C'est déjà la
   * règle de `ProductCard`, et elle vaut ici aussi.
   */
  avis: number;
};

/**
 * Une ligne du classement, marque ou pièce.
 *
 * `coeurs` OU `note`, jamais les deux : c'est la mesure de l'onglet qui
 * décide, et une ligne qui porterait les deux inviterait à les comparer.
 *
 * `rayons` est posé sur l'entrée elle-même plutôt que recalculé au
 * moment de filtrer. Une marque range ses catégories dans sa fiche, une
 * pièce doit passer par la déduction de `lib/rayons` : deux façons
 * différentes de répondre à la même question. En la posant une fois pour
 * toutes sur le serveur, le filtre du navigateur redevient une seule
 * ligne de code, la même pour les cinq onglets.
 */
export type PlaceMarque = {
  brand: Brand;
  rayons: string[];
  coeurs?: number;
  /** La part reçue sur la fenêtre. À LA PLACE des cœurs, jamais avec. */
  elan?: Elan;
  note?: NoteAffichee;
};

export type PlacePiece = {
  product: Product;
  rayons: string[];
  coeurs?: number;
  /** La part reçue sur la fenêtre. À LA PLACE des cœurs, jamais avec. */
  elan?: Elan;
  note?: NoteAffichee;
  /**
   * La personne connectée a-t-elle déjà donné son coup de cœur ?
   *
   * SON PROPRE GESTE, ET RIEN D'AUTRE. Ce booléen ne dit pas qui a aimé
   * la pièce : il dit si CELUI QUI REGARDE l'a fait, pour que le bouton
   * s'affiche dans le bon état. Sans lui, un cœur vide sur une pièce
   * déjà aimée se retirerait au clic suivant en croyant s'ajouter.
   */
  aimee: boolean;
};

/**
 * Ce que la page descend au navigateur : un classement de marques ou un
 * classement de pièces, jamais un panachage.
 *
 * Un objet discriminé plutôt que deux listes facultatives : avec deux
 * listes, « les deux vides » et « les deux remplies » deviennent des
 * états représentables, et il faut alors les traiter quelque part. Ici
 * le type interdit la question.
 */
export type Contenu =
  | {
      quoi: "marques";
      entrees: PlaceMarque[];
      /** Les marques que la personne connectée suit déjà. Jamais qui d'autre. */
      suivies: string[];
      /**
       * Les cœurs de TOUT l'annuaire, ceux qui décident du podium.
       * Absent sur l'onglet des notes : on n'y classe pas des cœurs.
       */
      total?: number;
    }
  | { quoi: "pieces"; entrees: PlacePiece[] };
