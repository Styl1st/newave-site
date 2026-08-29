import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import PastilleNote from "./PastilleNote";
import CouvertureAnimee from "./CouvertureAnimee";
import IllustrationMarque from "./IllustrationMarque";
import Teinte from "./Teinte";
import { vignette } from "@/lib/vignette";
import type { Brand } from "@/lib/types";
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
   * LA CARTE NE DIT PLUS QUE DEUX CHOSES : QUI, ET D'OÙ.
   *
   * Elle portait aussi l'accroche de la marque, une ou deux catégories,
   * une pastille de boutique et la gamme de prix. Six lignes de texte
   * sous chaque photo, sur une grille de cent trente-six cartes : ça ne
   * se lit pas, ça se saute. Et la plupart des accroches disaient la
   * même chose que la ligne du dessous — « Marque indépendante de
   * streetwear, France » sous une carte déjà étiquetée FRANCE.
   *
   * Ce qui décide de cliquer, dans une grille, c'est la photo. Le texte
   * n'est là que pour nommer ce qu'on regarde. Tout le reste — les
   * styles, les prix, où ça se vend — est sur la fiche, à un clic, et
   * les filtres au-dessus de la grille servent déjà à trier là-dessus.
   *
   * La ligne sous le nom : l'origine, qui est ce qu'on cherche le plus
   * souvent dans un annuaire de marques indépendantes. À défaut,
   * l'année de création. Si l'on ne sait ni l'un ni l'autre, la ligne
   * disparaît plutôt que de laisser un blanc.
   */
  const origine =
    [brand.city, brand.country].filter(Boolean).join(" · ") ||
    (brand.founded_year ? `Depuis ${brand.founded_year}` : "");

  /*
   * LA SEULE ÉTIQUETTE QUI RESTE, ET C'EST LA SEULE QUI PRÉVIENT.
   *
   * « Bientôt », « Ventes privées », « Liste d'attente » ne décrivent
   * pas la marque : ils disent qu'il n'y a rien à acheter aujourd'hui.
   * Une carte muette laisse croire à un catalogue, et l'on ne
   * l'apprend qu'après avoir ouvert la fiche — un aller-retour pour
   * rien, et l'impression d'une page cassée plutôt que d'une boutique
   * qui n'a pas encore ouvert.
   *
   * Une boutique ouverte n'affiche rien : c'est le cas normal, et une
   * pastille sur cent trente-six cartes ne dirait plus rien du tout.
   */
  const acces = unAcces(brand.acces);
  const etiquetteAcces = acces === "ouvert" ? null : ACCES_ETIQUETTE[acces];

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

      {/* L'adresse d'origine : `Teinte` en réclame lui-même une version
          minuscule, qu'il ne sert à rien d'aller chercher en grand. */}
      <Teinte src={visual} />

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
          ) : (
            /*
             * LE DÉFILÉ, MÊME SANS ILLUSTRATION.
             *
             * Il y avait une branche « pas de visuel » qui affichait le
             * nom de la marque sur un aplat. C'était un trou dans la
             * carte, et l'impression qu'il manquait quelque chose —
             * alors que la marque a des pièces, et qu'elles sont belles.
             *
             * Tout passe désormais par `IllustrationMarque` : elle
             * commence par l'illustration quand il y en a une, enchaîne
             * sur les pièces, et ne se rabat sur le nom que si vraiment
             * il n'y a rien.
             */
            <IllustrationMarque
              source={visual}
              estUnLogo={estUnLogo}
              slug={brand.slug}
              nom={brand.name}
            />
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
        {/* Deux lignes, et le bandeau se referme dessus. Le `p-5` d'avant
            réservait la marge d'un bloc de six lignes : sur une carte de
            cent quatre-vingts pixels, il restait plus de vide que de
            texte une fois le reste parti. */}
        <div className="pied-carte flex flex-col p-4 sm:p-5">
          <h3 className="m-0 truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            {brand.name}
          </h3>

          {/* Rien d'écrit, rien d'affiché : une marque sans ville ni pays
              laissait une ligne blanche sous son nom. On ne réservait de
              la place que pour montrer qu'il n'y avait rien à y mettre. */}
          {origine && (
            <p className="m-0 mt-1 truncate text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              {origine}
            </p>
          )}

          {etiquetteAcces && (
            <div className="mt-2.5">
              <span className="inline-block rounded-full bg-[var(--color-ink)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
                {etiquetteAcces}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
