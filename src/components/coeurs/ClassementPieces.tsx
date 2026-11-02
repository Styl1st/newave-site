"use client";

import LignePiece from "./LignePiece";
import PiedDeClassement from "./PiedDeClassement";
import PodiumPieces from "./PodiumPieces";
import Halo from "../Halo";
import type { PlacePiece } from "./classement";

/**
 * Les pièces d'un classement, en lignes.
 *
 * C'EST LE PENDANT DE `ClassementMarques`, ET IL EN A LA FORME EXACTE :
 * un titre, la pile de lignes, le même pied. Les trois onglets de pièces
 * — du moment, tout temps, mieux notées — passent tous les trois par
 * ici ; c'est ce qui garantit qu'ils ne divergeront pas.
 *
 * UN PODIUM POUR LES TROIS PREMIÈRES, PUIS LA LISTE NUMÉROTÉE.
 *
 * Il n'y en avait pas : un rang affiché prétend que l'ordre veut dire
 * quelque chose, et le site s'en gardait tant que les cœurs étaient
 * rares. Mais une ligne à vignette de soixante pixels ne montrait pas
 * les vêtements, alors que c'est l'image qui fait le coup de cœur. Les
 * trois premières montent donc sur un podium, en grand (voir
 * `PodiumPieces`), et la suite garde ses lignes, numérotées à partir
 * de 4.
 *
 * Le chiffre de la mesure, lui, suit toujours la règle de la page :
 * sous `SEUIL_PIECES`, il ne descend pas jusqu'ici (voir
 * `chiffresAffiches`). Le podium montre alors les pièces dans l'ordre,
 * sans compter les cœurs.
 *
 * Il faut trois pièces pour en faire un. En dessous, la liste seule,
 * sans rang : deux marches ne font pas un podium.
 *
 * IL NE GARDE PAS SA PAGINATION. Le nombre de lignes visibles vient du
 * dessus, de `ClassementEnRayons`, parce que changer de rayon doit la
 * remettre à zéro : sans ça on garde les « 48 lignes » demandées sur
 * « Tout » en passant à un rayon qui en compte six, et le bouton « voir
 * plus » disparaît sans qu'on comprenne pourquoi il était là juste
 * avant.
 */
/** Trois marches. Au-delà ce n'est plus un podium, c'est une liste. */
const MARCHES = 3;

export default function ClassementPieces({
  pieces,
  rayon,
  combien,
  onVoirPlus,
}: {
  /** Le classement DÉJÀ filtré par le rayon choisi. */
  pieces: PlacePiece[];
  /** Le nom du rayon choisi, pour le rappeler dans le titre. */
  rayon?: string;
  /** Combien de lignes on affiche. Voir plus haut. */
  combien: number;
  onVoirPlus: () => void;
}) {
  const podium = pieces.length >= MARCHES ? pieces.slice(0, MARCHES) : [];
  const suite = pieces.slice(podium.length);
  const visibles = suite.slice(0, combien);

  return (
    <>
      {podium.length > 0 && <PodiumPieces places={podium} />}

      {suite.length > 0 && (
        <div className={podium.length > 0 ? "mt-9 sm:mt-11" : ""}>
          <p className="eyebrow m-0 mb-2.5 text-white/50">
            {podium.length > 0 ? "La suite du classement" : "Le classement"}
            {/* Le rayon dans le titre, parce que la pastille cliquée est loin
                au-dessus dès qu'on a descendu quelques lignes : sans ça, on
                lit une liste courte sans se souvenir qu'on l'a soi-même
                rétrécie. Même précaution que dans `ClassementMarques`. */}
            {rayon && <span className="text-white/40"> · {rayon}</span>}
          </p>

          {/* Un seul écouteur de souris pour toutes les lignes. Voir `Halo`. */}
          <Halo />
          <div className="liste-halo flex flex-col">
            {visibles.map((place, i) => (
              /* `ligne-eco` met de côté ce qui est hors écran sur téléphone :
                 le navigateur cesse de peindre — et surtout de décoder les
                 visuels — des lignes qu'on ne regarde pas. C'est ce décodage
                 qui faisait recharger la page sur un téléphone, et ce
                 classement-ci descend jusqu'à cent vingt pièces. Voir
                 globals.css. */
              <div key={place.product.id} className="ligne-eco">
                <LignePiece
                  product={place.product}
                  rang={podium.length > 0 ? podium.length + i + 1 : undefined}
                  coeurs={place.coeurs}
                  elan={place.elan}
                  note={place.note}
                  aimee={place.aimee}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <PiedDeClassement
        affichees={podium.length + visibles.length}
        total={pieces.length}
        onVoirPlus={onVoirPlus}
      />
    </>
  );
}
