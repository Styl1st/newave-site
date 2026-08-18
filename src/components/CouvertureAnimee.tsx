"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Une couverture animée dans une carte d'annuaire.
 *
 * POURQUOI CETTE VERSION RESSEMBLE À CELLE DE LA FICHE. La première
 * rendait une vidéo SANS adresse, avec pour consigne de ne rien
 * précharger, et lui donnait son adresse par script une fois la carte
 * approchée de l'écran. L'intention était bonne — ne charger que ce
 * qu'on regarde — mais ça ne partait jamais, et j'ai passé deux essais
 * à rafistoler un montage qui n'était pas le bon.
 *
 * La vidéo de la fiche d'une marque, elle, marche depuis toujours.
 * Elle a son adresse dès le départ, `preload="metadata"` et la lecture
 * automatique. C'est donc exactement ce qu'on écrit ici : plus aucune
 * différence avec le cas qui fonctionne, plus aucune place pour ce
 * genre de panne.
 *
 * L'économie de mémoire ne disparaît pas pour autant, elle change de
 * moment. Au lieu de retarder le chargement, on RELÂCHE ce qui est
 * sorti du champ de vision : la vidéo est mise en pause, son adresse
 * retirée et le tampon de décodage vidé. Une carte qu'on a dépassée ne
 * coûte donc plus rien, et c'était le vrai problème — pas les
 * quelques-unes qu'on est en train de regarder.
 *
 * L'image fixe reste dessous en affiche. C'est elle qu'on voit avant le
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
   * On part de « oui ».
   *
   * Le contraire paraît plus prudent, mais c'est ce qui clouait la
   * première version : tant que rien ne disait explicitement que la
   * carte était visible, la vidéo n'existait pas. Ici elle joue, et
   * c'est l'observateur qui l'arrête si elle est loin. Le pire cas
   * devient une vidéo qui tourne une demi-seconde de trop, au lieu
   * d'une vidéo qui ne part jamais.
   */
  const [actif, setActif] = useState(true);

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
         * Assez large pour qu'une carte soit prête quand elle arrive,
         * assez serré pour ne pas décoder dix vidéos à la fois.
         *
         * C'était quatre cents pixels, ce qui faisait tourner presque
         * deux écrans de vidéos en même temps. Le décodage vidéo est du
         * travail pour la carte graphique, la même qui peint déjà le
         * décor animé : à ce compte-là, tout le site rame.
         */
        rootMargin: "150px 0px",
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
      // Revenue dans le champ de vision après avoir été relâchée : on
      // lui rend son adresse. `getAttribute` et non `el.src`, qui
      // renvoie une adresse absolue même quand l'attribut est absent.
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
      src={video}
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
      // Une couverture n'a rien à raconter à un lecteur d'écran : le
      // nom de la marque est juste en dessous, en toutes lettres.
      aria-hidden
      tabIndex={-1}
      className={className}
    />
  );
}
