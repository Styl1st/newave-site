"use client";

import Link from "next/link";
import { vignette } from "@/lib/vignette";
import type { MarqueTrouvee, Recherche } from "@/lib/types";
import type { Critere } from "./Jeton";

/**
 * Les suggestions : les critères, puis les marques, puis les pièces.
 *
 * LE MÊME RENDU SOUS LE CHAMP ET DANS LA FEUILLE. Sur ordinateur elles
 * s'affichent dans la barre de requête, au doigt dans une feuille qui
 * prend l'écran (voir `FeuilleRecherche`) — mais ce sont les mêmes
 * groupes, dans le même ordre, avec le même préfixe surligné. Les écrire
 * deux fois aurait suffi à ce que l'un des deux garde une vieille
 * version du dessin.
 *
 * DEUX SORTES DE LIGNES, ET UN BADGE POUR LES DISTINGUER. Une ligne de
 * critère POSE un jeton et reste sur la page ; une ligne de marque
 * OUVRE une fiche et quitte la page. Deux gestes opposés qui, sans
 * badge, se ressemblent trait pour trait. L'aplat d'accent dit « ceci
 * deviendra un jeton », le simple contour dit « ceci est une marque ».
 * C'est la seule couleur pleine de la barre, elle ne sert qu'à ça.
 *
 * Ce qui change entre les deux formes tient à `feuille` : au doigt, les
 * lignes s'aèrent pour atteindre la cible de quarante-quatre pixels, la
 * vignette de la marque reste — c'est elle qu'on reconnaît avant le nom
 * — et il n'y a pas de critère, la feuille ne pose pas encore de jetons.
 *
 * LA LIGNE ET LA BANDE SONT SORTIES À PART, plus bas. Le pop-up de la
 * barre (voir `PopupRecherche`) range les mêmes résultats en DEUX
 * COLONNES, avec un groupe de posts que les deux autres écrans n'ont
 * pas : il ne peut donc pas appeler ce composant-ci tel quel. Il
 * appelle ses briques, ce qui revient au même pour ce qui compte — une
 * marque se dessine à un seul endroit du dépôt.
 */

export default function Suggestions({
  suggestions,
  query,
  surligne,
  onSurligne,
  onOuvrir,
  feuille = false,
  criteres = [],
  onPoser,
}: {
  suggestions: Recherche;
  query: string;
  /** L'index de la ligne au clavier, critères et marques confondus. */
  surligne: number;
  onSurligne: (i: number) => void;
  /** Appelé juste avant de partir : c'est là qu'on note la recherche. */
  onOuvrir: (mot: string) => void;
  /** Vrai dans la feuille : cibles au doigt, métadonnées toujours lues. */
  feuille?: boolean;
  /** Les critères posables, déjà comptés par l'annuaire. */
  criteres?: Critere[];
  onPoser?: (critere: Critere) => void;
}) {
  const marques = suggestions.marques;
  const mot = query.trim();

  const ligne = feuille
    ? "flex items-center gap-3 rounded-[13px] px-3 py-3 transition"
    : "flex items-center gap-3 rounded-[10px] px-2 py-[7px] text-left transition";

  return (
    <>
      {criteres.length > 0 && (
        <div className="flex flex-col">
          {criteres.map((c, i) => (
            <button
              key={c.cle}
              type="button"
              onMouseEnter={() => onSurligne(i)}
              onClick={() => onPoser?.(c)}
              className={`${ligne} ${i === surligne ? "bg-white/14" : "hover:bg-white/8"}`}
            >
              <span className="badge-type badge-critere">{c.famille}</span>

              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">
                <Surligne texte={c.valeur} motif={mot} trait />
              </span>

              {c.compte !== undefined && (
                <span className={classeContexte(feuille)}>
                  {c.compte} marque{c.compte > 1 ? "s" : ""}
                </span>
              )}

              {i === surligne && <span className="requete-touche">Entrée</span>}
            </button>
          ))}
        </div>
      )}

      {marques.length > 0 && (
        <>
          {/* L'intertitre ne sert plus qu'au doigt : en grand, les badges
              disent déjà de quoi chaque ligne est faite, et une ligne de
              titre au-dessus de trois lignes de liste est du bruit. */}
          <p
            className={`eyebrow m-0 mb-2 text-white/45 ${feuille ? "" : "hidden"} ${
              criteres.length > 0 ? "mt-3" : ""
            }`}
          >
            Marques · {marques.length} résultat{marques.length > 1 ? "s" : ""}
          </p>

          <div className="flex flex-col gap-0.5">
            {marques.map((m, i) => {
              const rang = criteres.length + i;
              return (
                <LigneMarque
                  key={m.slug}
                  marque={m}
                  mot={mot}
                  feuille={feuille}
                  actif={rang === surligne}
                  onSurvol={() => onSurligne(rang)}
                  onOuvrir={() => onOuvrir(mot)}
                />
              );
            })}
          </div>
        </>
      )}

      {suggestions.pieces.length > 0 && (
        <>
          <p
            className={`eyebrow m-0 mb-2 text-white/45 ${
              marques.length > 0 || criteres.length > 0 ? "mt-4" : ""
            }`}
          >
            Pièces · {suggestions.totalPieces} résultat
            {suggestions.totalPieces > 1 ? "s" : ""}
          </p>
          <BandePieces
            pieces={suggestions.pieces}
            total={suggestions.totalPieces}
            onOuvrir={() => onOuvrir(mot)}
          />
        </>
      )}
    </>
  );
}

