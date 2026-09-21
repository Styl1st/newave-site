"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLoupe } from "@/components/Icons";
import type { Recherche } from "@/lib/types";
import { BandePieces, LigneMarque, Surligne } from "./Suggestions";
import { MINIMUM } from "./useRecherche";

/**
 * Ce qui pend sous la barre quand la loupe est ouverte.
 *
 * IL NE PORTE PAS DE CHAMP, et c'est un invariant, pas un oubli. Le
 * champ est DANS la barre, au-dessus (voir `BarreDuHaut`) : un second
 * `<input>` ici serait annoncé par les lecteurs d'écran comme une
 * deuxième recherche, sur une page qui n'en a qu'une.
 *
 * DEUX COLONNES EN GRAND, UNE SEULE AU DOIGT, et l'ordre change entre
 * les deux. Sur ordinateur, les marques et les posts tiennent la
 * colonne large — ce sont des lignes de texte — et les pièces
 * remplissent la colonne étroite en grille, parce qu'une photo se
 * reconnaît sans être lue. Au doigt, tout s'empile, et les pièces
 * passent devant les posts : on cherche une marque ou un vêtement, le
 * journal est ce qu'on trouve en plus.
 *
 * LE FOND EST OPAQUE. Le voile derrière, lui, est translucide : ce sont
 * deux surfaces différentes et c'est toute la question. Une liste de
 * résultats posée sur une grille de pièces qui transparaît ne se lit
 * pas, alors qu'un voile doit justement laisser reconnaître la page
 * qu'on n'a pas quittée.
 *
 * JAMAIS DE CARTE CREUSE : à champ vide il montre l'historique et
 * quatre entrées du moment, et quand il n'a ni l'un ni l'autre, c'est
 * la barre qui ne l'ouvre pas du tout.
 */

