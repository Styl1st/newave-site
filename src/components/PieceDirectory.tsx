"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CurseurPrix from "./CurseurPrix";
import Grille from "./Grille";
import ProductCard, { type RatioPiece } from "./ProductCard";
import { IconCheck, IconChevron, IconFiltre } from "./Icons";
import { SelecteurDensite, useDensite } from "./densite";
import { enChiffres } from "./chiffres";
import { compterLesRayons, rayonDe } from "@/lib/rayons";
import { discountPercent, formatPrice } from "@/lib/types";
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
 *
 * CE QUI CHANGE AVEC LA REFONTE, ET POURQUOI. Les filtres étaient
 * repliés derrière un bouton, et l'on ne les rouvrait pas : sur une page
 * dont le seul intérêt est de fouiller, la colonne de gauche est
 * l'écran. Elle est donc posée à demeure, elle porte ses compteurs, et
 * la grille récupère tout le reste de la largeur.
 *
 * Et surtout : LES PIÈCES N'ONT PLUS DE CARTE. La photo est posée à même
 * le fond, le texte vit dessous, sans cadre. C'est le parti pris de cet
 * écran-là — voir la variante `nue` de `ProductCard` pour le détail.
 */

/** Combien de pièces d'un coup. Même raison que pour l'annuaire. */
const LOT = 24;

/**
 * Les cadres, et le décalage qui fait respirer la grille.
 *
 * TROIS RAPPORTS CONTRE QUATRE COLONNES, CINQ DÉCALAGES CONTRE TROIS
 * RAPPORTS : aucune de ces périodes ne tombe sur une autre, donc aucun
 * motif ne se répète d'une rangée à la suivante. C'est ce qui distingue
 * une grille qui respire d'une grille en damier.
 *
 * LES DÉCALAGES SONT ÉTEINTS SOUS `sm`, ET C'EST INDISPENSABLE. À deux
 * colonnes, décaler une tuile sur deux ne fait plus respirer quoi que
 * ce soit : ça creuse un trou en haut d'une colonne sur deux, et la
 * grille a l'air cassée plutôt qu'aérée.
 *
 * Les classes sont écrites en toutes lettres : Tailwind lit le fichier
 * tel quel, une classe composée à la volée ne produirait aucune règle.
 */
const RATIOS: RatioPiece[] = ["3/4", "1/1", "4/5"];
const DECALAGES = ["", "sm:mt-[14px]", "", "sm:mt-[26px]", "sm:mt-[8px]"];

/** Le prix qui sert à comparer : en euros quand on a su convertir. */
function enCentimes(p: Product): number | null {
  return p.price_eur_cents ?? p.price_cents ?? null;
}

const euros = (centimes: number) => formatPrice(centimes, "EUR") ?? "";

/**
 * Le cran du curseur de prix.
 *
 * Visé : une centaine de crans sur toute l'étendue. En dessous, la
 * poignée saute d'un prix à l'autre sans qu'on puisse viser ; au-dessus,
 * une flèche du clavier ne déplace plus rien de perceptible et il faut
 * appuyer trois cents fois pour traverser le rail.
 */
function crantDe(etendue: number): number {
  const vise = etendue / 100;
  for (const cran of [100, 200, 500, 1000, 2000, 5000]) if (vise <= cran) return cran;
  return 10000;
}