/** Le contexte à droite d'une ligne : catégorie, ville, compte. */
function classeContexte(feuille: boolean): string {
  return `shrink-0 truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-white/50 ${
    feuille ? "max-w-[38%]" : "hidden sm:block"
  }`;
}

/**
 * Une marque trouvée, en une ligne.
 *
 * `feuille` ne veut pas dire « téléphone » mais « forme aérée » : la
 * ligne prend ses quarante-quatre pixels, la vignette remplace le badge
 * — on reconnaît un logo avant de lire un nom — et le contexte reste
 * affiché même à l'étroit. C'est la forme de la feuille plein écran ET
 * celle du pop-up de la barre, qui a lui aussi la place de respirer.
 */
export function LigneMarque({
  marque,
  mot,
  feuille = false,
  actif,
  onSurvol,
  onOuvrir,
}: {
  marque: MarqueTrouvee;
  /** Ce qui a été tapé, pour le surlignage du préfixe. */
  mot: string;
  feuille?: boolean;
  /** La ligne visée par les flèches du clavier. */
  actif: boolean;
  onSurvol: () => void;
  onOuvrir: () => void;
}) {
  const ligne = feuille
    ? "flex items-center gap-3 rounded-[13px] px-3 py-3 transition"
    : "flex items-center gap-3 rounded-[10px] px-2 py-[7px] text-left transition";

  return (
    <Link
      href={`/marques/${marque.slug}`}
      onMouseEnter={onSurvol}
      onClick={onOuvrir}
      className={`${ligne} ${actif ? "bg-white/14" : "hover:bg-white/8"}`}
    >
      {feuille ? (
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white/10">
          {marque.visuel ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vignette(marque.visuel, 160, { logo: true })}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="text-[11px] font-black text-white/60">{initiales(marque.name)}</span>
          )}
        </span>
      ) : (
        <span className="badge-type badge-marque">Marque</span>
      )}

      <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">
        <Surligne texte={marque.name} motif={mot} trait={!feuille} />
      </span>

      <span className={classeContexte(feuille)}>
        {[marque.categorie, marque.ville].filter(Boolean).join(" · ")}
      </span>

      {/* Gardé au doigt aussi : beaucoup de téléphones sont posés devant
          un clavier, et l'indication ne coûte qu'une ligne à qui n'en a
          pas. */}
      {actif &&
        (feuille ? (
          <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/45">
            Entrée ↵
          </span>
        ) : (
          <span className="requete-touche hidden lg:inline-block">Entrée</span>
        ))}
    </Link>
  );
}

