"use client";

import Link from "next/link";
import { useState } from "react";
import BrandPreview from "./BrandPreview";
import FavoriteButton from "./FavoriteButton";
import IllustrationMarque from "./IllustrationMarque";
import LigneMarque, { CoeurPlein } from "./LigneMarque";
import Teinte from "./Teinte";
import { enChiffres } from "./chiffres";
import type { Brand } from "@/lib/types";

/**
 * Le classement des marques les plus suivies : trois marches, puis la
 * suite en lignes.
 *
 * POURQUOI DEUX FORMES POUR UNE SEULE LISTE. Un classement répond à
 * deux questions qui ne se lisent pas de la même façon. « Qui est en
 * tête » se regarde : trois cartes, trois visuels, on comprend sans
 * lire. « Et après ? » se parcourt : quarante lignes qu'on descend en
 * cherchant un nom ou un écart. Rendre les quarante en cartes noierait
 * les trois premières ; rendre les trois en lignes leur retirerait
 * précisément ce qui fait un podium.
 *
 * LA LIGNE EST CELLE DE L'ANNUAIRE, sans une classe de plus : c'est le
 * même objet — une marque, ce qu'elle fabrique, un cœur — et le
 * classement n'y ajoute que deux chiffres.
 */

/** Trois marches. Au-delà ce n'est plus un podium, c'est une liste. */
const MARCHES = 3;

/**
 * Combien de lignes d'un coup. Même lot que l'annuaire, et pour la
 * raison qu'explique `BrandGrid` : ce n'est pas du confort de lecture,
 * c'est ce qui empêche un téléphone de recharger la page en boucle.
 */
const LOT = 24;

export type Place = { brand: Brand; favoris: number };

export default function ClassementMarques({
  classement,
  favoris,
}: {
  classement: Place[];
  /** Les marques déjà suivies par la personne connectée. */
  favoris: string[];
}) {
  const suivies = new Set(favoris);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [combien, setCombien] = useState(LOT);

  /*
   * Pas de podium sous trois marques : deux cartes en vitrine et rien
   * derrière ne ressemblent pas à un classement, elles ressemblent à
   * une page à moitié chargée.
   */
  const podium = classement.length >= MARCHES ? classement.slice(0, MARCHES) : [];
  const suite = classement.slice(podium.length);
  const visibles = suite.slice(0, combien);
  const reste = suite.length - visibles.length;

  return (
    <>
      {podium.length > 0 && (
        /*
         * LA PREMIÈRE PLACE EST PLUS LARGE, DONC PLUS HAUTE — les trois
         * cartes ont le même rapport de forme, c'est la colonne qui
         * change. Les bas s'alignent (`items-end`), les hauts non : le
         * podium se lit dans la silhouette avant de se lire en chiffres.
         *
         * Sous 768 pixels la première prend toute la largeur et les deux
         * autres se partagent la ligne du dessous. Trois cartes empilées
         * repousseraient la suite du classement hors de l'écran, et
         * trois colonnes de cent vingt pixels ne montreraient plus rien.
         */
        <div className="grid grid-cols-2 items-end gap-3 sm:gap-4 md:grid-cols-[1.35fr_1fr_1fr] md:gap-[18px]">
          {podium.map((entree, i) => (
            <div key={entree.brand.id} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>
              <Marche place={i + 1} entree={entree} suivie={suivies.has(entree.brand.id)} />
            </div>
          ))}
        </div>
      )}

      {suite.length > 0 && (
        <div className={podium.length > 0 ? "mt-7" : ""}>
          {podium.length > 0 && (
            <p className="eyebrow m-0 mb-2.5 text-white/50">La suite du classement</p>
          )}

          <div className="flex flex-col gap-2.5">
            {visibles.map((entree, i) => (
              <LigneMarque
                key={entree.brand.id}
                brand={entree.brand}
                rang={podium.length + i + 1}
                coeurs={entree.favoris}
                favori={{ initial: suivies.has(entree.brand.id) }}
                onApercu={() => setOuvert(entree.brand.slug)}
              />
            ))}
          </div>
        </div>
      )}

      {/*
       * Le pied reprend la matière de la ligne de filtres, comme celui
       * de l'annuaire : un bouton en carte claire au bas d'une pile de
       * cartes claires se prend pour une entrée de plus.
       *
       * Le compte D'ABORD, parce que c'est lui qui décide de cliquer ou
       * d'aller chercher autrement. Et le renvoi vers sa propre liste
       * en dernier : on vient de lire ce que suivent les autres, c'est
       * le moment où l'on pense à la sienne.
       */}
      <div className="mt-6 flex flex-col items-center gap-2.5 rounded-[26px] border border-white/20 bg-[rgba(8,2,30,0.44)] px-5 py-4 backdrop-blur-[20px] sm:flex-row sm:justify-center sm:gap-5 sm:rounded-full">
        <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/55">
          {podium.length + visibles.length} sur {classement.length} affichée
          {classement.length > 1 ? "s" : ""}
        </p>

        {reste > 0 && (
          <button
            type="button"
            onClick={() => setCombien((n) => n + LOT)}
            className="rounded-full bg-white px-5 py-2 text-[13px] font-extrabold text-[var(--color-ink)] transition active:scale-95"
          >
            Voir {Math.min(reste, LOT)} place{Math.min(reste, LOT) > 1 ? "s" : ""} de plus
          </button>
        )}

        <Link
          href="/favoris"
          className="text-[12.5px] font-bold text-white/75 underline underline-offset-4 transition hover:text-white"
        >
          Ma liste à moi →
        </Link>
      </div>

      {ouvert && <BrandPreview slug={ouvert} onClose={() => setOuvert(null)} />}
    </>
  );
}

