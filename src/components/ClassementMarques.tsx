"use client";

import Link from "next/link";
import { useState } from "react";
import BrandPreview from "./BrandPreview";
import FavoriteButton from "./FavoriteButton";
import IllustrationMarque from "./IllustrationMarque";
import LigneMarque, { CoeurPlein } from "./LigneMarque";
import Teinte from "./Teinte";
import { enChiffres } from "./chiffres";
import PiedDeClassement from "./coeurs/PiedDeClassement";
import type { Mesure, PlaceMarque } from "./coeurs/classement";
import { SEUIL_PODIUM } from "./coeurs/seuils";

/**
 * Le classement des marques : trois marches, puis la suite en lignes.
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
 *
 * IL SERT LES DEUX ONGLETS DE MARQUES. Les plus suivies comptent des
 * cœurs, les mieux notées comptent des avis : c'est la même liste de
 * lignes, avec une autre mesure à la même place. Deux composants pour ça
 * auraient fini par diverger d'un pixel, et l'on serait revenu à une
 * page qui change d'allure selon l'onglet — précisément ce qu'on répare.
 * ⚠️ Les deux mesures ne se rencontrent jamais dans une même ligne : le
 * favori dit qu'on suit, l'avis dit que c'est bon, et les additionner
 * donnerait un chiffre qui ne voudrait plus rien dire.
 *
 * CE QU'IL NE CONTIENT PLUS : la ligne de rayons ni la colonne de
 * droite. Toutes deux coiffent maintenant les cinq classements de la
 * page, donc elles vivent au-dessus — voir `ClassementEnRayons` et
 * `RailDesCoeurs`. Ce composant reçoit une liste DÉJÀ FILTRÉE et la
 * rend, rien de plus.
 */

/** Trois marches. Au-delà ce n'est plus un podium, c'est une liste. */
const MARCHES = 3;

/*
 * Le seuil de cent cœurs — celui qui décide du podium — vit dans
 * `coeurs/seuils.ts`, comme le lot de pagination.
 *
 * Il y est parti le jour où la page a eu, elle aussi, besoin de le lire :
 * le sélecteur de période et la barre de progression du rail obéissent au
 * même nombre, et la page est un composant SERVEUR. Or ce qu'un composant
 * serveur importe d'un fichier « use client » ne lui revient pas comme une
 * valeur mais comme une référence que React résoudra dans le navigateur —
 * parfait pour un composant, catastrophique pour un nombre, puisque la
 * comparaison devient fausse sans le moindre message. Un module ordinaire
 * se lit des deux côtés. Le raisonnement complet est écrit là-bas.
 */

