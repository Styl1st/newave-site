import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import PastilleNote from "./PastilleNote";
import CouvertureAnimee from "./CouvertureAnimee";
import VisuelAdaptatif from "./VisuelAdaptatif";
import Teinte from "./Teinte";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import type { Brand } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";
import { plateformeDeVente } from "@/lib/boutiques";
import { ACCES_ETIQUETTE, unAcces } from "@/lib/acces";

export default function BrandCard({
  brand,
  favori,
  apercu,
  note,
}: {
  brand: Brand;
  /** Présent = on affiche le cœur, avec son état de départ. */
  favori?: { initial: boolean };
  /** Bouton d'aperçu, posé en bas à gauche du visuel. */
  apercu?: React.ReactNode;
  /** La moyenne des avis. Absente ou vide = rien ne s'affiche. */
  note?: { moyenne: number; avis: number };
}) {
  /*
   * LE LOGO PASSE DEVANT LA COUVERTURE.
   *
   * C'était l'inverse : la couverture d'abord, le logo seulement à
   * défaut. Or une couverture importée d'une boutique, c'est souvent la
   * photo d'UNE pièce prise au hasard du catalogue. Sur une carte
   * d'annuaire, elle raconte cet article-là et pas la marque : on
   * reconnaissait un sac rose, pas GoodLou.
   *
   * Un logo, lui, EST l'identité. C'est ce qu'on cherche à reconnaître
   * en parcourant une grille de cent marques, et c'est ce que la marque
   * elle-même a dessiné pour être reconnue.
   *
   * L'illustration animée reste prioritaire sur les deux : quand une
   * marque s'est donné la peine d'en faire une, c'est ce qu'elle a de
   * mieux à montrer.
   */
  const visual = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  /*
   * Ce qui n'est pas un style mais qu'il faut savoir avant de cliquer :
   * où ça se vend, et si c'est ouvert aujourd'hui.
   *
   * Une seule des deux, au plus. Deux pastilles noires côte à côte
   * plus deux catégories, ça fait quatre étiquettes sur une carte
   * large de trois cents pixels : plus personne ne lit rien. L'accès
   * passe devant, parce qu'une boutique fermée est l'information la
   * plus susceptible de faire changer d'avis.
   */
  /*
   * La ligne sous le nom.
   *
   * D'abord l'origine, qui est ce qu'on cherche le plus souvent dans un
   * annuaire de marques indépendantes. À défaut, l'année de création :
   * elle était enregistrée sans être montrée nulle part, et elle dit
   * quelque chose de vrai plutôt que de laisser un blanc. Si l'on ne
   * sait ni l'un ni l'autre, la ligne disparaît.
   */
  const origine =
    [brand.city, brand.country].filter(Boolean).join(" · ") ||
    (brand.founded_year ? `Depuis ${brand.founded_year}` : "");

  const acces = unAcces(brand.acces);
  const plateforme = plateformeDeVente(brand.shop_url ?? brand.website_url);
  const etiquettes = [
    acces === "ouvert" ? null : ACCES_ETIQUETTE[acces],
    plateforme?.etiquette ?? null,
  ]
    .filter((e): e is string => Boolean(e))
    .slice(0, 1);

  return (
    /*
     * Le lien passe DERRIÈRE la carte, en calque, plutôt que de
     * l'entourer. Un <button> ne peut pas vivre dans un <a> : le
     * navigateur refuse cette imbrication, et le cœur ci-dessous doit
     * garder son propre clic. Toute la carte reste cliquable.
     */
    /*
     * PLUS DE HAUTEUR IMPOSÉE.
     *
     * Toutes les cartes d'une rangée s'alignaient sur la plus haute.
     * Une marque sans accroche héritait donc de la hauteur de sa
     * voisine bavarde, et se retrouvait avec un grand blanc entre son
     * nom et ses étiquettes. On réservait de la place pour un texte qui
     * n'existait pas.
     *
     * Chaque carte fait maintenant sa taille. Les hauts restent alignés
     * puisque c'est une grille, les bas ne le sont plus, et une carte
     * courte est simplement courte. Pour revenir en arrière il suffit
     * de remettre `h-full` ici et sur le bloc en dessous.
     */
    <div className="card-light group relative flex flex-col overflow-hidden">
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      {/* La MÊME adresse que la vignette affichée : c'est déjà l'image
          que le navigateur a chargée, et la mesure est retenue par
          adresse, donc un logo qui revient ailleurs ne sera pas relu. */}
      <Teinte src={vignette(visual, estUnLogo ? 400 : 640)} />

      <div className="pointer-events-none relative z-3 flex flex-1 flex-col">
        {/* Le visuel donne le ton avant meme le clic. Sans image, on garde
            un aplat plutot qu'un trou : la grille reste alignee. */}
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-t-[var(--radius)] bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]">
          {brand.cover_video_url ? (
            /* L'illustration animée, la même que sur la fiche. Elle ne
               se charge que lorsque la carte approche de l'écran et se
               relâche dès qu'elle s'en va : voir `CouvertureAnimee`. */
            <CouvertureAnimee
              video={brand.cover_video_url}
              affiche={vignette(brand.cover_url, 600)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : visual && estUnLogo ? (
            /*
             * LE LOGO, SUR SON PROPRE FLOU.
             *
             * J'avais essayé une plaque claire fixe avec le logo posé
             * dessus, et un flou ajouté par-dessus la plaque. Ça faisait
             * deux fonds superposés, et le logo semblait dédoublé.
             *
             * On revient au procédé simple, celui des lecteurs vidéo :
             * le logo en entier, et derrière lui le même agrandi et
             * flouté. Un seul fond, la couleur vient de la marque, et
             * cent logos ne donnent plus cent cartes identiques.
             */
            <VisuelAdaptatif
              src={vignette(visual, 400)}
              srcSet={jeuDeVignettes(visual, 400)}
              alt={brand.name}
              cadre={16 / 10}
              fondFlou
              /*
               * Un logo trop petit se replie sur la couverture.
               *
               * Beaucoup de marques n'ont qu'un logotype de cent
               * cinquante pixels, prévu pour un pied de page. Agrandi à
               * la taille d'une carte, il en ressort en bouillie, et
               * c'est la marque qui a l'air négligée. Mieux vaut sa
               * couverture, même quelconque. La mesure se fait au
               * chargement : voir `VisuelAdaptatif`.
               */
              secours={brand.cover_url ? vignette(brand.cover_url, 640) : undefined}
              className="transition duration-500 group-hover:scale-[1.04]"
            />
          ) : visual ? (
            /*
             * C'est L'IMAGE qui décide si on la recadre.
             *
             * Une couverture de marque n'est pas toujours une photo :
             * c'est souvent un lettrage sur fond uni, ou une bannière
             * trois fois plus large que haute. Remplie de force dans le
             * cadre, elle perdait la moitié de son nom. Voir
             * `VisuelAdaptatif`.
             */
            <VisuelAdaptatif
              src={vignette(visual, 640)}
              cadre={16 / 10}
              className="transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[#a795c9]">
                {brand.name}
              </span>
            </div>
          )}

          {brand.featured && <span className="badge absolute left-3 top-3">À la une</span>}

          {/* Le quatrième coin, le seul encore libre : « À la une » en
              haut à gauche, l'aperçu en bas à gauche, le cœur en bas à
              droite. La note prend donc le haut à droite. */}
          {note && (
            <PastilleNote
              moyenne={note.moyenne}
              avis={note.avis}
              className="absolute right-3 top-3"
            />
          )}

          {/* En bas à droite du visuel : le haut est déjà occupé par le
              badge « À la une » et par le bouton d'aperçu, et sur une
              carte étroite les trois se marchaient dessus. */}
          {/* Trois surcouches, trois coins distincts : le badge en
              haut à gauche, l'aperçu en bas à gauche, le cœur en bas à
              droite. Sur une carte étroite, deux d'entre elles au même
              endroit finissaient par se chevaucher. */}
          {apercu && (
            <div className="pointer-events-auto absolute bottom-3 left-3">{apercu}</div>
          )}

          {favori && (
            <div className="pointer-events-auto absolute bottom-3 right-3">
              <FavoriteButton
                brandId={brand.id}
                initial={favori.initial}
                etiquette={brand.name}
                taille="compacte"
              />
            </div>
          )}
        </div>

        {/* Le bandeau prend la couleur de l'image au-dessus de lui.
            Voir `Teinte` et `.pied-carte`. */}
        <div className="pied-carte flex flex-1 flex-col p-5">
          <h3 className="m-0 truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            {brand.name}
          </h3>

          {/* Rien d'écrit, rien d'affiché.
              Ces deux lignes étaient rendues même vides : une marque
              sans ville ni pays laissait une ligne blanche, et une
              marque sans accroche un trou de trois lignes au milieu de
              sa carte. On ne réservait donc de la place que pour
              montrer qu'il n'y avait rien à y mettre. */}
          {origine && (
            <p className="m-0 mt-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              {origine}
            </p>
          )}

          {brand.tagline?.trim() && (
            <p className="m-0 mt-3 text-[14px] leading-relaxed text-[#3a2c5e]">{brand.tagline}</p>
          )}

          {/* `mt-auto` pousse les étiquettes en bas quand la carte est
              plus haute que son contenu, ce qui arrive dès qu'une
              voisine de la même rangée en dit plus. Sans lui, elles
              flotteraient au milieu du vide plutôt que de tenir la base
              de la carte. */}
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
            {/*
              Deux pastilles PLEINES avant les catégories, et elles ne
              se saisissent nulle part : elles se déduisent de l'adresse
              de la boutique et de son état d'ouverture.
              « Vinted » ou « Bientôt » changent complètement ce à quoi
              s'attendre en cliquant — pièce unique, ou rien en vente
              aujourd'hui — et l'apprendre APRÈS avoir ouvert la fiche,
              c'est un aller-retour pour rien.
            */}
            {etiquettes.map((e) => (
              <span
                key={e}
                className="rounded-full bg-[var(--color-ink)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white"
              >
                {e}
              </span>
            ))}
            {brand.categories.slice(0, etiquettes.length > 0 ? 1 : 2).map((c) => (
              <span
                key={c}
                className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#4a3a78]"
              >
                {c}
              </span>
            ))}
            <span className="ml-auto text-[11px] font-bold text-[#6a5a92]">
              {PRICE_TIER_LABEL[brand.price_tier]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
