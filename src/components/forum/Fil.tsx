"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOT_FORUM, type Annonce, type FiltresForum as Filtres } from "@/lib/forum";
import CarteAnnonce from "./CarteAnnonce";
import FiltresForum from "./FiltresForum";
import Mosaique from "./Mosaique";

/**
 * Le fil du forum : les filtres, la mosaïque, le défilement.
 *
 * LE PREMIER LOT VIENT DU SERVEUR, on ne le redemande pas au montage :
 * la page est à l'écran au premier coup d'œil, et un robot la lit.
 * Chaque changement de filtre redemande le premier lot à `/api/forum` ;
 * arriver en bas de la liste demande le suivant.
 *
 * LES FILTRES S'ÉCRIVENT DANS L'ADRESSE (`?tri=tendance&ville=Lyon`),
 * par remplacement : un lien partagé rouvre le même fil, et le bouton
 * Retour ne rejoue pas chaque clic.
 */

/** Le temps qu'on laisse aux doigts avant de chercher. */
const REPOS_FRAPPE = 260;

type Page = { annonces: Annonce[]; total: number };

export default function Fil({
  premierePage,
  filtresInitiaux,
  moiId,
}: {
  /** null : la base n'a pas répondu (ou la migration 37 manque). */
  premierePage: Page | null;
  filtresInitiaux: Filtres;
  moiId: string | null;
}) {
  const [filtres, setFiltres] = useState<Filtres>(filtresInitiaux);
  const [annonces, setAnnonces] = useState<Annonce[]>(premierePage?.annonces ?? []);
  const [total, setTotal] = useState(premierePage?.total ?? 0);
  const [enCours, setEnCours] = useState(false);
  const [panne, setPanne] = useState(premierePage === null);

  /* La recherche attend que les doigts s'arrêtent ; le reste part tout de suite. */
  const [qDiffere, setQDiffere] = useState(filtres.q);
  useEffect(() => {
    const minuteur = setTimeout(() => setQDiffere(filtres.q), REPOS_FRAPPE);
    return () => clearTimeout(minuteur);
  }, [filtres.q]);

  const requete = useMemo(
    () => ({ tri: filtres.tri, ville: filtres.ville, rubrique: filtres.rubrique, q: qDiffere.trim() }),
    [filtres.tri, filtres.ville, filtres.rubrique, qDiffere]
  );

  const adresse = useCallback(
    (depuis: number) => {
      const p = new URLSearchParams();
      p.set("tri", requete.tri);
      if (requete.ville) p.set("ville", requete.ville);
      if (requete.rubrique) p.set("rubrique", requete.rubrique);
      if (requete.q) p.set("q", requete.q);
      p.set("depuis", String(depuis));
      p.set("combien", String(LOT_FORUM));
      return `/api/forum?${p}`;
    },
    [requete]
  );

  /* L'adresse de la page suit les filtres. `populaires` est le défaut :
     on ne l'écrit pas. */
  useEffect(() => {
    const p = new URLSearchParams();
    if (requete.tri !== "populaires") p.set("tri", requete.tri);
    if (requete.ville) p.set("ville", requete.ville);
    if (requete.rubrique) p.set("rubrique", requete.rubrique);
    if (requete.q) p.set("q", requete.q);
    const cible = window.location.pathname + (p.toString() ? `?${p}` : "");
    if (cible !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", cible);
    }
  }, [requete]);

  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    const halte = new AbortController();
    setEnCours(true);
    fetch(adresse(0), { signal: halte.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((page: Page) => {
        setAnnonces(page.annonces);
        setTotal(page.total);
        setPanne(false);
      })
      .catch((e) => {
        if ((e as Error)?.name === "AbortError") return;
        setPanne(true);
      })
      .finally(() => {
        if (!halte.signal.aborted) setEnCours(false);
      });
    return () => halte.abort();
  }, [adresse]);

  /* La suite s'AJOUTE : `depuis` se compte sur ce qu'on a déjà. */
  const charger = useCallback(() => {
    if (enCours || annonces.length >= total) return;
    setEnCours(true);
    fetch(adresse(annonces.length))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((page: Page) => {
        setAnnonces((deja) => {
          const vues = new Set(deja.map((a) => a.id));
          return [...deja, ...page.annonces.filter((a) => !vues.has(a.id))];
        });
        setTotal(page.total);
        setPanne(false);
      })
      .catch(() => setPanne(true))
      .finally(() => setEnCours(false));
  }, [adresse, annonces.length, enCours, total]);

  /* Arrivé à un écran du bas, on demande la suite sans attendre de clic. */
  const sentinelle = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelle.current;
    if (!el) return;
    const veille = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) charger();
      },
      { rootMargin: "600px 0px" }
    );
    veille.observe(el);
    return () => veille.disconnect();
  }, [charger]);

  const reste = total - annonces.length;
  const filtre = Boolean(filtres.ville || filtres.rubrique || requete.q);

  return (
    <>
      <FiltresForum filtres={filtres} onChange={(f) => setFiltres((v) => ({ ...v, ...f }))} />

      {panne && annonces.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/90">
            Le forum ne s&apos;est pas chargé. Réessaie dans un instant.
          </p>
        </div>
      ) : annonces.length === 0 && !enCours ? (
        /* « Rien ici » invite à publier : c'est la seule chose utile à
           faire devant un fil vide. */
        <div className="rounded-[var(--radius)] border-2 border-dashed border-white/30 px-6 py-10 text-center">
          <p className="m-0 text-[15.5px] font-bold text-white">
            {filtre
              ? "Rien dans cette ville pour cette rubrique."
              : "Aucune annonce pour l'instant."}
          </p>
          <p className="m-0 mt-1.5 text-[14px] text-white/75">Publie la première : c&apos;est ouvert à tous.</p>
          <Link
            href="/forum/publier"
            className="cta-barre mt-5 inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.97]"
          >
            + Publier une annonce
          </Link>
        </div>
      ) : (
        <div className={`transition-opacity ${enCours && annonces.length > 0 ? "opacity-60" : ""}`}>
          <Mosaique>
            {annonces.map((a) => (
              <CarteAnnonce key={a.id} annonce={a} moiId={moiId} />
            ))}
          </Mosaique>

          <div ref={sentinelle} aria-hidden className="h-px" />

          {reste > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={charger}
                disabled={enCours}
                className="card-light px-7 py-3.5 disabled:opacity-60"
              >
                <span className="relative z-3 text-[14px] font-extrabold">
                  {enCours ? "Chargement…" : `Voir ${Math.min(reste, LOT_FORUM)} annonces de plus`}
                </span>
              </button>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">
                {annonces.length} sur {total}
              </p>
            </div>
          )}
          {panne && annonces.length > 0 && (
            <p className="m-0 mt-4 text-center text-[13px] text-white/75">
              La suite ne s&apos;est pas chargée.{" "}
              <button type="button" onClick={charger} className="font-bold underline underline-offset-2">
                Réessayer
              </button>
            </p>
          )}
        </div>
      )}
    </>
  );
}
