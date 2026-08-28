"use client";

import { useEffect } from "react";

/**
 * Le site s'allège tout seul sur les machines qui peinent.
 *
 * LE PROBLÈME. Le décor de NEWAVE coûte cher : un dégradé animé, trois
 * nappes floutées qui dérivent, seize surfaces en verre dépoli, un
 * curseur dessiné, une inclinaison en trois dimensions sur chaque carte
 * survolée. Sur une machine à carte graphique dédiée, tout cela glisse.
 * Sur un ordinateur portable à puce intégrée, chaque image demande de
 * refloueter des zones entières de l'écran, et le tout tombe à quinze
 * images par seconde. Le curseur, qui est dessiné dans la page, traîne
 * alors visiblement derrière la souris du système : c'est le symptôme
 * qu'on remarque en premier, mais ce n'est pas la cause.
 *
 * ON NE DEVINE PAS, ON MESURE. Compter les cœurs du processeur ou la
 * mémoire annoncée ne dit presque rien : un portable récent annonce
 * huit cœurs et rame quand même, une vieille tour en annonce quatre et
 * tient les soixante images. Ce qui compte, c'est la vitesse réelle
 * d'affichage sur CETTE page, et elle se mesure en une seconde.
 *
 * CE QU'ON RETIRE, ET DANS QUEL ORDRE. D'abord le verre dépoli et les
 * flous, qui coûtent de loin le plus cher. Puis les dérives du fond, qui
 * repeignent en continu. Puis le curseur dessiné, qui redevient celui du
 * système — donc parfaitement fluide, puisqu'il n'est plus dessiné par
 * la page. Puis l'inclinaison des cartes. Ce qui reste est le site : ses
 * couleurs, ses images, ses arrondis, ses liserés. On enlève le
 * mouvement, pas l'identité.
 *
 * LA DÉCISION SE RETIENT LE TEMPS DE LA VISITE. Elle est reprise telle
 * quelle en changeant de page : remesurer à chaque navigation ferait
 * osciller le site entre ses deux états, ce qui serait pire que le
 * ralentissement.
 */

/** En dessous, la machine ne suit pas. Soixante est la cible usuelle. */
const SEUIL = 42;

/** Le temps qu'on se donne pour compter. Assez pour ignorer un à-coup. */
const MESURE = 1100;

/** On laisse d'abord la page finir de se poser. */
const ATTENTE = 900;

const MEMOIRE = "newave-allege";

export default function Menagement() {
  useEffect(() => {
    const racine = document.documentElement;

    const alleger = () => {
      if (racine.dataset.allege === "1") return;
      racine.dataset.allege = "1";
      /*
       * Le curseur et l'inclinaison sont du JavaScript, pas du style :
       * il faut les prévenir. Ils écoutent cet évènement et se
       * démontent d'eux-mêmes.
       */
      window.dispatchEvent(new CustomEvent("newave:allege"));
    };

    // Déjà tranché plus tôt dans la visite : on ne remesure pas.
    try {
      if (sessionStorage.getItem(MEMOIRE) === "1") {
        alleger();
        return;
      }
    } catch {
      // Navigation privée, stockage refusé : on mesurera, c'est tout.
    }

    /*
     * Quelqu'un qui a déjà demandé moins de mouvement n'a pas besoin
     * qu'on lui mesure quoi que ce soit : le site est déjà calme, et
     * `data-fige` fait le travail.
     */
    if (racine.dataset.fige === "1") return;

    let images = 0;
    let debut = 0;
    let boucle = 0;

    const compter = (t: number) => {
      if (!debut) debut = t;
      images++;

      const ecoule = t - debut;
      if (ecoule < MESURE) {
        boucle = requestAnimationFrame(compter);
        return;
      }

      const parSeconde = (images * 1000) / ecoule;
      if (parSeconde < SEUIL) {
        alleger();
        try {
          sessionStorage.setItem(MEMOIRE, "1");
        } catch {
          // Sans stockage, la mesure recommencera à la page suivante.
          // C'est une seconde de calcul, pas une gêne.
        }
      }
    };

    const depart = window.setTimeout(() => {
      boucle = requestAnimationFrame(compter);
    }, ATTENTE);

    return () => {
      window.clearTimeout(depart);
      if (boucle) cancelAnimationFrame(boucle);
    };
  }, []);

  return null;
}
