"use client";

import { useRef, useState } from "react";
import { jeuDeVignettes, vignette } from "@/lib/vignette";

/**
 * Les photos d'une pièce, feuilletées sans quitter la grille.
 *
 * POURQUOI ÇA CHANGE QUELQUE CHOSE. Une vignette ne montrait que la
 * première photo du catalogue, et c'est presque toujours la même chose :
 * le vêtement à plat, de face, sur fond blanc. Ce qui décide vraiment,
 * c'est la deuxième ou la troisième — le dos, la matière de près, la
 * pièce portée. Il fallait ouvrir la fiche pour y accéder, donc revenir
 * en arrière, donc perdre sa place dans la liste. Sur une page qui sert
 * à parcourir, cet aller-retour coûte plus cher que tout le reste.
 *
 * LES FLÈCHES N'APPARAISSENT QU'AU SURVOL, et seulement là où il y a une
 * souris. Posées en permanence, elles transformeraient une grille de
 * photos en tableau de bord : quatre-vingts paires de flèches à
 * l'écran, dont on n'utilise qu'une à la fois. Sur un écran tactile il
 * n'y a pas de survol, donc pas de flèches du tout : elles resteraient
 * affichées sans fin, en travers de la photo, sur la moitié de la
 * grille.
 *
 * ON NE CHARGE QUE CE QU'ON REGARDE. Une pièce a couramment six photos.
 * Les monter toutes multiplierait par six le poids d'une page qui en
 * compte déjà des dizaines, pour des images que personne ne verra. Une
 * seule est dans le document ; la suivante est demandée au moment où le
 * curseur entre sur la carte, c'est-à-dire juste avant qu'on en ait
 * besoin.
 */

export default function VignetteDefilante({
  images,
  alt,
  className = "",
}: {
  images: string[];
  alt: string;
  /** Les états de la pièce : retirée, épuisée. */
  className?: string;
}) {
  const [rang, setRang] = useState(0);
  const annoncees = useRef(new Set<number>());

  const total = images.length;
  const source = images[Math.min(rang, total - 1)];

  /**
   * Demander une image sans l'afficher.
   *
   * Le navigateur la range dans son cache : quand la balise la
   * réclamera, elle sera déjà là, et le changement se fera sans le
   * clignotement blanc d'un chargement.
   */
  const preparer = (i: number) => {
    if (i < 0 || i >= total || annoncees.current.has(i)) return;
    annoncees.current.add(i);
    const img = new Image();
    img.decoding = "async";
    const adresse = vignette(images[i], 400);
    if (adresse) img.src = adresse;
  };

  const aller = (pas: number) => (e: React.MouseEvent) => {
    /*
     * La photo est recouverte d'un lien vers la fiche. Sans ces deux
     * lignes, un clic sur une flèche changerait l'image ET ouvrirait la
     * pièce : on se retrouverait sur une autre page en croyant tourner
     * une photo.
     */
    e.preventDefault();
    e.stopPropagation();

    const suivant = (rang + pas + total) % total;
    setRang(suivant);
    // On prépare déjà celle d'après, dans le sens où l'on avance.
    preparer((suivant + pas + total) % total);
  };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={vignette(source, 400)}
        srcSet={jeuDeVignettes(source, 400)}
        sizes="(max-width: 640px) 45vw, 300px"
        alt={alt}
        loading="lazy"
        decoding="async"
        onMouseEnter={() => preparer(1)}
        className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${className}`}
      />

      {total > 1 && (
        <div className="defile">
          <button
            type="button"
            onClick={aller(-1)}
            aria-label="Photo précédente"
            className="defile-fleche defile-gauche"
          >
            <Chevron />
          </button>

          <button
            type="button"
            onClick={aller(1)}
            aria-label="Photo suivante"
            className="defile-fleche defile-droite"
          >
            <Chevron sens="droite" />
          </button>

          {/*
            Les points disent COMBIEN il reste à voir, ce que les flèches
            ne disent pas. Sans eux, on ne sait pas si l'on tourne dans
            une pièce à deux photos ou à douze, et l'on s'arrête après la
            deuxième.

            Au-delà de six, on cesse de les dessiner : une rangée de
            quinze points sur une vignette de trois cents pixels n'est
            plus lisible, et l'on ne les compte de toute façon pas.
          */}
          {total <= 6 && (
            <div className="defile-points">
              {images.map((_, i) => (
                <span key={i} data-actif={i === rang ? "1" : undefined} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Chevron({ sens = "gauche" }: { sens?: "gauche" | "droite" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
      style={sens === "droite" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
