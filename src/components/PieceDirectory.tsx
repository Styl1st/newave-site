"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Grille from "./Grille";
import ProductCard from "./ProductCard";
import { IconChevron, IconFiltre } from "./Icons";
import { compterLesRayons, rayonDe } from "@/lib/rayons";
import type { Product } from "@/lib/types";

/**
 * La vitrine : on cherche une pièce, pas une marque.
 *
 * L'annuaire répond à « quelle marque ? ». Ce n'est pas la question
 * qu'on se pose le plus souvent : on cherche un jean, une veste, un
 * truc à moins de cinquante euros, et l'on découvre la marque au
 * passage. Il fallait donc ouvrir la même porte dans l'autre sens.
 *
 * L'ordre est retiré au sort à chaque visite, et surtout ALTERNÉ ENTRE
 * LES MARQUES (voir `repartirParMarque`) : les premiers écrans montrent
 * une pièce de chacune plutôt que quarante de la plus fournie.
 */

/** Les tranches de prix, alignées sur celles des fiches de marque. */
const TRANCHES = [
  { cle: "accessible", label: "Moins de 60 €", min: 0, max: 6000 },
  { cle: "intermediaire", label: "60 à 160 €", min: 6000, max: 16000 },
  { cle: "premium", label: "Plus de 160 €", min: 16000, max: Infinity },
] as const;

type Tranche = (typeof TRANCHES)[number]["cle"];

/** Combien de pièces d'un coup. Même raison que pour l'annuaire. */
const LOT = 24;

/** Le prix qui sert à comparer : en euros quand on a su convertir. */
function enCentimes(p: Product): number | null {
  return p.price_eur_cents ?? p.price_cents ?? null;
}

