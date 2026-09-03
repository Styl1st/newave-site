"use client";

import Link from "next/link";
import LikeButton from "../LikeButton";
import { CoeurPlein } from "../LigneMarque";
import { enChiffres } from "../chiffres";
import Notee from "./Notee";
import type { NoteAffichee } from "./classement";
import { estUneVideo } from "@/lib/medias";
import { rayonDe } from "@/lib/rayons";
import { vignette } from "@/lib/vignette";
import type { Product } from "@/lib/types";
import { discountPercent, formatPrice, prixAffiche } from "@/lib/types";

/**
 * Une pièce sur une seule ligne, jumelle de `LigneMarque`.
 *
 * POURQUOI ELLE EXISTE. La page des coups de cœur montrait ses pièces en
 * grille de cartes et ses marques en lignes : changer d'onglet changeait
 * de page, et la forme la plus lisible — celle qui met dix entrées à
 * l'écran là où la grille en met trois — était réservée à un seul des
 * cinq classements. Cette ligne est ce qui met les cinq d'accord.
 *
 * ELLE COPIE LE GABARIT DE `LigneMarque` AU PIXEL, ET C'EST VOLONTAIRE.
 * Même `.card-light`, même vignette de 52 puis 62 pixels, mêmes
 * gouttières, même repli en `flex-wrap` sous 640. Ce n'est pas de la
 * coquetterie : deux lignes qui se ressemblent presque se remarquent
 * beaucoup plus qu'une différence franche, et l'on passe d'un onglet à
 * l'autre sur cette page.
 *
 * CE QU'ELLE NE COPIE PAS : la bande de quatre vignettes. Une marque a
 * besoin qu'on montre ce qu'elle fabrique — c'est la question qu'on se
 * pose devant un annuaire. Une pièce EST déjà ce qu'elle montre ; la
 * place de la bande revient donc au prix, qui est la seule chose qu'on
 * cherche ensuite.
 *
 * ⚠️ UNE SEULE MESURE PAR LIGNE. `coeurs` ou `note`, jamais les deux :
 * le coup de cœur dit ce qui plaît, l'avis dit ce qui est bon, et les
 * afficher côte à côte inviterait à les additionner. Voir le commentaire
 * d'`ONGLETS` dans la page.
 */

