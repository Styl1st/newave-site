"use client";

import { useEffect, useState } from "react";

/**
 * Les cartes s'inclinent vers le curseur.
 *
 * Une carte qui bascule légèrement dans la direction où on la regarde
 * donne l'impression d'un objet posé sur la page plutôt que d'une image
 * imprimée dedans. C'est le seul effet du site qui réagit à la POSITION
 * du pointeur et non à sa simple présence, et c'est ce qui le rend
 * vivant.
 *
 * UN SEUL ÉCOUTEUR POUR TOUTE LA PAGE. L'annuaire affiche jusqu'à cent
 * cartes : leur poser à chacune un gestionnaire, et le retirer au fil du
 * défilement, coûterait bien plus que de lire la cible d'un mouvement
 * déjà émis. On écrit au plus deux valeurs, une fois par image, sur une
 * seule carte à la fois.
 *
 * ON ÉCRIT `rotate`, ET SURTOUT PAS `transform`. Ce dernier est déjà
 * pris : le défilement animé du site fait tourner les cartes sur un
 * cylindre, et une animation l'emporte toujours sur une règle ordinaire.
 * L'inclinaison serait donc ignorée sur toute page assez longue pour
 * défiler. `rotate` est une propriété à part entière, appliquée avant
 * `transform` : les deux se composent au lieu de se disputer.
 */

/** Ce qui s'incline : toutes les cartes claires du site. */
const CARTES = ".card-light";

/**
 * React a-t-il déjà repris cet élément en main ?
 *
 * ON NE TOUCHE PAS À UNE CARTE QUE REACT N'A PAS ENCORE HYDRATÉE. Ce
 * composant vit dans la mise en page : il s'installe dès qu'elle est
 * prête, alors que le contenu de la page, lui, s'hydrate morceau par
 * morceau — et lentement en développement. Une souris qui passait sur
 * une carte dans cet intervalle y écrivait `data-relief` et ses
 * variables ; React trouvait ensuite des attributs que le serveur
 * n'avait pas envoyés, et le signalait en erreur d'hydratation.
 *
 * React pose sur chaque nœud qu'il reprend une propriété
 * `__reactFiber$…` : c'est elle qu'on cherche. Une carte pas encore
 * reprise est simplement ignorée, elle s'inclinera au survol suivant.
 *
 * ⚠️ CE N'EST QU'UN FILET. React peut commencer à hydrater un morceau,
 * s'interrompre — justement parce qu'un mouvement de souris lui demande
 * de passer ce morceau en priorité — puis recommencer : la propriété est
 * alors déjà posée sans que le travail soit fini. D'où la vraie garde,
 * plus bas : l'effet ne s'arme qu'une fois la page chargée ET au repos.
 */
function estHydratee(el: Element): boolean {
  return Object.keys(el).some((cle) => cle.startsWith("__reactFiber$"));
}

/**
 * L'inclinaison maximale, atteinte au coin de la carte.
 *
 * ELLE ÉTAIT DE CINQ DEGRÉS, ET C'ÉTAIT TROP. Sur une carte de marque,
 * qui est un bloc, cinq degrés passent. Sur la photo d'un vêtement, ils
 * se voient tout de suite : un pantalon droit part de travers, une
 * manche s'allonge d'un côté. L'œil connaît la forme d'un vêtement, et
 * il repère la déformation bien plus vite que sur un aplat de couleur.
 *
 * Trois degrés suffisent à faire sentir que la carte est un objet posé
 * sur la page plutôt qu'une image imprimée dedans, ce qui est tout ce
 * qu'on lui demande.
 */
const AMPLITUDE = 3;

/*
 * La HAUTEUR du décollement, elle, n'est pas ici : elle est fixe et vit
 * dans `globals.css`, avec l'agrandissement et l'ombre. Seul ce qui
 * dépend de la position du curseur est calculé de ce côté-ci.
 */