export default function PieceDirectory({ pieces }: { pieces: Product[] }) {
  const [query, setQuery] = useState("");
  /*
   * DEUX FAMILLES DE FILTRES, ET ELLES NE SE COMBINENT PAS PAREIL.
   *
   * À l'intérieur d'une famille, c'est un OU : « Hauts ou Bas », « moins
   * de 60 € ou 60 à 160 € ». Entre les deux familles, c'est un ET :
   * « des hauts, ET à moins de 60 € ».
   *
   * C'est la règle habituelle des filtres de boutique, et surtout c'est
   * la SEULE qui ait un sens ici : une pièce n'a qu'un rayon et qu'un
   * prix. Demander un ET à l'intérieur d'une famille — un article qui
   * serait à la fois un haut et un bas — ne peut RIEN donner, jamais.
   *
   * C'est exactement ce qui se passait : choisir « Bas » puis vouloir
   * ajouter « Hauts » vidait la liste, le filtre s'effaçait tout seul,
   * et la famille entière disparaissait de l'écran. Il ne restait que
   * les prix.
   */
  const [rayons, setRayons] = useState<string[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [combien, setCombien] = useState(LOT);

  const basculer = (r: string) =>
    setRayons((liste) => (liste.includes(r) ? liste.filter((x) => x !== r) : [...liste, r]));

  const basculerPrix = (t: Tranche) =>
    setTranches((liste) => (liste.includes(t) ? liste.filter((x) => x !== t) : [...liste, t]));

  const actifs = rayons.length + tranches.length;

  function reinitialiser() {
    setRayons([]);
    setTranches([]);
  }

  /*
   * Comme dans l'annuaire : la recherche d'abord, puis on établit les
   * filtres sur ce qu'il en reste. Une puce affichée ramène donc
   * toujours quelque chose.
   *
   * La recherche porte aussi sur le NOM DE LA MARQUE, et c'est
   * volontaire : quelqu'un qui tape « twojeys » ici cherche les pièces
   * de cette marque, pas sa fiche. Le renvoyer sur l'annuaire serait un
   * détour de plus.
   */
  const parRecherche = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pieces;
    return pieces.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand?.name ?? "").toLowerCase().includes(q) ||
        p.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [pieces, query]);

  const dansLaTranche = (p: Product, cle: Tranche) => {
    const centimes = enCentimes(p);
    if (centimes === null) return false;
    const t = TRANCHES.find((x) => x.cle === cle);
    return t ? centimes >= t.min && centimes < t.max : true;
  };

  const bonPrix = (p: Product) =>
    tranches.length === 0 || tranches.some((t) => dansLaTranche(p, t));

  const bonRayon = (p: Product) => rayons.length === 0 || rayons.includes(rayonDe(p));

  /*
   * Chaque famille se compte SANS ELLE-MÊME.
   *
   * Les rayons proposés tiennent compte du prix choisi, jamais des
   * rayons déjà cochés : sinon en choisir un ferait disparaître tous les
   * autres, et l'on ne pourrait plus en ajouter un second ni changer
   * d'avis sans tout effacer.
   */
  const rayonsDisponibles = useMemo(
    () => compterLesRayons(parRecherche.filter(bonPrix)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parRecherche, tranches]
  );

  const tranchesDisponibles = useMemo(() => {
    const dedans = parRecherche.filter(bonRayon);
    return TRANCHES.filter((t) => dedans.some((p) => dansLaTranche(p, t.cle))).map((t) => ({
      ...t,
      total: dedans.filter((p) => dansLaTranche(p, t.cle)).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parRecherche, rayons]);

  // Un filtre devenu sans objet s'efface tout seul.
  useEffect(() => {
    const dispo = new Set(rayonsDisponibles.map((r) => r.rayon));
    setRayons((liste) =>
      liste.every((r) => dispo.has(r)) ? liste : liste.filter((r) => dispo.has(r))
    );
  }, [rayonsDisponibles]);

  const resultats = useMemo(
    () => parRecherche.filter((p) => bonPrix(p) && bonRayon(p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parRecherche, rayons, tranches]
  );

  // Changer de filtre repart du début, sinon on demanderait à la page
  // d'afficher d'un coup tout ce qu'on avait déroulé avant.
  useEffect(() => setCombien(LOT), [resultats]);

  const visibles = resultats.slice(0, combien);
  const reste = resultats.length - visibles.length;

  const chip =
    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/80 hover:bg-white/20 hover:text-white";
  const chipOn = "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]";

  return (
    <>
      <div className="glass rise rise-1 mb-8 p-4 sm:p-5">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une pièce, une marque…"
            className="min-w-0 flex-1 rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55"
          />
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-controls="filtres-pieces"
            className={`inline-flex shrink-0 items-center gap-2 rounded-[13px] px-4 py-3 text-[13px] font-extrabold transition active:scale-[.97] ${
              actifs > 0 || ouvert
                ? "bg-white text-[var(--color-ink)]"
                : "border border-white/40 bg-white/8 text-white hover:bg-white/18"
            }`}
          >
            <IconFiltre />
            <span className="hidden sm:inline">Filtres</span>
            {actifs > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[10.5px] font-black text-white">
                {actifs}
              </span>
            )}
            <IconChevron
              className={`h-3.5 w-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {actifs > 0 && !ouvert && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {rayons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => basculer(r)}
                aria-label={`Retirer le filtre ${r}`}
                className={`${chip} ${chipOn}`}
              >
                {r}
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            ))}
            {tranches.map((cle) => (
              <button
                key={cle}
                type="button"
                onClick={() => basculerPrix(cle)}
                aria-label="Retirer ce filtre de prix"
                className={`${chip} ${chipOn}`}
              >
                {TRANCHES.find((t) => t.cle === cle)?.label}
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={reinitialiser}
              className="text-[12px] font-bold text-white/70 underline underline-offset-2 hover:text-white"
            >
              Tout effacer
            </button>
          </div>
        )}

        {ouvert && (
          <div id="filtres-pieces" className="mt-4 border-t border-white/15 pt-4">
            {rayonsDisponibles.length > 1 && (
              <>
                <p className="eyebrow m-0 mb-2">
                  Rayon
                  {rayons.length > 0 && (
                    <span className="ml-2 font-medium normal-case tracking-normal text-white/45">
                      plusieurs possibles
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRayons([])}
                    className={`${chip} ${rayons.length === 0 ? chipOn : chipOff}`}
                  >
                    Tout
                  </button>
                  {rayonsDisponibles.map(({ rayon, total }) => {
                    const active = rayons.includes(rayon);
                    return (
                      <button
                        key={rayon}
                        onClick={() => basculer(rayon)}
                        aria-pressed={active}
                        className={`${chip} ${active ? chipOn : chipOff}`}
                      >
                        {rayon}
                        <span className="ml-1.5 opacity-55 tabular-nums">{total}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tranchesDisponibles.length > 1 && (
              <>
                <p
                  className={`eyebrow m-0 mb-2 ${rayonsDisponibles.length > 1 ? "mt-4" : ""}`}
                >
                  Prix
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTranches([])}
                    className={`${chip} ${tranches.length === 0 ? chipOn : chipOff}`}
                  >
                    Tous les prix
                  </button>
                  {tranchesDisponibles.map((t) => {
                    const active = tranches.includes(t.cle);
                    return (
                      <button
                        key={t.cle}
                        onClick={() => basculerPrix(t.cle)}
                        aria-pressed={active}
                        className={`${chip} ${active ? chipOn : chipOff}`}
                      >
                        {t.label}
                        <span className="ml-1.5 opacity-55 tabular-nums">{t.total}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {actifs > 0 && (
              <button
                type="button"
                onClick={reinitialiser}
                className="mt-4 text-[12.5px] font-bold text-white/75 underline underline-offset-2 hover:text-white"
              >
                Tout effacer
              </button>
            )}
          </div>
        )}
      </div>

      {resultats.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/90">
            Rien ne correspond. Essaie avec moins de filtres, ou{" "}
            <Link href="/marques" className="font-bold text-white underline underline-offset-2">
              parcours les marques
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <Grille
            variante="pieces"
            memoire="vitrine"
            aside={
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
                {resultats.length} pièce{resultats.length > 1 ? "s" : ""}
              </p>
            }
          >
            {visibles.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                brandSlug={p.brand?.slug}
                // Le nom de la marque sous la pièce : ici, c'est la
                // moitié de l'information. Sur la fiche d'une marque il
                // serait répété quarante fois pour rien.
                showBrand
              />
            ))}
          </Grille>

          {reste > 0 && (
            <div className="mt-7 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setCombien((n) => n + LOT)}
                className="card-light px-7 py-3.5"
              >
                <span className="relative z-3 text-[14px] font-extrabold">
                  Voir {Math.min(reste, LOT)} pièce{Math.min(reste, LOT) > 1 ? "s" : ""} de plus
                </span>
              </button>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">
                {visibles.length} sur {resultats.length}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