export default function ClassementMarques({
  classement,
  mesure,
  favoris,
  total,
  rayon,
  combien,
  onVoirPlus,
}: {
  /** Le classement DÉJÀ filtré par le rayon choisi. */
  classement: PlaceMarque[];
  /** Ce que compte l'onglet : des cœurs, ou des avis. */
  mesure: Mesure;
  /** Les marques déjà suivies par la personne connectée. Jamais qui d'autre. */
  favoris: string[];
  /**
   * Le nombre de cœurs sur TOUT l'annuaire, pas seulement sur ce qui
   * est affiché. C'est lui qui décide s'il y a un podium.
   */
  total?: number;
  /** Le nom du rayon choisi, pour le rappeler dans le titre de la liste. */
  rayon?: string;
  /** Combien de lignes on affiche. La pagination vit au-dessus. */
  combien: number;
  onVoirPlus: () => void;
}) {
  const suivies = new Set(favoris);
  const [ouvert, setOuvert] = useState<string | null>(null);

  /*
   * TROIS CONDITIONS POUR UN PODIUM, ET LA DERNIÈRE EST LA PLUS
   * IMPORTANTE.
   *
   * La mesure, d'abord : un podium met en scène des cœurs. Sur l'onglet
   * des marques les mieux notées, trois marches trieraient des moyennes
   * — or une moyenne se compare mal en silhouette, et le seuil qui la
   * rend honnête n'est pas celui-ci mais le nombre d'avis minimum.
   *
   * Trois marques ensuite : deux cartes en vitrine et rien derrière ne
   * ressemblent pas à un classement, elles ressemblent à une page à
   * moitié chargée.
   *
   * Cent cœurs enfin. Sur un site qui vient d'ouvrir, un podium met en
   * scène trois marques à deux cœurs chacune — trois voix d'écart y
   * suffiraient à tout renverser, et la page annonce pourtant un
   * classement. Elle ment sans le vouloir, et elle ment au détriment des
   * marques qu'elle relègue.
   *
   * En dessous, la même liste, sans marche ni médaille : « les premières
   * mises de côté ». C'est vrai, et ça n'a rien de honteux.
   *
   * Le seuil est une constante parce qu'il bougera.
   *
   * LE SEUIL SE LIT SUR TOUT L'ANNUAIRE, LE COMPTE DE MARCHES SUR CE QUI
   * EST AFFICHÉ. Un rayon choisi ne rend pas le podium plus honnête —
   * trois voix d'écart restent trois voix d'écart — mais il peut très
   * bien ne contenir que deux marques, et deux marches ne font pas un
   * podium.
   */
  const assezDeCoeurs = mesure === "coeurs" && (total === undefined || total >= SEUIL_PODIUM);
  const podium =
    assezDeCoeurs && classement.length >= MARCHES ? classement.slice(0, MARCHES) : [];
  const suite = classement.slice(podium.length);
  const visibles = suite.slice(0, combien);

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
          {podium.length > 0 ? (
            <p className="eyebrow m-0 mb-2.5 text-white/50">La suite du classement</p>
          ) : (
            /* Sans podium, la liste a besoin d'un titre qui dise ce
               qu'elle est — et d'un mot sur ce qui manque, sinon on
               croit à une page inachevée plutôt qu'à un site jeune. */
            <div className="mb-2.5">
              <p className="eyebrow m-0 text-white/50">
                {mesure === "coeurs" ? "Les premières mises de côté" : "Le classement"}
                {/* Le rayon dans le titre, parce que la pastille cliquée
                    est loin au-dessus dès qu'on a descendu quelques
                    lignes : sans ça, on lit une liste courte sans se
                    souvenir qu'on l'a soi-même rétrécie. */}
                {rayon && <span className="text-white/40"> · {rayon}</span>}
              </p>
              {mesure === "coeurs" && total !== undefined && total < SEUIL_PODIUM && (
                <p className="m-0 mt-1 text-[12px] leading-relaxed text-white/50">
                  Le podium s&apos;ouvrira à {SEUIL_PODIUM} cœurs. En dessous, trois voix
                  d&apos;écart suffiraient à tout changer : un classement n&apos;y voudrait
                  rien dire.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {visibles.map((entree, i) => (
              /*
               * PAS DE NUMÉRO DE RANG QUAND IL N'Y A PAS DE PODIUM, ET
               * C'EST LA MÊME RAISON QUI VAUT POUR LES DEUX.
               *
               * Sous cent cœurs, écrire « 7ᵉ » à côté d'une marque à deux
               * cœurs range huit marques que trois voix d'écart
               * suffiraient à réordonner. Le chiffre a l'air d'un fait
               * alors qu'il est un hasard, et il colle une place à
               * quelqu'un qui n'a rien demandé. Le compte de cœurs, lui,
               * reste : il ne prétend rien classer, il dit ce qui s'est
               * passé.
               *
               * Au-dessus du seuil, le rang revient de lui-même : le
               * podium existe, donc l'ordre veut dire quelque chose.
               *
               * `ligne-eco` met de côté ce qui est hors écran sur
               * téléphone — le navigateur cesse de décoder les visuels
               * qu'on ne regarde pas, et c'est ce décodage qui faisait
               * recharger la page. Voir globals.css.
               */
              <div key={entree.brand.id} className="ligne-eco">
                <LigneMarque
                  brand={entree.brand}
                  rang={podium.length > 0 ? podium.length + i + 1 : undefined}
                  coeurs={entree.coeurs}
                  note={entree.note}
                  favori={{ initial: suivies.has(entree.brand.id) }}
                  onApercu={() => setOuvert(entree.brand.slug)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Le pied est celui des cinq onglets, et il vit dans `coeurs/`
          depuis que les pièces s'affichent elles aussi en lignes : deux
          pieds jumeaux dans deux fichiers auraient fini par diverger. */}
      {classement.length > 0 && (
        <PiedDeClassement
          affichees={podium.length + visibles.length}
          total={classement.length}
          onVoirPlus={onVoirPlus}
        />
      )}

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
 *
 * Elle n'est construite que pour la mesure « cœurs » : c'est la seule
 * qui ouvre un podium, et `coeurs` y est donc toujours renseigné.
 */
function Marche({
  place,
  entree,
  suivie,
}: {
  place: number;
  entree: PlaceMarque;
  suivie: boolean;
}) {
  const { brand, coeurs = 0 } = entree;
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
            {enChiffres(coeurs)}
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
