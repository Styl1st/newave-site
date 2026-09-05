"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CurseurPrix from "./CurseurPrix";
import Portal from "./Portal";
import Grille from "./Grille";
import ProductCard, { type RatioPiece } from "./ProductCard";
import { IconCheck, IconFiltre } from "./Icons";
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
 * ILS VALENT AUSSI À DEUX COLONNES, ET C'EST UN REVIREMENT ASSUMÉ. On
 * les éteignait sous `sm` en craignant qu'à deux colonnes ils creusent
 * un trou en haut d'une colonne sur deux. C'est vrai d'un décalage qui
 * tomberait une fois sur deux — il se rangerait toujours du même côté.
 * Celui-ci a une période de CINQ : sur deux colonnes, la gauche reçoit
 * les rangs 0, 2 et 4, la droite les rangs 1 et 3, et aucune des deux ne
 * garde le même retrait d'une rangée à l'autre. Le motif ne se referme
 * jamais, et c'est exactement ce qu'on lui demande.
 *
 * Les valeurs du téléphone sont un peu plus courtes : à quatre cents
 * pixels de large, vingt-six pixels de retrait sur une tuile qui en fait
 * deux cents se voient comme un décrochement, pas comme une respiration.
 *
 * Les classes sont écrites en toutes lettres : Tailwind lit le fichier
 * tel quel, une classe composée à la volée ne produirait aucune règle.
 */
