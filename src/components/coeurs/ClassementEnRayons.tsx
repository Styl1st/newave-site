"use client";

import { useState } from "react";
import ClassementMarques from "../ClassementMarques";
import ClassementPieces from "./ClassementPieces";
import type { Contenu, Mesure } from "./classement";
import { LIGNES_PAR_LOT } from "./seuils";

/**
 * La colonne de gauche de la page des coups de cœur : le classement, et
 * ce qu'il faut pour l'allonger.
 *
 * ⚠️ LA LIGNE DE RAYONS EST PARTIE, ET C'ÉTAIT VOULU. Elle coiffait le
 * classement d'une rangée de pastilles — « Tout 9 · Streetwear 8 ·
 * Denim 4 » — doublée d'une seconde rangée pour les rayons sans aucun
 * cœur. Deux lignes de filtres au-dessus d'un classement qui tient en
 * huit lignes : le réglage prenait plus de place que ce qu'il réglait,
 * et la phrase au-dessus dit déjà ce qu'on regarde. Les marques qu'on
 * n'a pas encore vues ont maintenant leur entrée dans la colonne de
 * droite, où elles ne coupent plus la lecture du classement.
 *
 * LE NOM DU FICHIER PARLE DONC D'UNE CHOSE QUI N'EXISTE PLUS. Il est
 * gardé tel quel le temps du chantier pour ne pas faire voyager un
 * renommage au milieu du reste ; il n'y a plus qu'une raison d'ouvrir ce
 * composant, la pagination.
 *
 * ELLE EST ICI ET NON DANS LES DEUX CORPS : les deux classements
 * l'allongent de la même façon, par lots, et la garder à un seul endroit
 * évite qu'un des deux finisse par compter autrement que l'autre.
 */
export default function ClassementEnRayons({
  contenu,
  mesure,
}: {
  /** Un classement de marques ou un classement de pièces. Jamais les deux. */
  contenu: Contenu;
  /** Ce que compte le classement : des cœurs, un élan, ou des avis. */
  mesure: Mesure;
}) {
  const [combien, setCombien] = useState(LIGNES_PAR_LOT);

  return contenu.quoi === "marques" ? (
    <ClassementMarques
      classement={contenu.entrees}
      mesure={mesure}
      favoris={contenu.suivies}
      total={contenu.total}
      combien={combien}
      onVoirPlus={() => setCombien((n) => n + LIGNES_PAR_LOT)}
    />
  ) : (
    <ClassementPieces
      pieces={contenu.entrees}
      combien={combien}
      onVoirPlus={() => setCombien((n) => n + LIGNES_PAR_LOT)}
    />
  );
}
