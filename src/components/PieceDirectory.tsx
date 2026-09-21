"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import CurseurPrix from "./CurseurPrix";
import FeuilleFiltres from "./feuille/FeuilleFiltres";
import Grille from "./Grille";
import ProductCard, { type RatioPiece } from "./ProductCard";
import { IconCheck, IconFiltre, IconLoupe } from "./Icons";
import { SelecteurDensite, useDensite } from "./densite";
import { enChiffres } from "./chiffres";
import { declarerChampLocal } from "./recherche/champLocal";
import FeuilleRecherche from "./recherche/FeuilleRecherche";
import Suggestions from "./recherche/Suggestions";
import type { Critere } from "./recherche/Jeton";
import { MINIMUM, useRecherche } from "./recherche/useRecherche";
import { noterRecherche } from "./recherche/historique";
import { formatPrice } from "@/lib/types";
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
 * C'est le même nombre que le `top-[86px]` de la colonne de filtres :
 * quand on repose la page sur le haut des résultats, il faut la poser
 * SOUS la barre, pas dessous elle.
 */
const ENTETE = 86;

/**
 * Ce que la colonne de filtres a le droit d'occuper en hauteur.
 *
 * Les 86 px de l'en-tête collant, plus 18 px de respiration en pied.
 * C'est LE MÊME NOMBRE que le `calc(100dvh - 104px)` de
 * `.colonne-filtres--deborde` dans `globals.css` : au-delà, la colonne
 * ne tient plus dans l'écran et on lui rend son ascenseur. Les deux
 * valeurs doivent bouger ensemble, sinon la mesure et la borne se
 * contredisent — la colonne se croirait à l'aise dans une hauteur
 * qu'elle dépasse, ou l'inverse.
 */
const PLACE_COLONNE = 104;

/**
 * Corriger le défilement doit se faire AVANT que la page soit peinte,
 * sinon on voit le saut puis sa correction. `useLayoutEffect` est fait
 * pour ça, mais il n'existe pas au rendu serveur et y laisse un
 * avertissement : côté serveur, l'effet ordinaire fait l'affaire
 * puisqu'il ne s'exécute pas.
 */
const useEffetDePose = typeof window === "undefined" ? useEffect : useLayoutEffect;

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