/**
 * Les pièces trouvées, en vignettes, et le reste du compte en dernière
 * case.
 *
 * TROIS DISPOSITIONS POUR LE MÊME CONTENU, parce que la place n'est
 * jamais la même. Sous le champ de l'annuaire elles s'enroulent au fil
 * de la largeur ; dans la colonne droite du pop-up elles remplissent
 * une grille de quatre, qui se lit d'un coup ; au doigt elles partent
 * en bande qui défile, sans quoi six vignettes prendraient trois rangs
 * au-dessus d'un clavier déjà monté.
 */
export function BandePieces({
  pieces,
  total,
  disposition = "enroulee",
  onOuvrir,
}: {
  pieces: Recherche["pieces"];
  /** Le compte du catalogue, pour la case « + N » de la fin. */
  total: number;
  disposition?: "enroulee" | "grille" | "bande";
  onOuvrir: () => void;
}) {
  const grille = disposition === "grille";

  const contenant = grille
    ? "grid grid-cols-4 gap-2"
    : disposition === "bande"
      ? /* Le rembourrage négatif puis positif laisse la première et la
           dernière vignette toucher le bord du panneau : une bande qui
           s'arrête à seize pixels du bord a l'air finie. */
        "-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1"
      : "flex flex-wrap gap-2";

  const tuile = grille ? "aspect-square w-full" : "h-14 w-14 shrink-0";

  return (
    <div className={contenant}>
      {pieces.map((p) => (
        <Link
          key={p.id}
          href={p.adresse}
          onClick={onOuvrir}
          className={`${tuile} overflow-hidden rounded-[10px] bg-white/10 transition hover:scale-105`}
          title={p.name}
        >
          {p.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vignette(p.image, 160)}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </Link>
      ))}
      {total > pieces.length && (
        <span
          className={`${tuile} grid place-items-center rounded-[10px] bg-white/12 text-[12px] font-extrabold text-white/80`}
        >
          +{total - pieces.length}
        </span>
      )}
    </div>
  );
}

/** Deux lettres, quand une marque n'a pas de visuel lisible. */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).slice(0, 2);
  return mots.map((m) => m.charAt(0).toUpperCase()).join("");
}

/**
 * Le préfixe tapé, mis en évidence dans le nom.
 *
 * ON N'ÉCRIT PAS DE HTML À LA MAIN ICI. La tentation est de fabriquer
 * une chaîne avec des balises et de l'injecter : c'est exactement
 * l'endroit où l'on ouvre une faille, puisque le texte surligné vient
 * de ce que quelqu'un a tapé. On découpe donc, et React se charge
 * d'échapper chaque morceau.
 *
 * DEUX FAÇONS DE LE MONTRER. Dans la feuille, un aplat d'accent derrière
 * les lettres. Dans la barre de requête, un simple trait dessous : les
 * lignes y portent déjà un badge de couleur et un fond au survol, un
 * troisième aplat rendrait le nom illisible.
 */
export function Surligne({
  texte,
  motif,
  trait = false,
}: {
  texte: string;
  motif: string;
  trait?: boolean;
}) {
  if (!motif) return <>{texte}</>;

  const i = texte.toLowerCase().indexOf(motif.toLowerCase());
  if (i < 0) return <>{texte}</>;

  return (
    <>
      {texte.slice(0, i)}
      <mark
        className={
          trait
            ? "requete-tape"
            : "rounded-[3px] bg-[rgba(var(--accent-1),0.45)] px-0.5 text-white"
        }
      >
        {texte.slice(i, i + motif.length)}
      </mark>
      {texte.slice(i + motif.length)}
    </>
  );
}
