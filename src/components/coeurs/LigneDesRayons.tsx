"use client";

import Link from "next/link";
import { enChiffres } from "../chiffres";
import { MOT_DE_LA_MESURE } from "./classement";
import type { Mesure, RayonAffiche, RayonVide } from "./classement";
import { RAYONS_VIDES_MAX, SEUIL_RAYON } from "./seuils";

/**
 * La ligne de rayons, et la zone de ceux qui n'ont encore aucun cœur.
 *
 * ELLE COIFFE MAINTENANT LES CINQ CLASSEMENTS, et plus seulement celui
 * des marques suivies. C'est le même geste sur les cinq : « je regarde
 * quoi ? » avant « qui est devant ? ». Elle vivait dans
 * `ClassementMarques`, elle est remontée d'un cran pour cette raison.
 *
 * ⚠️ ELLE NE DIT PLUS « CŒURS » EN DUR. Sur les onglets de notes, la
 * valeur d'un rayon est un nombre d'AVIS : l'annoncer comme des cœurs
 * aurait fait mentir la pastille la plus visible de la page, et rouvert
 * le mélange que toute la page s'applique à éviter. Le mot vient de
 * `MOT_DE_LA_MESURE`, et le champ s'appelle `valeur` et non `coeurs`
 * pour que le JSX n'ait plus l'occasion de se tromper.
 *
 * LE PROBLÈME N'ÉTAIT PAS LA LIGNE, C'ÉTAIT QU'ELLE MENTAIT. Un rayon à
 * zéro se présentait exactement comme un rayon à quatre cents : même
 * pastille, même clic, et l'on tombait sur un classement vide. Sur un
 * site qui vient d'ouvrir, c'était le cas de presque tous — la ligne
 * promettait donc vingt-sept fois quelque chose qu'elle n'avait pas.
 *
 * D'où la coupure. Au-dessus, ce qui a des cœurs, rangé du mieux garni
 * au moins garni : ON LIT L'ORDRE AVANT DE LIRE LES MOTS, et la jauge
 * sous chaque nom donne l'écart d'un regard, ce qu'un chiffre seul ne
 * fait jamais. En dessous, sous un filet, ceux qui n'ont rien — en
 * pointillé, sans compteur, avec un libellé qui dit la vérité (« 7
 * marques à découvrir ») et un lien qui mène à l'annuaire filtré. Le
 * geste reste possible, il ne mène simplement pas dans le mur.
 *
 * LA ZONE DU BAS NE CONCERNE QUE LES MARQUES, et c'est pour ça qu'elle
 * est facultative. Elle parle de fiches d'annuaire à découvrir : sous un
 * classement de pièces, elle enverrait vers `/marques?cat=` pour un
 * rayon de vêtements, c'est-à-dire ailleurs que là où l'on est. Les
 * onglets de pièces ne la passent donc pas, et elle disparaît d'elle-
 * même.
 *
 * LA LIGNE DÉFILE, ELLE NE PASSE PAS À LA LIGNE ET NE DEVIENT PAS UNE
 * LISTE DÉROULANTE. Passer à la ligne fabrique un pavé de pastilles qui
 * repousse le classement hors de l'écran du téléphone, et grandit d'un
 * rang dès qu'on tourne l'appareil. Une liste déroulante native — la
 * solution retenue pour `SelecteurClassement`, et la bonne là-bas —
 * perdrait ici l'essentiel : la jauge. Cette ligne n'est pas seulement
 * un choix, c'est un petit graphique, et un graphique ne rentre pas dans
 * un `<select>`.
 */

/** La jauge, en dessous de laquelle on ne descend pas. */
const JAUGE_MINIMALE = 8;

