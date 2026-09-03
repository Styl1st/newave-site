"use client";

import LignePiece from "./LignePiece";
import PiedDeClassement from "./PiedDeClassement";
import type { PlacePiece } from "./classement";

/**
 * Les pièces d'un classement, en lignes.
 *
 * C'EST LE PENDANT DE `ClassementMarques`, ET IL EN A LA FORME EXACTE :
 * un titre, la pile de lignes, le même pied. Les trois onglets de pièces
 * — du moment, tout temps, mieux notées — passent tous les trois par
 * ici ; c'est ce qui garantit qu'ils ne divergeront pas.
 *
 * PAS DE PODIUM, DONC PAS DE NUMÉRO DE RANG. C'est la règle du site, et
 * elle vient de `ClassementMarques` : un rang affiché prétend que
 * l'ordre veut dire quelque chose, et le podium est justement ce qui
 * l'atteste. Là où il n'y en a pas — et une pièce n'en a jamais eu — le
 * chiffre de la mesure suffit : il ne classe rien, il dit ce qui s'est
 * passé. Les médailles qui coiffaient les anciennes cartes ont disparu
 * pour cette raison, pas par simplification.
 *
 * IL NE GARDE PAS SA PAGINATION. Le nombre de lignes visibles vient du
 * dessus, de `ClassementEnRayons`, parce que changer de rayon doit la
 * remettre à zéro : sans ça on garde les « 48 lignes » demandées sur
 * « Tout » en passant à un rayon qui en compte six, et le bouton « voir
 * plus » disparaît sans qu'on comprenne pourquoi il était là juste
 * avant.
 */
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
  const visibles = pieces.slice(0, combien);

  return (
    <>
      <p className="eyebrow m-0 mb-2.5 text-white/50">
        Le classement
        {/* Le rayon dans le titre, parce que la pastille cliquée est loin
            au-dessus dès qu'on a descendu quelques lignes : sans ça, on
            lit une liste courte sans se souvenir qu'on l'a soi-même
            rétrécie. Même précaution que dans `ClassementMarques`. */}
        {rayon && <span className="text-white/40"> · {rayon}</span>}
      </p>

      <div className="flex flex-col gap-2.5">
        {visibles.map((place) => (
          /* `ligne-eco` met de côté ce qui est hors écran sur téléphone :
             le navigateur cesse de peindre — et surtout de décoder les
             visuels — des lignes qu'on ne regarde pas. C'est ce décodage
             qui faisait recharger la page sur un téléphone, et ce
             classement-ci descend jusqu'à cent vingt pièces. Voir
             globals.css. */
          <div key={place.product.id} className="ligne-eco">
            <LignePiece
              product={place.product}
              coeurs={place.coeurs}
              note={place.note}
              aimee={place.aimee}
            />
          </div>
        ))}
      </div>

      <PiedDeClassement
        affichees={visibles.length}
        total={pieces.length}
        onVoirPlus={onVoirPlus}
      />
    </>
  );
}
