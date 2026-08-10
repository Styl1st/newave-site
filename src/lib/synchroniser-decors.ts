/**
 * Plus utilisé.
 *
 * Ce fichier synchronisait les animations de deux décors identiques,
 * pour que la frontière du menu de téléphone ne se voie pas. L'idée
 * était bonne, le résultat non : deux empilements de couches
 * translucides, chacun avec ses flous et sa propre couche de
 * composition, ne donnent jamais exactement le même pixel, même à la
 * même seconde.
 *
 * Le menu n'a plus de décor à lui. Voir MobileMenu.
 */
export {};
