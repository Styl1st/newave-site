"use client";

import Link from "next/link";
import LikeButton from "../LikeButton";
import ApercuFlou from "../ApercuFlou";
import { enChiffres } from "../chiffres";
import { enEtoiles } from "../Etoiles";
import type { PlacePiece } from "./classement";
import { estUneVideo } from "@/lib/medias";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import { prixAffiche } from "@/lib/types";

/**
 * Les trois premières pièces, sur un vrai podium.
 *
 * POURQUOI LES PIÈCES EN ONT UN MAINTENANT. Le classement des pièces
 * n'était qu'une liste de lignes à vignette de soixante pixels : on
 * lisait des noms, on ne voyait pas les vêtements. Or c'est l'image qui
 * fait le coup de cœur. Les trois premières montent donc sur des
 * marches, en grand, et la suite reste en lignes juste en dessous.
 *
 * LA SILHOUETTE D'UN PODIUM, PAS UNE GRILLE. Deuxième à gauche,
 * première au centre et plus large, troisième à droite ; les marches
 * ont trois hauteurs et leurs bas s'alignent. On reconnaît la forme
 * avant d'avoir lu un chiffre, sur ordinateur comme sur téléphone.
 *
 * L'ENTRÉE SE FAIT DANS L'ORDRE D'UNE REMISE DE PRIX : la troisième
 * marche monte d'abord, puis la deuxième, puis la première, et chaque
 * pièce se pose sur sa marche une fois celle-ci en place. Le mouvement
 * est écrit dans `globals.css` (`.podium-*`), là où vivent aussi les
 * règles qui le coupent : réglage « figer les animations », préférence
 * du système, mode allégé.
 */

/** L'ordre à l'écran : 2, 1, 3. */
const ORDRE_A_L_ECRAN = [1, 0, 2];

/** L'ordre d'entrée : la troisième d'abord, la première en dernier. */
const DELAI: Record<number, string> = { 1: "0.36s", 2: "0.18s", 3: "0s" };

export default function PodiumPieces({ places }: { places: PlacePiece[] }) {
  return (
    <div
      role="list"
      aria-label="Le podium des pièces"
      className="podium grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-end gap-2 sm:gap-4"
    >
      {ORDRE_A_L_ECRAN.map((i) =>
        places[i] ? <Marche key={places[i].product.id} place={i + 1} entree={places[i]} /> : null
      )}
    </div>
  );
}

