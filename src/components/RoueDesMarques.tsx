"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Ce que la roue lit d'une marque : son nom pour l'écrire, son adresse pour y aller. */
export type FicheDeRoue = { slug: string; name: string };

/** La hauteur d'une ligne de la roue, en pixels. Voir `.roue-nom`. */
const LIGNE = 46;

/** Combien de noms défilent avant celui qui a été tiré. */
const PASSAGES = 14;

/** Filet de sécurité si la fin de l'animation n'arrive jamais (onglet caché). */
const DELAI_MAX = 1800;

function auHasard<T>(liste: T[]): T {
  return liste[Math.floor(Math.random() * liste.length)];
}

/**
 * « Au hasard », en roue : les noms défilent, ralentissent et s'arrêtent
 * sur une marque, puis on part sur sa fiche.
 *
 * POURQUOI UNE ROUE PLUTÔT QU'UN BOUTON QUI CHANGE DE PAGE. Le bouton
 * d'avant faisait la même chose, mais sans rien montrer : on cliquait,
 * on changeait de page, et le hasard restait invisible. La roue montre
 * qu'il y a des dizaines de marques derrière le geste, et elle laisse
 * une seconde pour lire sur laquelle on est tombé avant d'y aller.
 *
 * LE TIRAGE SE FAIT AU CLIC, PAS AU RENDU, pour la même raison que
 * `TirerUneMarque` : une adresse tirée au rendu serait la même à chaque
 * clic. Au premier affichage, la roue montre simplement les premières
 * marques de la liste, la même chose côté serveur et côté navigateur.
 *
 * LA BANDE EST RECONSTRUITE À CHAQUE TIRAGE : le nom actuel en haut,
 * quatorze noms pris au hasard, la marque tirée, et un dernier nom pour
 * qu'il y ait quelque chose sous elle. On replace la bande au début sans
 * transition, puis on la fait glisser jusqu'à la marque tirée. Elle ne
 * contient donc jamais plus de dix-huit lignes, quel que soit le nombre
 * de marques dans l'annuaire.
 *
 * MOINS DE MOUVEMENT : pas de roue, on part directement sur la fiche,
 * comme avant.
 */
export default function RoueDesMarques({ marques }: { marques: FicheDeRoue[] }) {
  const router = useRouter();
  const [bande, setBande] = useState<FicheDeRoue[]>(() => {
    const debut = marques.slice(0, 3);
    while (debut.length > 0 && debut.length < 3) debut.push(debut[debut.length - 1]);
    return debut;
  });
  /** L'indice de la ligne du milieu, celle qui est lue. */
  const [milieu, setMilieu] = useState(1);
  const [glisse, setGlisse] = useState(false);
  const [annonce, setAnnonce] = useState("");
  const cible = useRef<FicheDeRoue | null>(null);
  const secours = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (secours.current) window.clearTimeout(secours.current);
    };
  }, []);

  function moinsDeMouvement() {
    const racine = document.documentElement;
    if (racine.dataset.fige === "1") return true;
    if (racine.dataset.animChoisi === "1") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function arriver() {
    const c = cible.current;
    if (!c) return;
    cible.current = null;
    if (secours.current) {
      window.clearTimeout(secours.current);
      secours.current = null;
    }
    setAnnonce(`Tirée au sort : ${c.name}`);
    router.push(`/marques/${c.slug}`);
  }

  function tirer() {
    if (cible.current || marques.length === 0) return;

    const actuelle = bande[milieu];
    // Jamais deux fois la même d'affilée : c'est le seul résultat
    // qu'un tirage au sort ne doit pas produire.
    const autres = marques.length > 1 ? marques.filter((m) => m.slug !== actuelle?.slug) : marques;
    const choisie = auHasard(autres);

    if (moinsDeMouvement()) {
      router.push(`/marques/${choisie.slug}`);
      return;
    }

    cible.current = choisie;
    router.prefetch(`/marques/${choisie.slug}`);

    const nouvelle = [
      bande[milieu - 1] ?? actuelle,
      actuelle,
      ...Array.from({ length: PASSAGES }, () => auHasard(marques)),
      choisie,
      auHasard(marques),
    ];

    setGlisse(false);
    setBande(nouvelle);
    setMilieu(1);
    // Deux images : la première pose la bande au départ sans
    // transition, la seconde lance le glissement.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setGlisse(true);
        setMilieu(nouvelle.length - 2);
      })
    );
    secours.current = window.setTimeout(arriver, DELAI_MAX);
  }

  const visible = bande[milieu];

  return (
    <div>
      <div className="roue">
        <span className="roue-focus" aria-hidden="true" />
        <div className="roue-fenetre" aria-hidden="true">
          <div
            className="roue-bande"
            style={{
              transform: `translateY(${-(milieu - 1) * LIGNE}px)`,
              transition: glisse ? "transform 1.25s cubic-bezier(.12,.8,.2,1)" : "none",
            }}
            onTransitionEnd={(e) => {
              if (e.target === e.currentTarget) arriver();
            }}
          >
            {bande.map((m, i) => (
              <div key={i} className="roue-nom">
                {m.name}
              </div>
            ))}
          </div>
        </div>
        {/* Le nom du milieu se lit, il s'ouvre aussi : c'est une vraie
            marque, autant pouvoir y aller sans retirer au sort. */}
        {visible && !glisse && (
          <Link
            href={`/marques/${visible.slug}`}
            className="roue-lien"
            aria-label={`Ouvrir la fiche de ${visible.name}`}
          />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {annonce}
      </p>

      <button
        type="button"
        onClick={tirer}
        disabled={marques.length === 0}
        className="bouton-tirer"
      >
        <span className="bouton-tirer-de" aria-hidden="true">
          {/* Les deux flèches qui se croisent : le dessin du tirage,
              le même que « Nouveau tirage » plus bas sur la page. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 3h5v5" />
            <path d="M4 20 21 3" />
            <path d="M21 16v5h-5" />
            <path d="M15 15l6 6" />
            <path d="M4 4l5 5" />
          </svg>
        </span>
        Tirer une marque
      </button>
    </div>
  );
}
