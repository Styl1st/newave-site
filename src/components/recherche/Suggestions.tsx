"use client";

import Link from "next/link";
import { vignette } from "@/lib/vignette";
import type { Recherche } from "@/lib/types";

/**
 * Les suggestions, en deux groupes : les marques, puis les pièces.
 *
 * LE MÊME RENDU SOUS LE CHAMP ET DANS LA FEUILLE. Sur ordinateur elles
 * s'affichent dans le bloc de recherche, au doigt dans une feuille qui
 * prend l'écran (voir `FeuilleRecherche`) — mais ce sont les mêmes
 * groupes, dans le même ordre, avec le même préfixe surligné. Les écrire
 * deux fois aurait suffi à ce que l'un des deux garde une vieille
 * version du dessin.
 *
 * Ce qui change entre les deux tient en une propriété : au doigt, les
 * lignes s'aèrent pour atteindre la cible de quarante-quatre pixels, et
 * les métadonnées cessent de disparaître puisqu'il n'y a plus de panneau
 * étroit à ménager.
 */

export default function Suggestions({
  suggestions,
  query,
  surligne,
  onSurligne,
  onOuvrir,
  feuille = false,
}: {
  suggestions: Recherche;
  query: string;
  /** L'index de la marque au clavier. Les flèches le déplacent. */
  surligne: number;
  onSurligne: (i: number) => void;
  /** Appelé juste avant de partir : c'est là qu'on note la recherche. */
  onOuvrir: (mot: string) => void;
  /** Vrai dans la feuille : cibles au doigt, métadonnées toujours lues. */
  feuille?: boolean;
}) {
  const marques = suggestions.marques;
  const mot = query.trim();

  const ligne = feuille
    ? "flex items-center gap-3 rounded-[13px] px-3 py-3 transition"
    : "flex items-center gap-3 rounded-[12px] px-2 py-2 transition";

  return (
    <>
      {marques.length > 0 && (
        <>
          <p className="eyebrow m-0 mb-2 text-white/45">
            Marques · {marques.length} résultat{marques.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-col gap-0.5">
            {marques.map((m, i) => (
              <Link
                key={m.slug}
                href={`/marques/${m.slug}`}
                onMouseEnter={() => onSurligne(i)}
                onClick={() => onOuvrir(mot)}
                className={`${ligne} ${i === surligne ? "bg-white/14" : "hover:bg-white/8"}`}
              >
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

                <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">
                  <Surligne texte={m.name} motif={mot} />
                </span>

                <span
                  className={`shrink-0 truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-white/50 ${
                    feuille ? "max-w-[38%]" : "hidden sm:block"
                  }`}
                >
                  {[m.categorie, m.ville].filter(Boolean).join(" · ")}
                </span>

                {/* Gardé au doigt aussi : beaucoup de téléphones sont
                    posés devant un clavier, et l'indication ne coûte
                    qu'une ligne à qui n'en a pas. */}
                {i === surligne && (
                  <span
                    className={`shrink-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/45 ${
                      feuille ? "" : "hidden lg:block"
                    }`}
                  >
                    Entrée ↵
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      {suggestions.pieces.length > 0 && (
        <>
          <p className={`eyebrow m-0 mb-2 text-white/45 ${marques.length > 0 ? "mt-4" : ""}`}>
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
 */
export function Surligne({ texte, motif }: { texte: string; motif: string }) {
  if (!motif) return <>{texte}</>;

  const i = texte.toLowerCase().indexOf(motif.toLowerCase());
  if (i < 0) return <>{texte}</>;

  return (
    <>
      {texte.slice(0, i)}
      <mark className="rounded-[3px] bg-[rgba(var(--accent-1),0.45)] px-0.5 text-white">
        {texte.slice(i, i + motif.length)}
      </mark>
      {texte.slice(i + motif.length)}
    </>
  );
}