function Marche({ place, entree }: { place: number; entree: PlacePiece }) {
  const { product, coeurs, elan, note, aimee } = entree;
  const premier = place === 1;

  const visuel =
    (product.images ?? []).find((m) => Boolean(m) && !estUneVideo(m)) ??
    (product.image_url && !estUneVideo(product.image_url) ? product.image_url : null);

  const slug = product.brand?.slug;
  const interne = Boolean(slug && product.slug);
  const href = interne ? `/marques/${slug}/${product.slug}` : `/api/go/piece/${product.id}`;
  const prix = prixAffiche(product).principal;

  /*
   * La mesure qui a donné la place, quand ce n'est pas un compte de
   * cœurs. Les cœurs, eux, s'écrivent DANS le bouton (voir plus bas) :
   * un cœur plein pour le chiffre et un cœur vide pour le geste, côte à
   * côte, disaient deux fois la même chose.
   *
   * Absente sous le seuil des chiffres : la page la retire avant
   * d'arriver ici (voir `chiffresAffiches`).
   */
  const mesure = elan ? (
    <span
      title={`${enChiffres(elan.fenetre)} sur ${enChiffres(elan.total)} cœurs`}
      className="tabular-nums"
    >
      {elan.part} %
    </span>
  ) : note ? (
    <span
      title={`Noté ${enEtoiles(note.moyenne)} sur 5 par ${note.avis} personne${note.avis > 1 ? "s" : ""}`}
      className="inline-flex items-baseline gap-1 tabular-nums"
    >
      <span aria-hidden="true" className="text-[#f5c73c]">★</span>
      {enEtoiles(note.moyenne)}
      <span className="text-[10.5px] font-bold text-white/60">({note.avis})</span>
    </span>
  ) : null;

  return (
    <div
      role="listitem"
      className={`podium-colonne flex min-w-0 flex-col ${premier ? "podium-premier" : ""}`}
      style={{ "--delai": DELAI[place] } as React.CSSProperties}
    >
      {/* ---------- la pièce, posée sur sa marche ---------- */}
      <div className="podium-piece group relative">
        <LienPiece
          href={href}
          interne={interne}
          label={product.name}
          className={`relative block aspect-[4/5] overflow-hidden rounded-[4px] bg-white/8 ${
            premier
              ? "shadow-[0_26px_60px_-24px_rgba(20,6,50,0.95)]"
              : "shadow-[0_18px_40px_-22px_rgba(20,6,50,0.9)]"
          }`}
        >
          {visuel ? (
            <>
            {/* Du flou au net : voir `ApercuFlou`. */}
            <ApercuFlou src={visuel} prioritaire />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-progressif="net"
              suppressHydrationWarning
              src={vignette(visuel, premier ? 640 : 480)}
              srcSet={jeuDeVignettes(visuel, premier ? 640 : 480)}
              sizes={premier ? "(max-width: 640px) 40vw, 320px" : "(max-width: 640px) 32vw, 260px"}
              alt=""
              loading="eager"
              decoding="async"
              className={`relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${
                product.retired_at ? "opacity-70 grayscale-[.35]" : ""
              }`}
            />
            </>
          ) : (
            <span className="grid h-full w-full place-items-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
              Visuel à venir
            </span>
          )}

          {/* Le liseré chromé de la première place, le même que sur le
              podium des marques : une matière, pas une icône. */}
          {premier && <span aria-hidden="true" className="podium-chrome" />}
        </LienPiece>
      </div>

      {/* ---------- la marche ----------
          Le rang en grand, puis ce qu'on cherche ensuite : le nom, la
          marque, le prix, et le geste.

          LA SILHOUETTE NE DÉPEND PAS DU TEXTE. Le contenu a la même
          hauteur sur les trois marches — le nom réserve toujours ses
          deux lignes, le prix toujours la sienne — et c'est un socle
          ajouté sous le contenu qui fait les trois hauteurs. Avec de
          simples hauteurs minimales, un nom sur deux lignes suffisait à
          rendre la troisième marche plus haute que la première.

          LE BAS S'EFFACE EN FONDU, sans trait de sol : le fond de la
          marche se dissout dans la page au lieu de s'arrêter net sur
          une ligne. Le fondu est porté par le fond seul (voir
          `.podium-marche::before`), le texte reste net. */}
      <div
        className={`podium-marche relative mt-2.5 flex flex-col items-center rounded-t-[12px] px-1.5 pt-2 text-center sm:mt-3.5 sm:px-3 ${
          premier
            ? "podium-marche-or pb-16 sm:pb-24"
            : place === 2
              ? "podium-marche-2 pb-10 sm:pb-14"
              : "pb-5 sm:pb-6"
        }`}
      >
        <span
          aria-hidden="true"
          className={`font-black leading-none tracking-[-0.04em] text-white ${
            premier ? "text-[34px] sm:text-[46px]" : "text-[26px] sm:text-[34px]"
          }`}
        >
          {place}
        </span>
        <span className="sr-only">{premier ? "Première" : `${place}ᵉ`} place du classement :</span>

        <LienPiece href={href} interne={interne} className="mt-1.5 block w-full min-w-0">
          <span
            className={`line-clamp-2 min-h-[2lh] font-bold leading-snug text-white ${
              premier ? "text-[12.5px] sm:text-[15px]" : "text-[11.5px] sm:text-[13.5px]"
            }`}
          >
            {product.name}
          </span>
        </LienPiece>

        {/* Toujours écrites, même vides : une ligne absente raccourcirait
            la marche et fausserait la silhouette. */}
        <span className="mt-1 block w-full truncate text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/60 sm:text-[10.5px]">
          {product.brand?.name ?? "\u00a0"}
        </span>

        <span className="mt-1 block text-[11.5px] font-extrabold text-white sm:text-[13px]">
          {prix ?? "\u00a0"}
        </span>

        {/* Sur les cœurs, le bouton porte le compte : il part du chiffre
            du classement et bouge d'un cran au clic. Sur l'élan ou la
            note, la mesure s'écrit à côté et le bouton reste muet. */}
        <span className="flex items-center justify-center gap-1 pt-1.5 text-[12px] font-extrabold text-white sm:text-[13px]">
          {mesure}
          <LikeButton
            productId={product.id}
            initialLiked={aimee}
            initialCount={coeurs ?? 0}
            taille="trait"
            muet={coeurs === undefined}
          />
        </span>
      </div>
    </div>
  );
}

/** Le lien vers la pièce : la photo et le nom y mènent tous les deux. */
function LienPiece({
  href,
  interne,
  className,
  label,
  children,
}: {
  href: string;
  /** Une fiche chez nous, ou la boutique par le compteur de clics. */
  interne: boolean;
  className?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return interne ? (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={className} aria-label={label}>
      {children}
    </a>
  );
}