export default function LigneDesRayons({
  rayons,
  mesure,
  actif,
  onChoisir,
  total,
  vides = [],
}: {
  /** Les rayons dérivés de ce qui est affiché. Voir `rayonsDeLAffichage`. */
  rayons: RayonAffiche[];
  /** Ce que compte l'onglet : des cœurs, ou des avis. */
  mesure: Mesure;
  /** Le rayon choisi, ou `null` pour « Tout ». */
  actif: string | null;
  onChoisir: (slug: string | null) => void;
  /** La mesure de tout ce qui est classé : le compte de « Tout ». */
  total: number;
  /**
   * Les rayons de l'annuaire qui n'ont encore rien à classer.
   *
   * Réservé au classement des marques suivies — voir plus haut. Vide
   * partout ailleurs, et la zone du bas ne s'affiche alors pas du tout.
   */
  vides?: RayonVide[];
}) {
  /* Filet de sécurité : un rayon dérivé d'une entrée à zéro n'a rien à
     faire dans la rangée principale, puisque cliquer dessus mènerait à
     une liste qui ne montre rien. C'est la même règle que celle qui
     range les rayons de `vides` en dessous, et elle est écrite une fois
     pour toutes dans `seuils.ts`. */
  const garnis = rayons.filter((r) => r.valeur >= SEUIL_RAYON);
  const unite = MOT_DE_LA_MESURE[mesure];

  /*
   * LA JAUGE SE MESURE SUR LE RAYON LE MIEUX GARNI, PAS SUR LE TOTAL.
   *
   * Une entrée compte dans chacun de ses rayons : la somme des rayons
   * dépasse donc le total du classement, et des pourcentages calculés
   * dessus donneraient des barres minuscules qui ne diraient plus rien.
   * Rapportées au premier rayon, elles répondent à la seule question
   * qu'on se pose devant une ligne comme celle-ci : combien plus que le
   * suivant ?
   */
  const sommet = garnis[0]?.valeur ?? 0;

  return (
    <div className="mb-5">
      <div className="sans-ascenseur flex items-stretch gap-2 overflow-x-auto pb-1">
        <Pastille
          nom="Tout"
          compte={total}
          unite={unite}
          part={100}
          choisi={actif === null}
          onClick={() => onChoisir(null)}
        />
        {garnis.map((r) => (
          <Pastille
            key={r.slug}
            nom={r.nom}
            compte={r.valeur}
            unite={unite}
            part={
              sommet > 0
                ? Math.max(JAUGE_MINIMALE, Math.round((r.valeur / sommet) * 100))
                : 0
            }
            choisi={actif === r.slug}
            onClick={() => onChoisir(r.slug)}
          />
        ))}
      </div>

      {vides.length > 0 && (
        <div className="mt-4 border-t border-white/15 pt-4">
          <p className="eyebrow m-0 mb-2.5 text-white/45">Encore aucun cœur</p>

          {/* Ceux-là passent à la ligne, et c'est la différence avec la
              rangée du dessus : on ne les compare pas, on les lit. Rien
              à aligner, donc rien à faire défiler. */}
          <div className="flex flex-wrap gap-2">
            {vides.slice(0, RAYONS_VIDES_MAX).map((r) => (
              /*
               * ⚠️ VERS L'ANNUAIRE FILTRÉ, JAMAIS VERS UN CLASSEMENT
               * VIDE. C'est toute la raison d'être de cette zone : la
               * pastille reste cliquable — le rayon existe, il a des
               * marques — mais elle emmène là où il y a quelque chose à
               * voir.
               */
              <Link
                key={r.slug}
                href={`/marques?cat=${encodeURIComponent(r.slug)}`}
                className="min-w-[112px] rounded-[15px] border border-dashed border-white/30 px-4 pb-[9px] pt-2.5 text-left transition hover:border-white/55 hover:bg-white/8"
              >
                <span className="block text-[12px] font-bold uppercase tracking-[0.06em] text-white/80">
                  {r.nom}
                </span>
                {/* Pas de compteur de cœurs : écrire « 0 » n'apprend
                    rien et transforme le rayon en mauvaise note. Ce
                    qu'il a vraiment, ce sont des marques que personne
                    n'a encore vues. */}
                <span className="mt-0.5 block text-[10.5px] font-semibold text-white/50">
                  {r.marques} marque{r.marques > 1 ? "s" : ""} à découvrir
                </span>
              </Link>
            ))}

            {vides.length > RAYONS_VIDES_MAX && (
              /* Le reste a déjà une page faite pour lui. Voir
                 `RAYONS_VIDES_MAX` pour la raison du plafond. */
              <Link
                href="/marques"
                className="inline-flex items-center rounded-[15px] px-3 pb-[9px] pt-2.5 text-[11.5px] font-bold text-white/65 underline underline-offset-4 transition hover:text-white"
              >
                et {vides.length - RAYONS_VIDES_MAX} autres rayons dans l&apos;annuaire
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Une pastille de la ligne principale.
 *
 * Le nom, le compte, la jauge. La jauge est un `<span>` dans un `<span>`
 * plutôt qu'un `<progress>` : l'élément natif se dessine différemment sur
 * chaque système, et il porte une sémantique de « tâche en cours » qui
 * n'a rien à voir avec ce qu'on montre ici. Le rayon est déjà annoncé en
 * toutes lettres par son compte, la barre n'est qu'un doublon visuel —
 * d'où le `aria-hidden`.
 */
function Pastille({
  nom,
  compte,
  unite,
  part,
  choisi,
  onClick,
}: {
  nom: string;
  compte: number;
  /**
   * Ce que compte le chiffre, dit à voix haute.
   *
   * Un nombre nu, lu par un lecteur d'écran, annonce « Streetwear,
   * quarante-deux » — et rien ne dit quarante-deux quoi. Le mot suit
   * donc la mesure de l'onglet plutôt que d'être écrit en dur.
   */
  unite: string;
  /** La part du rayon le mieux garni, de 0 à 100. */
  part: number;
  choisi: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={choisi}
      className={`min-w-[112px] shrink-0 rounded-[15px] px-4 pb-[9px] pt-2.5 text-left transition active:scale-95 ${
        choisi
          ? "bg-white text-[var(--color-ink)]"
          : "bg-white/12 text-white hover:bg-white/20"
      }`}
    >
      <span className="block whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.06em] opacity-80">
        {nom}
      </span>
      <span className="block text-[13px] font-black tabular-nums">
        {enChiffres(compte)}
        <span className="sr-only"> {unite}</span>
      </span>

      {/* Le fond de jauge reste clair sur la pastille sombre et sombre
          sur la pastille blanche : une barre grise sur fond blanc ne se
          verrait pas, et c'est justement celle qui est à 100 %. */}
      <span
        aria-hidden="true"
        className={`mt-1.5 block h-[3px] w-full overflow-hidden rounded-full ${
          choisi ? "bg-[rgba(23,10,51,0.14)]" : "bg-white/16"
        }`}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${part}%`,
            /* Le dégradé de la maquette pour les rayons au repos ; sur
               la pastille blanche, l'encre du site — un dégradé rose sur
               blanc perdrait tout contraste. */
            background: choisi
              ? "#170a33"
              : "linear-gradient(90deg, rgba(232,111,216,.95), rgba(180,122,234,.9))",
          }}
        />
      </span>
    </button>
  );
}
