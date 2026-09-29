"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  consommerLeRetour,
  estUnePageDeMarque,
  lirePageDOrigine,
  noterIci,
} from "@/lib/page-d-origine";

/**
 * Note la page d'où l'on part vers une marque, et la hauteur où l'on en
 * est. Posée une fois, dans le gabarit du site. Voir `lib/page-d-origine`.
 *
 * Et quand on y revient par un bouton retour (`RetourOrigine`), elle
 * remet la page à la hauteur où on l'avait laissée : dans une liste de
 * soixante-dix marques, revenir en haut obligeait à retrouver sa ligne
 * à chaque aller-retour.
 *
 * TROIS MOMENTS OÙ L'ON NOTE, ET AUCUN N'EST DE TROP.
 *   - À l'arrivée sur une page : couvre ce qui n'est pas un clic (une
 *     recherche validée au clavier, le « précédent » du navigateur).
 *   - Au clic, avant que la navigation parte : c'est la hauteur exacte
 *     au moment où l'on a choisi la marque.
 *   - En défilant, une fois le geste terminé (150 ms de calme) : noter à
 *     chaque image du défilement ferait travailler la page pour rien.
 * Chaque note relit l'adresse du moment, filtres compris, et ne fait
 * rien sur une page de marque.
 *
 * Ne rend rien.
 */
export default function MemoireNavigation() {
  const chemin = usePathname();

  // L'arrivée : reprendre la hauteur si l'on revient par le bouton, sinon noter.
  useEffect(() => {
    if (estUnePageDeMarque(chemin)) return;

    const notee = lirePageDOrigine();
    const ici = `${window.location.pathname}${window.location.search}`;
    const y = notee?.y ?? 0;

    if (consommerLeRetour() && notee?.url === ici && y > 0) {
      /*
       * Deux images plus tard, pour passer après le défilement vers le
       * haut que Next fait à chaque navigation. Puis on attend, au plus
       * une seconde et demie, que la page soit assez haute : une grille
       * qui se charge en deux temps n'a pas encore sa taille.
       */
      let essais = 15;
      let minuterie = 0;
      const viser = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max >= y || essais <= 0) {
          window.scrollTo({ top: Math.min(y, Math.max(max, 0)) });
          return;
        }
        essais -= 1;
        minuterie = window.setTimeout(viser, 100);
      };
      const image = requestAnimationFrame(() => requestAnimationFrame(viser));
      return () => {
        cancelAnimationFrame(image);
        window.clearTimeout(minuterie);
      };
    }

    noterIci();
  }, [chemin]);

  // Le clic et le défilement, écoutés une fois pour tout le site.
  useEffect(() => {
    let calme = 0;
    const surDefilement = () => {
      window.clearTimeout(calme);
      calme = window.setTimeout(noterIci, 150);
    };

    // En capture : on note avant que le lien ne déclenche la navigation.
    document.addEventListener("click", noterIci, true);
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => {
      document.removeEventListener("click", noterIci, true);
      window.removeEventListener("scroll", surDefilement);
      window.clearTimeout(calme);
    };
  }, []);

  return null;
}