export default function PieceDirectory({
  premierLot,
  totalDuPremierLot,
  graine,
  rayonsDuCatalogue,
  marquesDuCatalogue,
  bornesDuCatalogue,
  etatsDuCatalogue,
  amorce,
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

  const [query, setQuery] = useState(amorce ?? "");
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

  /*
   * LA COLONNE RESTE COLLÉE, TOUJOURS. C'EST CE QUI CHANGE ICI.
   *
   * Elle ne l'était que tant qu'elle tenait dans l'écran : au-delà, on
   * la rendait à la page, et elle partait vers le haut au premier
   * défilement. Sur un portable ordinaire — 1366 × 768, donc six cent
   * cinquante pixels de fenêtre — c'était le cas par défaut : on
   * descendait de trois rangées et il n'y avait plus de filtres nulle
   * part. Or l'envie d'affiner arrive au milieu de la grille, jamais en
   * haut. Une colonne de filtres qu'il faut aller rechercher en
   * remontant est une colonne qu'on n'utilise pas.
   *
   * L'autre remède qu'on s'était donné était de SERRER la colonne à
   * mesure que l'écran baissait — les paliers de `globals.css`. Trois
   * pixels de rembourrage et des lignes collées les unes aux autres :
   * elle tenait, mais elle avait l'air écrasée, et c'est le reproche
   * qu'on lui fait.
   *
   * On revient donc à l'ascenseur intérieur, avec ce qui lui manquait la
   * première fois : un dégradé au bas de la colonne qui DIT qu'il reste
   * quelque chose dessous. Le défaut d'alors n'était pas l'ascenseur,
   * c'était qu'il était invisible.
   *
   * On mesure quand même, parce que la barre de défilement et le
   * dégradé n'ont aucune raison d'exister quand tout tient : ils ne
   * s'allument que lorsque le contenu dépasse.
   */
  const colonne = useRef<HTMLElement>(null);
  const [colonneDeborde, setColonneDeborde] = useState(false);

  useEffect(() => {
    if (auDoigt) return;
    const el = colonne.current;
    if (!el) return;

    /* `scrollHeight` : la hauteur que la colonne DEMANDE, y compris la
       part qui passe sous son propre bord une fois l'ascenseur posé.
       `offsetHeight` ne dirait plus que la hauteur permise, et la mesure
       se mordrait la queue — déborde, donc on borne, donc ça ne déborde
       plus, donc on débourne. */
    const mesurer = () =>
      setColonneDeborde(el.scrollHeight > window.innerHeight - PLACE_COLONNE + 1);

    mesurer();

    /* Le contenu bouge tout seul : les rayons et les marques
       disponibles se réduisent à mesure qu'on filtre. */
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    window.addEventListener("resize", mesurer);
    return () => {
      observateur.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, [auDoigt]);

  /* Le glissement, la poignée, le voile et le verrou de défilement
     vivent dans `FeuilleFiltres`, partagée avec l'annuaire. */

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

    /* Arrondi au cran, pour que les deux extrémités du rail tombent sur
       des nombres ronds et que la poignée ait de quoi s'arrêter. */
    const pas = crantDe(haut - bas);
    return {
      min: Math.floor(bas / pas) * pas,
      max: Math.ceil(haut / pas) * pas,
      pas,
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
    marque,
    prix: prixDemande ? prixDiffere : null,
    stock,
    promo,
    tri,
  });

  const adresse = useCallback(
    (depuis: number) => {
      const p = new URLSearchParams();
      p.set("graine", graine);
      p.set("depuis", String(depuis));
      p.set("combien", String(LOT));
      if (qDifferee.trim()) p.set("q", qDifferee.trim());
      for (const r of rayons) p.append("rayon", r);
      if (marque) p.set("marque", marque);
      if (prixDemande) {
        p.set("prixMin", String(prixDiffere[0]));
        p.set("prixMax", String(prixDiffere[1]));
      }
      if (stock) p.set("stock", "1");
      if (promo) p.set("promo", "1");
      if (tri !== "hasard") p.set("tri", tri);
      return `/api/pieces?${p}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graine, signature]
  );

  const [lot, setLot] = useState<Product[]>(premierLot);
  const [total, setTotal] = useState(totalDuPremierLot);
  const [enCours, setEnCours] = useState(false);
  const [panne, setPanne] = useState(false);

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

  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }

    const halte = new AbortController();
    setEnCours(true);

    fetch(adresse(0), { signal: halte.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((page: { pieces: Product[]; total: number }) => {
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
  const charger = useCallback(() => {
    if (enCours) return;
    setEnCours(true);
    fetch(adresse(lot.length))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((page: { pieces: Product[]; total: number }) => {
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
    const haut = Math.max(0, bloc.getBoundingClientRect().top + window.scrollY - ENTETE);

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

    // 3. la remontée.
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
    /* La feuille verrouille le défilement du fond : mesurer là-dedans
       ne donnerait que la hauteur de l'écran. On corrige à sa
       fermeture, dans l'effet qui suit. */
    if (ouvert) return;
    recaler();
  }, [signature, ouvert, recaler]);

  /* À la fermeture de la feuille, le verrou est levé par `FeuilleFiltres`
     — un effet d'enfant, donc joué avant celui-ci. La page a retrouvé sa
     hauteur : c'est le moment de la reposer. */
  useEffect(() => {
    if (!ouvert) recaler();
  }, [ouvert, recaler]);

  /* Ce qu'on a sous la main, et ce que la base dit qu'il reste. `reste`
     ne se déduit plus d'une liste complète tenue en mémoire : il est la
     différence entre le total que la base a compté et ce qu'on a déjà
     demandé. */
  const visibles = lot;
  const reste = Math.max(total - visibles.length, 0);

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
      .filter((r) => !rayons.includes(r.rayon) && sansAccent(r.rayon).includes(q))
      .map((r) => ({
        famille: "Rayon",
        valeur: r.rayon,
        cle: `rayon:${sansAccent(r.rayon)}`,
        compte: r.total,
      }));

    if (q.length >= 2) {
      if (etatsUtiles.stock && !stock && "en stock".includes(q))
        proposes.push({ famille: "État", valeur: "En stock", cle: "etat:stock" });
      if (etatsUtiles.promo && !promo && "en promo".includes(q))
        proposes.push({ famille: "État", valeur: "En promo", cle: "etat:promo" });
    }

    /* Six au plus : au-delà, la liste pousse les marques et les pièces
       hors du panneau, qui sont l'autre moitié de la réponse. */
    return proposes.slice(0, 6);
  }, [rayonsDisponibles, rayons, etatsUtiles, stock, promo, query]);

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
    if (c.cle.startsWith("rayon:")) basculer(c.valeur);
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

  /* Ces pastilles ne vivent que sur téléphone : elles sont donc taillées
     pour le doigt, sans repli en version souris.

     ELLES SONT PASSÉES DU BLANC À L'ACCENT, et c'est pour être du même
     sang que le panneau. Un critère y porte un aplat d'accent qui dit
     « ceci deviendra un filtre » (`badge-critere`) ; une fois posé, il
     garde la même couleur dans la rangée. Le blanc, lui, reste réservé
     à ce qui agit — le bouton de filtres, le « Voir les 38 pièces » —
     et deux familles de blancs sur le même écran ne se distinguaient
     plus l'une de l'autre. */
  const pastille =
    "inline-flex min-h-[44px] items-center rounded-full bg-[rgb(var(--accent-1))] px-3.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[var(--color-ink)] transition active:scale-[.97]";

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
              {/* « Tout », c'est la somme des rayons listés : le
                  catalogue entier quand la base l'a compté, et sinon ce
                  que donneraient les autres familles SANS aucun rayon
                  coché — surtout pas la liste courante, qui annoncerait
                  le nombre de hauts au moment où l'on veut savoir
                  combien il reste si on les décoche. */}
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
          <div className="relative">
            {/* La loupe est dessinée, pas suggérée : `champ-loupe` ne
                fait que réserver les quarante pixels à sa gauche. */}
            <IconLoupe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
            <input
              ref={champ}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPointerDown={ouvrirAuDoigt}
              onFocus={ouvrirAuDoigt}
              placeholder="Chercher une pièce…"
              aria-label="Chercher une pièce, une marque"
              autoComplete="off"
              className="champ champ-loupe w-full"
            />
          </div>
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
                autoComplete="off"
                className="requete-champ"
              />

              {/* Le raccourci s'efface dès qu'on tape : il rappelle un
                  geste, il n'a plus rien à dire une fois le curseur
                  dedans. Il ne revient pas dans le panneau. */}
              {!query && (
                <span className="requete-touche mt-[7px] hidden shrink-0 sm:block">⌘ K</span>
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

      <div
        ref={zone}
        className="grid items-start gap-4 pb-20 lg:grid-cols-[222px_minmax(0,1fr)] lg:gap-[26px] lg:pb-0"
      >
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
            ref={colonne}
            /* Collée en toutes circonstances. Quand le contenu dépasse
               la hauteur de l'écran, `colonne-filtres--deborde` lui rend
               son ascenseur ET le dégradé qui l'annonce — voir
               `colonneDeborde` et `globals.css`. */
            className={`glass colonne-filtres p-5 sticky top-[86px] ${
              colonneDeborde ? "colonne-filtres--deborde" : ""
            }`}
          >
            {contenuFiltres}
          </aside>
        )}

        {/* ---------------- la grille ---------------- */}
        <div className="min-w-0">
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
              {!auDoigt && (
                <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
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
                <div className="barre barre-pied mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 p-3 sm:px-5">
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
                      : "ou tape ⌘K pour chercher directement"}
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
                      ou tape ⌘K pour chercher directement
                    </p>
                  </div>
                )
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
      {auDoigt && !ouvert && total > 0 && (
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
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[10.5px] font-black text-white">
              {actifs}
            </span>
          )}
        </button>
      )}

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

      <FeuilleFiltres
        ouvert={auDoigt && ouvert}
        onFermer={() => setOuvert(false)}
        id="filtres-pieces"
        pied={
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.98]"
          >
            Voir {total > 1 ? "les" : "la"} {enChiffres(total)} pièce
            {total > 1 ? "s" : ""}
          </button>
        }
      >
        {contenuFiltres}
      </FeuilleFiltres>
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
    <div className="section-filtre mt-4 border-t border-white/15 pt-4">
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
      className={`ligne-filtre flex min-h-[44px] w-full items-center justify-between gap-2 text-left transition lg:min-h-0 lg:py-2 ${
        pastille ? "rounded-[13px] px-3.5" : "rounded-[11px] px-[11px]"
      } ${
        actif
          ? pastille
            ? "bg-white text-[var(--color-ink)]"
            : "bg-[var(--color-ink)] text-white"
          : pastille
            ? "bg-white/8 text-white/88 hover:bg-white/14"
            : "text-white/84 hover:bg-white/12 hover:text-white"
      }`}
    >
      <span className="min-w-0 truncate text-[12.5px] font-bold">{libelle}</span>
      <span className={`shrink-0 text-[11.5px] font-bold tabular-nums ${actif ? "opacity-70" : "opacity-55"}`}>
        {enChiffres(total)}
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
      className={`ligne-filtre flex min-h-[44px] cursor-pointer items-center gap-2.5 transition lg:min-h-0 lg:py-2 ${
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
