"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vignette } from "@/lib/vignette";

/**
 * Le bandeau d'une fiche de marque : ses pièces, et son logo dans un coin.
 *
 * POURQUOI. La fiche affichait la couverture en grand. Or chez beaucoup
 * de marques, la couverture EST le logo : on se retrouvait avec un
 * lettrage noir étiré sur mille pixels de blanc, en haut de page, à
 * l'endroit qui donne le ton. Ça ne dit rien de ce que la marque
 * fabrique, et c'est justement la question qu'on se pose en arrivant.
 *
 * Le logo identifie, les pièces donnent envie. On garde les deux, chacun
 * à sa place : les pièces occupent le bandeau, le logo se pose dans un
 * coin sur une petite plaque.
 *
 * LA PLAQUE N'EST PAS DÉCORATIVE. Un lettrage noir sur une photo sombre
 * disparaît, et un logo blanc sur un fond clair aussi. La plaque garantit
 * que le nom reste lisible quelle que soit la pièce derrière.
 *
 * ON PEUT FAIRE DÉFILER À LA MAIN. Le mouvement automatique montre, les
 * flèches permettent de chercher. Et dès qu'on touche aux flèches,
 * l'automatique se met en pause : rien n'est plus agaçant qu'un
 * carrousel qui reprend la main pendant qu'on regarde une pièce.
 *
 * LA COUVERTURE S'AFFICHE D'ABORD. C'est le premier élément visible de
 * la page : il ne doit pas attendre une requête. Les pièces arrivent
 * ensuite et prennent le relais.
 */

/** Plus lent que dans une vignette : c'est en haut de page. */
const DUREE = 6000;

/** Après une action à la main, on laisse la personne tranquille. */
const REPIT = 12000;

/** Un bandeau, pas un catalogue. */
const MAX = 8;

/** En deçà, un geste horizontal n'est pas un balayage. */
const BALAYAGE = 45;

type Reponse = { products?: { image?: string | null }[] };

