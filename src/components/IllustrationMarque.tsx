"use client";

import { useCallback, useState } from "react";
import VisuelAdaptatif from "./VisuelAdaptatif";
import VitrineMarque from "./VitrineMarque";
import { jeuDeVignettes, vignette } from "@/lib/vignette";

/**
 * Ce qu'on montre d'une marque, et dans quel ordre.
 *
 * L'ORDRE EST LE SUJET, le reste n'est que de la plomberie.
 *
 * 1. L'ILLUSTRATION ANIMÉE, quand la marque en a une. Elle s'est donné
 *    la peine d'en faire une, c'est ce qu'elle a de mieux à montrer, et
 *    ça marche. Elle est gérée en amont, dans `BrandCard`.
 *
 * 2. LE LOGO, MAIS SEULEMENT S'IL EST NET. Un logo est l'identité d'une
 *    marque : c'est ce qu'on cherche à reconnaître en parcourant une
 *    grille de cent marques. Quand le fichier est assez grand, rien ne
 *    le remplace.
 *
 * 3. LE DÉFILÉ DE SES PIÈCES, quand il ne l'est pas. Et c'est le
 *    changement de méthode : on a passé des semaines à essayer de
 *    rendre présentable un logotype de cent cinquante pixels — rognage
 *    des marges, flou derrière, détourage du fond, agrandissement. Rien
 *    ne rend nets des pixels qui n'existent pas. Ses pièces, elles, sont
 *    photographiées pour être vendues : elles font deux mille pixels et
 *    elles sont belles. Une marque sans logo utilisable est mieux
 *    représentée par ce qu'elle fabrique que par une image floue de son
 *    nom.
 *
 * 4. LA COUVERTURE DE LA BOUTIQUE, si elle n'a même pas de pièces.
 *
 * ON NE PEUT PAS DÉCIDER PLUS TÔT. La définition d'un fichier ne se
 * connaît qu'une fois l'image chargée, et la base ne la stocke pas. Le
 * logo est donc affiché puis remplacé, ce qui se voit à peine puisque
 * c'est précisément le cas où il arrive vite : il est petit.
 */
export default function IllustrationMarque({
  logo,
  couverture,
  slug,
  nom,
  className = "",
}: {
  logo: string;
  /** La couverture de la boutique, dernier recours. */
  couverture?: string | null;
  slug: string;
  nom: string;
  className?: string;
}) {
  const [insuffisant, setInsuffisant] = useState(false);

  // `useCallback` parce que ce rappel est dans les dépendances de la
  // décision, côté `VisuelAdaptatif` : une fonction recréée à chaque
  // rendu y relancerait la mesure en boucle.
  const signaler = useCallback(() => setInsuffisant(true), []);

  if (insuffisant) {
    return (
      <VitrineMarque
        slug={slug}
        nom={nom}
        /* Sans pièce, la vitrine reste vide et laisse voir ce qu'il y a
           derrière : la couverture si elle existe, l'aplat de la carte
           sinon. C'est pour ça qu'elle est superposée et non
           substituée. */
        className={couverture ? "vitrine-sur-couverture" : ""}
      />
    );
  }

  return (
    <VisuelAdaptatif
      src={vignette(logo, 400, { logo: true })}
      srcSet={jeuDeVignettes(logo, 400, { logo: true })}
      alt={nom}
      cadre={16 / 10}
      fondFlou
      logo
      onTropPetit={signaler}
      className={className}
    />
  );
}
