"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Grille from "./Grille";
import ProductCard, { CADRES_VITRINE, DECALAGES_VITRINE } from "./ProductCard";
import { prechaufferVignette } from "./VignetteDefilante";
import { IconLoupe } from "./Icons";
import FiltresPieces, { type EtatFiltres } from "./pieces/FiltresPieces";
import { SelecteurDensite, useDensite } from "./densite";
import { enChiffres } from "./chiffres";
import { declarerChampLocal } from "./recherche/champLocal";
import FeuilleRecherche from "./recherche/FeuilleRecherche";
import Suggestions from "./recherche/Suggestions";
import type { Critere } from "./recherche/Jeton";
import { MINIMUM, useRecherche } from "./recherche/useRecherche";
import { noterRecherche } from "./recherche/historique";
import { formatPrice } from "@/lib/types";
import { PRODUCT_CATEGORIES } from "@/lib/taxonomy";
import { estUneVideo, premiereImage } from "@/lib/medias";
import type { Product } from "@/lib/types";
import type { CompteDuCatalogue } from "@/lib/queries";
import Raccourci from "@/components/Raccourci";

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
 * LES FILTRES NE SONT PLUS UNE COLONNE. La colonne de verre de gauche
 * prenait deux cent vingt pixels à la grille pour un panneau qu'on ne
 * regardait qu'une fois, et la feuille du téléphone cachait tout derrière
 * un bouton. Les rayons s'écrivent maintenant en grand au-dessus de la
 * grille, et les autres réglages tiennent sur une ligne qui se déplie
 * sans boîte et suit le défilement — voir `pieces/FiltresPieces`.
 *
 * Et surtout : LES PIÈCES N'ONT PLUS DE CARTE. La photo est posée à même
 * le fond, le texte vit dessous, sans cadre. C'est le parti pris de cet
 * écran-là — voir la variante `nue` de `ProductCard` pour le détail.
 */

/** Combien de pièces d'un coup. Même raison que pour l'annuaire. */
const LOT = 24;

/**
 * Le repos qu'on laisse aux doigts avant d'aller redemander une page.
 *
 * Filtrer passe maintenant par la base : taper « veste » ferait cinq
 * requêtes dont quatre jetées. Le même nombre que le panneau de
 * suggestions, pour que la grille et lui se mettent à jour ensemble
 * plutôt que l'un après l'autre.
 */
const REPOS_FRAPPE = 180;

/**
 * Le même repos, pour le rail de prix, et il est un peu plus long.
 *
 * Un `input[type=range]` prévient à CHAQUE cran : traverser le rail au
 * doigt émet quelques dizaines de changements, donc quelques dizaines
 * de requêtes si on les suit toutes. Un geste de glissement dure aussi
 * plus longtemps qu'une frappe — on cherche la bonne valeur, on
 * dépasse, on revient — d'où les quatre-vingts millisecondes de plus.
 *
 * ⚠️ L'AFFICHAGE, LUI, NE LAMBINE PAS. Les deux nombres au-dessus du
 * rail et la pastille de filtre suivent `prix`, la valeur immédiate ;
 * seule la REQUÊTE suit `prixDiffere`. Faire traîner la main sur le
 * rail donnerait l'impression d'une page cassée.
 */
const REPOS_RAIL = 260;

/**
 * LE POINT DE BASCULE DE LA RECHERCHE, ET IL N'EST PAS CELUI DES
 * FILTRES.
 *
 * La colonne de filtres devient une feuille sous 1 024 px, parce que
 * c'est là qu'elle cesse de tenir à côté de la grille. La recherche,
 * elle, bascule à 640 px : c'est la largeur en dessous de laquelle la
 * ligne typographique se coupe en deux et où le clavier virtuel mange
 * la moitié basse de l'écran. Deux seuils différents pour deux
 * contraintes différentes, et c'est le même 640 que l'annuaire.
 */
const AU_DOIGT_RECHERCHE = "(max-width: 639px)";

/** Sans accents ni casse : « Bas » doit répondre à « bas ». */
function sansAccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * La hauteur de l'en-tête collant, en pixels.
 *
 * C'est le même nombre que le `top: 86px` de la barre de filtres
 * collante : quand on repose la page sur le haut des résultats, il faut
 * la poser SOUS l'en-tête et sous la barre, pas dessous elles.
 */
const ENTETE = 86;

/**
 * Corriger le défilement doit se faire AVANT que la page soit peinte,
 * sinon on voit le saut puis sa correction. `useLayoutEffect` est fait
 * pour ça, mais il n'existe pas au rendu serveur et y laisse un
 * avertissement : côté serveur, l'effet ordinaire fait l'affaire
 * puisqu'il ne s'exécute pas.
 */
const useEffetDePose = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Les cadres et le décalage de la grille : écrits une seule fois dans
 * `ProductCard`, parce que le catalogue d'une marque reprend exactement
 * la même grille. Voir `CADRES_VITRINE`.
 */
const RATIOS = CADRES_VITRINE;
const DECALAGES = DECALAGES_VITRINE;

/** Le prix qui sert à comparer : en euros quand on a su convertir. */

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

/**
 * Les rayons qui s'habillent, les seuls où la taille a un sens. Une
 * bague en M ou une casquette en XL ne veulent rien dire.
 */
/**
 * Les rayons montrés avant que la base ait répondu : leurs noms, sans
 * chiffre. Ceux de la base les remplacent dès qu'ils arrivent (ils
 * peuvent en compter un de plus, « Autres »).
 */
const RAYONS_EN_ATTENDANT = PRODUCT_CATEGORIES.map((rayon) => ({ rayon, total: null }));

/** Le bout du rail de prix, en centimes : trois cents euros. Voir `bornes`. */
const PLAFOND_RAIL = 30000;

/** Les barres au-dessus du rail : vingt-quatre tranches, plus « et plus ». */
const TRANCHES_PRIX = 24;

const RAYONS_HABILLES = ["Hauts", "Bas", "Vestes", "Maille", "Robes"];

/** Dans cet ordre-là, et pas dans l'ordre des comptes : on lit une échelle. */
const ORDRE_DES_TAILLES = ["XS", "S", "M", "L", "XL", "XXL"];

/**
 * UNE LECTURE QUI RETENTE QUAND LA BASE A EU UN RATÉ.
 *
 * La vitrine et les comptes du catalogue passent par des fonctions SQL
 * qui parcourent toute la table des pièces. La plupart du temps elles
 * répondent en quelques dizaines de millisecondes ; de temps en temps,
 * base froide ou plusieurs comptages en même temps, l'une dépasse le
 * délai et la route répond 503. Une seconde plus tard, la même requête
 * passe. Abandonner au premier raté laissait la page dans son état de
 * secours — colonne de filtres vide — jusqu'au prochain rechargement.
 *
 * On ne retente que ce qui peut changer : une coupure réseau ou une
 * réponse 5xx. Une 4xx dira la même chose la fois suivante. Et une
 * requête annulée s'arrête tout de suite : c'est qu'une autre l'a
 * remplacée.
 */
async function chercherAvecReprises<T>(
  url: string,
  signal?: AbortSignal,
  attentes: number[] = [800, 2500]
): Promise<T> {
  for (let essai = 0; ; essai++) {
    let reponse: Response | null = null;
    try {
      reponse = await fetch(url, { signal });
    } catch (e) {
      if ((e as Error)?.name === "AbortError" || essai >= attentes.length) throw e;
    }
    if (reponse?.ok) return (await reponse.json()) as T;
    if (reponse && (reponse.status < 500 || essai >= attentes.length)) {
      throw new Error(String(reponse.status));
    }

    await new Promise<void>((suite, arret) => {
      if (signal?.aborted) return arret(new DOMException("Annulée", "AbortError"));
      const minuteur = setTimeout(suite, attentes[essai]);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(minuteur);
          arret(new DOMException("Annulée", "AbortError"));
        },
        { once: true }
      );
    });
  }
}