export default function LignePiece({
  product,
  coeurs,
  note,
  aimee,
}: {
  product: Product;
  /** Coups de cœur reçus. Absent sur l'onglet des notes. */
  coeurs?: number;
  /** La note moyenne et son nombre d'avis. Absent sur les onglets de cœurs. */
  note?: NoteAffichee;
  /** Le geste de la personne connectée, et rien que le sien. */
  aimee: boolean;
}) {
  const prix = prixAffiche(product);
  const barre = formatPrice(product.compare_at_cents, product.currency);
  const remise = discountPercent(product);

  /*
   * La première PHOTO, et pas le premier média. Une pièce peut porter
   * une vidéo en tête de carrousel : la fiche sait la lire, une balise
   * `img` non, et la ligne afficherait un cadre cassé. Même précaution
   * que `ProductCard`.
   */
  const visuel =
    (product.images ?? []).find((m) => Boolean(m) && !estUneVideo(m)) ??
    (product.image_url && !estUneVideo(product.image_url) ? product.image_url : null);

  const slug = product.brand?.slug;
  const interne = Boolean(slug && product.slug);
  /* Sans fiche interne, on sort par le compteur de clics plutôt que de
     fabriquer un lien mort. Même règle que `ProductCard`. */
  const href = interne
    ? `/marques/${slug}/${product.slug}`
    : `/api/go/piece/${product.id}`;

  /*
   * La sous-ligne : la marque, puis le rayon. La marque d'abord parce
   * que c'est elle qu'on cherche dans un classement de pièces — savoir
   * QUI fait ce qui plaît est la moitié de l'intérêt de la page.
   *
   * « Autres » ne s'écrit pas : `rayonDe` le rend pour les pièces qu'on
   * n'a pas su ranger, et l'afficher reviendrait à coller une étiquette
   * dépréciative sur une pièce dont le seul tort est un nom que nos
   * règles ne reconnaissent pas. Le rayon reste dans la ligne du haut,
   * où il sert à filtrer.
   */
  const rayon = rayonDe(product);
  const sousLigne = [product.brand?.name, rayon === "Autres" ? null : rayon]
    .filter(Boolean)
    .join(" · ");

  /* Les blocs laissent passer le clic vers le lien étalé sous la ligne ;
     seul le cœur le reprend. Même procédé que `LigneMarque`. */
  const bloc = "pointer-events-none relative z-3";

  /*
   * Le lien passe DERRIÈRE la ligne, en calque. Un <button> ne peut pas
   * vivre dans un <a> — le navigateur refuse cette imbrication — et le
   * cœur doit garder son propre clic.
   *
   * Il reste un ENFANT DIRECT de la carte, sinon la règle
   * `.card-light:has(> a[data-calque]:hover)` ne s'allume plus et la
   * ligne cesse de réagir au survol.
   *
   * Écrit en deux fois plutôt qu'en composant partagé avec
   * `ProductCard` : celui-ci est un composant serveur, et l'importer
   * ici — dans un module qui vit forcément côté navigateur — ferait
   * descendre toute la carte, son carrousel et sa teinte dans le paquet
   * de la page, pour quinze lignes de balisage.
   */
  const calque = interne ? (
    <Link
      href={href}
      aria-label={product.name}
      data-calque=""
      className="absolute inset-0 z-2"
    />
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={product.name}
      data-calque=""
      className="absolute inset-0 z-2"
    />
  );

  /* Retirée l'emporte sur épuisée : une pièce qui n'est plus sur la
     boutique ne reviendra pas en stock. Même arbitrage que `ProductCard`. */
  const etat = product.retired_at ? "Retirée" : product.available ? null : "Épuisé";

  return (
    <div className="card-light group relative flex flex-wrap items-center gap-3 overflow-hidden p-3.5 sm:flex-nowrap sm:gap-4 sm:p-4">
      {calque}

      {/* 1. La photo. Demandée à la taille où on l'affiche : c'est le
             décodage des images, et non leur poids, qui fait recharger
             la page sur un téléphone. Voir `vignette`. */}
      <div
        className={`${bloc} grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[rgba(23,10,51,0.06)] sm:h-[62px] sm:w-[62px]`}
      >
        {visuel ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vignette(visuel, 160)}
            alt=""
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover ${
              product.retired_at ? "opacity-70 grayscale-[.35]" : ""
            }`}
          />
        ) : (
          <span className="text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-[#a795c9]">
            À venir
          </span>
        )}
      </div>

      {/* 2. L'identité. */}
      <div className={`${bloc} min-w-0 flex-1`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="m-0 min-w-0 truncate text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)] sm:text-[16px]">
            {product.name}
          </h3>
          {etat && (
            <span className="shrink-0 rounded-full bg-[var(--color-ink)] px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-white">
              {etat}
            </span>
          )}
        </div>
        {sousLigne && (
          <p className="m-0 mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
            {sousLigne}
          </p>
        )}
      </div>

      {/* 3. Le prix. Il prend la place et le comportement de la bande de
             vignettes de `LigneMarque` : sur téléphone il passe à la
             ligne et prend toute la largeur, plutôt que de disputer
             quarante pixels au nom de la pièce et au cœur. */}
      <div
        className={`${bloc} order-last flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:order-none sm:w-auto sm:flex-none sm:justify-end`}
      >
        <span className="text-[13.5px] font-extrabold text-[var(--color-ink)] sm:text-[14px]">
          {prix.principal ?? "Prix sur la boutique"}
        </span>
        {/* Le prix réellement demandé par la marque, quand il n'est pas
            en euros. Notre conversion aide à comparer, elle ne remplace
            pas ce qui sera payé. */}
        {prix.origine && (
          <span className="text-[11.5px] font-semibold text-[#8a7bab]">{prix.origine}</span>
        )}
        {barre && remise !== null && (
          <span className="text-[11.5px] font-semibold text-[#8a7bab] line-through">
            {barre}
          </span>
        )}
      </div>

      {/* 4 et 5. La mesure, puis le geste. Sur téléphone ils restent au
             bout de la première ligne, à droite du nom. */}
      <div className={`${bloc} ml-auto flex shrink-0 items-center gap-2 sm:ml-0`}>
        {coeurs !== undefined && (
          /*
           * Le chiffre porte son cœur, et c'est ce qui le rend lisible
           * sans en-tête de colonne : la ligne est une bande souple, pas
           * une grille, et un intitulé posé au-dessus se décalerait de sa
           * colonne dès que la largeur change. Même dessin que
           * `LigneMarque`.
           */
          <span
            title={`${enChiffres(coeurs)} coup${coeurs > 1 ? "s" : ""} de cœur`}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-extrabold tabular-nums text-[var(--color-ink)] sm:mr-1 sm:text-[17px]"
          >
            <CoeurPlein className="h-3 w-3 text-[#8a7bab] sm:h-3.5 sm:w-3.5" />
            {enChiffres(coeurs)}
          </span>
        )}

        {/* La même note que sur une ligne de marque, au même endroit et
            avec le même dessin. Voir `Notee`. */}
        {note && <Notee note={note} />}

        <div className="pointer-events-auto">
          {/*
           * LE BOUTON PART À ZÉRO, ET CE N'EST PAS UN OUBLI.
           *
           * En taille `claire`, `LikeButton` n'écrit AUCUN compte : c'est
           * la même pastille ronde de 36 px que le cœur au bout d'une
           * `LigneMarque`, et les cinq onglets ont donc la même fin de
           * ligne — un chiffre en encre, puis un geste.
           *
           * Le chiffre qui compte est celui d'à gauche : il vient du
           * serveur, il est le même pour tout le monde, et c'est lui qui
           * fait le classement. Le bouton, lui, ne répond que d'une
           * chose — c'est fait — et il le dit en se remplissant.
           */}
          <LikeButton
            productId={product.id}
            initialLiked={aimee}
            initialCount={0}
            taille="claire"
          />
        </div>
      </div>
    </div>
  );
}
