"use client";

import { useEffect, useMemo, useState } from "react";
import Grille from "./Grille";
import ProductCard from "./ProductCard";
import { compterLesRayons, rayonDe } from "@/lib/rayons";
import type { Product } from "@/lib/types";

/**
 * Le catalogue d'une marque, rangé par rayon.
 *
 * Une marque qui a cent quarante pièces les présentait toutes à la
 * suite. Quelqu'un qui cherche un t-shirt devait tout parcourir, et
 * abandonnait avant.
 *
 * Le filtre ne s'affiche QUE s'il y a au moins deux rayons. Sur une
 * marque qui ne fait que des bijoux, une barre « Bijoux (12) » toute
 * seule n'apprend rien et ajoute un geste avant la première pièce.
 *
 * Le rayon est deviné à l'import à partir du nom de la pièce, et
 * corrigeable à la main. Ce qui n'a pas pu être rangé se retrouve dans
 * « Autres » plutôt que d'être caché : une pièce invisible parce que
 * mal classée serait un défaut bien pire qu'un rayon approximatif.
 *
 * ET SURTOUT : ON N'AFFICHE PAS TOUT D'UN COUP.
 *
 * Un navigateur charge les images à l'approche de l'écran, mais il ne
 * les DÉCHARGE jamais tant qu'elles restent dans la page. Sur une
 * marque de cent quarante pièces, descendre jusqu'en bas revenait donc
 * à empiler cent quarante images décompressées en mémoire, sans qu'une
 * seule ne soit libérée. Un téléphone finit par abandonner l'onglet et
 * le recharger — c'est le rechargement en boucle constaté.
 *
 * Vingt-quatre pièces à la fois, donc, et un bouton pour la suite. Ce
 * n'est pas une pagination : on ne perd pas sa place, on ne change pas
 * de page, la liste s'allonge. Mais elle ne s'allonge que si on le
 * demande, ce qui suffit à ne jamais atteindre le plafond par
 * inadvertance.
 */

/** Pièces ajoutées à chaque fois qu'on en redemande. */
const LOT = 24;

export default function RayonsPieces({
  produits,
  brandSlug,
  canManage,
  likes,
  notes,
}: {
  produits: Product[];
  brandSlug: string;
  canManage: boolean;
  likes: Record<string, { count: number; liked: boolean }>;
  notes: Record<string, { moyenne: number; avis: number }>;
}) {
  const [rayon, setRayon] = useState<string | null>(null);
  const [combien, setCombien] = useState(LOT);

  const rayons = useMemo(() => compterLesRayons(produits), [produits]);
  const duRayon = useMemo(
    () => (rayon ? produits.filter((p) => rayonDe(p) === rayon) : produits),
    [produits, rayon]
  );

  // Changer de rayon repart du début : garder le compteur donnerait
  // trente pièces dans un rayon qui n'en a que huit, et l'impression
  // que le filtre n'a rien fait.
  useEffect(() => setCombien(LOT), [rayon]);

  const visibles = duRayon.slice(0, combien);
  const reste = duRayon.length - visibles.length;

  const chip =
    "shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-[.97]";

  return (
    <>
      {rayons.length > 1 && (
        <div className="sans-ascenseur -mx-1 mb-4 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setRayon(null)}
            className={`${chip} ${
              rayon === null
                ? "bg-white text-[var(--color-ink)]"
                : "border border-white/25 text-white/78 hover:bg-white/12 hover:text-white"
            }`}
          >
            Tout <span className="opacity-55">{produits.length}</span>
          </button>

          {rayons.map((r) => (
            <button
              key={r.rayon}
              type="button"
              onClick={() => setRayon(r.rayon)}
              className={`${chip} ${
                rayon === r.rayon
                  ? "bg-white text-[var(--color-ink)]"
                  : "border border-white/25 text-white/78 hover:bg-white/12 hover:text-white"
              }`}
            >
              {r.rayon} <span className="opacity-55">{r.total}</span>
            </button>
          ))}
        </div>
      )}

      <Grille
        variante="pieces"
        memoire="pieces-marque"
        aside={
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
            {duRayon.length} pièce{duRayon.length > 1 ? "s" : ""}
            {rayon && ` · ${rayon}`}
          </p>
        }
      >
        {visibles.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            brandSlug={brandSlug}
            canManage={canManage}
            note={notes[p.id]}
            likes={likes[p.id] ?? { count: 0, liked: false }}
          />
        ))}
      </Grille>

      {reste > 0 && (
        <div className="mt-7 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setCombien((n) => n + LOT)}
            className="card-light px-7 py-3.5"
          >
            <span className="relative z-3 text-[14px] font-extrabold">
              Voir {Math.min(reste, LOT)} pièce{Math.min(reste, LOT) > 1 ? "s" : ""} de plus
            </span>
          </button>
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">
            {visibles.length} sur {duRayon.length}
          </p>
        </div>
      )}
    </>
  );
}