export default function BandeauMarque({
  slug,
  nom,
  logo,
  couverture,
}: {
  slug: string;
  nom: string;
  /** Posé dans le coin. Absent, on affiche le nom en toutes lettres. */
  logo?: string | null;
  couverture?: string | null;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [rang, setRang] = useState(0);
  const [pauseJusqua, setPauseJusqua] = useState(0);

  useEffect(() => {
    let vivant = true;

    fetch(`/api/marques/${slug}/pieces`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: Reponse) => {
        if (!vivant) return;
        /*
         * ON DÉDOUBLONNE. Deux pièces d'une même marque partagent
         * souvent la même photo : une déclinaison de taille, un coloris,
         * une pièce saisie deux fois. React se plaint alors de deux
         * enfants portant la même clé, et peut en escamoter un. Montrer
         * deux fois la même photo dans un bandeau n'a de toute façon
         * aucun intérêt.
         */
        const images = [
          ...new Set(
            (json.products ?? []).map((p) => p.image).filter((u): u is string => Boolean(u))
          ),
        ];

        // Mélange de Fisher-Yates, comme partout ailleurs : on ne veut
        // pas que ce soit toujours la même pièce qui accueille.
        for (let i = images.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [images[i], images[j]] = [images[j], images[i]];
        }
        setPhotos(images.slice(0, MAX));
      })
      .catch(() => {
        // Pas de pièces : la couverture reste, et c'est très bien.
      });

    return () => {
      vivant = false;
    };
  }, [slug]);

  const total = photos.length;

  const aller = useCallback(
    (pas: number) => {
      if (total < 2) return;
      setRang((r) => (r + pas + total) % total);
      // Le mouvement automatique se retire le temps qu'on regarde.
      setPauseJusqua(Date.now() + REPIT);
    },
    [total]
  );

  // Le défilement automatique, arrêté hors de l'écran et pendant le répit.
  useEffect(() => {
    if (total < 2) return;

    const el = cadre.current;
    if (!el) return;

    const racine = document.documentElement;
    if (
      racine.dataset.allege === "1" ||
      racine.dataset.fige === "1" ||
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1")
    ) {
      return;
    }

    let minuteur: ReturnType<typeof setInterval> | null = null;
    const arreter = () => {
      if (minuteur) clearInterval(minuteur);
      minuteur = null;
    };
    const demarrer = () => {
      if (minuteur) return;
      minuteur = setInterval(() => {
        // On ne coupe pas le minuteur pendant le répit : on le laisse
        // tourner à vide. Le relancer au bon moment demanderait un
        // second minuteur, pour économiser une comparaison de dates.
        if (Date.now() < pauseJusqua) return;
        setRang((r) => (r + 1) % total);
      }, DUREE);
    };

    const guetteur = new IntersectionObserver(
      (entrees) => (entrees.some((e) => e.isIntersecting) ? demarrer() : arreter()),
      { rootMargin: "0px" }
    );
    guetteur.observe(el);

    return () => {
      arreter();
      guetteur.disconnect();
    };
  }, [total, pauseJusqua]);

  /*
   * LE BALAYAGE AU DOIGT.
   *
   * Sur un téléphone il n'y a pas de survol, et viser une flèche de
   * trente pixels au pouce n'est pas naturel. On lit donc le geste
   * directement : un déplacement horizontal franc fait tourner le
   * bandeau. Le seuil écarte les petits mouvements involontaires pendant
   * qu'on fait défiler la page verticalement.
   */
  const depart = useRef<{ x: number; y: number } | null>(null);

  const surAppui = (e: React.PointerEvent) => {
    depart.current = { x: e.clientX, y: e.clientY };
  };

  const surRelache = (e: React.PointerEvent) => {
    const d = depart.current;
    depart.current = null;
    if (!d) return;

    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Plus horizontal que vertical, sinon c'est un défilement de page.
    if (Math.abs(dx) < BALAYAGE || Math.abs(dx) < Math.abs(dy)) return;
    aller(dx < 0 ? 1 : -1);
  };

  const actuelle = total > 0 ? rang % total : 0;

  return (
    <div
      ref={cadre}
      className="bandeau-marque"
      onPointerDown={surAppui}
      onPointerUp={surRelache}
    >
      {/* La couverture, visible tout de suite et jusqu'à ce que les
          pièces arrivent. Sans pièces, elle reste. */}
      {couverture && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className="bandeau-fond"
          src={vignette(couverture, 1200)}
          alt=""
          aria-hidden
          data-visible={total === 0 ? "1" : undefined}
        />
      )}

      {photos.map((photo, i) => (
        <div
          key={`${i}-${photo}`}
          className="bandeau-photo"
          data-visible={i === actuelle ? "1" : undefined}
          aria-hidden={i !== actuelle}
        >
          {/* Le remplissage : une photo de vêtement est verticale, un
              bandeau est très horizontal. Montrer la pièce entière
              laisserait deux grands vides sur les côtés. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bandeau-flou" src={vignette(photo, 1200)} alt="" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="bandeau-nette"
            src={vignette(photo, 1200)}
            alt={i === actuelle ? `Une pièce de ${nom}` : ""}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        </div>
      ))}

      {/* Le logo, sur sa plaque, dans le coin haut gauche. Le coin bas
          droit est déjà pris par le bouton de la boutique. */}
      <div className="bandeau-signature">
        {logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={vignette(logo, 320, { logo: true })} alt={nom} />
        ) : (
          <span>{nom}</span>
        )}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => aller(-1)}
            aria-label="Pièce précédente"
            className="bandeau-fleche bandeau-gauche"
          >
            <Chevron />
          </button>
          <button
            type="button"
            onClick={() => aller(1)}
            aria-label="Pièce suivante"
            className="bandeau-fleche bandeau-droite"
          >
            <Chevron sens="droite" />
          </button>

          <div className="bandeau-points">
            {photos.map((photo, i) => (
              <button
                key={`${i}-${photo}`}
                type="button"
                onClick={() => {
                  setRang(i);
                  setPauseJusqua(Date.now() + REPIT);
                }}
                aria-label={`Pièce ${i + 1} sur ${total}`}
                data-actif={i === actuelle ? "1" : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chevron({ sens = "gauche" }: { sens?: "gauche" | "droite" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
      style={sens === "droite" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
