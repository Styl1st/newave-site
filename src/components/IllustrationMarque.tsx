"use client";

import { useCallback, useState } from "react";
import VisuelAdaptatif from "./VisuelAdaptatif";
import VitrineMarque from "./VitrineMarque";
import { vignette } from "@/lib/vignette";

/**
 * Ce qu'on montre d'une marque, et dans quel ordre.
 *
 * 1. L'ILLUSTRATION ANIMÉE, gérée en amont dans `BrandCard`. Elle
 *    marche, on n'y touche pas.
 *
 * 2. L'IMAGE DE LA MARQUE, LOGO OU COUVERTURE, MAIS SEULEMENT SI ELLE
 *    EST NETTE.
 *
 * 3. LE DÉFILÉ DE SES PIÈCES quand elle ne l'est pas. On a passé des
 *    semaines à essayer de rendre présentable un logotype de cent
 *    cinquante pixels : rognage des marges, flou derrière, détourage du
 *    fond, agrandissement. Rien ne rend nets des pixels qui n'existent
 *    pas. Ses pièces, elles, sont photographiées pour être vendues.
 *
 * 4. L'IMAGE D'ORIGINE quand même, si la marque n'a aucune pièce. Floue
 *    vaut mieux qu'absente.
 *
 * CE COMPOSANT VAUT POUR LE LOGO COMME POUR LA COUVERTURE, et c'était le
 * trou de ma version précédente : je ne l'avais branché que sur la
 * branche « logo ». Or une marque sur deux n'a pas de logo enregistré,
 * et sa couverture partait alors dans l'ancien chemin, sans aucune
 * vérification de définition. C'est pour ça que le défilé ne se
 * déclenchait jamais sur ces cartes, et que leur image restait floue.
 *
 * ON NE PEUT PAS DÉCIDER PLUS TÔT. La définition d'un fichier ne se
 * connaît qu'une fois l'image chargée, et la base ne la stocke pas.
 */
export default function IllustrationMarque({
  source,
  estUnLogo,
  slug,
  nom,
  className = "",
}: {
  source: string;
  /** Un logo se traite autrement qu'une photo : voir `VisuelAdaptatif`. */
  estUnLogo: boolean;
  slug: string;
  nom: string;
  className?: string;
}) {
  const [insuffisante, setInsuffisante] = useState(false);
  const [sansPieces, setSansPieces] = useState(false);

  // `useCallback` parce que ces rappels sont dans les dépendances de la
  // décision, côté `VisuelAdaptatif` : une fonction recréée à chaque
  // rendu y relancerait la mesure en boucle.
  const signaler = useCallback(() => setInsuffisante(true), []);
  const rienAMontrer = useCallback(() => setSansPieces(true), []);

  /*
   * Le défilé remplace l'image, sauf si la marque n'a aucune pièce à
   * montrer. Dans ce cas on revient à l'image d'origine, même imparfaite :
   * une carte vide serait pire qu'une carte floue.
   */
  if (insuffisante && !sansPieces) {
    return <VitrineMarque slug={slug} nom={nom} onVide={rienAMontrer} />;
  }

  /*
   * PAS DE JEU DE TAILLES SUR UN LOGO, ET C'EST UNE CORRECTION DE BOGUE.
   *
   * On proposait deux versions, une pour les écrans ordinaires et une
   * pour les écrans fins, avec les descripteurs `1x` et `2x`. Or quand
   * le navigateur retient la version `2x`, il DIVISE PAR DEUX les
   * dimensions qu'il annonce : c'est la règle, une image prévue pour
   * une densité double occupe deux fois moins de place.
   *
   * Notre mesure lisait donc 250 pour un logo de 500 pixels
   * parfaitement net, le déclarait trop petit, et basculait sur le
   * défilé des pièces. Human With Attitude a un beau logo et montrait
   * une casquette.
   *
   * Une seule taille, généreuse, et les dimensions annoncées redeviennent
   * les vraies. Un logo pèse quelques dizaines de kilo-octets : demander
   * 640 pixels à tout le monde ne coûte rien comparé à se tromper sur la
   * moitié des marques.
   */
  const largeur = 640;

  return (
    <VisuelAdaptatif
      src={vignette(source, largeur, { logo: estUnLogo })}
      alt={nom}
      cadre={16 / 10}
      fondFlou={estUnLogo}
      logo={estUnLogo}
      /* Une fois qu'on sait qu'il n'y a pas de pièces, on cesse de
         prévenir : sinon la mesure rebasculerait sans fin entre les
         deux affichages. */
      onTropPetit={sansPieces ? undefined : signaler}
      className={className}
    />
  );
}
