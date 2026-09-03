"use client";

import Link from "next/link";
import { useState } from "react";
import FavoriteButton from "../FavoriteButton";
import { vignette } from "@/lib/vignette";
import { CARTES_A_DECOUVRIR } from "./seuils";
import type { Brand } from "@/lib/types";

/**
 * « Le premier cœur est à prendre » : les marques que personne n'a
 * encore mises de côté.
 *
 * C'EST LA MOITIÉ MANQUANTE D'UNE PAGE DE CLASSEMENT. Un classement dit
 * qui est devant ; il ne dit jamais rien de ceux qui n'y figurent pas, et
 * sur un site jeune ils sont la majorité. Les laisser hors champ revient
 * à faire croire que l'annuaire s'arrête aux vingt marques déjà suivies.
 *
 * LE TON EST TOUT LE TRAVAIL DE CE BLOC. « Aucun cœur » se lit comme un
 * bulletin, et un bulletin sur une marque qui vient d'arriver est un
 * jugement qu'on n'a pas le droit de rendre : personne ne l'a notée, on
 * ne l'a simplement pas encore regardée. D'où la phrase, qui est le vrai
 * contenu de ce bloc : ce ne sont pas les moins bonnes, juste les moins
 * vues.
 *
 * LE GESTE EST SUR LA CARTE. Un bloc qui montre des marques sans cœur et
 * demande d'aller ailleurs pour en donner un ne sert à rien : le bouton
 * est posé sur le visuel, là où le regard se trouve déjà.
 */

