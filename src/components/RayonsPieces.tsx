"use client";

import { useEffect, useMemo, useState } from "react";
import Grille from "./Grille";
import ProductCard from "./ProductCard";
import { compterLesRayons, rayonDe } from "@/lib/rayons";
import type { Product } from "@/lib/types";

/**
 * Le filtre posé : une famille (et peut-être un de ses tags fins), ou
 * une collection propre à la marque. Jamais les deux à la fois : une
 * collection comme « Capsule Nuit » traverse les rayons, la croiser
 * avec « Hauts » donnerait une liste que la boutique elle-même ne
 * montre nulle part.
 */
type Choix =
  | { sorte: "tout" }
  | { sorte: "rayon"; rayon: string; tag: string | null }
  | { sorte: "collection"; libelle: string };

/** En deçà, une collection de la boutique ne vaut pas une puce. */
const COLLECTION_MIN = 2;
/** Au-delà, la rangée des collections déborde et plus personne ne la lit. */
const COLLECTIONS_MAX = 10;

/** Les tags fins d'une liste de pièces, du plus fourni au plus rare. */
function compterLesTags(pieces: Product[]): { tag: string; total: number }[] {
  const compte = new Map<string, number>();
  for (const p of pieces) {
    for (const t of p.tags ?? []) compte.set(t, (compte.get(t) ?? 0) + 1);
  }
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([tag, total]) => ({ tag, total }));
}