export default function Relief() {
  /*
   * La mesure de fluidité tombe une seconde après l'arrivée sur la
   * page, donc APRÈS que ce composant se soit installé. Sans cet
   * écouteur, il continuerait de tourner sur une machine qu'on vient
   * justement de déclarer trop lente. Voir `Menagement`.
   */
  const [allege, setAllege] = useState(false);
  useEffect(() => {
    const surAllege = () => setAllege(true);
    window.addEventListener("newave:allege", surAllege);
    return () => window.removeEventListener("newave:allege", surAllege);
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    /*
     * Sur une machine qui peine, on ne dessine plus rien de tout ça :
     * voir `Menagement`. Le curseur du système est toujours fluide,
     * puisqu'il n'est pas dessiné par la page.
     */
    if (allege || Boolean(document.documentElement.dataset.allege)) return;

    const racine = document.documentElement;
    /*
     * Le réglage du site et celui du système font foi. Quelqu'un qui a
     * demandé moins de mouvement n'a pas envie que ses cartes bougent
     * sous son curseur.
     */
    if (
      racine.dataset.fige === "1" ||
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1")
    ) {
      return;
    }

    let carte: HTMLElement | null = null;
    /*
     * LES DIMENSIONS DE LA CARTE SONT MESURÉES UNE FOIS, À L'ENTRÉE.
     *
     * Elles l'étaient à chaque image. Or demander la position d'un
     * élément oblige le navigateur à recalculer la mise en page de la
     * page entière avant de répondre : c'est l'opération la plus chère
     * qu'on puisse glisser dans une boucle d'affichage, et elle tombait
     * dans le même budget d'image que le curseur, qu'elle retardait
     * d'autant.
     *
     * Une carte ne change pas de taille pendant qu'on la survole. On
     * mesure donc en arrivant dessus, et plus jamais ensuite.
     */
    let cadre = { gauche: 0, haut: 0, largeur: 1, hauteur: 1 };
    let x = 0;
    let y = 0;
    let image = 0;

    const relacher = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty("--relief-x");
      el.style.removeProperty("--relief-y");
      el.style.removeProperty("--relief-angle");
      el.style.removeProperty("--relief-dx");
      delete el.dataset.relief;
      /* Un `style=""` vide resterait sinon accroché à la carte. */
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    };

    const mesurer = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      cadre = {
        gauche: r.left,
        haut: r.top,
        largeur: r.width || 1,
        hauteur: r.height || 1,
      };
    };

    const peindre = () => {
      image = 0;
      if (!carte) return;

      // De -0,5 à 0,5, depuis le centre de la carte.
      const px = (x - cadre.gauche) / cadre.largeur - 0.5;
      const py = (y - cadre.haut) / cadre.hauteur - 0.5;

      /*
       * L'axe de rotation est perpendiculaire au déplacement du
       * curseur : c'est ce qui fait pencher la carte VERS lui, comme si
       * on appuyait sur le bord qu'on survole.
       */
      carte.style.setProperty("--relief-x", String(-py));
      carte.style.setProperty("--relief-y", String(px));
      carte.style.setProperty(
        "--relief-angle",
        `${(Math.min(0.5, Math.hypot(px, py)) * 2 * AMPLITUDE).toFixed(2)}deg`
      );

      /*
       * LA CARTE SE DÉCALE VERS LE CURSEUR EN PLUS DE PENCHER.
       *
       * Un objet qu'on soulève ne reste pas au-dessus de sa case : il
       * glisse un peu du côté où on le tient. Deux ou trois pixels
       * suffisent, et c'est ce détail qui fait passer l'effet d'un
       * basculement à plat à un vrai décollement.
       *
       * La hauteur, elle, est fixe et vit dans le CSS : elle ne dépend
       * pas de l'endroit qu'on survole.
       */
      carte.style.setProperty("--relief-dx", `${(px * 4).toFixed(1)}px`);
    };

    /*
     * LA CIBLE PRÉCÉDENTE, POUR NE PAS REMONTER L'ARBRE POUR RIEN.
     *
     * `closest()` remonte le document jusqu'à trouver une carte, et il
     * le faisait à CHAQUE mouvement — plus de cent fois par seconde,
     * sur un annuaire de cent cartes, pour retrouver presque toujours
     * le même élément : on survole le même endroit pendant des dizaines
     * d'images d'affilée.
     *
     * Une comparaison de référence suffit à s'en dispenser. C'est le
     * même garde-fou que dans `Curseur`, pour la même raison.
     */
    let precedente: Element | null = null;

    /*
     * L'EFFET S'ARME QUAND LA PAGE EST AU REPOS, PAS AVANT.
     *
     * Le chargement fini, on attend encore que le navigateur n'ait plus
     * rien à faire : c'est le signe que React a fini d'hydrater, puisque
     * l'hydratation est une suite de tâches qui le tiennent occupé. Une
     * carte survolée pendant ce temps reste simplement à plat — l'affaire
     * de quelques centaines de millisecondes — au lieu d'être modifiée
     * sous les pieds de React. Safari ne connaît pas `requestIdleCallback`
     * : il attend deux dixièmes de seconde après le chargement.
     */
    let arme = false;
    let attente = 0;
    const armer = () => {
      arme = true;
    };
    const auRepos = () => {
      attente =
        typeof window.requestIdleCallback === "function"
          ? window.requestIdleCallback(armer, { timeout: 2500 })
          : window.setTimeout(armer, 200);
    };
    if (document.readyState === "complete") auRepos();
    else window.addEventListener("load", auRepos, { once: true });

    const surMouvement = (e: PointerEvent) => {
      if (!arme) return;
      const cible = (e.target as Element | null) ?? null;

      if (cible !== precedente) {
        precedente = cible;

        let dessus = (cible?.closest?.(CARTES) ?? null) as HTMLElement | null;
        /* Pas encore hydratée : on la laisse, et on oublie la cible pour
           la revérifier au prochain mouvement. Voir `estHydratee`. */
        if (dessus && !estHydratee(dessus)) {
          dessus = null;
          precedente = null;
        }

        if (dessus !== carte) {
          relacher(carte);
          carte = dessus;
          if (carte) {
            carte.dataset.relief = "1";
            mesurer(carte);
          }
        }
      }
      if (!carte) return;

      x = e.clientX;
      y = e.clientY;
      if (!image) image = requestAnimationFrame(peindre);
    };

    const surSortie = () => {
      relacher(carte);
      carte = null;
      /*
       * On oublie aussi la cible retenue : sans cela, le défilement
       * relâcherait la carte sans que le curseur ait bougé, et le
       * garde-fou ci-dessus empêcherait de la reprendre tant que le
       * pointeur reste immobile sur le même élément.
       */
      precedente = null;
    };

    /*
     * Le défilement déplace la carte sans qu'on la quitte : sa position
     * mesurée n'est plus la bonne, et l'inclinaison partirait de
     * travers. On relâche plutôt que de remesurer, parce qu'on ne
     * survole plus vraiment la même chose quand la page bouge sous le
     * curseur.
     */
    window.addEventListener("scroll", surSortie, { passive: true });
    window.addEventListener("resize", surSortie);
    window.addEventListener("pointermove", surMouvement, { passive: true });
    document.addEventListener("pointerleave", surSortie);
    window.addEventListener("blur", surSortie);

    return () => {
      window.removeEventListener("load", auRepos);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(attente);
      window.clearTimeout(attente);
      if (image) cancelAnimationFrame(image);
      relacher(carte);
      window.removeEventListener("scroll", surSortie);
      window.removeEventListener("resize", surSortie);
      window.removeEventListener("pointermove", surMouvement);
      document.removeEventListener("pointerleave", surSortie);
      window.removeEventListener("blur", surSortie);
    };
  }, [allege]);

  return null;
}
