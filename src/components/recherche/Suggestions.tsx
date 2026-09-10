"use client";

import Link from "next/link";
import { vignette } from "@/lib/vignette";
import type { Recherche } from "@/lib/types";
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

  const contexte = `shrink-0 truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-white/50 ${
    feuille ? "max-w-[38%]" : "hidden sm:block"
  }`;

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
                <span className={contexte}>
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
                <Link
                  key={m.slug}
                  href={`/marques/${m.slug}`}
                  onMouseEnter={() => onSurligne(rang)}
                  onClick={() => onOuvrir(mot)}
                  className={`${ligne} ${rang === surligne ? "bg-white/14" : "hover:bg-white/8"}`}
                >
                  {feuille ? (
                    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white/10">
                      {m.visuel ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={vignette(m.visuel, 160, { logo: true })}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-[11px] font-black text-white/60">
                          {initiales(m.name)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="badge-type badge-marque">Marque</span>
                  )}

                  <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">
                    <Surligne texte={m.name} motif={mot} trait={!feuille} />
                  </span>

                  <span className={contexte}>
                    {[m.categorie, m.ville].filter(Boolean).join(" · ")}
                  </span>

                  {/* Gardé au doigt aussi : beaucoup de téléphones sont
                      posés devant un clavier, et l'indication ne coûte
                      qu'une ligne à qui n'en a pas. */}
                  {rang === surligne &&
                    (feuille ? (
                      <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/45">
                        Entrée ↵
                      </span>
                    ) : (
                      <span className="requete-touche hidden lg:inline-block">Entrée</span>
                    ))}
                </Link>
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
          <div className="flex flex-wrap gap-2">
            {suggestions.pieces.map((p) => (
              <Link
                key={p.id}
                href={p.adresse}
                onClick={() => onOuvrir(mot)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-white/10 transition hover:scale-105"
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
            {suggestions.totalPieces > suggestions.pieces.length && (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] bg-white/12 text-[12px] font-extrabold text-white/80">
                +{suggestions.totalPieces - suggestions.pieces.length}
              </span>
            )}
          </div>
        </>
      )}
    </>
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
