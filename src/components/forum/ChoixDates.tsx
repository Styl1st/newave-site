"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Portal from "@/components/Portal";
import {
  ecrireDates,
  isoDuJour,
  jourLocal,
  libelleDates,
  lireDates,
  type Intervalle,
} from "@/lib/forum";

/**
 * Du… au… : un bouton qui déplie un calendrier.
 *
 * DEUX CLICS, ET C'EST TOUT. Le premier pose le début, le second la
 * fin ; entre les deux, la plage se dessine sous la souris pour qu'on
 * voie ce qu'on s'apprête à choisir. Un seul jour ? On clique deux fois
 * dessus. Un second clic AVANT le début échange les deux : personne ne
 * veut « du 16 au 14 ».
 *
 * PAS DE CHAMP NATIF. `input type="date"` ne sait choisir qu'un jour,
 * et deux champs côte à côte (« du », « au ») obligent à ouvrir deux
 * calendriers pour une seule idée. Celui-ci en ouvre un.
 *
 * Les jours passés sont grisés : un casting d'hier ne recrute plus.
 *
 * LE PANNEAU EST POSÉ SUR LA PAGE, PAS DANS LE FORMULAIRE (portail, en
 * position fixe). Le bloc « Détails » est en verre, donc un contexte
 * d'empilement à lui seul : un panneau enfermé dedans passait SOUS le
 * pied de page dès qu'il dépassait le bas du formulaire, et ses jours
 * ne répondaient plus aux clics. Il s'ouvre sous le bouton, ou
 * au-dessus s'il n'y a pas la place.
 */

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

/** Largeur et hauteur du panneau, pour le placer avant de l'avoir mesuré. */
const LARGEUR = 318;
const HAUTEUR = 400;
const MARGE = 16;

type Position = { left: number; width: number; top?: number; bottom?: number };