export default function PieceDirectory({ pieces }: { pieces: Product[] }) {
  /*
   * LA DENSITÉ EST TENUE ICI ET NON DANS LA GRILLE, parce que son rail
   * de boutons est posé dans la ligne de tri, à droite du compteur. La
   * grille la reçoit et n'affiche plus le sien. Même mécanique que
   * l'annuaire refondu ; le choix reste retenu sous la même clé
   * qu'avant, personne ne perd le sien.
   */
  const { densite, choisir: choisirDensite, offertes } = useDensite("vitrine", "pieces");

  const [query, setQuery] = useState("");
  /*
   * DEUX FAMILLES DE FILTRES, ET ELLES NE SE COMBINENT PAS PAREIL.
   *
   * À l'intérieur des rayons, c'est un OU : « Hauts ou Bas ». Entre les
   * familles, c'est un ET : « des hauts, ET à moins de 60 €, ET en
   * stock ».
   *
   * C'est la règle habituelle des filtres de boutique, et surtout c'est
   * la SEULE qui ait un sens ici : une pièce n'a qu'un rayon et qu'un
   * prix. Demander un ET à l'intérieur des rayons — un article qui
   * serait à la fois un haut et un bas — ne peut RIEN donner, jamais.
   */
  const [rayons, setRayons] = useState<string[]>([]);
  const [marque, setMarque] = useState<string | null>(null);
  const [stock, setStock] = useState(false);
  const [promo, setPromo] = useState(false);
  const [tri, setTri] = useState<"hasard" | "croissant" | "decroissant">("hasard");
  const [ouvert, setOuvert] = useState(false);
  const [combien, setCombien] = useState(LOT);

  /*
   * LES BORNES DU PRIX SE CALCULENT SUR LE CATALOGUE ENTIER, PAS SUR CE
   * QUI RESTE APRÈS FILTRAGE. Un rail qui se remet à l'échelle à chaque
   * clic déplace les poignées sous le doigt et fait mentir la position
   * qu'on venait de choisir : on croit avoir demandé « jusqu'à 60 € » et
   * la même poignée, au même endroit, dit maintenant 30.
   */
  const bornes = useMemo(() => {
    const prix = pieces.map(enCentimes).filter((c): c is number => c !== null);
    if (prix.length === 0) return null;

    const bas = Math.min(...prix);
    const haut = Math.max(...prix);
    if (haut === bas) return null;

    const pas = crantDe(haut - bas);
    return {
      min: Math.floor(bas / pas) * pas,
      max: Math.ceil(haut / pas) * pas,
      pas,
    };
  }, [pieces]);

  const [prix, setPrix] = useState<[number, number]>(() =>
    bornes ? [bornes.min, bornes.max] : [0, 0]
  );

  /*
   * Le prix ne filtre que si l'on a bougé une poignée. Tant qu'elles
   * sont aux bornes, les pièces DONT ON NE CONNAÎT PAS LE PRIX restent
   * dans la liste : les écarter d'office reviendrait à cacher une pièce
   * pour une information qui manque à la boutique, pas à elle.
   */
  const prixActif = bornes !== null && (prix[0] > bornes.min || prix[1] < bornes.max);

  const basculer = (r: string) =>
    setRayons((liste) => (liste.includes(r) ? liste.filter((x) => x !== r) : [...liste, r]));

  const actifs =
    rayons.length + (marque ? 1 : 0) + (stock ? 1 : 0) + (promo ? 1 : 0) + (prixActif ? 1 : 0);

  function reinitialiser() {
    setRayons([]);
    setMarque(null);
    setStock(false);
    setPromo(false);
    if (bornes) setPrix([bornes.min, bornes.max]);
  }

  /* ------------------------------------------------------------------
     La recherche
     ------------------------------------------------------------------ */

  const champ = useRef<HTMLInputElement>(null);

  /*
   * ⌘K, comme dans l'annuaire. Le geste doit être le même d'une page de
   * listing à l'autre, sinon il n'en devient le réflexe sur aucune.
   *
   * Ctrl aussi bien que ⌘ : le site n'a aucune raison de supposer un
   * Mac. Pas de panneau de suggestions ici, contrairement à l'annuaire :
   * les pièces sont déjà toutes dans le navigateur, la liste répond donc
   * sous la frappe et une seconde liste par-dessus ne dirait rien de
   * plus.
   */
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
      }
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, []);

  /*
   * Comme dans l'annuaire : la recherche d'abord, puis on établit les
   * filtres sur ce qu'il en reste. Une ligne affichée ramène donc
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

  /* ------------------------------------------------------------------
     Les filtres
     ------------------------------------------------------------------ */

  const bonPrix = (p: Product) => {
    if (!prixActif) return true;
    const centimes = enCentimes(p);
    return centimes !== null && centimes >= prix[0] && centimes <= prix[1];
  };

  const bonRayon = (p: Product) => rayons.length === 0 || rayons.includes(rayonDe(p));
  const bonneMarque = (p: Product) => !marque || p.brand?.slug === marque;
  const bonEtat = (p: Product) =>
    (!stock || p.available) && (!promo || discountPercent(p) !== null);

  /*
   * UNE CASE QUI NE RETIRE RIEN NE S'AFFICHE PAS, exactement comme une
   * pastille de rayon vide. Sur un catalogue où tout est en stock,
   * « En stock » occupe une ligne, ne change aucun résultat, et laisse
   * pourtant croire qu'on vient de filtrer quelque chose.
   *
   * Elle reste affichée tant qu'elle est cochée, sinon on l'aurait
   * cochée puis vue disparaître avec la liste restreinte, sans plus
   * aucun moyen de revenir en arrière.
   */
  const etatsUtiles = useMemo(
    () => ({
      stock: parRecherche.some((p) => !p.available),
      promo: parRecherche.some((p) => discountPercent(p) !== null),
    }),
    [parRecherche]
  );

  /*
   * Chaque famille se compte SANS ELLE-MÊME.
   *
   * Les rayons proposés tiennent compte du prix, de l'état et de la
   * marque, jamais des rayons déjà cochés : sinon en choisir un ferait
   * disparaître tous les autres, et l'on ne pourrait plus en ajouter un
   * second ni changer d'avis sans tout effacer. Même règle pour la liste
   * des marques.
   */
  const rayonsDisponibles = useMemo(
    () => compterLesRayons(parRecherche.filter((p) => bonPrix(p) && bonEtat(p) && bonneMarque(p))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parRecherche, prix, prixActif, stock, promo, marque]
  );

  const marquesDisponibles = useMemo(() => {
    const compte = new Map<string, { nom: string; total: number }>();
    for (const p of parRecherche) {
      if (!p.brand || !bonPrix(p) || !bonEtat(p) || !bonRayon(p)) continue;
      const vu = compte.get(p.brand.slug);
      if (vu) vu.total += 1;
      else compte.set(p.brand.slug, { nom: p.brand.name, total: 1 });
    }
    return [...compte.entries()]
      .map(([slug, { nom, total }]) => ({ slug, nom, total }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parRecherche, prix, prixActif, stock, promo, rayons]);

  /* Un filtre devenu sans objet s'efface tout seul. Pas de boucle
     possible : ces listes se calculent sans le filtre qu'elles
     vérifient. */
  useEffect(() => {
    const dispo = new Set(rayonsDisponibles.map((r) => r.rayon));
    setRayons((liste) =>
      liste.every((r) => dispo.has(r)) ? liste : liste.filter((r) => dispo.has(r))
    );
  }, [rayonsDisponibles]);

  useEffect(() => {
    if (marque && !marquesDisponibles.some((m) => m.slug === marque)) setMarque(null);
  }, [marquesDisponibles, marque]);

  const resultats = useMemo(
    () => parRecherche.filter((p) => bonPrix(p) && bonRayon(p) && bonneMarque(p) && bonEtat(p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parRecherche, rayons, prix, prixActif, marque, stock, promo]
  );

  /*
   * LE TRI NE MÉLANGE RIEN LUI-MÊME. « Au hasard », c'est l'ordre dans
   * lequel la page a livré les pièces — déjà tiré au sort ET alterné
   * entre les marques sur le serveur. Un `Math.random()` joué ici
   * donnerait un ordre au serveur et un autre dans le navigateur, donc
   * un clignotement et un avertissement d'hydratation, pour un résultat
   * moins bon : le hasard pur remet quarante pièces de la même marque
   * d'affilée.
   */
  const ordonnes = useMemo(() => {
    if (tri === "hasard") return resultats;
    const sens = tri === "croissant" ? 1 : -1;
    return [...resultats].sort((a, b) => {
      const pa = enCentimes(a);
      const pb = enCentimes(b);
      // Sans prix connu, la pièce va au bout — dans les deux sens.
      if (pa === null) return pb === null ? 0 : 1;
      if (pb === null) return -1;
      return (pa - pb) * sens;
    });
  }, [resultats, tri]);

  /* Changer de filtre repart du début, sinon on demanderait à la page
     d'afficher d'un coup tout ce qu'on avait déroulé avant. Changer de
     tri, en revanche, garde ce qu'on avait déplié : ce sont les mêmes
     pièces, rangées autrement. */
  useEffect(() => setCombien(LOT), [resultats]);

  const visibles = ordonnes.slice(0, combien);
  const reste = ordonnes.length - visibles.length;

  const nomDeLaMarque = marquesDisponibles.find((m) => m.slug === marque)?.nom ?? null;

  /* « 214 PIÈCES · HAUTS, EN STOCK » : la phrase dit ce qu'on regarde.
     Un compteur seul laisse croire à un catalogue entier quand trois
     filtres sont posés plus haut, dans une colonne qu'on ne relit pas. */
  const legende =
    [
      rayons.length > 0 ? rayons.join(", ") : null,
      nomDeLaMarque,
      prixActif ? `${euros(prix[0])} – ${euros(prix[1])}` : null,
      stock ? "en stock" : null,
      promo ? "en promo" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "toutes marques";

  /* Ces pastilles ne vivent que sur téléphone : elles sont donc taillées
     pour le doigt, sans repli en version souris. */
  const pastille =
    "inline-flex min-h-[44px] items-center rounded-full bg-white px-3.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[var(--color-ink)] transition active:scale-[.97]";

  return (
    <>
      {/* ---------------- la recherche, pleine largeur ----------------

          ELLE RESTE AU-DESSUS DES DEUX COLONNES et non dans celle des
          filtres : sous `lg`, cette colonne devient un tiroir replié, et
          la recherche y serait rangée derrière un bouton alors que c'est
          le geste le plus direct de la page. */}
      <div className="glass rise rise-1 mb-4 p-3.5 sm:p-4">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={champ}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher une pièce, une marque…"
              aria-label="Chercher une pièce, une marque"
              autoComplete="off"
              className="champ w-full pr-16"
            />
            {/* Le raccourci s'efface dès qu'on tape : il rappelle un
                geste, il n'a plus rien à dire une fois le curseur
                dedans. */}
            {!query && (
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-extrabold tracking-[0.06em] text-white/40">
                ⌘ K
              </span>
            )}
          </div>

          {/*
           * LE BOUTON N'EXISTE QUE SOUS `lg`, puisque au-dessus la
           * colonne est déjà là et n'a rien à ouvrir.
           */}
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            aria-controls="filtres-pieces"
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-[13px] px-4 text-[13px] font-extrabold transition active:scale-[.97] lg:hidden ${
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

        {/*
         * CE QUI EST COCHÉ REMONTE ICI, ET SEULEMENT SUR TÉLÉPHONE.
         *
         * Un filtre actif rangé derrière un tiroir replié rend la liste
         * incomplète sans qu'on comprenne pourquoi — et c'est précisément
         * ce qui arrive dès qu'on referme le tiroir. Sur grand écran la
         * colonne est sous les yeux : répéter son contenu ne servirait
         * qu'à le dire deux fois.
         */}
        {actifs > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 lg:hidden">
            {rayons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => basculer(r)}
                aria-label={`Retirer le filtre ${r}`}
                className={pastille}
              >
                {r}
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            ))}
            {marque && nomDeLaMarque && (
              <button
                type="button"
                onClick={() => setMarque(null)}
                aria-label="Retirer le filtre de marque"
                className={pastille}
              >
                {nomDeLaMarque}
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            )}
            {prixActif && bornes && (
              <button
                type="button"
                onClick={() => setPrix([bornes.min, bornes.max])}
                aria-label="Retirer le filtre de prix"
                className={pastille}
              >
                {euros(prix[0])} – {euros(prix[1])}
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            )}
            {stock && (
              <button
                type="button"
                onClick={() => setStock(false)}
                aria-label="Retirer le filtre en stock"
                className={pastille}
              >
                En stock
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            )}
            {promo && (
              <button
                type="button"
                onClick={() => setPromo(false)}
                aria-label="Retirer le filtre en promo"
                className={pastille}
              >
                En promo
                <span className="ml-1.5 opacity-45">×</span>
              </button>
            )}
            <button
              type="button"
              onClick={reinitialiser}
              className="text-[12px] font-bold text-white/70 underline underline-offset-2 hover:text-white"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[222px_minmax(0,1fr)] lg:gap-[26px]">
        {/* ---------------- la colonne de filtres ----------------

            SOUS `lg`, ELLE DEVIENT UN TIROIR, PAS UNE RANGÉE DE
            PASTILLES QUI DÉFILE. Trois raisons, dans l'ordre :

            1. Ce qu'il y a dedans ne tient pas en pastilles. Un double
               curseur de prix et des cases à cocher n'ont pas de forme
               ronde ; il faudrait les reléguer ailleurs, et l'on se
               retrouverait avec deux endroits pour filtrer une même
               page.
            2. Une rangée qui défile à l'horizontale cache la moitié de
               ses entrées hors de l'écran, sans rien pour dire qu'elles
               existent. Sur six rayons ce serait supportable ; avec la
               marque et le prix en plus, non.
            3. Le geste existe déjà, à l'identique, sur l'annuaire et sur
               les posts. Une troisième façon de filtrer sur le même site
               est une façon de trop.

            Ce que le tiroir coûte — les filtres actifs deviennent
            invisibles une fois refermé — est réglé par les pastilles
            au-dessus, qui n'apparaissent que là.

            Sur grand écran elle reste COLLANTE : l'envie d'affiner arrive
            au milieu de la grille, pas en haut, et il fallait sinon
            remonter, donc perdre l'endroit où l'on en était. */}
        <aside
          id="filtres-pieces"
          /* Les tirets bas deviennent des espaces : `calc()` refuse un
             moins collé à ses opérandes, et la règle serait jetée en
             silence — la colonne dépasserait alors l'écran sans qu'on
             sache pourquoi. */
          className={`glass p-5 lg:sticky lg:top-[86px] lg:block lg:max-h-[calc(100vh_-_104px)] lg:overflow-y-auto ${
            ouvert ? "" : "hidden"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow m-0">Filtres</p>
            {actifs > 0 && (
              <button
                type="button"
                onClick={reinitialiser}
                className="text-[11px] font-bold text-white/75 underline underline-offset-2 transition hover:text-white"
              >
                Effacer
              </button>
            )}
          </div>

          {rayonsDisponibles.length > 1 && (
            <Section titre="Rayon">
              <div className="flex flex-col gap-0.5">
                {/* « Tout » compte ce que donneraient les autres
                    familles SANS aucun rayon coché — pas la liste
                    courante. Sinon la ligne annoncerait le nombre de
                    hauts au moment où l'on veut savoir combien il y a
                    de pièces si on les décoche. */}
                <LigneRayon
                  libelle="Tout"
                  total={rayonsDisponibles.reduce((n, r) => n + r.total, 0)}
                  actif={rayons.length === 0}
                  onClick={() => setRayons([])}
                />
                {rayonsDisponibles.map(({ rayon, total }) => (
                  <LigneRayon
                    key={rayon}
                    libelle={rayon}
                    total={total}
                    actif={rayons.includes(rayon)}
                    onClick={() => basculer(rayon)}
                  />
                ))}
              </div>
            </Section>
          )}

          {bornes && (
            <Section titre="Prix">
              <CurseurPrix
                min={bornes.min}
                max={bornes.max}
                pas={bornes.pas}
                valeur={prix}
                onChange={setPrix}
                format={euros}
              />
            </Section>
          )}

          {(etatsUtiles.stock || stock || etatsUtiles.promo || promo) && (
            <Section titre="Disponibilité">
              <div className="flex flex-col gap-0.5">
                {(etatsUtiles.stock || stock) && (
                  <Case libelle="En stock" coche={stock} onChange={setStock} />
                )}
                {(etatsUtiles.promo || promo) && (
                  <Case libelle="En promo" coche={promo} onChange={setPromo} />
                )}
              </div>
            </Section>
          )}

          {marquesDisponibles.length > 1 && (
            <Section titre="Marque">
              <select
                value={marque ?? ""}
                onChange={(e) => setMarque(e.target.value || null)}
                aria-label="Filtrer par marque"
                className="champ champ-petit min-h-[44px] lg:min-h-0"
              >
                <option value="">Toutes ({marquesDisponibles.length})</option>
                {marquesDisponibles.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.nom} ({m.total})
                  </option>
                ))}
              </select>
            </Section>
          )}
        </aside>

        {/* ---------------- la grille ---------------- */}
        <div className="min-w-0">
          {ordonnes.length === 0 ? (
            <div className="glass p-8 text-center">
              <p className="m-0 text-[15px] text-white/90">
                Rien ne correspond. Essaie avec moins de filtres, ou{" "}
                <Link
                  href="/marques"
                  className="font-bold text-white underline underline-offset-2"
                >
                  parcours les marques
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
                <p className="m-0 min-w-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
                  {enChiffres(ordonnes.length)} pièce{ordonnes.length > 1 ? "s" : ""} ·{" "}
                  {legende}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/*
                   * Le tri en texte souligné, pas en pastilles : la
                   * colonne de gauche en est déjà pleine, et deux
                   * familles de pastilles sur un même écran ne se
                   * distinguent plus l'une de l'autre.
                   *
                   * Le rembourrage du bouton donne au doigt de quoi
                   * viser ; le soulignement, lui, reste porté par le
                   * texte, sinon il flotterait huit pixels plus bas et
                   * ne désignerait plus rien.
                   */}
                  {(
                    [
                      ["hasard", "Au hasard"],
                      ["croissant", "Prix croissant"],
                      ["decroissant", "Prix décroissant"],
                    ] as const
                  ).map(([cle, label]) => (
                    <button
                      key={cle}
                      type="button"
                      onClick={() => setTri(cle)}
                      aria-pressed={tri === cle}
                      className={`py-2 text-[12.5px] font-bold transition ${
                        tri === cle ? "text-white" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <span className={tri === cle ? "border-b-[1.5px] border-white pb-[3px]" : ""}>
                        {label}
                      </span>
                    </button>
                  ))}

                  <SelecteurDensite
                    densite={densite}
                    choisir={choisirDensite}
                    offertes={offertes}
                  />
                </div>
              </div>

              <Grille
                variante="pieces"
                memoire="vitrine"
                densite={densite}
                onDensite={choisirDensite}
                selecteur={false}
              >
                {visibles.map((p, i) => (
                  /*
                   * EN GRILLE SERRÉE, NI CADRES ALTERNÉS NI DÉCALAGE.
                   * Cette densité-là sert à balayer six colonnes d'un
                   * coup d'œil : des hauteurs inégales y rendent
                   * illisible ce qu'on est justement venu comparer.
                   *
                   * `data-reveal` N'EST PAS DÉCORATIF ICI. L'entrée au
                   * défilement s'accroche à `.card-light` et à `.glass`
                   * (voir globals.css) : une pièce sans carte n'a plus
                   * ni l'une ni l'autre, et cette grille serait la seule
                   * du site à ne pas bouger. L'attribut la lui rend, et
                   * la pose sur la tuile ENTIÈRE — photo et texte
                   * ensemble — plutôt que sur deux morceaux qui
                   * arriveraient chacun de leur côté.
                   */
                  <div
                    key={p.id}
                    data-reveal
                    className={densite === "serre" ? "" : DECALAGES[i % 5]}
                  >
                    <ProductCard
                      product={p}
                      brandSlug={p.brand?.slug}
                      nue
                      ratio={densite === "serre" ? "1/1" : RATIOS[i % 3]}
                      // Le nom de la marque sous la pièce : ici, c'est la
                      // moitié de l'information. Sur la fiche d'une marque
                      // il serait répété quarante fois pour rien.
                      showBrand
                    />
                  </div>
                ))}
              </Grille>

              {reste > 0 && (
                /* Le pied reprend la pilule de la ligne de filtres de
                   l'annuaire : c'est le même objet, à l'autre bout de la
                   page. */
                <div className="mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[24px] border border-white/20 bg-[rgba(8,2,30,0.44)] p-3 backdrop-blur-[20px] sm:rounded-full sm:px-5">
                  <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                    {enChiffres(visibles.length)} sur {enChiffres(ordonnes.length)} affichées
                  </p>

                  <button
                    type="button"
                    onClick={() => setCombien((n) => n + LOT)}
                    className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[13px] font-extrabold text-[var(--color-ink)] transition hover:opacity-90 active:scale-[.97]"
                  >
                    Charger {Math.min(reste, LOT)} pièce{Math.min(reste, LOT) > 1 ? "s" : ""} de
                    plus
                  </button>

                  <p className="m-0 hidden text-[11.5px] font-semibold text-white/50 lg:block">
                    ou tape ⌘K pour chercher directement
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Une section de la colonne, séparée de la précédente par un trait.
 *
 * Le trait plutôt qu'un simple écart : quatre familles de filtres
 * empilées sans rien entre elles se lisent comme une seule longue liste,
 * et l'on cherche alors le prix parmi les rayons.
 */
function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-white/15 pt-4">
      <p className="eyebrow m-0 mb-2.5">{titre}</p>
      {children}
    </div>
  );
}

/**
 * Une ligne de rayon : le nom à gauche, ce qu'il contient à droite.
 *
 * Le compteur avant le clic, et c'est tout l'intérêt de la forme en
 * lignes : on choisit en sachant si l'on va tomber sur cent quarante
 * pièces ou sur trois.
 */
function LigneRayon({
  libelle,
  total,
  actif,
  onClick,
}: {
  libelle: string;
  total: number;
  actif: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      /* La cible fait 44 px au doigt et se resserre à la souris : le
         tiroir de téléphone est justement l'endroit où l'on vise mal. */
      className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[11px] px-[11px] text-left transition lg:min-h-0 lg:py-2 ${
        actif
          ? "bg-[var(--color-ink)] text-white"
          : "text-white/84 hover:bg-white/12 hover:text-white"
      }`}
    >
      <span className="min-w-0 truncate text-[12.5px] font-bold">{libelle}</span>
      <span className={`shrink-0 text-[11.5px] font-bold tabular-nums ${actif ? "opacity-70" : "opacity-55"}`}>
        {total}
      </span>
    </button>
  );
}

/**
 * Une case à cocher, dessinée.
 *
 * La case du navigateur reste sous le doigt et garde le clavier : elle
 * est simplement rendue invisible, et le carré qu'on voit la suit. On ne
 * refait donc ni le focus, ni la barre d'espace, ni l'annonce par un
 * lecteur d'écran.
 */
function Case({
  libelle,
  coche,
  onChange,
}: {
  libelle: string;
  coche: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[11px] px-[11px] transition hover:bg-white/8 lg:min-h-0 lg:py-2">
      <input
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] transition peer-focus-visible:ring-2 peer-focus-visible:ring-white/70 ${
          coche ? "bg-white text-[var(--color-ink)]" : "border-[1.5px] border-white/40"
        }`}
      >
        {coche && <IconCheck className="h-3 w-3" />}
      </span>
      <span className="text-[12.5px] font-bold text-white/84">{libelle}</span>
    </label>
  );
}
