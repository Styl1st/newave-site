"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Une couverture animée dans une carte d'annuaire.
 *
 * TROIS VERSIONS, ET LA BONNE EXPLICATION SEULEMENT À LA TROISIÈME.
 *
 * La première ne posait pas d'adresse au montage et la donnait à
 * l'approche de l'écran, ce qui était la bonne idée. Mais elle portait
 * aussi `preload="none"` : le navigateur avait donc reçu la consigne de
 * ne rien charger, et la respectait même une fois l'adresse arrivée.
 * Rien ne démarrait jamais.
 *
 * J'en ai conclu, à tort, que c'était l'adresse posée tardivement qui
 * ne marchait pas. La deuxième version a donc mis l'adresse dès le
 * montage — et là, avec quatre-vingt-seize marques, ce sont
 * quatre-vingt-seize chargements lancés d'un coup, ce qui a fait tomber
 * les téléphones. J'ai alors coupé la vidéo sur mobile, ce qui réglait
 * le symptôme en supprimant la fonctionnalité.
 *
 * LE VRAI PARTAGE EST AILLEURS. C'est la présence de l'ADRESSE au
 * montage qui déclenche le chargement, pas le préchargement. Une balise
 * sans adresse ne coûte rien, quelle que soit sa consigne de
 * préchargement. On peut donc avoir les deux : aucune adresse au
 * départ, `preload="metadata"` pour que le chargement parte franchement
 * quand on la donne, et l'adresse posée uniquement à l'approche de
 * l'écran.
 *
 * Résultat : trois ou quatre vidéos vivantes à tout instant, sur
 * téléphone comme sur ordinateur, et l'image fixe partout ailleurs.
 * Elle reste d'ailleurs en affiche : c'est elle qu'on voit avant le
 * chargement, pendant, et pour toujours si la vidéo ne vient jamais.
 */
export default function CouvertureAnimee({
  video,
  affiche,
  className,
}: {
  video: string;
  /** L'image fixe, montrée tant que la vidéo n'est pas là. */
  affiche?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  /*
   * On part de « non », et c'est ce qui rend la chose tenable.
   *
   * L'observateur répond dès qu'il est posé, donc les cartes déjà à
   * l'écran passent à « oui » en une image. Celles du bas de la liste,
   * elles, n'auront jamais rien demandé.
   */
  const [actif, setActif] = useState(false);

  /** Coupé pour de bon : réglage du site, ou économiseur de données. */
  const bloque = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /*
     * Deux raisons de ne jamais lancer la vidéo, et aucune n'est
     * technique : le réglage « figer les animations » du site, et le
     * mode économiseur de données du navigateur. Dans les deux cas
     * quelqu'un a demandé explicitement moins, et l'affiche suffit.
     */
    const fige = document.documentElement.dataset.fige === "1";
    const economie = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;

    if (fige || economie) {
      bloque.current = true;
      el.pause();
      el.removeAttribute("src");
      el.load();
      return;
    }

    const observateur = new IntersectionObserver(
      ([entree]) => setActif(entree.isIntersecting),
      {
        /*
         * Assez pour qu'une carte soit prête quand elle arrive, assez
         * peu pour ne jamais décoder dix vidéos à la fois. Le décodage
         * vidéo est du travail pour la carte graphique, la même qui
         * peint déjà le décor animé.
         */
        rootMargin: "120px 0px",
        threshold: 0,
      }
    );

    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || bloque.current) return;

    if (actif) {
      /*
       * Elle arrive à l'écran : on lui donne son adresse.
       *
       * `getAttribute` et non `el.src`, qui renvoie une adresse absolue
       * même quand l'attribut est absent. Et `load()` explicitement,
       * pour que le chargement parte à cet instant plutôt qu'au bon
       * vouloir du navigateur.
       */
      if (!el.getAttribute("src")) {
        el.setAttribute("src", video);
        el.load();
      }
      // Une lecture refusée n'est pas une erreur : certains navigateurs
      // la bloquent tant qu'on n'a pas touché la page. L'affiche reste.
      el.play().catch(() => {});
      return;
    }

    el.pause();
    if (el.getAttribute("src")) {
      el.removeAttribute("src");
      // Sans ce `load()`, retirer l'adresse ne libère rien : le
      // navigateur garde le tampon décodé de la vidéo précédente.
      el.load();
    }
  }, [actif, video]);

  return (
    <video
      ref={ref}
      /*
       * AUCUNE ADRESSE ICI, ET C'EST TOUT LE SUJET. Une balise vidéo
       * sans adresse ne charge rien et ne coûte rien : on peut donc en
       * poser cent dans une page. L'adresse est donnée plus haut, à
       * l'approche de l'écran seulement.
       */
      poster={affiche}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      // Filet de sécurité : quand la vidéo est prête, on relance. Sur
      // certains navigateurs la lecture automatique est refusée à
      // l'instant du rendu mais acceptée quelques dixièmes plus tard.
      onLoadedData={(e) => {
        if (!bloque.current) e.currentTarget.play().catch(() => {});
      }}
      // Deuxième filet : sur certains navigateurs `loadeddata` arrive
      // avant que la lecture soit autorisée, `canplay` non.
      onCanPlay={(e) => {
        if (!bloque.current) e.currentTarget.play().catch(() => {});
      }}
      // Une couverture n'a rien à raconter à un lecteur d'écran : le
      // nom de la marque est juste en dessous, en toutes lettres.
      aria-hidden
      tabIndex={-1}
      className={className}
    />
  );
}
