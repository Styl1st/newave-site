import { fetchCatalogue } from "./catalogue";
import type { Resultat } from "./catalogue-commun";
import { estUnProfilVinted, lireLeProfilVinted } from "./vinted";
import { plateformeDeVente } from "./boutiques";

/**
 * Une seule porte d'entrée pour lire ce qu'une marque vend.
 *
 * Il y avait `fetchCatalogue`, et il fallait maintenant lire aussi les
 * profils Vinted. La tentation était d'ajouter un `if` dans chacun des
 * quatre endroits qui importent un catalogue — l'enregistrement d'une
 * fiche, le bouton « tout relire », la tâche de midi, l'espace marque.
 * Quatre copies de la même décision, et la certitude qu'un jour l'une
 * des quatre serait oubliée.
 *
 * Le choix se fait donc ici, une fois. Les appelants demandent « lis
 * cette adresse » sans avoir à savoir de quel genre de boutique il
 * s'agit, et le jour où l'on saura lire Depop, ils n'auront rien à
 * changer.
 */
export async function lireLaBoutique(adresse: string): Promise<Resultat> {
  if (estUnProfilVinted(adresse)) return lireLeProfilVinted(adresse);

  /*
   * Une adresse Vinted sans profil précis — `vinted.fr` tout court —
   * n'est pas une boutique. Sans ce garde-fou, on partait lire la page
   * d'accueil de Vinted et l'on rangeait ses articles à la une dans le
   * catalogue de la marque.
   */
  if (plateformeDeVente(adresse)?.nom === "Vinted") {
    return {
      ok: false,
      error:
        "Il manque le profil : colle l'adresse complète de la boutique Vinted, " +
        "celle qui contient /member/.",
    };
  }

  return fetchCatalogue(adresse);
}