export default function PanneauRecherche({
  id,
  query,
  suggestions,
  garni,
  surligne,
  onSurligne,
  onOuvrir,
  historique,
  onReprendre,
  onEffacerHistorique,
  enCeMoment,
  auDoigt,
}: {
  /** Ce que le champ de la barre désigne par `aria-controls`. */
  id: string;
  query: string;
  suggestions: Recherche | null;
  /** Vrai quand la réponse tient quelque chose à montrer. */
  garni: boolean;
  surligne: number;
  onSurligne: (i: number) => void;
  /** Appelé juste avant de partir : on note la recherche et on referme. */
  onOuvrir: (mot: string) => void;
  historique: string[];
  /** Reprendre une ancienne recherche : on réécrit le champ, on ne part pas. */
  onReprendre: (mot: string) => void;
  onEffacerHistorique: () => void;
  enCeMoment: { label: string; href: string }[];
  /** Mesuré par la barre, pas rendu deux fois : voir `BarreDuHaut`. */
  auDoigt: boolean;
}) {
  const chemin = usePathname();
  const mot = query.trim();
  const marques = suggestions?.marques ?? [];
  const pieces = suggestions?.pieces ?? [];
  const posts = suggestions?.posts ?? [];

  return (
    <div
      id={id}
      className="max-h-[56vh] overflow-y-auto overscroll-contain rounded-[22px] border border-white/20 bg-[var(--surface-sombre)] p-3.5 shadow-[0_34px_80px_rgba(6,1,18,0.62)] sm:max-h-[min(70vh,540px)] sm:p-4"
    >
      {garni && suggestions ? (
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[1.25fr_1fr] sm:items-start sm:gap-5">
          {/* ---------- les marques ---------- */}
          {marques.length > 0 && (
            <div className="order-1 min-w-0 sm:col-start-1 sm:row-start-1">
              <p className="eyebrow m-0 mb-2 text-white/45">
                Marques · {marques.length} résultat{marques.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-col gap-0.5">
                {marques.map((m, i) => (
                  <LigneMarque
                    key={m.slug}
                    marque={m}
                    mot={mot}
                    feuille
                    actif={i === surligne}
                    onSurvol={() => onSurligne(i)}
                    onOuvrir={() => onOuvrir(mot)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---------- les pièces, et la sortie ---------- */}
          <div className="order-2 min-w-0 sm:col-start-2 sm:row-start-1">
            {pieces.length > 0 && (
              <>
                <p className="eyebrow m-0 mb-2 text-white/45">
                  Pièces · {suggestions.totalPieces} résultat
                  {suggestions.totalPieces > 1 ? "s" : ""}
                </p>
                {/* En grille sur grand écran, en bande qui défile au
                    doigt : six vignettes enroulées prendraient trois
                    rangs au-dessus d'un clavier déjà monté.

                    Une seule des deux formes existe à la fois, et c'est
                    la largeur mesurée qui tranche. Les rendre toutes les
                    deux en cachant l'une doublerait les liens pour un
                    lecteur d'écran, qui les annoncerait tous. */}
                <BandePieces
                  pieces={pieces}
                  total={suggestions.totalPieces}
                  disposition={auDoigt ? "bande" : "grille"}
                  onOuvrir={() => onOuvrir(mot)}
                />
              </>
            )}

            {/*
             * LA SORTIE RESTE MÊME SANS PIÈCE. Le pop-up montre six
             * marques au plus : quand la réponse est plus longue que
             * lui, c'est l'annuaire qui la porte, avec ses filtres et
             * son index. Le mot tapé part avec (`?q=`), donc on ne
             * recommence pas.
             */}
            <VersLAnnuaire
              href={`/marques?q=${encodeURIComponent(mot)}`}
              chemin={chemin}
              onClick={() => onOuvrir(mot)}
              className="mt-3 inline-block text-[11.5px] font-bold text-[rgb(var(--accent-1))] underline underline-offset-4 transition hover:text-white"
            >
              Tout voir dans l&apos;annuaire
            </VersLAnnuaire>
          </div>

          {/* ---------- dans le site ---------- */}
          {posts.length > 0 && (
            <div className="order-3 min-w-0 sm:col-start-1 sm:row-start-2">
              <p className="eyebrow m-0 mb-2 text-white/45">Dans le site</p>
              <div className="flex flex-col gap-0.5">
                {posts.map((p) => (
                  /*
                   * Les posts ne sont pas dans l'ordre des flèches.
                   * `useRecherche` compte les critères et les marques,
                   * c'est-à-dire ce qu'Entrée peut ouvrir sans
                   * ambiguïté ; y ajouter un troisième groupe ferait
                   * traverser trois listes à la flèche du bas pour
                   * atteindre un résultat qui est presque toujours le
                   * moins précis des trois.
                   */
                  <Link
                    key={p.slug}
                    href={`/posts/${p.slug}`}
                    onClick={() => onOuvrir(mot)}
                    className="flex items-center gap-3 rounded-[13px] px-3 py-3 transition hover:bg-white/8"
                  >
                    <span className="badge-type badge-marque">Post</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">
                      <Surligne texte={p.title} motif={mot} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : mot.length >= MINIMUM && suggestions ? (
        /* Deux lettres tapées et rien en face : on le dit, plutôt que
           de laisser un panneau vide qui ressemble à une panne.

           `suggestions` dans la condition, et ce n'est pas une
           précaution de type : tant que la première réponse n'est pas
           revenue, il n'y a pas encore de « rien ». Sans ça, la
           deuxième lettre affiche « rien ne correspond » pendant les
           deux cents millisecondes de la frappe, pour une recherche qui
           va répondre. */
        <p className="m-0 px-2 py-6 text-center text-[13.5px] leading-relaxed text-white/60">
          Rien ne correspond pour l&apos;instant.
          <br />
          <VersLAnnuaire
            href={`/marques?q=${encodeURIComponent(mot)}`}
            chemin={chemin}
            onClick={() => onOuvrir(mot)}
            className="font-bold text-white underline underline-offset-2"
          >
            Chercher dans l&apos;annuaire
          </VersLAnnuaire>
        </p>
      ) : (
        <>
          {historique.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="eyebrow m-0 text-white/45">Tu cherchais</p>
                <button
                  type="button"
                  onClick={onEffacerHistorique}
                  className="shrink-0 py-2 text-[11px] font-bold text-white/55 underline underline-offset-2 transition hover:text-white active:scale-95"
                >
                  Effacer
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {historique.map((ancien) => (
                  <button
                    key={ancien}
                    type="button"
                    onClick={() => onReprendre(ancien)}
                    className="flex items-center gap-3 rounded-[13px] px-3 py-3 text-left transition hover:bg-white/8 active:bg-white/10"
                  >
                    <IconLoupe className="h-4 w-4 shrink-0 text-white/40" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-white/85">
                      {ancien}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {enCeMoment.length > 0 && (
            <>
              <p className={`eyebrow m-0 mb-2 text-white/45 ${historique.length > 0 ? "mt-4" : ""}`}>
                En ce moment
              </p>
              {/*
               * DES DESTINATIONS, PAS DES MOTS À TAPER. Écrire
               * « Denim » dans le champ chercherait ce mot dans les NOMS
               * de marques et de pièces, où il ne se trouve presque
               * jamais ; la pastille ouvre donc l'annuaire sur la
               * catégorie, où la réponse existe à coup sûr.
               */}
              <div className="flex flex-wrap gap-2">
                {enCeMoment.map((e) => (
                  <VersLAnnuaire
                    key={e.href}
                    href={e.href}
                    chemin={chemin}
                    className="rounded-full bg-white/12 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] text-white/84 transition hover:bg-white/20 hover:text-white"
                  >
                    {e.label}
                  </VersLAnnuaire>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * La sortie vers l'annuaire, et le seul endroit du pop-up qui regarde
 * où l'on se trouve.
 *
 * DEPUIS L'ANNUAIRE LUI-MÊME, UN LIEN CLIENT NE SUFFIT PAS. Aller de
 * `/marques` à `/marques?q=denim` ne change pas le chemin : React
 * conserve `BrandDirectory` monté, et son amorce — le mot cherché, la
 * catégorie, les jetons — n'est lue qu'au montage. L'adresse changeait
 * donc dans la barre du navigateur sans que la liste bouge d'une
 * ligne, ce qui est pire que de ne rien proposer.
 *
 * On recharge donc pour de bon dans ce cas précis, avec une balise
 * `a` : c'est un geste rare, et la page remontée lit son amorce comme
 * elle le fait depuis n'importe quelle autre page du site. Partout
 * ailleurs, `Link` garde la navigation douce.
 */
function VersLAnnuaire({
  href,
  chemin,
  onClick,
  className,
  children,
}: {
  href: string;
  /** Le chemin courant, sans la requête. */
  chemin: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (chemin === "/marques") {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
