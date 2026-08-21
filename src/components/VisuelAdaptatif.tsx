"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Une couverture qui décide elle-même si elle se recadre ou non.
 *
 * LE PROBLÈME. Une couverture de marque, ce n'est pas toujours une
 * photo. C'est très souvent un logotype posé sur un fond uni, ou une
 * bannière large de trois fois sa hauteur. Recadrée pour remplir une
 * vignette, elle perd la moitié de son nom : on lisait « ONSOUL » au
 * lieu de « GONSOUL », et un lettrage coupé en deux donne l'impression
 * qu'on a bâclé la fiche de la marque.
 *
 * Recadrer TOUT est donc mauvais. Ne recadrer RIEN l'est aussi : une
 * photo d'ambiance encadrée de bandes vides perd exactement ce qui la
 * rendait belle, et la grille devient un damier.
 *
 * LA SOLUTION EST DANS L'IMAGE ELLE-MÊME. On lit ses proportions
 * réelles au chargement — l'information est là, gratuite, il suffisait
 * de la demander. Une image dont la forme s'approche de celle du cadre
 * se recadre sans dommage, on la remplit. Une image nettement plus
 * large ou plus haute que son cadre serait charcutée : on la montre en
 * entier.
 *
 * Aucune analyse du contenu, aucune requête, aucune bibliothèque : deux
 * nombres que le navigateur connaît déjà.
 *
 * ET LA PLACE QUI RESTE EST REMPLIE PAR L'IMAGE ELLE-MÊME. Montrer une
 * bannière en entier dans un cadre plus haut qu'elle laisse deux
 * bandes vides au-dessus et en dessous : c'est correct, mais ça a l'air
 * d'un accident. On y glisse donc un agrandissement flouté de la même
 * image, comme le font les lecteurs vidéo pour les films au mauvais
 * format. La vignette redevient pleine, la couleur vient de la marque,
 * et le vide n'est plus un vide.
 *
 * Ça ne coûte pas une image de plus : c'est la même adresse, donc le
 * navigateur réutilise ce qu'il a déjà décodé. Seul le flou est du
 * travail supplémentaire, et il ne s'applique qu'aux vignettes qui en
 * ont besoin.
 */

/**
 * En deçà, un logo est trop petit pour servir d'illustration.
 *
 * Une carte d'annuaire fait dans les trois cent quatre-vingts points de
 * large, et deux fois plus de pixels sur un écran fin. Un fichier de
 * cent cinquante pixels y est agrandi trois fois : il en ressort en
 * bouillie, et c'est la marque qui a l'air négligée.
 *
 * On mesure le plus GRAND côté : beaucoup de logos sont des bandeaux
 * larges et bas, parfaitement nets malgré leurs quatre-vingts pixels de
 * hauteur.
 */
const LOGO_TROP_PETIT = 220;

/**
 * À partir de quel écart on renonce à recadrer.
 *
 * Un tiers de différence, dans un sens ou dans l'autre. En deçà, ce
 * qu'on rogne reste de la marge ; au-delà, on commence à manger le
 * sujet. Le seuil est volontairement large : dans le doute, mieux vaut
 * recadrer, parce qu'une image qui remplit son cadre est le cas normal
 * et le plus agréable.
 */
const ECART_TOLERE = 1.34;

