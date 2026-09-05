"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Portal from "@/components/Portal";
import { IconLoupe } from "@/components/Icons";
import Suggestions from "./Suggestions";
import { MINIMUM, useRecherche } from "./useRecherche";
import { lireHistorique, noterRecherche, oublierHistorique } from "./historique";

/**
 * La recherche, au doigt : un écran entier plutôt qu'un panneau.
 *
 * POURQUOI ELLE REMPLACE LA PAGE. Sur ordinateur, ⌘K met le curseur dans
 * le champ et les suggestions se déplient dessous : la liste reste
 * visible, on compare, on choisit. Au doigt, il n'y a pas de raccourci,
 * et surtout le clavier virtuel prend la moitié basse de l'écran — le
 * panneau qu'on vient d'ouvrir se retrouve derrière lui. Il ne reste que
 * quelques lignes utiles, exactement là où l'on avait besoin de place.
 *
 * On prend donc tout l'écran : le champ en haut, sous le pouce du regard,
 * les suggestions dessous, et rien d'autre à lire. C'est le geste que
 * tout le monde connaît des applications de téléphone.
 *
 * ELLE NE FAIT PAS UNE SECONDE RECHERCHE. Le champ est celui de
 * l'annuaire — c'est sa valeur qui est écrite ici, et c'est elle qui
 * filtre la liste derrière. Refermer ne perd donc rien : on retrouve
 * l'annuaire déjà réduit à ce qu'on avait tapé.
 *
 * PAS DE POIGNÉE, PAS DE VOILE. Ce ne sont pas des oublis : la poignée et
 * le voile disent « il y a la page en dessous, tire pour y revenir », ce
 * qui est vrai des feuilles de filtres et de retouche. Celle-ci REMPLACE
 * la page, comme le veut le design ; lui poser une poignée promettrait un
 * geste qui ne mène nulle part.
 */

