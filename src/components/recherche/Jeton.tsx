"use client";

/**
 * Un critère posé dans le champ de recherche.
 *
 * POURQUOI LE FILTRE ENTRE DANS LE CHAMP. Il y avait deux outils côte à
 * côte : un champ pour chercher un nom, un panneau replié pour cocher
 * des critères. Deux endroits à regarder pour une seule question, et le
 * panneau replié cachait des filtres actifs — la liste était réduite
 * sans qu'on voie pourquoi. Un jeton, lui, est toujours sous les yeux :
 * il est DANS la phrase qu'on est en train d'écrire.
 *
 * DEUX NIVEAUX DANS LE JETON, et ils sont nécessaires. « France » et
 * « Denim » ont exactement la même tête ; seule la famille dit que l'un
 * filtre l'origine et l'autre la matière. On la met en petit au-dessus
 * plutôt que devant : la valeur reste ce qu'on lit d'abord.
 *
 * Il est écrit à part pour la feuille du téléphone, qui prendra les
 * jetons plus tard. À part, mais pas configurable pour autant : tant
 * qu'un seul écran s'en sert, chaque option qu'on lui ajouterait serait
 * une option qu'on devine au lieu de la constater.
 */

export type Critere = {
  /** Ce qui range le critère : Style, Vestiaire, Prix, Origine. */
  famille: string;
  /** Ce qu'on lit : Streetwear, Femme, Accessible. */
  valeur: string;
  /** Ce qui part dans l'adresse, en minuscules : `style:streetwear`. */
  cle: string;
  /**
   * Combien de marques restent debout si on le pose. Absent une fois le
   * jeton posé : le compte est alors celui de la liste elle-même, écrit
   * au-dessus de la grille, et le répéter dans le jeton le ferait dire
   * deux fois.
   */
  compte?: number;
};

export default function Jeton({
  critere,
  /** Visé par le premier retour arrière, pas encore retiré. */
  vise = false,
  onRetirer,
}: {
  critere: Critere;
  vise?: boolean;
  onRetirer: () => void;
}) {
  return (
    <span className="jeton" data-vise={vise ? "1" : undefined}>
      <span className="jeton-famille">{critere.famille}</span>
      <span className="jeton-valeur">{critere.valeur}</span>
      <button
        type="button"
        onClick={onRetirer}
        aria-label={`Retirer le filtre ${critere.famille} ${critere.valeur}`}
        data-curseur-mot="Retirer"
        className="jeton-x"
      >
        ×
      </button>
    </span>
  );
}
