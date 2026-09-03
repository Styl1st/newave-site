"use client";

import { createContext, useContext } from "react";
import type { Brouillon, ChampBrouillon } from "./brouillon";
import type { MotsDeLaRetouche, Voix } from "./mots";

/**
 * Le fil qui relie les morceaux de page à leur brouillon.
 *
 * POURQUOI UN CONTEXTE PLUTÔT QUE DES PROPRIÉTÉS. Les blocs
 * modifiables sont dispersés dans une page rendue par le serveur :
 * l'accroche est dans l'en-tête, la démarche et les métadonnées dans le
 * bloc de verre, la couverture entre les deux. Les relier à la main
 * aurait voulu dire faire descendre le brouillon, la fonction qui
 * l'écrit et l'état d'ouverture à travers toute la fiche — et donc
 * transformer la page publique en composant client de bout en bout, ce
 * qu'on refuse.
 *
 * `useRetouche()` REND `null` HORS RETOUCHE, ET C'EST VOULU. La barre du
 * gérant vit aussi sur « Mes pièces » et « Statistiques », où il n'y a
 * pas de page à retoucher : elle demande le contexte, n'en trouve pas,
 * et son bouton reste le lien vers l'éditeur. Un composant peut donc se
 * rendre partout sans savoir s'il est dans une scène de retouche.
 */
export type Retouche = {
  /** La retouche est en cours : c'est un état, pas une page. */
  actif: boolean;
  entrer: () => void;
  sortir: () => void;

  voix: Voix;
  mots: MotsDeLaRetouche;
  slug: string;
  nom: string;

  /** Combien de pièces au catalogue, brouillons compris. */
  pieces: number;
  /** Une fiche sans catalogue possible n'est pas une fiche incomplète. */
  exigeDesPieces: boolean;

  brouillon: Brouillon;
  /** Écrit un champ du brouillon. Rien ne part au serveur. */
  definir: <C extends ChampBrouillon>(champ: C, valeur: Brouillon[C]) => void;
  modifications: number;
  enCours: boolean;
  enregistrer: () => void;
  annulerTout: () => void;

  /** Le champ dont l'éditeur est ouvert, ou `null`. */
  champOuvert: ChampBrouillon | null;
  /**
   * Demande l'ouverture d'un champ.
   *
   * C'est le seul endroit qui décide entre l'édition en place et la
   * feuille qui monte : les blocs de la page se contentent de dire quel
   * champ on vient de toucher.
   */
  ouvrir: (champ: ChampBrouillon) => void;
  fermer: () => void;

  /** La feuille qui monte, sur téléphone. */
  feuille: boolean;
  ouvrirFeuille: (champ?: ChampBrouillon) => void;
  fermerFeuille: () => void;

  /** Sous `sm`, l'édition en place cède la place à la feuille. */
  etroit: boolean;
};

const Contexte = createContext<Retouche | null>(null);

export const FournisseurRetouche = Contexte.Provider;

export function useRetouche(): Retouche | null {
  return useContext(Contexte);
}