export default function PieceDirectory({
  premierLot,
  totalDuPremierLot,
  graine,
  rayonsDuCatalogue: rayonsServeur,
  tagsDuCatalogue: tagsServeur,
  taillesDuCatalogue: taillesServeur,
  marquesDuCatalogue: marquesServeur,
  bornesDuCatalogue: bornesServeur,
  etatsDuCatalogue: etatsServeur,
  amorce,
  secours = false,
}: {
  /**
   * LES VINGT-QUATRE PREMIÈRES PIÈCES, RENDUES PAR LE SERVEUR.
   *
   * La page en descendait douze cent trente et faisait tout le travail
   * ici. Elle n'en descend plus que vingt-quatre, et c'est la base qui
   * filtre, trie, compte et découpe (voir `lireUnePageDeVitrine`). Ce
   * premier lot est rendu avec la page pour deux raisons qui valent
   * chacune la peine : la grille est là au premier coup d'œil, sans
   * aller-retour, et un robot qui ne joue pas le JavaScript voit
   * quand même des pièces.
   */
  premierLot: Product[];
  /** Ce que les filtres de départ retiennent EN TOUT, avant découpage. */
  totalDuPremierLot: number;
  /**
   * Le premier lot vient de l'ÉCHANTILLON et non de la base : la
   * fonction `vitrine` n'a pas répondu au rendu. La grille redemande
   * alors sa vraie première page dès qu'elle est montée.
   */
  secours?: boolean;
  /**
   * LA GRAINE DE L'ORDRE « AU HASARD », TIRÉE UNE FOIS PAR VISITE.
   *
   * L'ordre alterne les marques et se poursuit page après page. S'il
   * était retiré au sort à chaque appel, la page 2 serait rangée
   * autrement que la page 1 : une pièce sortirait deux fois, une autre
   * jamais. La page en tire une, la redonne à chaque requête, et l'on
   * obtient un ordre qui change d'une visite à l'autre sans bouger à
   * l'intérieur d'une visite.
   */
  graine: string;
  /**
   * Ce que l'adresse a déposé dans le champ, `?q=veste`.
   *
   * LUE AU SERVEUR ET NON DANS UN EFFET, comme pour l'annuaire : il la
   * faut au PREMIER rendu. Lue après coup, la grille complète
   * s'afficherait puis se réduirait sous les yeux. C'est ce qui rend
   * une recherche de la vitrine partageable, et ce qui permettra à un
   * lien de pointer sur « les vestes » sans passer par le champ.
   */
  amorce?: string;
  /**
   * Les rayons du site entier, comptés par Postgres.
   *
   * La page ne porte qu'un échantillon — dix pièces par marque — et la
   * colonne de filtres comptait donc l'échantillon : « Hauts 413 » sur
   * un site qui en a des milliers. Ces nombres-là viennent de la base
   * (voir `compterLeCatalogue`) et disent le catalogue.
   *
   * Absent en démonstration, ou si la lecture échoue : on retombe sur
   * le comptage de ce qui est chargé, qui est ce qu'on faisait avant.
   */
  rayonsDuCatalogue?: { rayon: string; total: number }[];
  /**
   * LES TAGS FINS DU SITE, AVEC LE RAYON DE LEURS PIÈCES.
   *
   * « Hauts » rassemble des milliers de pièces ; « Hoodies » en est une
   * part qu'on veut pouvoir isoler. Comptés par Postgres comme les
   * rayons (voir `compter_les_tags`, migration 34) : un tag n'est
   * listé que s'il a des pièces, aucun filtre ne mène donc à une grille
   * vide.
   *
   * Absent avant la migration 34 : la section « Type » ne s'affiche pas.
   */
  tagsDuCatalogue?: { rayon: string | null; tag: string; total: number }[];
  /**
   * LES TAILLES EN STOCK, par rayon (XS à XXL, ramenées d'écritures
   * aussi variées que « Small », « X-Large » ou « 2XL »). Absent avant
   * la migration 35 : la section « Taille » ne s'affiche pas.
   */
  taillesDuCatalogue?: { rayon: string | null; taille: string; total: number }[];
  /**
   * LES MARQUES DU SITE, ET NON CELLES DE L'ÉCHANTILLON.
   *
   * Même correction que pour les rayons, un cran plus loin. Le filtre
   * « Marque » listait les marques PRÉSENTES DANS LA VITRINE : celle-ci
   * prend dix pièces par marque et n'en garde que les photographiées,
   * si bien qu'une marque dont les dix premières pièces n'ont pas de
   * visuel en disparaissait. Le filtre annonçait « Toutes (133) » sous
   * un en-tête qui disait « 141 marques ». Les deux nombres venaient de
   * deux comptages différents, et la page paraissait se contredire.
   *
   * Ils viennent maintenant du même endroit — `compter_les_marques`,
   * migration 32 — donc ils ne peuvent plus diverger. Une marque sans
   * pièce dans la vitrine reste choisissable et la grille explique
   * pourquoi elle est vide, plutôt que de faire disparaître la marque.
   *
   * Absent en démonstration, ou si la migration n'est pas passée : on
   * retombe sur le comptage de ce qui est chargé, qui est ce qu'on
   * faisait avant.
   */
  marquesDuCatalogue?: { slug: string; nom: string; total: number }[];
  /**
   * De quoi graduer le rail de prix, et de quoi décider des deux cases
   * d'état.
   *
   * Ils se mesuraient sur les pièces chargées. Il n'y en a plus que
   * vingt-quatre : un rail gradué là-dessus ne couvrirait pas le
   * catalogue, et « En stock » disparaîtrait dès que les vingt-quatre
   * premières sont toutes disponibles. Voir `vitrine_bornes`.
   */
  bornesDuCatalogue?: { min: number; max: number };
  etatsDuCatalogue?: { ruptures: boolean; promos: boolean };
}) {
  /*
   * LA DENSITÉ EST TENUE ICI ET NON DANS LA GRILLE, parce que son rail
   * de boutons est posé dans la ligne de tri, à droite du compteur. La
   * grille la reçoit et n'affiche plus le sien. Même mécanique que
   * l'annuaire refondu ; le choix reste retenu sous la même clé
   * qu'avant, personne ne perd le sien.
   */
  const { densite, choisir: choisirDensite, offertes } = useDensite("vitrine", "pieces");

  /*
   * LES COMPTES DU CATALOGUE, RATTRAPÉS QUAND LE SERVEUR NE LES A PAS EUS.
   *
   * Toute la colonne de filtres sort de `compterLeCatalogue`. Quand la
   * base n'a pas répondu à temps au rendu, la page arrivait avec une
   * colonne vide — l'intitulé « Filtres » et rien dessous — et le restait
   * jusqu'au rechargement suivant. Elle les redemande maintenant à
   * `/api/catalogue`, en retentant, et se remplit toute seule. Entre-temps
   * la colonne montre qu'elle charge, plutôt que d'avoir l'air finie.
   *
   * Tout le reste du composant lit les mêmes noms qu'avant : ce sont
   * eux qui choisissent entre la version du serveur et la version
   * rattrapée.
   */
  const [rattrape, setRattrape] = useState<CompteDuCatalogue | null>(null);
  const [filtresEnPanne, setFiltresEnPanne] = useState(false);
  const [essaiFiltres, setEssaiFiltres] = useState(0);
  const catalogueManquant = rayonsServeur === undefined && rattrape === null;

  useEffect(() => {
    if (!catalogueManquant) return;
    const halte = new AbortController();
    setFiltresEnPanne(false);

    chercherAvecReprises<CompteDuCatalogue>("/api/catalogue", halte.signal, [1000, 3000, 8000])
      .then(setRattrape)
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setFiltresEnPanne(true);
      });

    return () => halte.abort();
  }, [catalogueManquant, essaiFiltres]);

  const rayonsDuCatalogue = rayonsServeur ?? rattrape?.rayons;
  const tagsDuCatalogue = tagsServeur ?? rattrape?.tags;
  const taillesDuCatalogue = taillesServeur ?? rattrape?.tailles;
  const marquesDuCatalogue = marquesServeur ?? rattrape?.marquesListe;
  const bornesDuCatalogue = bornesServeur ?? rattrape?.prix;
  const etatsDuCatalogue = etatsServeur ?? rattrape?.etats;

  const [query, setQuery] = useState(amorce ?? "");
  /*
   * UN SEUL RAYON À LA FOIS, ET SES TYPES DESSOUS.
   *
   * Le rayon et le type ne font plus qu'un menu. Cliquer « Hauts » le
   * pose en filtre ET le déroule sur ses types ; cliquer un autre rayon
   * replie le premier et le retire, types compris ; cliquer le rayon
   * ouvert le referme et revient à tout. On pouvait cocher plusieurs
   * rayons, mais personne ne cherche « des hauts ou des bas » : on
   * cherche des hauts, puis des chemises.
   *
   * Les types, eux, se cochent à plusieurs : « T-shirts ou Débardeurs ».
   * Entre les familles de filtres, c'est toujours un ET : « des
   * chemises, ET à moins de 60 €, ET en stock ».
   *
   * `rayons`, en tableau, reste ce que l'API attend (`?rayon=`), avec
   * une valeur au plus.
   */
  const [rayon, setRayon] = useState<string | null>(null);
  const rayons = useMemo(() => (rayon ? [rayon] : []), [rayon]);
  const [tags, setTags] = useState<string[]>([]);
  /*
   * LA TAILLE, un seul choix, et seulement pour ce qui s'habille : voir
   * `RAYONS_HABILLES`. « Bijoux + M » ne voudrait rien dire.
   */
  const [taille, setTaille] = useState<string | null>(null);
  const [marque, setMarque] = useState<string | null>(null);
  const [stock, setStock] = useState(false);
  const [promo, setPromo] = useState(false);
  const [tri, setTri] = useState<"hasard" | "croissant" | "decroissant">("hasard");

  /*
   * LES BORNES DU PRIX SE CALCULENT SUR LE CATALOGUE ENTIER, PAS SUR CE
   * QUI RESTE APRÈS FILTRAGE. Un rail qui se remet à l'échelle à chaque
   * clic déplace les poignées sous le doigt et fait mentir la position
   * qu'on venait de choisir : on croit avoir demandé « jusqu'à 60 € » et
   * la même poignée, au même endroit, dit maintenant 30.
   */
  const bornes = useMemo(() => {
    if (!bornesDuCatalogue) return null;

    const { min: bas, max: haut } = bornesDuCatalogue;
    if (haut <= bas) return null;

    /*
     * LE RAIL PART DE ZÉRO ET S'ARRÊTE À `PLAFOND_RAIL`.
     *
     * Gradué jusqu'à la pièce la plus chère du site (près de neuf cents
     * euros), il tassait l'essentiel du catalogue — la moitié des pièces
     * sous soixante euros — dans le premier quart du trait, et ses
     * barres de prix n'étaient qu'un pic contre le bord. La poignée
     * haute posée au bout veut donc dire « et plus » : elle ne retient
     * aucune borne haute (voir `adresse`).
     */
    const max = Math.min(haut, PLAFOND_RAIL);
    const pas = crantDe(max);
    return {
      min: 0,
      max: Math.ceil(max / pas) * pas,
      pas,
      /** Des pièces coûtent plus que le bout du rail. */
      auDela: haut > PLAFOND_RAIL,
    };
  }, [bornesDuCatalogue]);

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

  /* Le rayon ouvert se referme et se retire ; un autre prend sa place.
     Dans les deux cas, les types repartent de zéro. */
  const basculer = (r: string) => {
    setRayon((actuel) => (actuel === r ? null : r));
    setTags([]);
  };

  const basculerTag = (t: string) =>
    setTags((liste) => (liste.includes(t) ? liste.filter((x) => x !== t) : [...liste, t]));

  /* Le rayon d'un type, celui où il a le plus de pièces. Sert quand on
     pose un type depuis la recherche, sans être passé par son rayon. */
  const rayonDuType = (t: string): string | null => {
    let meilleur: { rayon: string; total: number } | null = null;
    for (const l of tagsDuCatalogue ?? []) {
      if (l.tag !== t) continue;
      if (!meilleur || l.total > meilleur.total) meilleur = { rayon: l.rayon ?? "Autres", total: l.total };
    }
    return meilleur?.rayon ?? null;
  };

  /* Un jeton par type coché, sinon un pour le rayon seul : « Hauts »,
     puis « Hauts · Chemises » dès qu'un type est posé. */
  const actifs =
    (tags.length > 0 ? tags.length : rayon ? 1 : 0) +
    (taille ? 1 : 0) +
    (marque ? 1 : 0) +
    (stock ? 1 : 0) +
    (promo ? 1 : 0) +
    (prixActif ? 1 : 0);

  function reinitialiser() {
    setRayon(null);
    setTags([]);
    setTaille(null);
    setMarque(null);
    setStock(false);
    setPromo(false);
    if (bornes) setPrix([bornes.min, bornes.max]);
  }

  /* ------------------------------------------------------------------
     La recherche
     ------------------------------------------------------------------ */

  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const bloc = useRef<HTMLDivElement>(null);
  const [panneau, setPanneau] = useState(false);
  const [feuille, setFeuille] = useState(false);

  /*
   * La largeur est MESURÉE, et avant la peinture.
   *
   * Le champ ne prend pas la même forme de part et d'autre des 640 px :
   * ligne typographique au-dessus, champ ordinaire en dessous. Mesurer
   * dans un effet ordinaire ferait afficher la ligne une fraction de
   * seconde sur un téléphone avant de la remplacer. `useEffetDePose`
   * joue avant que le navigateur peigne, personne ne voit le change.
   */
  const [petit, setPetit] = useState(false);
  useEffetDePose(() => {
    const etroit = window.matchMedia(AU_DOIGT_RECHERCHE);
    const mesurer = () => setPetit(etroit.matches);
    mesurer();
    etroit.addEventListener("change", mesurer);
    return () => etroit.removeEventListener("change", mesurer);
  }, []);

  /* En repassant au grand écran, le panneau redevient lisible sous le
     champ : laisser la feuille ouverte la ferait flotter en travers. */
  useEffect(() => {
    if (!petit) setFeuille(false);
  }, [petit]);

  /*
   * Fermer en cliquant à côté, et pas au `blur` du champ : le `blur`
   * part AVANT le clic sur une suggestion, et le lien visé n'existerait
   * plus au moment où le clic arrive. L'annuaire a payé ce bug.
   */
  useEffect(() => {
    if (!panneau) return;
    const dehors = (e: MouseEvent) => {
      if (!bloc.current?.contains(e.target as Node)) setPanneau(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [panneau]);

  /*
   * ⌘K, comme dans l'annuaire. Le geste doit être le même d'une page de
   * listing à l'autre, sinon il n'en devient le réflexe sur aucune.
   *
   * Ctrl aussi bien que ⌘ : le site n'a aucune raison de supposer un
   * Mac. Il déplie aussi le panneau, depuis que la vitrine en a un : le
   * raccourci doit mener au même endroit que le clic.
   */
  /* La page porte son propre champ : le pop-up de la barre laisse donc
     ⌘K à celui-ci. Voir `champLocal`. */
  useEffect(() => declarerChampLocal(), []);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
        setPanneau(true);
      }
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, []);

  /* ------------------------------------------------------------------
     LES FILTRES NE TRAVAILLENT PLUS ICI. ILS TRAVAILLENT DANS POSTGRES.
     ------------------------------------------------------------------

     C'est le renversement de cette page, et il vaut la peine d'être dit
     en entier, parce que tout le reste du fichier en découle.

     AVANT : la page descendait un ÉCHANTILLON — dix pièces par marque,
     plafonné à mille cinq cents lignes, soit douze cent trente sur les
     vingt-six mille du site — et ce fichier filtrait, cherchait, triait
     et découpait cet échantillon en JavaScript. C'était instantané, et
     c'était faux : le pied annonçait « 24 sur 1 230 » sur une page
     intitulée « Les pièces », « moins de 30 € » ne cherchait pas moins
     de 30 € au catalogue mais dans l'échantillon, et les vingt-cinq
     mille autres pièces n'étaient atteignables que marque par marque.

     MAINTENANT : la base filtre, trie, compte et découpe, et la page ne
     reçoit que les vingt-quatre pièces qu'elle affiche. Le site est
     entièrement parcourable, et la page pèse moins qu'avant.

     CE QUE ÇA COÛTE, ET C'EST ASSUMÉ : filtrer n'est plus instantané,
     il y a un aller-retour. D'où la frappe DIFFÉRÉE juste en dessous,
     et d'où le fait qu'on garde les pièces précédentes à l'écran
     pendant le chargement plutôt que de vider la grille — une grille
     qui clignote à chaque lettre est pire qu'une grille qui met deux
     cents millisecondes à se mettre à jour.
     ------------------------------------------------------------------ */

  /*
   * LA FRAPPE EST DIFFÉRÉE, LE RESTE NON.
   *
   * Cocher un rayon est un geste unique : il part tout de suite. Taper
   * « veste » en fait cinq, et cinq requêtes dont quatre sont jetées.
   * Le même repos que le panneau de suggestions, pour que les deux
   * arrivent ensemble.
   */
  const [qDifferee, setQDifferee] = useState(amorce ?? "");
  useEffect(() => {
    const minuteur = setTimeout(() => setQDifferee(query), REPOS_FRAPPE);
    return () => clearTimeout(minuteur);
  }, [query]);

  /* Le rail de prix, même mécanique. Voir `REPOS_RAIL`. */
  const [prixDiffere, setPrixDiffere] = useState<[number, number]>(prix);
  useEffect(() => {
    const minuteur = setTimeout(() => setPrixDiffere(prix), REPOS_RAIL);
    return () => clearTimeout(minuteur);
  }, [prix]);

  /*
   * LES BORNES PEUVENT ARRIVER APRÈS COUP (voir le rattrapage du
   * catalogue). Le rail démarrait alors sur [0, 0], ce qui se lisait
   * « jusqu'à 0 € » et vidait la grille. On le pose sur toute l'étendue
   * au moment où elles arrivent, et PENDANT le rendu plutôt que dans un
   * effet : un effet laisserait passer un rendu avec le filtre à 0 €, et
   * la requête qui va avec.
   */
  const [bornesConnues, setBornesConnues] = useState(bornes);
  if (bornes !== bornesConnues) {
    setBornesConnues(bornes);
    if (bornes && !bornesConnues) {
      setPrix([bornes.min, bornes.max]);
      setPrixDiffere([bornes.min, bornes.max]);
    }
  }

  /* `prixActif` dit ce que la COLONNE affiche, celui-ci ce que la
     REQUÊTE demande. Les deux se rejoignent au repos ; entre les deux,
     la pastille est déjà posée et la grille n'a pas encore bougé. */
  const prixDemande =
    bornes !== null && (prixDiffere[0] > bornes.min || prixDiffere[1] < bornes.max);

  /*
   * CE QUI, EN CHANGEANT, REDEMANDE UNE PAGE.
   *
   * Une chaîne plutôt qu'un objet : deux tableaux de rayons identiques
   * ne sont pas le même objet, et un effet qui en dépend se relancerait
   * à chaque rendu. Les rayons sont triés avant d'être écrits, sinon
   * cocher « Hauts » puis « Bas » et l'inverse donneraient deux
   * signatures pour un même filtre, donc une requête pour rien.
   */
  const signature = JSON.stringify({
    q: qDifferee.trim(),
    rayons: [...rayons].sort(),
    tags: [...tags].sort(),
    taille,
    marque,
    prix: prixDemande ? prixDiffere : null,
    stock,
    promo,
    tri,
  });

  /*
   * LA GRAINE EST FIGÉE AU PREMIER RENDU, ET LA PROP N'Y TOUCHE PLUS.
   *
   * Aimer une pièce passe par `toggleLike`, qui revalide `/populaires` :
   * Next renvoie alors la page COURANTE rendue à neuf avec la réponse de
   * l'action. Pour la vitrine, ça veut dire une nouvelle graine tirée au
   * serveur, donc une nouvelle `adresse`, donc le premier lot redemandé
   * dans un autre ordre : la grille se rebattait sous le doigt à chaque
   * cœur, et l'on perdait tout ce qu'on avait chargé. La graine dure la
   * visite, c'est sa raison d'être ; un rafraîchissement du serveur n'en
   * fait pas une nouvelle visite.
   */
  const [graineDeLaVisite] = useState(graine);

  const adresse = useCallback(
    (depuis: number) => {
      const p = new URLSearchParams();
      p.set("graine", graineDeLaVisite);
      p.set("depuis", String(depuis));
      p.set("combien", String(LOT));
      if (qDifferee.trim()) p.set("q", qDifferee.trim());
      for (const r of rayons) p.append("rayon", r);
      for (const t of tags) p.append("tag", t);
      if (taille) p.set("taille", taille);
      if (marque) p.set("marque", marque);
      /* Chaque borne seulement si elle retient quelque chose : la
         poignée haute au bout du rail veut dire « et plus ». */
      if (prixDemande && bornes) {
        if (prixDiffere[0] > bornes.min) p.set("prixMin", String(prixDiffere[0]));
        if (prixDiffere[1] < bornes.max) p.set("prixMax", String(prixDiffere[1]));
      }
      if (stock) p.set("stock", "1");
      if (promo) p.set("promo", "1");
      if (tri !== "hasard") p.set("tri", tri);
      return `/api/pieces?${p}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graineDeLaVisite, signature]
  );

  /*
   * LES BARRES DU RAIL DE PRIX : les filtres posés, SAUF le prix. Elles
   * montrent la forme de ce qu'on découpe ; se découper avec elle ne
   * dirait plus rien. Voir `/api/pieces/prix`.
   */
  const adresseDesPrix = useMemo(() => {
    if (!bornes) return null;
    const p = new URLSearchParams();
    if (qDifferee.trim()) p.set("q", qDifferee.trim());
    for (const r of rayons) p.append("rayon", r);
    for (const t of tags) p.append("tag", t);
    if (taille) p.set("taille", taille);
    if (marque) p.set("marque", marque);
    if (stock) p.set("stock", "1");
    if (promo) p.set("promo", "1");
    p.set("bas", String(bornes.min));
    p.set("pas", String(Math.round((bornes.max - bornes.min) / TRANCHES_PRIX)));
    p.set("tranches", String(TRANCHES_PRIX));
    return `/api/pieces/prix?${p}`;
  }, [bornes, qDifferee, rayons, tags, taille, marque, stock, promo]);

  const [lot, setLot] = useState<Product[]>(premierLot);
  const [total, setTotal] = useState(totalDuPremierLot);
  const [enCours, setEnCours] = useState(false);
  const [panne, setPanne] = useState(false);

  /*
   * LES CŒURS, DEMANDÉS POUR CE QUI VIENT D'ARRIVER ET RIEN D'AUTRE.
   *
   * On ne pouvait aimer une pièce que depuis la fiche de sa marque, qui
   * lit les coups de cœur au serveur avec la page. Ici les pièces
   * arrivent par lots, à la demande : chaque lot redemande donc les
   * siens à `/api/coeurs`, en une requête.
   *
   * Tant que la réponse n'est pas là, la pièce n'a PAS de bouton, plutôt
   * qu'un cœur vide à zéro : un bouton qui passerait de « 0 » à « 12 »,
   * ou de vide à plein, sous les yeux, se lirait comme un clic qui
   * n'a pas pris. Le cœur arrive une fraction de seconde après la photo.
   *
   * CE QUI SORT DE LA GRILLE EST OUBLIÉ. Le bouton garde son état pour
   * lui ; s'il revenait plus tard avec la réponse d'avant, une pièce
   * aimée entre-temps reviendrait vide. Une pièce qui repasse à
   * l'écran redemande donc son état, à jour.
   */
  type Coeur = { count: number; liked: boolean };
  const [coeurs, setCoeurs] = useState<Record<string, Coeur>>({});
  const demandes = useRef(new Set<string>());

  useEffect(() => {
    const presents = new Set(lot.map((p) => p.id));

    for (const id of demandes.current) {
      if (!presents.has(id)) demandes.current.delete(id);
    }
    setCoeurs((avant) => {
      const gardes = Object.keys(avant).filter((id) => presents.has(id));
      if (gardes.length === Object.keys(avant).length) return avant;
      return Object.fromEntries(gardes.map((id) => [id, avant[id]]));
    });

    const manquants = [...presents].filter((id) => !demandes.current.has(id));
    // Par paquets de quatre-vingt-seize, le plafond de la route.
    for (let i = 0; i < manquants.length; i += 96) {
      const paquet = manquants.slice(i, i + 96);
      paquet.forEach((id) => demandes.current.add(id));

      fetch(`/api/coeurs?ids=${paquet.join(",")}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((recus: Record<string, Coeur>) => setCoeurs((avant) => ({ ...avant, ...recus })))
        /* Sans réponse, pas de bouton : mieux vaut pas de cœur qu'un
           cœur qui ment. On les rend à la prochaine occasion. */
        .catch(() => paquet.forEach((id) => demandes.current.delete(id)));
    }
  }, [lot]);

  /*
   * LE PREMIER LOT VIENT DU SERVEUR, ON NE LE REDEMANDE PAS.
   *
   * La page a déjà rendu ses vingt-quatre premières pièces avec ces
   * filtres-là — c'est ce qui fait qu'elle est à l'écran au premier
   * coup d'œil et qu'un robot la lit. Sans ce garde, l'effet partirait
   * au montage et referait aussitôt la requête que le serveur vient de
   * faire, pour un résultat identique.
   */
  const premierRendu = useRef(true);
  /* Sauf quand ce premier lot est celui du secours : là, il faut
     justement le redemander. Lu une fois, au montage. */
  const secoursAuMontage = useRef(secours);

  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      if (!secoursAuMontage.current) return;
    }

    const halte = new AbortController();
    setEnCours(true);

    chercherAvecReprises<{ pieces: Product[]; total: number }>(adresse(0), halte.signal)
      .then((page) => {
        setLot(page.pieces);
        setTotal(page.total);
        setPanne(false);
      })
      .catch((e) => {
        /* Une requête annulée n'est pas une panne : c'est la lettre
           suivante qui est arrivée, et sa réponse va remplacer
           celle-ci. L'annoncer ferait clignoter un message d'erreur à
           chaque frappe. */
        if ((e as Error)?.name === "AbortError") return;
        setPanne(true);
      })
      .finally(() => {
        if (!halte.signal.aborted) setEnCours(false);
      });

    return () => halte.abort();
  }, [adresse]);

  /*
   * « CHARGER 24 DE PLUS » AJOUTE, IL NE REMPLACE PAS.
   *
   * `depuis` se compte sur ce qu'on a déjà, pas sur un numéro de page :
   * c'est ce qui rend l'appel juste même si un lot précédent est
   * revenu court. Et l'ordre ne bouge pas entre deux appels puisque la
   * graine ne bouge pas — c'est précisément à quoi elle sert.
   */
  /*
   * LE LOT SUIVANT EST PRÊT AVANT QU'ON LE DEMANDE.
   *
   * Cliquer sur « Charger 24 de plus » lançait la requête, puis, une
   * fois les tuiles posées, le chargement de leurs photos : on
   * regardait un bouton grisé, puis vingt-quatre cadres vides se
   * remplir. Or on sait très bien ce qui va être demandé, et quand :
   * la tranche suivante, dès que le pied de la grille approche.
   *
   * Quand il arrive à un écran et demi (voir `pied`, plus bas), on va
   * donc chercher cette tranche en silence et l'on demande déjà ses
   * premières photos. Au clic, les pièces sont là et leurs images
   * aussi : la suite se pose d'un coup.
   *
   * La promesse est gardée avec SON adresse. Un filtre qui change entre
   * temps change l'adresse, et la tranche préparée pour l'ancienne
   * liste est simplement ignorée.
   */
  type Page = { pieces: Product[]; total: number };
  const avance = useRef<{ url: string; page: Promise<Page> } | null>(null);

  const preparerLaSuite = useCallback(() => {
    if (enCours) return;
    const url = adresse(lot.length);
    if (avance.current?.url === url) return;

    /* Sans reprise : c'est une avance, pas une demande. Si elle échoue,
       le clic refera la requête normalement, avec ses reprises. */
    const page = chercherAvecReprises<Page>(url, undefined, []);
    avance.current = { url, page };
    page
      .then((recue) => {
        if (avance.current?.url !== url) return;
        /* Les douze premières : ce qu'on verra en arrivant sur la suite.
           Les autres sont prises en charge par l'avance au défilement
           (voir `lib/image-progressive`). */
        for (const p of recue.pieces.slice(0, 12)) {
          prechaufferVignette(
            premiereImage(p.images) ?? (estUneVideo(p.image_url) ? null : p.image_url)
          );
        }
      })
      .catch(() => {
        if (avance.current?.url === url) avance.current = null;
      });
  }, [adresse, enCours, lot.length]);

  const charger = useCallback(() => {
    if (enCours) return;
    setEnCours(true);

    const url = adresse(lot.length);
    const prete = avance.current?.url === url ? avance.current.page : null;
    avance.current = null;

    (prete
      ? prete.catch(() => chercherAvecReprises<Page>(url))
      : chercherAvecReprises<Page>(url)
    )
      .then((page) => {
        setLot((deja) => {
          /* Ceinture et bretelles : si deux clics passaient malgré le
             garde, une pièce reçue deux fois ferait une clé React en
             double et un trou dans la grille. */
          const vus = new Set(deja.map((p) => p.id));
          return [...deja, ...page.pieces.filter((p) => !vus.has(p.id))];
        });
        setTotal(page.total);
        setPanne(false);
      })
      .catch(() => setPanne(true))
      .finally(() => setEnCours(false));
  }, [adresse, enCours, lot.length]);

  /*
   * LES DEUX CASES D'ÉTAT DISENT LE CATALOGUE.
   *
   * Une case qui ne retire rien ne s'affiche pas : sur un catalogue où
   * tout est en stock, « En stock » occupe une ligne, ne change aucun
   * résultat, et laisse pourtant croire qu'on vient de filtrer quelque
   * chose. Elle se mesurait sur les pièces chargées ; depuis qu'il n'y
   * en a que vingt-quatre, il n'y a plus rien à mesurer — elle
   * disparaîtrait dès que les vingt-quatre premières sont toutes
   * disponibles. Elle vient donc de la base (voir `vitrine_bornes`).
   *
   * Elle reste affichée tant qu'elle est cochée, sinon on l'aurait
   * cochée puis vue disparaître avec la liste restreinte, sans plus
   * aucun moyen de revenir en arrière.
   */
  const etatsUtiles = useMemo(
    () => ({
      stock: etatsDuCatalogue?.ruptures ?? false,
      promo: etatsDuCatalogue?.promos ?? false,
    }),
    [etatsDuCatalogue]
  );

  /* Les rayons et les marques du site entier. Ils ne se restreignent
     pas à mesure qu'on filtre, et c'est le parti pris de cette colonne :
     elle annonce le catalogue, pas ce qui reste. Le prix en est que
     « Bas 5 857 » reste 5 857 même après « moins de 30 € » ; le gain est
     que ces nombres tombent sur ceux de l'en-tête. */
  /* `?? []` dans le corps donnerait un tableau neuf à chaque rendu, donc
     un `useMemo` qui se recalcule pour rien un peu plus bas. */
  const rayonsDisponibles = useMemo(() => rayonsDuCatalogue ?? [], [rayonsDuCatalogue]);

  /*
   * LES TYPES, RANGÉS SOUS LEUR RAYON.
   *
   * Ils avaient leur propre section, sous les rayons : une douzaine de
   * lignes de plus, et jusqu'à soixante une fois un rayon coché. La
   * colonne dépassait l'écran, il fallait la faire défiler pour
   * atteindre le prix ou la marque.
   *
   * Chaque rayon porte maintenant ses types dans le menu qui se déroule
   * sous lui, du plus fourni au moins fourni, tous : le plus long en
   * compte une quinzaine, ce qui tient sans défiler.
   *
   * Un même tag peut venir de deux rayons (un ensemble rangé tantôt
   * dans les hauts, tantôt nulle part) : il est listé sous chacun.
   */
  const typesParRayon = useMemo(() => {
    const parRayon = new Map<string, { tag: string; total: number }[]>();
    for (const l of tagsDuCatalogue ?? []) {
      const r = l.rayon ?? "Autres";
      const liste = parRayon.get(r) ?? [];
      liste.push({ tag: l.tag, total: l.total });
      parRayon.set(r, liste);
    }
    for (const liste of parRayon.values()) {
      liste.sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag, "fr"));
    }
    return parRayon;
  }, [tagsDuCatalogue]);

  const typesDuRayon = rayon ? (typesParRayon.get(rayon) ?? []) : [];

  /*
   * LES TAILLES QU'ON PROPOSE : celles qui ont des pièces en stock dans
   * le rayon posé, ou dans tout le catalogue quand aucun ne l'est. Aucune
   * pour un rayon qui ne s'habille pas. Voir `compter_les_tailles`,
   * migration 35 : sans elle, la section ne s'affiche simplement pas.
   */
  const taillesDisponibles = useMemo(() => {
    if (!taillesDuCatalogue || (rayon && !RAYONS_HABILLES.includes(rayon))) return [];
    const compte = new Map<string, number>();
    for (const l of taillesDuCatalogue) {
      if (rayon && (l.rayon ?? "Autres") !== rayon) continue;
      compte.set(l.taille, (compte.get(l.taille) ?? 0) + l.total);
    }
    return ORDRE_DES_TAILLES.filter((t) => (compte.get(t) ?? 0) > 0).map((t) => ({
      taille: t,
      total: compte.get(t) ?? 0,
    }));
  }, [taillesDuCatalogue, rayon]);

  /* Passer à « Bijoux » retire la taille : elle n'y aurait pas de sens,
     et la grille resterait vide sans qu'on voie pourquoi. */
  useEffect(() => {
    if (taille && !taillesDisponibles.some((t) => t.taille === taille)) setTaille(null);
  }, [taille, taillesDisponibles]);

  const marquesDisponibles = useMemo(
    () => (marquesDuCatalogue ?? []).slice().sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [marquesDuCatalogue]
  );


  /*
   * FILTRER REMONTE AUX PREMIÈRES PIÈCES, ET ÇA SE VOIT MONTER.
   *
   * Deux problèmes en un. Le premier : filtrer raccourcit la liste, donc
   * la page ; quand on filtrait depuis le milieu de la grille — presque
   * toujours, puisque l'envie d'affiner arrive en fouillant — la page
   * raccourcie ne pouvait plus tenir la position où l'on était, et le
   * navigateur rabattait l'ascenseur sur ce qu'il en restait, d'un coup
   * sec, souvent jusqu'à l'en-tête. On cliquait « Chaussures » et on
   * atterrissait n'importe où, sans avoir vu une chaussure.
   *
   * Le second : là où l'on veut atterrir n'est pas « n'importe où »,
   * c'est la PREMIÈRE RANGÉE de la nouvelle liste. Et il faut le voir,
   * sinon on ne sait pas si la page a filtré ou si elle a sauté.
   *
   * D'où la mécanique ci-dessous, dans l'ordre :
   *
   * 1. ON RÉSERVE LA HAUTEUR QUI VIENT DE DISPARAÎTRE. Sans elle, le
   *    navigateur rabat l'ascenseur avant que l'animation commence, et
   *    l'on verrait le saut PUIS la remontée. La grille garde donc une
   *    hauteur minimale le temps du voyage.
   * 2. ON REMET L'ASCENSEUR OÙ IL ÉTAIT s'il avait déjà été rabattu.
   *    Nous sommes encore avant la peinture (voir `useEffetDePose`) :
   *    personne ne voit ce va-et-vient.
   * 3. ON REMONTE EN DOUCEUR jusqu'aux premières pièces.
   * 4. LA HAUTEUR RÉSERVÉE EST RENDUE À L'ARRIVÉE, quand on est en haut
   *    et que le vide du bas n'est plus dans l'écran.
   *
   * `behavior` est écrit explicitement à chaque fois : la feuille de
   * style pose `scroll-behavior: smooth` sur toute la page, si bien
   * qu'un déplacement qu'on veut instantané serait animé lui aussi — et
   * c'est justement le cas du replacement de l'étape 2.
   */
  const zone = useRef<HTMLDivElement>(null);
  const collant = useRef<HTMLDivElement>(null);
  const calme = useRef(0);
  const avant = useRef(0);
  const liberer = useRef<(() => void) | null>(null);

  useEffect(() => {
    const suivre = () => {
      avant.current = window.scrollY;
    };
    suivre();
    window.addEventListener("scroll", suivre, { passive: true });
    return () => window.removeEventListener("scroll", suivre);
  }, []);

  /* Une réservation qui traînerait après le démontage laisserait une
     hauteur morte dans une page qui n'existe plus. */
  useEffect(() => () => liberer.current?.(), []);

  const recaler = useCallback(() => {
    const bloc = zone.current;
    if (!bloc) return;

    /* Une remontée déjà en cours rend d'abord sa réservation : on
       repart d'une grille à sa vraie hauteur. */
    liberer.current?.();

    const depart = avant.current;
    /* Sur ordinateur, la barre de filtres colle sous l'en-tête : la
       première rangée doit tomber sous elle, pas derrière son voile. Au
       téléphone, elle reste dans la page et ne cache rien. */
    const barre = window.matchMedia("(min-width: 640px)").matches
      ? (collant.current?.offsetHeight ?? 0)
      : 0;
    const haut = Math.max(0, bloc.getBoundingClientRect().top + window.scrollY - ENTETE - barre);

    /* Déjà au-dessus des résultats : rien à remonter. Cliquer un filtre
       ne doit pas déplacer une page qu'on regarde par le haut. */
    if (depart <= haut + 4) return;

    // 1. la hauteur qu'il manque pour que le départ tienne encore.
    const manque = depart + window.innerHeight - document.documentElement.scrollHeight;
    if (manque > 0) bloc.style.minHeight = `${bloc.offsetHeight + manque}px`;

    // 2. le replacement, instantané et invisible.
    if (Math.abs(window.scrollY - depart) > 1) {
      window.scrollTo({ top: depart, behavior: "instant" as ScrollBehavior });
    }

    // 3. la remontée. Ce défilement-là n'est pas celui de la main : il
    //    ne doit pas refermer le volet de filtre qu'on est en train
    //    d'utiliser.
    calme.current = Date.now() + 1600;
    const brusque = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: haut, behavior: brusque ? "auto" : "smooth" });
    avant.current = haut;

    // 4. la restitution : à la fin du défilement, ou au bout d'une
    //    seconde et demie si le navigateur ne sait pas le dire.
    const fin = () => {
      window.removeEventListener("scrollend", fin);
      window.clearTimeout(minuteur);
      bloc.style.minHeight = "";
      liberer.current = null;
    };
    const minuteur = window.setTimeout(fin, 1500);
    window.addEventListener("scrollend", fin, { once: true });
    liberer.current = fin;
  }, []);

  useEffetDePose(() => {
    recaler();
  }, [signature, recaler]);

  /* Ce qu'on a sous la main, et ce que la base dit qu'il reste. `reste`
     ne se déduit plus d'une liste complète tenue en mémoire : il est la
     différence entre le total que la base a compté et ce qu'on a déjà
     demandé. */
  const visibles = lot;
  const reste = Math.max(total - visibles.length, 0);

  /*
   * Le pied de la grille, guetté à un écran et demi : c'est lui qui
   * déclenche la préparation du lot suivant (voir `preparerLaSuite`).
   * Rien pour qui a demandé d'économiser ses données : on ne charge pas
   * en avance ce qui ne sera peut-être jamais regardé.
   */
  const pied = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pied.current;
    if (!el || reste <= 0 || typeof IntersectionObserver === "undefined") return;

    const lien = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (lien?.saveData) return;

    const veille = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) preparerLaSuite();
      },
      { rootMargin: "0px 0px 150% 0px" }
    );
    veille.observe(el);
    return () => veille.disconnect();
  }, [preparerLaSuite, reste]);

  /*
   * LE PIED N'A PLUS QU'UN NOMBRE, ET C'EST LE BON.
   *
   * Il en a porté deux pendant le temps d'une correction : « 24 sur
   * 1 230 en vitrine · 26 507 au catalogue », parce que la grille ne
   * connaissait qu'un échantillon et qu'il fallait bien dire la taille
   * réelle du site à côté. Depuis que la base filtre et compte, `total`
   * EST le compte du catalogue — ou, si un filtre est posé, le compte
   * exact de ce que ce filtre retient dans le catalogue entier. Le
   * second nombre serait le même, écrit deux fois.
   */

  const nomDeLaMarque = marquesDisponibles.find((m) => m.slug === marque)?.nom ?? null;

  /* ------------------------------------------------------------------
     Le panneau de suggestions

     CE QU'IL AJOUTE, ET CE QU'IL NE REMPLACE PAS. La grille derrière
     continue de se filtrer à la frappe : c'est elle qui répond « voilà
     les pièces de la vitrine qui portent ce mot ». Le panneau dit les
     trois choses qu'elle ne peut pas dire — quels RAYONS ce mot désigne
     et qu'on peut poser d'une touche, quelles MARQUES le portent, et
     combien de PIÈCES le catalogue entier en compte, vingt-six mille
     contre les mille deux cents descendues avec la page.
     ------------------------------------------------------------------ */

  /*
   * Ce que la frappe propose de poser.
   *
   * Les rayons viennent de la même liste que la colonne de filtres, donc
   * avec les comptes du CATALOGUE quand la base les a donnés : « Bas,
   * 5 857 pièces » et non « Bas, 38 ». Un rayon déjà coché n'est pas
   * reproposé, il n'y aurait rien à poser.
   *
   * Les deux états ne rejoignent la liste que s'ils servent à quelque
   * chose — même règle que leurs cases dans la colonne — et à partir de
   * deux lettres, sinon « s » les ferait apparaître à chaque mot.
   */
  const criteresProposes = useMemo(() => {
    const q = sansAccent(query.trim());
    if (q.length === 0) return [];

    const proposes: Critere[] = rayonsDisponibles
      .filter((r) => r.rayon !== rayon && sansAccent(r.rayon).includes(q))
      .map((r) => ({
        famille: "Rayon",
        valeur: r.rayon,
        cle: `rayon:${sansAccent(r.rayon)}`,
        compte: r.total,
      }));

    /* Les types du site entier, pas seulement ceux du rayon coché : on
       tape « hoodie » pour les trouver, pas pour découvrir qu'il fallait
       d'abord cocher « Hauts ». */
    const parTag = new Map<string, number>();
    for (const l of tagsDuCatalogue ?? []) parTag.set(l.tag, (parTag.get(l.tag) ?? 0) + l.total);
    for (const [tag, total] of parTag) {
      if (tags.includes(tag) || !sansAccent(tag).includes(q)) continue;
      proposes.push({ famille: "Type", valeur: tag, cle: `type:${sansAccent(tag)}`, compte: total });
    }

    if (q.length >= 2) {
      if (etatsUtiles.stock && !stock && "en stock".includes(q))
        proposes.push({ famille: "État", valeur: "En stock", cle: "etat:stock" });
      if (etatsUtiles.promo && !promo && "en promo".includes(q))
        proposes.push({ famille: "État", valeur: "En promo", cle: "etat:promo" });
    }

    /* Six au plus : au-delà, la liste pousse les marques et les pièces
       hors du panneau, qui sont l'autre moitié de la réponse. */
    return proposes.slice(0, 6);
  }, [rayonsDisponibles, rayon, tagsDuCatalogue, tags, etatsUtiles, stock, promo, query]);

  /*
   * Poser un critère COCHE UN FILTRE, il ne navigue pas. C'est toute la
   * différence avec la ligne d'à côté, qui ouvre une fiche de marque, et
   * c'est le badge de couleur qui l'annonce avant le clic.
   *
   * LE TEXTE RESTE DANS LE CHAMP, contrairement à l'annuaire où le jeton
   * reprend le mot à son compte. Ici les deux ne disent pas la même
   * chose : « denim » cherche dans les noms, « Bas » range dans un
   * rayon, et l'on veut souvent les deux — les jeans en denim.
   */
  function poser(c: Critere) {
    if (c.cle.startsWith("rayon:")) {
      // Poser un rayon ne le retire jamais, même s'il est déjà posé.
      if (rayon !== c.valeur) basculer(c.valeur);
    } else if (c.cle.startsWith("type:")) {
      /* Le type s'ouvre DANS son rayon : on pose le rayon s'il ne l'est
         pas (les types d'un autre rayon partent avec lui), puis on
         coche le type. Le menu déroulé montre ainsi où il est rangé. */
      const sien = rayonDuType(c.valeur);
      if (sien && sien !== rayon) {
        setRayon(sien);
        setTags([c.valeur]);
      } else {
        setTags((liste) => (liste.includes(c.valeur) ? liste : [...liste, c.valeur]));
      }
    }
    else if (c.cle === "etat:stock") setStock(true);
    else if (c.cle === "etat:promo") setPromo(true);

    setPanneau(false);
    setFeuille(false);
    if (!petit) champ.current?.focus();
  }

  const { suggestions, surligne, setSurligne, garni, auClavier } = useRecherche(
    query,
    criteresProposes
  );

  /*
   * LA LIGNE N'A PLUS DEUX NOMBRES, ET C'EST UN PROGRÈS.
   *
   * Elle en portait deux : « 38 pièces pour "denim" » d'un côté, « le
   * catalogue en compte 312 » de l'autre, parce que la grille ne
   * cherchait que dans l'échantillon descendu avec la page. Depuis que
   * la recherche va dans la base, `total` EST le compte du catalogue :
   * les deux nombres seraient le même, écrit deux fois.
   *
   * Le compte de marques est parti avec, pour la raison inverse : on ne
   * peut plus le déduire des pièces sous la main, il n'y en a que
   * vingt-quatre. Le panneau de suggestions le dit déjà, et lui
   * l'interroge.
   */

  /*
   * LE TRAIT EST UN ORNEMENT, PAS UNE JAUGE. Sa portion colorée dit
   * seulement que la requête se remplit ; plafonnée à soixante pour
   * cent, elle ne promet aucune fin — on peut toujours poser un filtre
   * de plus. Même formule que l'annuaire, aux filtres près.
   */
  const remplissage = Math.min(60, actifs * 13 + Math.min(query.length, 18) * 1.1);

  function toucheDansLeChamp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setPanneau(false);
      champ.current?.blur();
      return;
    }
    if (!panneau) return;
    auClavier(
      e,
      (slug, mot) => {
        noterRecherche(mot);
        router.push(`/marques/${slug}`);
      },
      poser
    );
  }

  /*
   * OUVRIR LA FEUILLE AVANT QUE LE CHAMP PRENNE LE CURSEUR.
   *
   * `preventDefault` sur le `pointerdown` empêche le focus, donc le
   * clavier de monter derrière la page : sans lui, on verrait le clavier
   * surgir sur la vitrine, puis la feuille arriver par-dessus, et le
   * clavier redescendre et remonter. Trois mouvements pour un geste.
   *
   * Le `focus` reste couvert à part, pour la tabulation : on peut
   * atteindre le champ au clavier sans jamais poser un doigt dessus.
   */
  function ouvrirAuDoigt(e: React.PointerEvent | React.FocusEvent): boolean {
    if (!petit) return false;
    if (e.type === "pointerdown") e.preventDefault();
    else champ.current?.blur();
    setFeuille(true);
    return true;
  }

  /* LA LIGNE « 1 220 PIÈCES DANS LA VITRINE · TOUTES MARQUES » A ÉTÉ
     RETIRÉE. Elle répétait en capitales ce que la colonne de filtres
     montre déjà — ce qui est coché s'y voit — et venait s'ajouter au
     compte de l'en-tête deux centimètres plus haut : trois lignes de
     petites capitales empilées, la page en paraissait chargée avant
     même la première photo. Le compte reste dit là où il sert, au pied
     de la grille : « 24 sur 312 affichées ». */

  /*
   * CE QUE LA BARRE DE FILTRES REÇOIT. Elle ne tient aucun filtre : elle
   * dessine ceux-ci et renvoie les gestes. La requête, l'adresse et le
   * recalage de la page restent ici.
   */
  const etat: EtatFiltres = {
    total,
    enCours,
    chargement: !catalogueManquant ? "pret" : filtresEnPanne ? "panne" : "attente",
    reessayer: () => setEssaiFiltres((n) => n + 1),
    rayons: rayonsDisponibles.length > 0 ? rayonsDisponibles : RAYONS_EN_ATTENDANT,
    rayon,
    choisirRayon: (r) => {
      if (r === null) {
        setRayon(null);
        setTags([]);
      } else basculer(r);
    },
    types: typesDuRayon,
    tags,
    basculerTag,
    tailles: taillesDisponibles,
    taille,
    choisirTaille: setTaille,
    bornes,
    prix,
    choisirPrix: setPrix,
    prixActif,
    adresseDesPrix,
    euros,
    marques: marquesDisponibles,
    marque,
    nomDeLaMarque,
    choisirMarque: setMarque,
    etats: etatsUtiles,
    stock,
    setStock,
    promo,
    setPromo,
    tri,
    setTri,
    actifs,
    reinitialiser,
    densite: <SelecteurDensite densite={densite} choisir={choisirDensite} offertes={offertes} />,
  };

  return (
    <>
      {/* ---------------- la requête ----------------

          PLUS DE CAISSON, ET C'EST LE CŒUR DU CHANTIER.

          Le champ vivait seul au milieu d'une plaque de verre pleine
          largeur, avec un « ⌘ K » pour toute compagnie : beaucoup de
          surface pour un objet. Il devient la ligne de requête de
          l'annuaire — une loupe, du texte à la taille d'un titre, un
          trait de deux pixels qui se colore à mesure qu'on écrit. Deux
          pages de listing, un seul geste.

          ET SURTOUT IL NE MENT PLUS SUR CE QU'IL CHERCHE. Il filtrait
          la vitrine en silence : taper « denim » donnait trente-huit
          pièces, et l'on en concluait que le site en avait
          trente-huit. Le panneau dessous dit le catalogue entier, et la
          ligne entre les deux dit lequel des deux nombres on regarde.

          Au doigt, la ligne typographique ne survit pas à 402 px : le
          champ reprend la forme d'un champ, et le panneau devient la
          feuille plein écran. Voir `petit`. */}
      <div ref={bloc} className="relative z-20 mb-4">
        {petit ? (
          /* Un champ, et le toucher ouvre la feuille : le panneau
             « sous le champ » n'aurait que deux lignes utiles une fois
             le clavier monté. */
          /* LA MÊME LIGNE QUE SUR ORDINATEUR : une loupe, le texte en
             grand, un trait dessous. Le champ en pastille faisait de la
             page du téléphone une autre page ; seul le geste change, le
             toucher ouvre la feuille de recherche. */
          <>
            <div className="flex items-start gap-3">
            <IconLoupe className="mt-[13px] h-[18px] w-[18px] shrink-0 text-white/85" />
            <input
              ref={champ}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPointerDown={ouvrirAuDoigt}
              onFocus={ouvrirAuDoigt}
              placeholder="Chercher une pièce…"
              aria-label="Chercher une pièce, une marque"
              /* Le clavier du téléphone : une touche « Rechercher », et ni
                 majuscule forcée ni correction sur un nom de marque. */
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className="requete-champ"
            />
            </div>
            <div
              className="requete-trait mt-1"
              style={{ "--remplissage": `${remplissage}%` } as React.CSSProperties}
            />
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <IconLoupe className="mt-[7px] h-[19px] w-[19px] shrink-0 text-white/85" />

              <input
                ref={champ}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPanneau(true);
                }}
                onFocus={() => setPanneau(true)}
                onKeyDown={toucheDansLeChamp}
                placeholder="Chercher une pièce, une marque…"
                aria-label="Chercher une pièce, une marque"
                /* Le clavier du téléphone : une touche « Rechercher », et ni
                   majuscule forcée ni correction sur un nom de marque. */
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className="requete-champ"
              />

              {/* Le raccourci s'efface dès qu'on tape : il rappelle un
                  geste, il n'a plus rien à dire une fois le curseur
                  dedans. Il ne revient pas dans le panneau. */}
              {!query && (
                <span className="requete-touche mt-[7px] hidden shrink-0 sm:block"><Raccourci /></span>
              )}
            </div>

            <div
              className="requete-trait mt-2.5"
              style={{ "--remplissage": `${remplissage}%` } as React.CSSProperties}
            />
          </>
        )}

        {/* ---------------- la ligne qui compte ----------------

            À GAUCHE CE QU'ON VOIT, À DROITE CE QUI EXISTE. La vitrine
            ne porte que dix pièces par marque ; le catalogue en compte
            vingt fois plus. La page s'en excusait jusqu'ici dans son
            état vide, c'est-à-dire trop tard et seulement quand elle ne
            trouvait rien. Elle le dit maintenant dès la première
            frappe, et elle le dit avec des nombres plutôt qu'avec une
            phrase.

            Le nombre de droite ne s'affiche que s'il dépasse celui de
            gauche : autrement il ne dirait rien de plus, et deux
            nombres qui se ressemblent laissent croire à une erreur. */}
        {query.trim() !== "" && (
          <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="m-0 min-w-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
              {enChiffres(total)} pièce{total > 1 ? "s" : ""} pour «&nbsp;
              {query.trim()}&nbsp;» au catalogue
            </p>

            {/* LA SORTIE VERS LES MARQUES RESTE, mais elle ne
                s'excuse plus d'un compte trop petit : elle propose
                l'autre entrée, pour qui cherche une maison plutôt
                qu'une pièce. */}
            {total > 0 && (
              <p className="m-0 shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                <Link
                  href={`/marques?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => noterRecherche(query.trim())}
                  className="text-white/75 underline underline-offset-2 transition hover:text-white"
                >
                  voir les marques qui en ont
                </Link>
              </p>
            )}
          </div>
        )}

        {/* ---------------- le panneau ----------------

            IL FLOTTE AU-DESSUS DE LA GRILLE, contrairement à celui de
            l'annuaire qui pousse le contenu vers le bas. Deux écrans,
            deux raisons : l'annuaire déplie ses suggestions au-dessus
            d'une liste de lignes, qu'on retrouve en refermant ; ici il
            faudrait pousser une grille de photos de trois cents pixels
            de haut, et la page entière sauterait à chaque frappe.

            SON FOND EST OPAQUE, et ce n'est pas une préférence. Une
            liste de résultats posée en verre sur une grille de pièces
            qui transparaît ne se lit tout simplement pas.

            Il ne porte PAS de champ : celui de la page est juste
            au-dessus, et un second serait annoncé comme une deuxième
            recherche par un lecteur d'écran. */}
        {!petit && panneau && garni && suggestions && (
          <div className="absolute left-0 right-0 top-full z-30 mt-3 max-h-[min(62vh,430px)] overflow-y-auto overscroll-contain rounded-[16px] border border-white/20 bg-[var(--surface-sombre)] p-3.5 shadow-[0_30px_70px_rgba(8,2,20,0.6)]">
            <Suggestions
              intertitres
              suggestions={suggestions}
              query={query}
              surligne={surligne}
              onSurligne={setSurligne}
              onOuvrir={noterRecherche}
              criteres={criteresProposes}
              onPoser={poser}
              uniteCompte="pièces"
            />

            {/* La même sortie qu'au-dessus, à portée de la main quand on
                est descendu dans le panneau. */}
            {query.trim().length >= MINIMUM && (
              <div className="mt-3 flex justify-end border-t border-white/12 pt-2.5">
                <Link
                  href={`/marques?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => noterRecherche(query.trim())}
                  className="text-[11.5px] font-bold text-[rgb(var(--accent-1))] underline underline-offset-4 transition hover:text-white"
                >
                  Voir les marques qui en ont
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- les filtres, puis la grille ----------------

          La grille vit DANS la section des filtres : la barre collante
          ne colle que dans son parent, et s'arrêterait sinon au bout des
          filtres, avant la première pièce. */}
      <FiltresPieces f={etat} collant={collant} calme={calme}>
        {/* ---------------- la grille ---------------- */}
        <div ref={zone} className="mt-6 min-w-0 pb-24 sm:mt-8 sm:pb-0">
          {total === 0 && !enCours ? (
            <div className="glass p-8 text-center">
              {/*
               * DEUX RAISONS DE NE RIEN TROUVER, ET ELLES NE SE
               * RÉPARENT PAS PAREIL.
               *
               * « Moins de filtres » est le bon conseil quand on en a
               * empilé quatre. Il ne l'est plus depuis que les rayons
               * annoncent le CATALOGUE : « Robes 9 » peut très bien
               * n'avoir aucune robe dans la vitrine, qui ne prend que
               * dix pièces par marque. Le filtre a alors parfaitement
               * fonctionné, il n'y a simplement rien à montrer ici — et
               * dire « essaie avec moins de filtres » enverrait chercher
               * une erreur qui n'existe pas.
               */}
              <p className="m-0 text-[15px] leading-relaxed text-white/90">
                {marquesDuCatalogue && marque ? (
                  /* LA MARQUE, D'ABORD : c'est le filtre le plus précis
                     des deux, et celui dont la sortie est la plus utile
                     — sa page porte son catalogue entier. Depuis que le
                     menu liste les marques du SITE, en choisir une dont
                     aucune pièce n'est dans la vitrine est un cas
                     ordinaire, pas une erreur de manipulation. */
                  <>
                    {marquesDisponibles.find((m) => m.slug === marque)?.total
                      ? "Les pièces de cette marque ne sont pas dans la vitrine : elle en montre dix par marque, et seulement celles qui ont une photo."
                      : "Cette marque n'a pas encore de pièces au catalogue."}{" "}
                    <Link
                      href={`/marques/${marque}`}
                      className="font-bold text-white underline underline-offset-2"
                    >
                      Va voir sa page
                    </Link>
                    .
                  </>
                ) : rayonsDuCatalogue && rayons.length > 0 ? (
                  <>
                    Ce rayon existe au catalogue, mais aucune de ses pièces n&apos;est dans
                    la vitrine : elle en montre dix par marque.{" "}
                    <Link
                      href="/marques"
                      className="font-bold text-white underline underline-offset-2"
                    >
                      Va les voir chez les marques
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Rien ne correspond. Essaie avec moins de filtres, ou{" "}
                    <Link
                      href="/marques"
                      className="font-bold text-white underline underline-offset-2"
                    >
                      parcours les marques
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          ) : (
            <>
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
                      likes={coeurs[p.id]}
                      nue
                      ratio={densite === "serre" ? "1/1" : RATIOS[i % 3]}
                      // Les huit premières sont dans le premier écran,
                      // sur ordinateur comme sur téléphone.
                      prioritaire={i < 8}
                      // Le nom de la marque sous la pièce : ici, c'est la
                      // moitié de l'information. Sur la fiche d'une marque
                      // il serait répété quarante fois pour rien.
                      showBrand
                    />
                  </div>
                ))}
              </Grille>

              {/* Le pied reprend la pilule de la ligne de filtres de
                  l'annuaire : c'est le même objet, à l'autre bout de la
                  page.

                  LE NOMBRE DE DROITE EST CELUI DU CATALOGUE, et non plus
                  celui de l'échantillon descendu avec la page. C'est
                  toute la différence : « 24 sur 1 230 » disait la taille
                  d'un extrait sur une page intitulée « Les pièces », et
                  le site paraissait vingt fois plus petit qu'il n'est.
                  Un filtre posé, il devient le compte exact de ce que ce
                  filtre retient DANS LE CATALOGUE ENTIER. */}
              {reste > 0 ? (
                <div
                  ref={pied}
                  className="barre barre-pied mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 p-3 sm:px-5"
                >
                  <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                    {enChiffres(visibles.length)} sur {enChiffres(total)} affichées
                  </p>

                  <button
                    type="button"
                    onClick={charger}
                    /* Deux clics pendant qu'une page voyage
                       demanderaient deux fois la même tranche. */
                    disabled={enCours}
                    className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[13px] font-extrabold text-[var(--color-ink)] transition hover:opacity-90 active:scale-[.97] disabled:opacity-60"
                  >
                    {enCours
                      ? "Chargement…"
                      : `Charger ${Math.min(reste, LOT)} pièce${
                          Math.min(reste, LOT) > 1 ? "s" : ""
                        } de plus`}
                  </button>

                  {/* LA PANNE SE DIT LÀ OÙ ELLE SE PRODUIT. Le réseau
                      peut refuser une tranche : sans rien, le bouton
                      semblerait simplement ne pas marcher. */}
                  <p
                    className={`m-0 hidden text-[11.5px] font-semibold lg:block ${
                      panne ? "text-[rgb(var(--accent-1))]" : "text-white/50"
                    }`}
                  >
                    {panne
                      ? "la suite n'a pas répondu, reclique pour réessayer"
                      : <>ou tape <Raccourci colle /> pour chercher directement</>}
                  </p>
                </div>
              ) : (
                total > LOT && (
                  /* AU BOUT DE LA LISTE, LA PAGE NE DISAIT PLUS RIEN.
                     Le pied disparaissait avec son bouton : on tombait
                     sur du vide après la dernière rangée, sans savoir si
                     on avait tout vu ou si le chargement s'était arrêté
                     tout seul. */
                  <div className="barre barre-pied mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 p-3 sm:px-5">
                    <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                      {enChiffres(total)} pièce{total > 1 ? "s" : ""} · tu as tout vu
                    </p>

                    <Link
                      href="/marques"
                      className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[13px] font-extrabold text-[var(--color-ink)] transition hover:opacity-90 active:scale-[.97]"
                    >
                      Parcourir les marques
                    </Link>

                    <p className="m-0 hidden text-[11.5px] font-semibold text-white/50 lg:block">
                      ou tape <Raccourci colle /> pour chercher directement
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </FiltresPieces>

      {/* ---------------- au doigt : la recherche prend l'écran ----------------

          C'est la feuille de l'annuaire, réemployée telle quelle. Le
          clavier virtuel mange la moitié basse de l'écran : un panneau
          « sous le champ » n'aurait que deux lignes utiles, exactement
          là où il faut de la place. Les rayons y passent en premier,
          parce qu'au doigt poser un filtre en un geste vaut mieux que
          taper dix lettres.

          Elle se referme d'elle-même au-dessus de 640 px — une fenêtre
          qu'on agrandit, une tablette qu'on tourne — et le panneau
          reprend la main sous le champ. */}
      <FeuilleRecherche
        ouverte={petit && feuille}
        query={query}
        onQuery={setQuery}
        onFermer={() => setFeuille(false)}
        criteres={criteresProposes}
        onPoser={poser}
        uniteCompte="pièces"
      />

    </>
  );
}
