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
 */

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
}: {
  src?: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  cadre: number;
  className?: string;
  eager?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [entiere, setEntiere] = useState(false);

  const decider = useCallback(
    (img: HTMLImageElement) => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const forme = img.naturalWidth / img.naturalHeight;
      const ecart = forme > cadre ? forme / cadre : cadre / forme;
      setEntiere(ecart > ECART_TOLERE);
    },
    [cadre]
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

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={ref}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) => decider(e.currentTarget)}
      className={`h-full w-full ${entiere ? "object-contain p-3" : "object-cover"} ${className}`}
    />
  );
}