export default function PremierCoeur({
  marques,
  combien: sansCoeur,
  suivies,
}: {
  /**
   * La réserve de marques sans aucun cœur, DÉJÀ MÉLANGÉE PAR LE SERVEUR
   * et déjà réduite à quelques séries (voir `RESERVE_A_DECOUVRIR`).
   *
   * Le tirage au sort ne peut pas se faire ici. Un `Math.random()` au
   * premier rendu donne un ordre sur le serveur et un autre dans le
   * navigateur : React compare les deux, ne reconnaît rien, et signale
   * une erreur d'hydratation sur toute la page. Le hasard est donc tiré
   * une seule fois, en amont, et ce composant ne fait que se déplacer
   * dans la liste reçue.
   */
  marques: Brand[];
  /**
   * Combien de marques de l'annuaire n'ont VRAIMENT aucun cœur.
   *
   * Ce n'est pas `marques.length` : la réserve est plafonnée pour ne pas
   * alourdir la page, et annoncer sa taille reviendrait à écrire « 24
   * marques » là où il y en a cent trente. La phrase de ce bloc est une
   * affirmation sur l'annuaire, elle doit dire le vrai chiffre.
   */
  combien: number;
  /** Celles que la personne connectée suit déjà. */
  suivies: string[];
}) {
  const [depart, setDepart] = useState(0);
  const dejaSuivies = new Set(suivies);

  if (marques.length === 0) return null;

  const combien = Math.min(CARTES_A_DECOUVRIR, marques.length);

  /*
   * « UNE AUTRE SÉRIE » FAIT GLISSER LA FENÊTRE, IL NE RETIRE PAS AU
   * SORT.
   *
   * Deux raisons, et la seconde compte plus que la première. Un nouveau
   * tirage à chaque clic peut ressortir la même marque deux fois de
   * suite, et le bouton donne alors l'impression de ne pas marcher. Mais
   * surtout : en avançant d'une série à l'autre, on finit par avoir vu
   * TOUTES les marques sans cœur, ce qui est exactement ce qu'on
   * cherche ici. Un tirage sans mémoire, lui, en laisserait
   * indéfiniment certaines de côté — le contraire de l'intention.
   *
   * Le modulo referme la boucle : arrivé au bout, on repart du début.
   */
  const serie = Array.from(
    { length: combien },
    (_, i) => marques[(depart + i) % marques.length]
  );

  return (
    <section className="glass mt-7 p-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow m-0 text-white/50">Personne n&apos;a encore voté pour elles</p>
          <h2 className="m-0 mt-2 text-[21px] font-extrabold leading-tight tracking-[-0.02em] text-white">
            Le premier cœur est à prendre
          </h2>
          <p className="m-0 mt-2 max-w-lg text-[13.5px] leading-relaxed text-white/78">
            {sansCoeur} marque{sansCoeur > 1 ? "s" : ""} de l&apos;annuaire n&apos;
            {sansCoeur > 1 ? "ont" : "a"} aucun cœur.{" "}
            <strong className="font-extrabold text-white">
              Ce ne sont pas les moins bonnes — juste les moins vues.
            </strong>
          </p>
        </div>

        {marques.length > combien && (
          <button
            type="button"
            onClick={() => setDepart((d) => (d + combien) % marques.length)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-white/20 active:scale-95"
          >
            <IconMelange />
            Une autre série
          </button>
        )}
      </div>

      {/*
       * Deux colonnes sur téléphone, quatre dès qu'il y a la place. La
       * maquette en demande quatre : sur trois cent soixante pixels de
       * large, quatre colonnes laissent soixante-dix pixels par visuel,
       * où l'on ne reconnaît plus rien et où le bouton cœur couvre la
       * moitié de l'image.
       *
       * `content-visibility` parce que ce bloc est sous le classement,
       * donc hors de l'écran à l'ouverture : le navigateur saute son
       * travail — mise en page, peinture, décodage des visuels — tant
       * qu'on n'est pas descendu jusqu'ici. Même remède que `.carte-eco`,
       * et pour la même raison : c'est le décodage des images qui fait
       * recharger la page sur un téléphone. La hauteur de réserve évite
       * que l'ascenseur ne saute sous le doigt ; `auto` demande au
       * navigateur de retenir la vraie mesure dès le premier passage.
       */}
      <div className="mt-4 grid grid-cols-2 gap-3 [contain-intrinsic-size:auto_260px] [content-visibility:auto] md:grid-cols-4">
        {serie.map((marque) => (
          <CarteADecouvrir
            key={marque.id}
            brand={marque}
            suivie={dejaSuivies.has(marque.id)}
          />
        ))}
      </div>
    </section>
  );
}

/** Une des quatre cartes : un visuel, un cœur, un nom, une origine. */
function CarteADecouvrir({ brand, suivie }: { brand: Brand; suivie: boolean }) {
  /* Même arbitrage que `BrandCard` et que le podium : le logo passe
     devant la couverture, parce qu'une couverture importée d'une
     boutique est souvent la photo d'une pièce prise au hasard, et qu'un
     logo EST l'identité qu'on cherche à reconnaître. */
  const visuel = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  const meta =
    [brand.city, brand.country].filter(Boolean).join(" · ") ||
    brand.categories[0] ||
    (brand.founded_year ? `Depuis ${brand.founded_year}` : "");

  return (
    <article className="card-light group relative flex flex-col overflow-hidden rounded-[16px]">
      {/* Le lien en calque, sous la carte : un <button> ne peut pas
          vivre dans un <a>, et le cœur doit garder son propre clic. */}
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      <div className="pointer-events-none relative z-3 flex flex-1 flex-col">
        <div className="relative aspect-4/3 w-full overflow-hidden bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]">
          {visuel ? (
            /*
             * Une image simple, et pas le défilé de pièces de
             * `IllustrationMarque`. Ce bloc en montre quatre à la fois et
             * se renouvelle à chaque clic : le défilé irait chercher le
             * catalogue de chacune, soit quatre requêtes de plus par
             * série, pour un bloc qu'on parcourt vite. La vignette est
             * demandée à la taille où on l'affiche — voir `vignette`,
             * c'est ce qui empêche un téléphone de recharger la page.
             */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vignette(visuel, 320, { logo: estUnLogo })}
              alt=""
              loading="lazy"
              decoding="async"
              className={`h-full w-full ${estUnLogo ? "object-contain p-3" : "object-cover"}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2">
              <span className="text-center text-[12px] font-black uppercase tracking-[0.16em] text-[#a795c9]">
                {brand.name}
              </span>
            </div>
          )}

          {/*
           * Le cœur en bas à droite, sur le visuel.
           *
           * C'est la pastille `compacte` du site, celle du podium et des
           * cartes d'annuaire, et non un bouton redessiné pour ce bloc.
           * La maquette la veut de trente-deux pixels quand celle-ci en
           * fait trente-six : refaire le bouton pour gagner quatre pixels
           * dupliquerait le geste le plus important de la page — le
           * renvoi vers la connexion, l'état d'attente, la reprise
           * d'erreur — et le jour où l'un des deux changerait, l'autre
           * mentirait.
           */}
          <div className="pointer-events-auto absolute bottom-2 right-2 z-4">
            <FavoriteButton
              brandId={brand.id}
              initial={suivie}
              etiquette={brand.name}
              taille="compacte"
            />
          </div>
        </div>

        <div className="p-3">
          <h3 className="m-0 truncate text-[14px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
            {brand.name}
          </h3>
          {meta && (
            <p className="m-0 mt-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              {meta}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Le mélange, en deux flèches qui se croisent.
 *
 * Dessiné ici et non dans `Icons` : c'est la seule page qui en a besoin,
 * et le jeu d'icônes commun n'a pas à grossir d'un dessin qui ne sert
 * qu'une fois. Il reprend le gabarit d'`Icons` — même boîte, même trait,
 * même héritage de couleur — pour ne pas se voir à côté des autres.
 */
function IconMelange() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[1.05em] w-[1.05em] shrink-0"
    >
      <path d="M16 4h4v4" />
      <path d="M4 20 20 4" />
      <path d="M16 20h4v-4" />
      <path d="m4 4 5 5" />
      <path d="m15 15 5 5" />
    </svg>
  );
}