export default function VisuelAdaptatif({
  src,
  srcSet,
  sizes,
  alt = "",
  /** Les proportions du cadre : 16 / 10 pour une carte d'annuaire. */
  cadre,
  className = "",
  eager = false,
  fondFlou = false,
  secours,
}: {
  src?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  cadre: number;
  className?: string;
  eager?: boolean;
  /**
   * Remplir la place restante avec un agrandissement flouté de l'image.
   *
   * Réservé aux LOGOS. Sur une photo, le procédé fait double emploi :
   * l'image est déjà une ambiance, la flouter derrière elle brouille
   * les deux. Sur un logo posé sur fond uni, en revanche, il donne à la
   * vignette la couleur de la marque au lieu d'un aplat neutre.
   */
  fondFlou?: boolean;
  /**
   * L'image de repli, quand celle demandée est trop petite pour être
   * agrandie proprement.
   *
   * Sert aux logos : mieux vaut la couverture de la boutique, même
   * quelconque, qu'un logotype de cent pixels étiré en bouillie.
   */
  secours?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [entiere, setEntiere] = useState(false);

  /*
   * L'adresse réellement affichée. Elle peut basculer sur le repli une
   * fois la première image mesurée, et une seule fois : sans ce garde-
   * fou, un repli lui-même trop petit relancerait la bascule sans fin.
   */
  const [source, setSource] = useState<string | undefined>(src);
  const [replie, setReplie] = useState(false);

  // Une nouvelle adresse annule tout ce qu'on avait décidé de
  // l'ancienne : sans ça, une carte recyclée par React garderait le
  // repli de la marque précédente.
  useEffect(() => {
    setSource(src);
    setReplie(false);
    setEntiere(false);
  }, [src]);

  const decider = useCallback(
    (img: HTMLImageElement) => {
      if (!img.naturalWidth || !img.naturalHeight) return;

      /*
       * Trop petite pour être agrandie : on prend l'autre.
       *
       * La mesure n'est possible qu'APRÈS le chargement, donc on
       * affiche brièvement le logo pixellisé avant de basculer. C'est
       * inévitable côté navigateur, et ça reste préférable à l'inverse :
       * décider en amont supposerait de connaître les dimensions de
       * chaque fichier, ce que la base ne stocke pas.
       */
      if (
        !replie &&
        secours &&
        secours !== src &&
        Math.max(img.naturalWidth, img.naturalHeight) < LOGO_TROP_PETIT
      ) {
        setReplie(true);
        setSource(secours);
        setEntiere(false);
        return;
      }

      const forme = img.naturalWidth / img.naturalHeight;
      const ecart = forme > cadre ? forme / cadre : cadre / forme;
      setEntiere(ecart > ECART_TOLERE);
    },
    [cadre, replie, secours, src]
  );

  /*
   * Une image déjà en cache est complète AVANT que React ait posé son
   * gestionnaire : `onLoad` ne se déclenche alors jamais, et la
   * décision ne serait prise qu'au tout premier affichage de la
   * session. On vérifie donc aussi au montage.
   */
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) decider(img);
  }, [decider]);

  const image = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={ref}
      src={source}
      // Le jeu de tailles ne vaut que pour l'image d'origine : une fois
      // repliée sur la couverture, il ne lui correspond plus.
      srcSet={replie ? undefined : srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) => decider(e.currentTarget)}
      /*
       * `relative` SANS RANG EXPLICITE, et c'est important.
       *
       * Il y avait `z-1`, pour passer devant le fond flouté. Un rang
       * positif fait passer l'élément devant TOUT ce qui est posé sans
       * rang à lui : le bouton « Aperçu », le cœur et l'étiquette « À la
       * une » se retrouvaient derrière l'image, donc invisibles et
       * incliquables sur certaines marques.
       *
       * `relative` seul suffit : entre deux éléments positionnés sans
       * rang, c'est l'ordre du document qui tranche, et le fond est
       * écrit avant. Les boutons, eux, sont écrits après.
       */
      className={`h-full w-full ${
        entiere ? "relative object-contain p-3" : "object-cover"
      } ${fondFlou && !replie ? "visuel-detoure" : ""} ${className}`}
    />
  );

  if (!entiere || !fondFlou || replie) return image;

  return (
    <>
      {/* Le fond : la même image, agrandie et floutée. `aria-hidden` et
          `alt` vide, c'est un décor, pas une information. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt=""
        aria-hidden
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-lg"
      />
      {image}
    </>
  );
}