/**
 * Le catalogue d'une marque, rangé par rayon.
 *
 * Une marque qui a cent quarante pièces les présentait toutes à la
 * suite. Quelqu'un qui cherche un t-shirt devait tout parcourir, et
 * abandonnait avant.
 *
 * DEUX NIVEAUX, PUIS LA BOUTIQUE ELLE-MÊME.
 *
 *   1. Les familles : Hauts, Bas, Vestes… Seulement s'il y en a au
 *      moins deux : sur une marque qui ne fait que des bijoux, une
 *      barre « Bijoux (12) » toute seule n'apprend rien.
 *   2. Dans la famille choisie, ses tags fins : T-shirts, Hoodies,
 *      Sweats. Quand la marque n'a qu'une famille, ce sont eux qui
 *      prennent la première rangée.
 *   3. Les collections de la boutique que le lexique ne range pas :
 *      « Capsule Nuit », « Archive », « FW25 ». C'est le menu de son
 *      site, tel qu'elle l'a voulu.
 *
 * Tout est compté sur les pièces affichées : une puce n'existe que si
 * elle a des pièces, aucune ne mène à une grille vide.
 *
 * Le rangement vient du site de la marque (type, collections, nom de
 * la pièce : voir `lib/tags`) et reste corrigeable à la main. Ce qui
 * n'a pas pu être rangé se retrouve dans « Autres » plutôt que d'être
 * caché : une pièce invisible parce que mal classée serait un défaut
 * bien pire qu'un rayon approximatif.
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
  const [choix, setChoix] = useState<Choix>({ sorte: "tout" });
  const [combien, setCombien] = useState(LOT);

  const rayons = useMemo(() => compterLesRayons(produits), [produits]);

  /* Une seule famille : ses tags fins deviennent la première rangée. */
  const familleUnique = rayons.length === 1 ? rayons[0].rayon : null;

  const rayonCourant =
    choix.sorte === "rayon" ? choix.rayon : choix.sorte === "tout" ? familleUnique : null;

  const tagsDuRayon = useMemo(
    () =>
      rayonCourant
        ? compterLesTags(produits.filter((p) => rayonDe(p) === rayonCourant))
        : [],
    [produits, rayonCourant]
  );

  const collections = useMemo(() => {
    const compte = new Map<string, number>();
    for (const p of produits) {
      for (const l of p.tags_locaux ?? []) compte.set(l, (compte.get(l) ?? 0) + 1);
    }
    return [...compte.entries()]
      .filter(([, n]) => n >= COLLECTION_MIN && n < produits.length)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
      .slice(0, COLLECTIONS_MAX)
      .map(([libelle, total]) => ({ libelle, total }));
  }, [produits]);

  const duRayon = useMemo(() => {
    if (choix.sorte === "collection") {
      return produits.filter((p) => (p.tags_locaux ?? []).includes(choix.libelle));
    }
    const rayon = choix.sorte === "rayon" ? choix.rayon : null;
    const tag = choix.sorte === "rayon" ? choix.tag : null;
    return produits.filter(
      (p) =>
        (!rayon || rayonDe(p) === rayon) && (!tag || (p.tags ?? []).includes(tag))
    );
  }, [produits, choix]);

  // Changer de filtre repart du début : garder le compteur donnerait
  // trente pièces dans un rayon qui n'en a que huit, et l'impression
  // que le filtre n'a rien fait.
  useEffect(() => setCombien(LOT), [choix]);

  const visibles = duRayon.slice(0, combien);
  const reste = duRayon.length - visibles.length;

  const chip =
    "shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-[.97]";
  const actif = "bg-white text-[var(--color-ink)]";
  const inactif =
    "border border-white/25 text-white/78 hover:bg-white/12 hover:text-white";
  /* Les tags fins, un cran en dessous : plus petits, sans fond, pour
     qu'on lise la rangée du dessus comme le choix principal. */
  const chipFin =
    "shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition active:scale-[.97]";

  const tagCourant = choix.sorte === "rayon" ? choix.tag : null;
  const rangeeFine =
    tagsDuRayon.length > 0 &&
    // Un seul tag qui couvre tout le rayon ne filtre rien.
    !(tagsDuRayon.length === 1 && tagsDuRayon[0].total === (rayons.find((r) => r.rayon === rayonCourant)?.total ?? 0));

  const legende =
    choix.sorte === "collection"
      ? choix.libelle
      : choix.sorte === "rayon"
        ? [choix.rayon, choix.tag].filter(Boolean).join(" · ")
        : null;

  return (
    <>
      {rayons.length > 1 && (
        <div className="sans-ascenseur -mx-1 mb-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setChoix({ sorte: "tout" })}
            className={`${chip} ${choix.sorte === "tout" ? actif : inactif}`}
          >
            Tout <span className="opacity-55">{produits.length}</span>
          </button>

          {rayons.map((r) => {
            const pose = choix.sorte === "rayon" && choix.rayon === r.rayon;
            return (
              <button
                key={r.rayon}
                type="button"
                onClick={() => setChoix({ sorte: "rayon", rayon: r.rayon, tag: null })}
                aria-pressed={pose}
                className={`${chip} ${pose ? actif : inactif}`}
              >
                {r.rayon} <span className="opacity-55">{r.total}</span>
              </button>
            );
          })}
        </div>
      )}

      {rangeeFine && rayonCourant && (
        <div className="sans-ascenseur -mx-1 mb-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          {familleUnique && (
            <button
              type="button"
              onClick={() => setChoix({ sorte: "tout" })}
              className={`${chip} ${choix.sorte === "tout" ? actif : inactif}`}
            >
              Tout <span className="opacity-55">{produits.length}</span>
            </button>
          )}
          {tagsDuRayon.map((t) => {
            const pose = tagCourant === t.tag;
            return (
              <button
                key={t.tag}
                type="button"
                onClick={() =>
                  setChoix({ sorte: "rayon", rayon: rayonCourant, tag: pose ? null : t.tag })
                }
                aria-pressed={pose}
                className={`${familleUnique ? chip : chipFin} ${pose ? actif : inactif}`}
              >
                {t.tag} <span className="opacity-55">{t.total}</span>
              </button>
            );
          })}
        </div>
      )}

      {collections.length > 0 && (
        <div className="sans-ascenseur -mx-1 mb-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          <span className="shrink-0 pr-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
            Sur sa boutique
          </span>
          {collections.map((c) => {
            const pose = choix.sorte === "collection" && choix.libelle === c.libelle;
            return (
              <button
                key={c.libelle}
                type="button"
                onClick={() =>
                  setChoix(pose ? { sorte: "tout" } : { sorte: "collection", libelle: c.libelle })
                }
                aria-pressed={pose}
                className={`${chipFin} ${pose ? actif : inactif}`}
              >
                {c.libelle} <span className="opacity-55">{c.total}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-1.5" />

      <Grille
        variante="pieces"
        memoire="pieces-marque"
        aside={
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
            {duRayon.length} pièce{duRayon.length > 1 ? "s" : ""}
            {legende && ` · ${legende}`}
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