export default function ChoixDates({
  valeur,
  onChange,
  placeholder = "Choisir les dates",
  id,
}: {
  /** Intervalle ISO (« 2026-10-14/2026-10-16 ») ou vide. */
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const choisi = lireDates(valeur);
  const [ouvert, setOuvert] = useState(false);
  /* Le premier clic, tant que le second n'est pas venu. */
  const [debut, setDebut] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const aujourdhui = useMemo(() => isoDuJour(new Date()), []);
  const [mois, setMois] = useState(() => {
    const d = choisi ? jourLocal(choisi.debut) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const boite = useRef<HTMLDivElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  /* Sous le bouton, ou au-dessus s'il manque de place en bas ; jamais
     hors de l'écran sur les côtés. Recalculé au défilement. */
  const placer = useCallback(() => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(LARGEUR, window.innerWidth - 2 * MARGE);
    const left = Math.min(Math.max(r.left, MARGE), window.innerWidth - width - MARGE);
    const enBas = window.innerHeight - r.bottom;
    if (enBas < HAUTEUR + 8 && r.top > enBas) {
      setPosition({ left, width, bottom: window.innerHeight - r.top + 8 });
    } else {
      setPosition({ left, width, top: r.bottom + 8 });
    }
  }, []);

  useLayoutEffect(() => {
    if (!ouvert) return;
    placer();
    window.addEventListener("scroll", placer, { passive: true });
    window.addEventListener("resize", placer);
    return () => {
      window.removeEventListener("scroll", placer);
      window.removeEventListener("resize", placer);
    };
  }, [ouvert, placer]);

  const fermer = useCallback(() => {
    setOuvert(false);
    setDebut(null);
    setSurvol(null);
  }, []);

  /* Fermer en cliquant à côté, ou avec Échap. */
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      const cible = e.target as Node;
      if (!boite.current?.contains(cible) && !panneau.current?.contains(cible)) fermer();
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, fermer]);

  function cliquer(jour: string) {
    if (!debut) {
      setDebut(jour);
      return;
    }
    const plage: Intervalle = jour < debut ? { debut: jour, fin: debut } : { debut, fin: jour };
    onChange(ecrireDates(plage));
    fermer();
  }

  /* La plage à dessiner : celle qu'on est en train de choisir, sinon celle déjà choisie. */
  const plage: Intervalle | null = debut
    ? (() => {
        const autre = survol ?? debut;
        return autre < debut ? { debut: autre, fin: debut } : { debut, fin: autre };
      })()
    : choisi;

  /* Les cases du mois : des blancs jusqu'au lundi, puis les jours. */
  const cases = useMemo(() => {
    const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const decalage = (premier.getDay() + 6) % 7; // lundi = 0
    const nombre = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
    const liste: (string | null)[] = Array.from({ length: decalage }, () => null);
    for (let j = 1; j <= nombre; j++) liste.push(isoDuJour(new Date(mois.getFullYear(), mois.getMonth(), j)));
    return liste;
  }, [mois]);

  const titreMois = mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisPrecedentPasse =
    mois.getFullYear() * 12 + mois.getMonth() <= new Date().getFullYear() * 12 + new Date().getMonth();

  const changerDeMois = (n: number) => setMois((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div ref={boite} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        className="champ flex items-center gap-2.5 text-left"
      >
        <IconCalendrier />
        {/* `.champ` impose sa couleur hors couche : l'invite s'éteint
            par l'opacité, pas par une classe de couleur. */}
        <span className={`min-w-0 flex-1 truncate ${choisi ? "" : "font-medium opacity-55"}`}>
          {choisi ? libelleDates(valeur) : placeholder}
        </span>
      </button>

      {ouvert && position && (
        <Portal>
          <div
            ref={panneau}
            role="dialog"
            aria-label="Choisir les dates"
            style={position}
            className="fixed z-[85] rounded-[18px] border border-white/20 bg-[var(--surface-sombre)] p-3.5 shadow-[0_24px_60px_rgba(8,2,20,0.55)]"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => changerDeMois(-1)}
                disabled={moisPrecedentPasse}
                aria-label="Mois précédent"
                className="grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold text-white transition hover:bg-white/12 disabled:opacity-25"
              >
                ‹
              </button>
              <p className="m-0 text-[14px] font-extrabold capitalize text-white">{titreMois}</p>
              <button
                type="button"
                onClick={() => changerDeMois(1)}
                aria-label="Mois suivant"
                className="grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold text-white transition hover:bg-white/12"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 text-center">
              {JOURS.map((j, i) => (
                <span key={i} className="pb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                  {j}
                </span>
              ))}

              {cases.map((jour, i) => {
                if (!jour) return <span key={`vide-${i}`} />;
                const passe = jour < aujourdhui;
                const bord = plage && (jour === plage.debut || jour === plage.fin);
                const dedans = plage && jour > plage.debut && jour < plage.fin;
                const debutPlage = plage && jour === plage.debut && plage.debut !== plage.fin;
                const finPlage = plage && jour === plage.fin && plage.debut !== plage.fin;
                return (
                  <span
                    key={jour}
                    className={`relative flex h-10 items-center justify-center ${
                      dedans ? "bg-white/14" : ""
                    } ${debutPlage ? "rounded-l-full bg-white/14" : ""} ${finPlage ? "rounded-r-full bg-white/14" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={passe}
                      onClick={() => cliquer(jour)}
                      onMouseEnter={() => setSurvol(jour)}
                      aria-pressed={Boolean(bord)}
                      aria-label={jourLocal(jour).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold tabular-nums transition ${
                        bord
                          ? "bg-white text-[var(--color-ink)]"
                          : passe
                            ? "text-white/25"
                            : "text-white hover:bg-white/18"
                      } ${jour === aujourdhui && !bord ? "ring-1 ring-white/45" : ""}`}
                    >
                      {jourLocal(jour).getDate()}
                    </button>
                  </span>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/12 pt-3">
              <p className="m-0 text-[12px] font-semibold leading-snug text-white/70">
                {debut
                  ? "Et la fin ? Même jour : clique-le encore."
                  : choisi
                    ? libelleDates(valeur)
                    : "Clique le premier jour, puis le dernier."}
              </p>
              {(choisi || debut) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    fermer();
                  }}
                  className="shrink-0 text-[12px] font-bold text-white/75 underline underline-offset-2 hover:text-white"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function IconCalendrier() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0 opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
