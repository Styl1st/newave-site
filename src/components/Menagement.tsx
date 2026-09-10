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
 * DEUX PALIERS, ET LE CURSEUR EST AU SECOND. C'est la correction
 * importante de ce fichier. Tout partait d'un coup, curseur compris, sur
 * une seule mesure : un portable un peu juste perdait la flèche du site
 * alors qu'elle n'était pour presque rien dans son ralentissement.
 *
 *   Palier 1 — le verre dépoli et les flous, qui coûtent de loin le plus
 *   cher, puis les dérives du fond, qui repeignent en continu, puis
 *   l'inclinaison des cartes.
 *
 *   Palier 2 — le curseur dessiné, et lui seul. Il n'est atteint que si
 *   la page, DÉJÀ dépouillée, ne tient toujours pas la cadence. Autant
 *   dire presque jamais : une fois les seize verres dépolis éteints, une
 *   flèche de quinze pixels ne fait plus la différence.
 *
 * Ce qui reste au bout est le site : ses couleurs, ses images, ses
 * arrondis, ses liserés. On enlève le mouvement, pas l'identité.
 *
 * LA DÉCISION SE RETIENT LE TEMPS DE LA VISITE. Elle est reprise telle
 * quelle en changeant de page : remesurer à chaque navigation ferait
 * osciller le site entre ses états, ce qui serait pire que le
 * ralentissement.
 */

/** En dessous, la machine ne suit pas. Soixante est la cible usuelle. */
const SEUIL = 42;

/**
 * Le second seuil, mesuré la page déjà allégée, et il est plus bas.
 *
 * À ce stade il ne reste plus grand-chose à éteindre : si l'on repassait
 * le même seuil, la moindre machine à quarante images perdrait son
 * curseur pour un gain qui se compte en fractions d'image. Trente-quatre
 * est la limite en dessous de laquelle le retard de la flèche se voit
 * vraiment à l'œil.
 */
const SEUIL_NU = 34;

/** Le temps qu'on se donne pour compter. Assez pour ignorer un à-coup. */
const MESURE = 1100;

/** On laisse d'abord la page finir de se poser. */
const ATTENTE = 900;

/**
 * Et le temps que le navigateur mette réellement de côté ce qu'on vient
 * d'éteindre. Remesurer dans la foulée reviendrait à compter les images
 * de l'ancienne page : on lirait le ralentissement qu'on est en train de
 * corriger, et l'on conclurait qu'il faut tout enlever.
 */
const REPRISE = 500;

const MEMOIRE = "newave-allege";

export default function Menagement() {
  useEffect(() => {
    const racine = document.documentElement;

    const alleger = () => {
      if (racine.dataset.allege) return;
      racine.dataset.allege = "1";
      /*
       * L'inclinaison des cartes est du JavaScript, pas du style : il
       * faut la prévenir. Elle écoute cet évènement et se démonte
       * d'elle-même. Le curseur, lui, écoute l'autre.
       */
      window.dispatchEvent(new CustomEvent("newave:allege"));
    };

    const depouiller = () => {
      if (racine.dataset.allege === "2") return;
      racine.dataset.allege = "2";
      window.dispatchEvent(new CustomEvent("newave:allege-curseur"));
    };

    const retenir = (palier: string) => {
      try {
        sessionStorage.setItem(MEMOIRE, palier);
      } catch {
        // Sans stockage, la mesure recommencera à la page suivante.
        // C'est une seconde de calcul, pas une gêne.
      }
    };

    // Déjà tranché plus tôt dans la visite : on ne remesure pas.
    try {
      const garde = sessionStorage.getItem(MEMOIRE);
      if (garde === "1" || garde === "2") {
        alleger();
        if (garde === "2") depouiller();
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

    let boucle = 0;
    let minuteur = 0;

    /** Compte les images pendant `MESURE`, puis rend la moyenne. */
    const compter = (fini: (parSeconde: number) => void) => {
      let images = 0;
      let debut = 0;

      const tour = (t: number) => {
        if (!debut) debut = t;
        images++;

        const ecoule = t - debut;
        if (ecoule < MESURE) {
          boucle = requestAnimationFrame(tour);
          return;
        }
        fini((images * 1000) / ecoule);
      };

      boucle = requestAnimationFrame(tour);
    };

    minuteur = window.setTimeout(() => {
      compter((parSeconde) => {
        // La machine suit : elle garde le site entier, curseur compris.
        if (parSeconde >= SEUIL) return;

        alleger();
        retenir("1");

        /*
         * ON REMESURE, LA PAGE DÉPOUILLÉE, et c'est tout l'objet des
         * deux paliers : savoir ce qu'il reste de lenteur une fois le
         * coupable habituel écarté. Presque toujours, plus rien.
         */
        minuteur = window.setTimeout(() => {
          compter((nu) => {
            if (nu >= SEUIL_NU) return;
            depouiller();
            retenir("2");
          });
        }, REPRISE);
      });
    }, ATTENTE);

    return () => {
      window.clearTimeout(minuteur);
      if (boucle) cancelAnimationFrame(boucle);
    };
  }, []);

  return null;
}