export default function FeuilleRecherche({
  ouverte,
  query,
  onQuery,
  onFermer,
}: {
  ouverte: boolean;
  /** La saisie de l'annuaire, écrite ici et lue là-bas. */
  query: string;
  onQuery: (q: string) => void;
  onFermer: () => void;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const { suggestions, surligne, setSurligne, garni, auClavier } = useRecherche(query);
  const [historique, setHistorique] = useState<string[]>([]);

  /*
   * Le clavier doit monter en même temps que la feuille : c'est tout
   * l'intérêt du geste. Un court délai, le temps que l'animation
   * d'entrée pose l'élément — un `focus()` sur un nœud qui se translate
   * encore est ignoré par plusieurs navigateurs mobiles.
   */
  useEffect(() => {
    if (!ouverte) return;
    const minuteur = window.setTimeout(() => champ.current?.focus(), 120);
    return () => window.clearTimeout(minuteur);
  }, [ouverte]);

  /* L'historique n'est lu qu'à l'ouverture : c'est du stockage local, il
     n'existe pas au premier rendu du serveur. */
  useEffect(() => {
    if (ouverte) setHistorique(lireHistorique());
  }, [ouverte]);

  /*
   * La page dessous ne défile plus, et Échap referme.
   *
   * Le défilement bloqué n'est pas une coquetterie : sans lui, faire
   * glisser la liste de suggestions entraîne l'annuaire caché derrière,
   * et l'on retrouve la page à un autre endroit qu'on l'a laissée.
   */
  useEffect(() => {
    if (!ouverte) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", surTouche);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = precedent;
    };
  }, [ouverte, onFermer]);

  /*
   * Elle n'a de sens qu'au doigt : sur un écran large, le panneau sous
   * le champ fait mieux. Quelqu'un qui agrandit sa fenêtre — ou qui
   * tourne sa tablette — la voit donc se refermer sur l'annuaire, pas se
   * figer en travers d'une page de mille pixels.
   */
  useEffect(() => {
    if (!ouverte) return;
    const large = window.matchMedia("(min-width: 640px)");
    const verifier = () => large.matches && onFermer();
    verifier();
    large.addEventListener("change", verifier);
    return () => large.removeEventListener("change", verifier);
  }, [ouverte, onFermer]);

  if (!ouverte) return null;

  const noter = (mot: string) => setHistorique(noterRecherche(mot));

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal
        aria-label="Chercher une marque, une pièce"
        /* `feuille-pleine` et non `panneau-edition` : celle-ci se pose
           SUR la page et la laisse transparaître, ce qui est juste pour
           une feuille de retouche et faux ici — la recherche remplace
           la page. Voir globals.css, où l'on explique aussi pourquoi
           elle est opaque plutôt que floutée. */
        className="feuille-pleine fixed inset-0 z-[80] flex flex-col"
        style={{
          /* Le padding de scène du mobile : la barre d'état du système
             en haut, la barre de geste en bas. Ailleurs, `env()` rend
             zéro et il ne reste que nos douze pixels. */
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* ---------- le champ ---------- */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3">
          <div className="relative min-w-0 flex-1">
            <IconLoupe
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
            />
            <input
              ref={champ}
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onFermer();
                  return;
                }
                auClavier(e, (slug, mot) => {
                  noter(mot);
                  router.push(`/marques/${slug}`);
                });
              }}
              placeholder="Chercher une marque, un style…"
              aria-label="Chercher une marque, une pièce"
              autoComplete="off"
              enterKeyHint="search"
              /* Le raccourci « ⌘ K » du champ d'ordinateur saute : il ne
                 se tape pas au doigt, et la loupe dit déjà à quoi sert
                 la ligne. */
              className="champ w-full pl-10 pr-10"
            />
            {/*
             * Une croix pour effacer, qui n'est pas dans le gabarit.
             *
             * Elle est pourtant nécessaire : sur téléphone, toucher le
             * champ de l'annuaire ouvre cette feuille, donc le champ de
             * l'annuaire n'est plus jamais modifiable directement. Sans
             * cette croix, une recherche tapée une fois ne pourrait plus
             * être retirée qu'en rechargeant la page.
             */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  onQuery("");
                  champ.current?.focus();
                }}
                aria-label="Effacer la recherche"
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[15px] font-black text-white/55 transition active:scale-90"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="-mr-2 shrink-0 rounded-full px-3 py-3 text-[13px] font-extrabold text-white/85 transition active:scale-95"
          >
            Annuler
          </button>
        </div>

        {/* ---------- ce qu'on trouve ---------- */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {garni && suggestions ? (
            <Suggestions
              feuille
              suggestions={suggestions}
              query={query}
              surligne={surligne}
              onSurligne={setSurligne}
              onOuvrir={noter}
            />
          ) : query.trim().length >= MINIMUM ? (
            /* Deux lettres tapées et rien en face : on le dit, plutôt
               que de laisser un écran vide qui ressemble à une panne. */
            <p className="m-0 mt-6 text-center text-[13.5px] leading-relaxed text-white/60">
              Rien ne correspond pour l&apos;instant.
              <br />
              Essaie un nom de marque, une ville ou un style.
            </p>
          ) : (
            historique.length > 0 && (
              <>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="eyebrow m-0 text-white/45">Tu cherchais</p>
                  <button
                    type="button"
                    onClick={() => setHistorique(oublierHistorique())}
                    className="shrink-0 py-2 text-[11px] font-bold text-white/55 underline underline-offset-2 transition active:scale-95"
                  >
                    Effacer
                  </button>
                </div>
                <div className="flex flex-col gap-0.5">
                  {historique.map((mot) => (
                    <button
                      key={mot}
                      type="button"
                      onClick={() => onQuery(mot)}
                      className="flex items-center gap-3 rounded-[13px] px-3 py-3 text-left transition active:bg-white/10"
                    >
                      <IconLoupe className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-white/85">
                        {mot}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </Portal>
  );
}
