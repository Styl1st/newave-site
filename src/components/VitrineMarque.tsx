"use client";

import { useEffect, useRef, useState } from "react";
import { vignette } from "@/lib/vignette";

/**
 * Les pièces d'une marque, qui défilent à la place de son logo.
 *
 * POURQUOI ÇA EXISTE. Beaucoup de marques n'ont qu'un logotype de cent
 * cinquante pixels, exporté pour un pied de page. Agrandi à la taille
 * d'une carte, il en ressort en bouillie, et c'est la MARQUE qui a
 * l'air négligée alors qu'elle n'y est pour rien. On a essayé de le
 * rattraper de six façons ; aucune ne rend nets des pixels qui
 * n'existent pas.
 *
 * Ses pièces, elles, sont photographiées pour être vendues : elles font
 * deux mille pixels et elles sont belles. Une marque qui n'a pas de
 * logo utilisable a presque toujours un catalogue, et son catalogue la
 * représente mieux qu'un logo flou.
 *
 * ON NE CHARGE RIEN TANT QUE LA CARTE EST LOIN. La liste des pièces est
 * demandée quand la carte approche de l'écran, et le défilé s'arrête
 * dès qu'elle s'en va. Sur un annuaire de cent trente-cinq marques,
 * faire tourner cent trente-cinq diaporamas en même temps ferait
 * chauffer la machine pour des images que personne ne regarde.
 *
 * L'ORDRE EST TIRÉ AU SORT, et le départ aussi. Sans ça, toutes les
 * cartes changeraient d'image à la même seconde, ce qui donne une page
 * qui clignote au lieu d'une page qui respire.
 */

/** Combien de temps chaque pièce reste affichée. */
const DUREE = 3400;

/** Au-delà, on n'en garde pas plus : c'est une vitrine, pas un catalogue. */
const MAX = 6;

type Reponse = { products?: { image?: string | null }[] };

export default function VitrineMarque({
  slug,
  nom,
  className = "",
}: {
  slug: string;
  nom: string;
  className?: string;
}) {
  const ancre = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [rang, setRang] = useState(0);

  // Charger, mais seulement quand la carte approche.
  useEffect(() => {
    const el = ancre.current;
    if (!el) return;
    let vivant = true;

    const guetteur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        guetteur.disconnect();

        fetch(`/api/marques/${slug}/pieces`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((json: Reponse) => {
            if (!vivant) return;
            const images = (json.products ?? [])
              .map((p) => p.image)
              .filter((u): u is string => Boolean(u));

            /*
             * Mélange de Fisher-Yates, comme partout ailleurs sur le
             * site : deux marques voisines ne montrent pas les mêmes
             * pièces dans le même ordre, et l'on revient sur autre
             * chose au chargement suivant.
             */
            for (let i = images.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [images[i], images[j]] = [images[j], images[i]];
            }
            setPhotos(images.slice(0, MAX));
          })
          .catch(() => {
            // Pas de pièces, pas de vitrine. L'appelant montre alors sa
            // couverture ou le nom de la marque : voir
            // `IllustrationMarque`.
          });
      },
      { rootMargin: "300px" }
    );

    guetteur.observe(el);
    return () => {
      vivant = false;
      guetteur.disconnect();
    };
  }, [slug]);

  // Faire défiler, et seulement tant que la carte est à l'écran.
  useEffect(() => {
    if (photos.length < 2) return;

    const el = ancre.current;
    if (!el) return;

    /*
     * Quelqu'un qui a demandé moins de mouvement ne veut pas d'un
     * diaporama qui tourne tout seul dans chaque carte. Le réglage du
     * site l'emporte sur celui du système, comme partout.
     */
    const racine = document.documentElement;
    if (
      // Machine trop lente : plusieurs fondus simultanés sur une grille
      // de cartes est exactement ce qu'elle ne sait pas faire. La
      // première pièce reste affichée. Voir `Menagement`.
      racine.dataset.allege === "1" ||
      racine.dataset.fige === "1" ||
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1")
    ) {
      return;
    }

    let minuteur: ReturnType<typeof setInterval> | null = null;

    const demarrer = () => {
      if (minuteur) return;
      minuteur = setInterval(() => setRang((r) => r + 1), DUREE);
    };
    const arreter = () => {
      if (!minuteur) return;
      clearInterval(minuteur);
      minuteur = null;
    };

    const guetteur = new IntersectionObserver(
      (entrees) => (entrees.some((e) => e.isIntersecting) ? demarrer() : arreter()),
      { rootMargin: "80px" }
    );
    guetteur.observe(el);

    return () => {
      arreter();
      guetteur.disconnect();
    };
  }, [photos.length]);

  const total = photos.length;
  const actuelle = total > 0 ? rang % total : 0;

  return (
    <div ref={ancre} className={`vitrine-marque ${className}`}>
      {photos.map((photo, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={photo}
          src={vignette(photo, 400)}
          alt={i === actuelle ? `Une pièce de ${nom}` : ""}
          aria-hidden={i !== actuelle}
          /*
           * La première est demandée tout de suite, les autres quand
           * leur tour approche. `loading="lazy"` ne suffirait pas : une
           * image superposée aux autres est considérée comme visible
           * par le navigateur, qui les chargerait donc toutes d'un coup.
           */
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          data-visible={i === actuelle ? "1" : undefined}
        />
      ))}
    </div>
  );
}
