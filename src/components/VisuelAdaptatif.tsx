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
 * À partir de quel écart on hésite à recadrer.
 *
 * Un tiers de différence, dans un sens ou dans l'autre. En deçà, ce
 * qu'on rogne reste de la marge ; au-delà, on commence à manger le
 * sujet.
 */
const ECART_TOLERE = 1.34;

/**
 * L'image a-t-elle un fond transparent ?
 *
 * C'EST LA QUESTION QUI MANQUAIT. On décidait de recadrer ou non
 * d'après la seule FORME de l'image, et ça ne suffit pas : un logo
 * carré détouré doit être montré en entier, alors qu'une capture
 * carrée avec un fond noir cuit dedans doit remplir le cadre. Même
 * forme, deux traitements opposés, et la différence est dans les pixels.
 *
 * On la lit sur une réduction de vingt-quatre pixels de côté. C'est
 * assez pour savoir si le pourtour est vide, et assez petit pour que
 * l'opération ne se remarque pas.
 *
 * Rend `null` quand on n'a pas pu regarder : certains hébergeurs
 * refusent qu'on lise leurs images pixel par pixel, et il n'y a rien à
 * y faire. L'appelant traite ce cas comme un fond opaque, parce que
 * c'est le cas le plus fréquent et le moins risqué à l'affichage.
 */
/**
 * Ce qu'on a déjà mesuré, par adresse.
 *
 * Deux raisons de garder ça. Une même image revient souvent — le logo
 * d'une marque apparaît dans l'annuaire, dans le carrousel, dans les
 * favoris — et il n'y a aucune raison de la relire à chaque fois. Et
 * surtout, la mesure se refait à chaque chargement de l'élément : sans
 * ce registre, la réponse arrivait plusieurs fois et faisait osciller
 * l'affichage.
 */
const MESURES = new Map<string, boolean | null>();

async function aUnFondTransparent(url: string): Promise<boolean | null> {
  const connu = MESURES.get(url);
  if (connu !== undefined) return connu;

  // Un JPEG ne SAIT PAS être transparent : inutile d'aller voir.
  if (/\.jpe?g(\?|#|$)/i.test(url)) {
    MESURES.set(url, false);
    return false;
  }

  return new Promise((resolve) => {
    const repondre = (v: boolean | null) => {
      MESURES.set(url, v);
      resolve(v);
    };

    const sonde = new Image();
    sonde.crossOrigin = "anonymous";

    sonde.onload = () => {
      try {
        const toile = document.createElement("canvas");
        toile.width = 24;
        toile.height = 24;
        const ctx = toile.getContext("2d", { willReadFrequently: true });
        if (!ctx) return repondre(null);

        ctx.drawImage(sonde, 0, 0, 24, 24);
        const pixels = ctx.getImageData(0, 0, 24, 24).data;

        let vides = 0;
        const total = pixels.length / 4;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 24) vides++;
        }

        /*
         * Un dixième de pixels transparents suffit à conclure. Un logo
         * détouré en a bien plus — la moitié, souvent — mais on reste
         * bas exprès : un fichier peut avoir quelques pixels
         * translucides sur ses bords sans être détouré pour autant.
         */
        repondre(vides / total > 0.1);
      } catch {
        // Image d'un autre domaine sans autorisation : on ne verra rien.
        repondre(null);
      }
    };

    sonde.onerror = () => repondre(null);
    sonde.src = url;
  });
}

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

      // Proche du cadre : on remplit, sans se poser de question.
      if (ecart <= ECART_TOLERE) {
        setEntiere(false);
        return;
      }

      /*
       * TROP LARGE ET TROP HAUTE NE SE VALENT PAS, et c'est la clé.
       *
       * Une image plus large que son cadre laisse deux bandes en haut et
       * en bas : l'œil lit ça comme un format de cinéma, c'est familier
       * et ça ne choque personne. La même image plus HAUTE que son cadre
       * laisse deux bandes sur les côtés, et là on ne voit qu'une
       * vignette collée de travers au milieu d'une carte.
       *
       * Une bannière large se montre donc en entier. Une image haute
       * remplit le cadre, quitte à en perdre le haut et le bas.
       */
      if (forme > cadre) {
        setEntiere(true);
        return;
      }

      /*
       * Reste le cas des images plus hautes que larges, et c'est le
       * CONTENU qui tranche.
       *
       * Un logo détouré posé sur du vide doit être montré en entier :
       * le rogner couperait la marque. Une image dont le fond est cuit
       * dans le fichier — une capture d'écran, une photo carrée — doit
       * au contraire remplir, sinon elle flotte au milieu de la carte.
       *
       * On remplit tant qu'on n'a pas la réponse : c'est l'affichage le
       * plus courant, et le plus propre quand on se trompe.
       */
      setEntiere(false);
      const adresse = img.currentSrc || img.src;
      aUnFondTransparent(adresse).then((transparent) => {
        if (transparent === true) setEntiere(true);
      });
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

  /*
   * LES DEUX IMAGES SONT TOUJOURS LÀ, ET C'EST UNE CORRECTION DE BOGUE.
   *
   * On rendait le fond flouté SEULEMENT quand il servait : une image
   * seule dans un cas, deux images dans l'autre. Or React apparie les
   * éléments par leur POSITION quand il n'a pas de clé pour les
   * distinguer. En passant d'une forme à l'autre, il réutilisait donc
   * l'image de premier plan comme fond flouté et en fabriquait une
   * neuve derrière : le logo net disparaissait le temps que la nouvelle
   * charge, puis tout recommençait. C'est le clignotement.
   *
   * Les deux éléments existent maintenant en permanence, dans le même
   * ordre, et seules leurs classes changent. Plus de va-et-vient
   * possible. Le fond masqué ne coûte rien de plus : c'est la même
   * adresse que le premier plan, donc la même image déjà décodée.
   */
  const avecFond = entiere && fondFlou && !replie;

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
        className={`pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-lg ${
          avecFond ? "" : "hidden"
        }`}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
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
         * rang à lui : le bouton « Aperçu », le cœur et l'étiquette « À
         * la une » se retrouvaient derrière l'image, donc invisibles et
         * incliquables sur certaines marques.
         *
         * `relative` seul suffit : entre deux éléments positionnés sans
         * rang, c'est l'ordre du document qui tranche, et le fond est
         * écrit avant. Les boutons, eux, sont écrits après.
         */
        className={`h-full w-full ${
          entiere ? "relative object-contain p-3" : "object-cover"
        } ${avecFond ? "visuel-detoure" : ""} ${className}`}
      />
    </>
  );
}
