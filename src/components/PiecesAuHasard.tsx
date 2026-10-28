"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

/** Combien de pièces à l'écran. Trois : une rangée, pas une grille. */
const COMBIEN = 3;

/**
 * « Un aperçu, tiré au sort ».
 *
 * LE TIRAGE EST FAIT SUR LE SERVEUR, PAS ICI, et c'est ce qui explique
 * la forme de ce fichier. Un `Math.random()` joué au montage donnerait
 * deux résultats différents de part et d'autre — trois pièces à
 * l'arrivée de la page, trois autres une fraction de seconde plus tard —
 * donc un clignotement, et un avertissement d'hydratation. La page
 * envoie donc une réserve déjà mélangée et déjà répartie entre les
 * marques (voir `repartirParMarque`), et l'on n'a plus qu'à y avancer.
 *
 * « Nouveau tirage » prend les suivantes de la réserve plutôt que d'en
 * retirer trois au sort : on ne retombe jamais sur les mêmes qu'à
 * l'instant d'avant, ce qu'un tirage aléatoire fait une fois sur dix et
 * qui donne l'impression que le bouton ne marche pas.
 *
 * LES PIÈCES SONT POSÉES COMME SUR LA PAGE DES PIÈCES. La variante
 * « nue » de `ProductCard` : la photo à même le fond, le texte dessous,
 * sans carte blanche. Les cartes faisaient trois grands rectangles
 * clairs au milieu d'une page violette ; posées nues, ce sont les
 * photos qui se voient, et c'est ce que la section veut montrer.
 *
 * AU TÉLÉPHONE, UN CARROUSEL. Trois pièces dans une grille de deux
 * colonnes laissaient la troisième seule sur sa ligne. Elles défilent
 * maintenant du doigt, la suivante dépassant du bord pour dire qu'il y
 * en a d'autres.
 */
export default function PiecesAuHasard({ pieces }: { pieces: Product[] }) {
  const [depart, setDepart] = useState(0);
  /* Compte les tirages, pour rejouer l'entrée des cartes même quand la
     réserve, en faisant le tour, ramène des pièces déjà vues. */
  const [tirage, setTirage] = useState(0);

  if (pieces.length === 0) return null;

  const montrees = Array.from(
    { length: Math.min(COMBIEN, pieces.length) },
    (_, i) => pieces[(depart + i) % pieces.length]
  );

  /* Le bouton n'a d'intérêt que s'il reste des pièces à montrer. */
  const rejouable = pieces.length > COMBIEN;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="eyebrow m-0">Au hasard</p>
          <h2 className="m-0 mt-2 text-[clamp(18px,4.2vw,23px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
            Un aperçu, tiré au sort
          </h2>
          <p className="m-0 mt-2 max-w-[46ch] text-[13.5px] leading-[1.6] text-white/72">
            {/* Pas de « parmi les 1 284 » : le compte exact du catalogue
                ne descend pas jusqu'ici, et un chiffre approché sur une
                page d'accueil est un chiffre faux. */}
            Trois pièces prises au hasard dans l&apos;annuaire. Elles changent à chaque
            visite.
          </p>
        </div>

        {rejouable && (
          <button
            type="button"
            onClick={() => {
              setDepart((d) => (d + COMBIEN) % pieces.length);
              setTirage((t) => t + 1);
            }}
            className="nouveau-tirage"
          >
            {/* La pastille a le même dessin que le cœur posé sur les
                photos de la page des pièces : un rond sombre, un trait
                clair. Le bouton se fond dans la page au lieu d'en
                sortir comme une pilule de plus. */}
            <span className="nouveau-tirage-pastille" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.3}
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
            Nouveau tirage
          </button>
        )}
      </div>

      {/* `aria-live` : le bouton change trois pièces d'un coup, et rien
          d'autre ne le signale à qui ne voit pas la page. */}
      <div aria-live="polite" className="tirage-rangee">
        {montrees.map((p) => (
          <div key={`${tirage}-${p.id}`} className="tirage-piece">
            <ProductCard product={p} showBrand nue />
          </div>
        ))}
      </div>

      <p className="m-0 mt-4 text-[12.5px] leading-[1.6] text-white/80">
        L&apos;achat se fait toujours directement chez la marque. NEWAVE SPHERE ne vend
        rien.
      </p>
    </section>
  );
}