const RATIOS: RatioPiece[] = ["3/4", "1/1", "4/5"];
const DECALAGES = [
  "",
  "mt-[14px] sm:mt-[14px]",
  "",
  "mt-[22px] sm:mt-[26px]",
  "mt-[8px] sm:mt-[8px]",
];

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
   * SOUS `lg`, LA COLONNE DEVIENT UNE FEUILLE QUI MONTE.
   *
   * Le tiroir dépliait les filtres AU-DESSUS de la grille : on ouvrait,
   * on cochait, et la liste qu'on venait de réduire était repoussée deux
   * écrans plus bas — il fallait refermer, puis redescendre, pour voir ce
   * qu'on avait fait. La feuille se pose par-dessus, la page reste où
   * elle est, et son pied dit combien de pièces attendent derrière.
   *
   * On MESURE la largeur au lieu de tout rendre deux fois : la feuille et
   * la colonne portent le même contenu, et deux exemplaires dans la page
   * doubleraient les champs pour les lecteurs d'écran.
   */
  const [auDoigt, setAuDoigt] = useState(false);
  useEffect(() => {
    const petit = window.matchMedia("(max-width: 1023px)");
    const mesurer = () => setAuDoigt(petit.matches);
    mesurer();
    petit.addEventListener("change", mesurer);
    return () => petit.removeEventListener("change", mesurer);
  }, []);

  /* En passant au grand écran, la colonne redevient visible d'elle-même :
     laisser la feuille ouverte la ferait flotter en travers. */
  useEffect(() => {
    if (!auDoigt) setOuvert(false);
  }, [auDoigt]);

  /* ------------------------------------------------------------------
     LA FEUILLE SE REFERME EN LA TIRANT VERS LE BAS.

     Une poignée dessinée en haut d'une feuille est une promesse : tout le
     monde essaie de la tirer. Sans ce geste, il ne se passait rien et il
     fallait redescendre chercher le bouton du pied — soit exactement le
     trajet que la feuille était censée éviter.

     LE GESTE PART DE N'IMPORTE OÙ, PAS SEULEMENT DE LA POIGNÉE, à une
     condition : que la liste soit en haut de son défilement. Sinon on ne
     pourrait plus la faire défiler du tout, chaque glissement vers le bas
     emportant la feuille entière. C'est la règle de toutes les feuilles
     du téléphone, et celle qu'on essaie sans y penser.

     `setPointerCapture` garde le doigt rattaché à la feuille même s'il
     sort de ses bords en chemin : sans lui, le mouvement se coupe au
     milieu et la feuille reste en travers de l'écran.
     ------------------------------------------------------------------ */

  const corps = useRef<HTMLDivElement>(null);
  const depart = useRef<number | null>(null);
  const [glisse, setGlisse] = useState(0);
  const [tire, setTire] = useState(false);

  /** Au-delà, on lâche et la feuille s'en va. En deçà, elle revient. */
  const SEUIL = 110;

  function prendre(e: React.PointerEvent<HTMLDivElement>) {
    /* Un doigt posé sur un curseur de prix ou une case à cocher n'est pas
       un doigt qui veut refermer la feuille. */
    if ((e.target as HTMLElement).closest("input, select, button, label")) return;
    if ((corps.current?.scrollTop ?? 0) > 0) return;
    depart.current = e.clientY;
  }

  function deplacer(e: React.PointerEvent<HTMLDivElement>) {
    if (depart.current === null) return;
    const dy = e.clientY - depart.current;
    /* On n'engage qu'au-delà de quelques pixels : sinon un simple appui
       un peu tremblant ferait sauter la feuille. */
    if (!tire && dy < 6) return;
    if (!tire) {
      setTire(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setGlisse(Math.max(0, dy));
  }

  function lacher() {
    if (depart.current === null) return;
    const assez = glisse > SEUIL;
    depart.current = null;
    setTire(false);
    setGlisse(0);
    if (assez) setOuvert(false);
  }

  /* La page dessous ne défile plus, et Échap referme. */
  useEffect(() => {
    if (!ouvert || !auDoigt) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", surTouche);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = precedent;
    };
  }, [ouvert, auDoigt]);

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

  /*
   * Le contenu des filtres, écrit une fois pour ses deux logements :
   * la colonne collante de l'ordinateur et la feuille du téléphone.
   * Une seule des deux est montée à la fois — voir `auDoigt`.
   */
  const contenuFiltres = (
    <>
        <div className="flex items-center justify-between gap-2">
          {/* Dans la feuille, « Filtres » est le titre de l'écran et se
              lit comme tel ; dans la colonne, ce n'est qu'un intitulé de
              plus au-dessus d'une liste, et l'œil-de-bœuf suffit. */}
          {auDoigt ? (
            <h2 className="m-0 text-[19px] font-extrabold leading-none tracking-[-0.02em] text-white">
              Filtres
            </h2>
          ) : (
            <p className="eyebrow m-0">Filtres</p>
          )}
          {actifs > 0 && (
            <button
              type="button"
              onClick={reinitialiser}
              className={`font-bold text-white/75 underline underline-offset-2 transition hover:text-white ${
                auDoigt ? "text-[13px]" : "text-[11px]"
              }`}
            >
              Effacer
            </button>
          )}
        </div>

        {rayonsDisponibles.length > 1 && (
          <Section titre="Rayon">
            {/* Deux colonnes au doigt : six rayons empilés poussent le
                prix et la marque hors de la feuille, et l'on referme sans
                les avoir vus. */}
            <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-0.5">
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
                pastille={auDoigt}
              />
              {rayonsDisponibles.map(({ rayon, total }) => (
                <LigneRayon
                  key={rayon}
                  libelle={rayon}
                  total={total}
                  actif={rayons.includes(rayon)}
                  onClick={() => basculer(rayon)}
                  pastille={auDoigt}
                />
              ))}
            </div>
          </Section>
        )}

        {bornes && (
          /* Au doigt, les bornes remontent sur la ligne du titre : le rail
             tient alors sur une seule hauteur au lieu de deux, et c'est
             autant de gagné sur une feuille qui doit aussi loger les
             rayons, la disponibilité et la marque. */
          <Section
            titre="Prix"
            apres={
              auDoigt ? (
                <span className="text-[13px] font-extrabold tabular-nums text-white">
                  {euros(prix[0])} — {euros(prix[1])}
                </span>
              ) : undefined
            }
          >
            <CurseurPrix
              min={bornes.min}
              max={bornes.max}
              pas={bornes.pas}
              valeur={prix}
              onChange={setPrix}
              format={euros}
              bornesVisibles={!auDoigt}
            />
          </Section>
        )}

        {(etatsUtiles.stock || stock || etatsUtiles.promo || promo) && (
          <Section titre="Disponibilité">
            <div className={auDoigt ? "flex flex-wrap gap-2" : "flex flex-col gap-0.5"}>
              {(etatsUtiles.stock || stock) && (
                <Case libelle="En stock" coche={stock} onChange={setStock} pastille={auDoigt} />
              )}
              {(etatsUtiles.promo || promo) && (
                <Case libelle="En promo" coche={promo} onChange={setPromo} pastille={auDoigt} />
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

        {/* LE TRI EST ICI, ET SEULEMENT AU DOIGT.

            Il vivait à côté du compte, dans une pilule collante qui
            prenait cent pixels de haut pour trois mots. Il est de la même
            famille que ce qu'il y a au-dessus — on règle ce qu'on veut
            voir, puis dans quel ordre — et on repart d'un seul geste avec
            le bouton du pied. En dernier parce que c'est le réglage qu'on
            change le moins : les rayons d'abord, l'ordre ensuite. */}
        {auDoigt && (
          <Section titre="Tri">
            <div className="flex flex-wrap gap-2">
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
                  className={`inline-flex min-h-[44px] items-center rounded-[13px] px-3.5 text-[12.5px] font-bold transition active:scale-[.97] ${
                    tri === cle
                      ? "bg-white text-[var(--color-ink)]"
                      : "bg-white/8 text-white/84 hover:bg-white/14"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* La densité suit le tri : ce sont les deux réglages
                d'affichage, et ils n'ont plus d'autre logement depuis que
                la pilule a disparu. */}
            {/* `flex` sur l'enveloppe : le rail est un bloc, il prendrait
                sinon toute la largeur de la feuille pour trois icônes. */}
            <div className="mt-3 flex">
              <SelecteurDensite
                densite={densite}
                choisir={choisirDensite}
                offertes={offertes}
              />
            </div>
          </Section>
        )}
    </>
  );

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
          {/* LE BOUTON DE FILTRES A QUITTÉ CETTE LIGNE.

              Il vit maintenant en bas de l'écran, flottant, et il porte
              le compte des filtres actifs (voir plus bas). En haut, il
              fallait remonter pour l'atteindre — or l'envie d'affiner
              arrive en fouillant, donc au milieu de la grille. En bas,
              il est sous le pouce en permanence, et c'est le seul geste
              de cette page qu'on refait dix fois. */}
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

      <div className="grid items-start gap-4 pb-20 lg:grid-cols-[222px_minmax(0,1fr)] lg:gap-[26px] lg:pb-0">
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
        {/* ---------------- les filtres ----------------

            Ils s'écrivent UNE FOIS et se posent à deux endroits selon la
            largeur : la colonne collante sur grand écran, la feuille qui
            monte au doigt. Les rendre deux fois donnerait deux jeux de
            champs dans la page — le lecteur d'écran les annoncerait tous,
            et la moitié seraient invisibles. */}
        {!auDoigt && (
          <aside
            /* Les tirets bas deviennent des espaces : `calc()` refuse un
               moins collé à ses opérandes, et la règle serait jetée en
               silence — la colonne dépasserait alors l'écran sans qu'on
               sache pourquoi. */
            className="glass sticky top-[86px] max-h-[calc(100vh_-_104px)] overflow-y-auto p-5"
          >
            {contenuFiltres}
          </aside>
        )}

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
              {/* AU DOIGT, IL NE RESTE QUE LE COMPTE.

                  La pilule collante qui portait le tri et la densité
                  faisait cent pixels de haut pour trois mots : elle
                  mangeait le premier tiers de l'écran, et le tri
                  s'utilise deux fois par visite, pas deux fois par
                  rangée. Les deux réglages ont rejoint la feuille de
                  filtres — c'est le même geste, au même endroit, et l'on
                  y règle tout d'un coup avant de revenir à la grille.

                  Sur grand écran ils restent ici : la colonne de filtres
                  y est déjà dépliée en permanence, et le tri n'a aucune
                  raison d'aller se cacher. */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
                <p className="m-0 min-w-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
                  {enChiffres(ordonnes.length)} pièce{ordonnes.length > 1 ? "s" : ""} ·{" "}
                  {legende}
                </p>

                {!auDoigt && (
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
                      /* « Au hasard » saute au doigt, sauf s'il est le
                         tri courant : trois tris et le rail de densité ne
                         tiennent pas sur quatre cents pixels, et c'est
                         celui dont on se passe le mieux — la page arrive
                         déjà dans cet ordre. */
                      className={`py-2 text-[12.5px] font-bold transition ${
                        cle === "hasard" && tri !== "hasard" ? "hidden sm:block" : ""
                      } ${tri === cle ? "text-white" : "text-white/60 hover:text-white"}`}
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
                )}
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

      {/* ---------------- au doigt : le bouton, puis la feuille ----------------

          LE BOUTON EST EN BAS, ET C'EST LE POINT DE L'ÉCRAN. Filtrer est
          le seul geste qu'on refait dix fois sur cette page ; il doit
          être là où le pouce se trouve déjà, pas en haut d'un défilement
          de six rangées. Il porte son compte, donc il dit aussi combien
          de filtres sont posés — ce qu'un tiroir refermé ne disait plus. */}
      {auDoigt && !ouvert && ordonnes.length > 0 && (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          aria-haspopup="dialog"
          className="fixed bottom-5 left-1/2 z-40 inline-flex min-h-[44px] -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-black text-[var(--color-ink)] shadow-[0_14px_34px_-10px_rgba(12,3,36,0.9)] transition active:scale-[.97]"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
        >
          <IconFiltre className="h-4 w-4" />
          Filtres
          {actifs > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[10.5px] font-black text-[var(--sur-plein,#fff)]">
              {actifs}
            </span>
          )}
        </button>
      )}

      {auDoigt && ouvert && (
        /* Rendue dans un portail, hors de la page : posée dedans, elle
           hériterait du plan d'empilement de la grille et passerait sous
           la barre du haut. Même mécanique que `FeuilleRetouche`. */
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-end">
            {/* Le voile. Toucher à côté referme, comme partout ailleurs.
                Il s'éclaircit à mesure qu'on tire la feuille vers le bas :
                c'est ce qui fait sentir qu'on est en train de la refermer
                et non de la déplacer. */}
            <button
              type="button"
              aria-label="Fermer les filtres"
              onClick={() => setOuvert(false)}
              className="absolute inset-0 bg-[rgba(12,4,32,0.58)]"
              style={{ opacity: 1 - Math.min(glisse / 420, 0.55) }}
            />

            {/*
             * L'ENVELOPPE PORTE LE GLISSEMENT, ET LA FEUILLE SON DESSIN.
             *
             * `panneau-edition` anime son entrée par une `transform`, en
             * `animation-fill-mode: both` : la dernière image du
             * mouvement continue de s'appliquer une fois l'animation
             * finie, et une `transform` posée en style en ligne sur le
             * même élément serait purement et simplement ignorée. Le
             * glissement vit donc un cran au-dessus.
             */}
            <div
              className="relative w-full"
              style={{
                transform: glisse ? `translateY(${glisse}px)` : undefined,
                transition: tire ? "none" : "transform .28s cubic-bezier(.2,.8,.3,1)",
              }}
            >
            <div
              role="dialog"
              aria-modal
              aria-label="Filtres"
              id="filtres-pieces"
              onPointerDown={prendre}
              onPointerMove={deplacer}
              onPointerUp={lacher}
              onPointerCancel={lacher}
              className="panneau-edition relative flex max-h-[86svh] w-full flex-col rounded-t-[26px] border-t border-white/20 shadow-[0_-18px_44px_-8px_rgba(12,3,36,0.8)]"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              {/* La poignée. Elle disait « ceci se ferme en tirant vers le
                  bas » sans que ce soit vrai : on l'essayait, il ne se
                  passait rien, et il fallait redescendre chercher le
                  bouton. Elle tient maintenant sa promesse — et le geste
                  marche depuis toute la feuille, pas seulement depuis
                  elle. */}
              <span
                aria-hidden
                className="mx-auto mt-2.5 h-[5px] w-11 shrink-0 rounded-full bg-white/30"
              />

              <div
                ref={corps}
                className="min-h-0 flex-1 overflow-y-auto px-5 pb-4"
              >
                {contenuFiltres}
              </div>

              {/*
               * LE PIED COMPTE, ET C'EST LUI QUI REMPLACE LE RETOUR
               * IMMÉDIAT.
               *
               * Sur grand écran, la colonne est à côté de la grille :
               * on coche, on voit. Ici la feuille recouvre ce qu'elle
               * filtre, et l'on cocherait à l'aveugle. Le compte se
               * recalcule à chaque changement — c'est la même valeur que
               * la grille affichera en dessous, pas une estimation.
               */}
              <div className="shrink-0 border-t border-white/15 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.98]"
                >
                  Voir {ordonnes.length > 1 ? "les" : "la"} {enChiffres(ordonnes.length)} pièce
                  {ordonnes.length > 1 ? "s" : ""}
                </button>
              </div>
            </div>
            </div>
          </div>
        </Portal>
      )}
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
function Section({
  titre,
  apres,
  children,
}: {
  titre: string;
  /** Posé à droite du titre : la plage de prix y remonte, au doigt. */
  apres?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-white/15 pt-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <p className="eyebrow m-0">{titre}</p>
        {apres}
      </div>
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
  pastille = false,
}: {
  libelle: string;
  total: number;
  actif: boolean;
  onClick: () => void;
  /**
   * La forme de la feuille : un bloc plein, posé dans une grille de deux.
   *
   * Dans la colonne, les rayons sont une LISTE — on les lit de haut en
   * bas, et un fond sur chacun ferait six pavés là où il n'y a qu'un
   * choix à faire. Dans la feuille ils sont côte à côte : sans fond, on
   * ne sait plus où finit « Bijoux » et où commence son compte.
   */
  pastille?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      /* La cible fait 44 px au doigt et se resserre à la souris : la
         feuille de téléphone est justement l'endroit où l'on vise mal. */
      className={`flex min-h-[44px] w-full items-center justify-between gap-2 text-left transition lg:min-h-0 lg:py-2 ${
        pastille ? "rounded-[13px] px-3.5" : "rounded-[11px] px-[11px]"
      } ${
        actif
          /* `--sur-plein` et non `text-white` : en mode clair, ce dernier
             bascule en encre, et la ligne active — dont le fond, lui,
             reste sombre — deviendrait illisible. */
          ? pastille
            ? "bg-white text-[var(--color-ink)]"
            : "bg-[var(--color-ink)] text-[var(--sur-plein,#fff)]"
          : pastille
            ? "bg-white/8 text-white/88 hover:bg-white/14"
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
  pastille = false,
}: {
  libelle: string;
  coche: boolean;
  onChange: (v: boolean) => void;
  /** Même raison que pour `LigneRayon` : côte à côte, il faut un contour. */
  pastille?: boolean;
}) {
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 transition lg:min-h-0 lg:py-2 ${
        pastille
          ? `rounded-[13px] px-3.5 ${coche ? "bg-white/14" : "bg-white/6 hover:bg-white/12"}`
          : "rounded-[11px] px-[11px] hover:bg-white/8"
      }`}
    >
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