/**
 * Une marche du podium.
 *
 * C'est une carte de marque à laquelle on a retiré ce qui ne sert pas
 * ici et ajouté les deux seules choses qu'un podium doit dire : la
 * place, et le nombre de cœurs qui l'a donnée. Elle emprunte tout le
 * reste au reste du site — `IllustrationMarque` pour le visuel et son
 * repli sur les pièces, `Teinte` et `.pied-carte` pour le bandeau qui
 * prend la couleur de l'image, `.card-light` pour la matière.
 */
function Marche({
  place,
  entree,
  suivie,
}: {
  place: number;
  entree: Place;
  suivie: boolean;
}) {
  const { brand, favoris } = entree;
  const premier = place === 1;

  /* Même arbitrage que `BrandCard` : le logo passe devant la
     couverture, parce qu'une couverture importée d'une boutique est
     souvent la photo d'une pièce prise au hasard, et qu'un logo EST
     l'identité qu'on cherche à reconnaître. */
  const visuel = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  const origine =
    [brand.city, brand.country].filter(Boolean).join(" · ") ||
    (brand.founded_year ? `Depuis ${brand.founded_year}` : "");

  return (
    <article className="card-light group relative flex flex-col overflow-hidden">
      {/* Le lien en calque, sous la carte : un <button> ne peut pas
          vivre dans un <a>, et le cœur doit garder son propre clic. */}
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      {/*
       * LE LISERÉ CHROMÉ, PLUS ÉPAIS, POUR LA PREMIÈRE PLACE.
       *
       * Il est posé DANS la carte et non autour d'elle. Un cadre
       * extérieur aurait paru se détacher au survol : `.card-light`
       * soulève la carte de trois pixels, et le cadre, lui, serait
       * resté. Ici c'est la même technique que `.card-light::before` —
       * un dégradé métallique dont on masque le centre — recouvrant
       * exactement le liseré d'origine, un peu plus large.
       *
       * IL NE DÉRIVE PAS, ALORS QUE LE GABARIT L'ANIME. Le mouvement
       * s'écrit dans `globals.css`, et c'est là que se trouvent aussi
       * les règles qui le coupent quand quelqu'un en a demandé moins
       * (`prefers-reduced-motion`, `[data-fige]`, mode allégé). Une
       * animation posée ici en style en ligne échapperait à toutes :
       * mieux vaut un chrome immobile qu'un chrome qu'on ne peut plus
       * arrêter.
       */}
      {premier && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-4 rounded-[inherit]"
          style={{
            padding: "1.8px",
            backgroundImage: "var(--chrome-edge)",
            backgroundSize: "240% 240%",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}

      <Teinte src={visuel} />

      <div className="pointer-events-none relative z-3 flex flex-1 flex-col">
        {/* La deuxième et la troisième sont carrées tant qu'elles
            partagent une ligne de téléphone : en 4/3 sur cent soixante
            pixels de large, il ne reste que cent vingt pixels de haut,
            et les quatre pastilles posées dessus mangent le visuel. */}
        <div
          className={`relative w-full overflow-hidden bg-linear-to-br from-[#efe6ff] to-[#d9c9f7] ${
            premier ? "aspect-4/3" : "aspect-square md:aspect-4/3"
          }`}
        >
          <IllustrationMarque
            source={visuel}
            estUnLogo={estUnLogo}
            slug={brand.slug}
            nom={brand.name}
          />

          {/*
           * La place, en haut à gauche. La première reçoit la pastille
           * colorée du site — elle passe par les accents du thème et
           * non par un violet écrit en dur, sans quoi elle resterait
           * mauve sur une ambiance verte ou graphite.
           */}
          <span
            className={`absolute left-3 top-3 z-4 grid place-items-center font-black text-white shadow-[0_4px_14px_rgba(35,12,85,0.45)] ${
              premier
                ? "h-[46px] w-[46px] rounded-[14px] text-[17px]"
                : "h-[38px] w-[38px] rounded-[12px] bg-[var(--color-ink)] text-[15px]"
            }`}
            style={
              premier
                ? {
                    backgroundImage:
                      "linear-gradient(120deg, rgb(var(--accent-3)), rgb(var(--accent-1)))",
                  }
                : undefined
            }
          >
            {/* Un chiffre nu ne dit pas de quoi il est le chiffre : sur
                une pastille, l'œil comprend « première place », un
                lecteur d'écran entendrait « un ». */}
            <span className="sr-only">
              {place === 1 ? "Première" : `${place}ᵉ`} place du classement
            </span>
            <span aria-hidden="true">{place}</span>
          </span>

          {brand.featured && <span className="badge absolute right-3 top-3 z-4">À la une</span>}

          {/* Le compteur sur le visuel et non sous le nom : c'est lui
              qui justifie la place, il doit se lire dans le même
              regard. */}
          <span className="absolute bottom-2.5 right-2.5 z-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(14,5,38,0.75)] px-2.5 py-1 text-[12px] font-black text-white backdrop-blur-sm sm:text-[13px]">
            <CoeurPlein className="h-3 w-3" />
            {enChiffres(favoris)}
          </span>

          <div className="pointer-events-auto absolute bottom-2.5 left-2.5 z-4">
            <FavoriteButton
              brandId={brand.id}
              initial={suivie}
              etiquette={brand.name}
              taille="compacte"
            />
          </div>
        </div>

        {/* Le bandeau prend la couleur de l'image au-dessus de lui.
            Voir `Teinte` et `.pied-carte`. */}
        <div className="pied-carte p-3 sm:p-4">
          <h3
            className={`m-0 truncate font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)] ${
              premier ? "text-[17px] sm:text-[20px]" : "text-[14px] sm:text-[16px]"
            }`}
          >
            {brand.name}
          </h3>
          {origine && (
            <p className="m-0 mt-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92] sm:text-[11.5px]">
              {origine}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
