import EcranChargement from "@/components/EcranChargement";

/**
 * Affiché pendant qu'une page se prépare, c'est-à-dire à presque chaque
 * navigation : les pages du site sont lues à la demande.
 *
 * C'était un squelette de six cartes. Il rassurait sur l'annuaire, et
 * mentait partout ailleurs : une fiche de marque, un post, le forum
 * n'ont pas cette silhouette. Voir `EcranChargement`.
 */
export default function Loading() {
  return <EcranChargement />;
}
