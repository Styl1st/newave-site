"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkBrandAction } from "@/app/admin/actions";
import { annoncer } from "@/components/Confirmations";
import { useConfirmationCle } from "@/lib/confirmation";
import { obstacleAPublication, peutEtrePubliee } from "@/lib/publication";
import { conditionsDePublication } from "@/components/publication/conditions";
import { doitAvoirDesPieces } from "@/lib/acces";
import { StatusPill } from "./ListRow";
import type { BrandAdmin } from "@/lib/admin-queries";

/**
 * L'annuaire côté administration : on filtre, on coche, on agit.
 *
 * Chaque ligne portait son propre bouton, ce qui va très bien pour
 * trois marques et beaucoup moins pour soixante-dix : publier une
 * fournée revenait à cliquer soixante-dix fois la même chose, en
 * cherchant à chaque fois où l'on s'était arrêté.
 *
 * Les filtres ne sont pas un supplément décoratif, ils font partie du
 * geste : on réduit d'abord la liste à ce qui nous intéresse, puis
 * « Cocher les affichées » ne coche que celles-là. Les critères du
 * bas répondent aux questions qu'on se pose devant une base tout
 * juste importée, et ils se prennent dans les deux sens : avec ou
 * sans visuel, avec ou sans boutique, avec ou sans pièces.
 *
 * Encore fallait-il savoir quoi leur demander. La rangée de vues, en
 * tête, pose les trois ou quatre questions qu'on vient poser neuf fois
 * sur dix — ce qui est prêt à partir, ce qui est incomplet, ce qui n'a
 * pas de catalogue — et donne le nombre AVANT le clic, ce qui évite
 * d'ouvrir un panneau pour découvrir qu'il n'y en a aucune.
 */

type Etat = "tout" | "published" | "draft";
type Tri = "nom" | "recentes" | "pieces";

/**
 * Les critères du bas, chacun une question qu'on se pose.
 *
 * Chaque question se pose dans les deux sens, et il fallait les deux :
 * « sans visuel » sert à réparer, « avec visuel » sert à choisir quoi
 * publier. Il n'y avait que la moitié négative, ce qui obligeait à
 * lire la liste entière pour trouver l'autre.
 */
type Cle = "visuel" | "boutique" | "piece" | "gerant" | "aLaUne" | "publiable";
type Sens = "avec" | "sans";

const TESTS: Record<Cle, (b: BrandAdmin) => boolean> = {
  visuel: (b) => Boolean(b.cover_url || b.logo_url),
  boutique: (b) => Boolean(b.shop_url || b.website_url),
  piece: (b) => b.pieces > 0,
  gerant: (b) => b.gerants > 0,
  aLaUne: (b) => b.featured,
  // Ce qui peut partir en ligne en l'état. Pris à l'envers, c'est la
  // liste à traiter avant une mise en ligne groupée.
  publiable: (b) => peutEtrePubliee(b),
};

/** Le nom du critère, puis comment se lisent ses deux faces. */
const CRITERES: { cle: Cle; nom: string; avec: string; sans: string }[] = [
  { cle: "visuel", nom: "Visuel", avec: "Avec visuel", sans: "Sans visuel" },
  { cle: "boutique", nom: "Boutique", avec: "Avec boutique", sans: "Sans boutique" },
  { cle: "piece", nom: "Pièces", avec: "Avec pièces", sans: "Sans pièce" },
  { cle: "gerant", nom: "Gérant", avec: "Avec gérant", sans: "Sans gérant" },
  { cle: "aLaUne", nom: "À la une", avec: "À la une", sans: "Pas à la une" },
  { cle: "publiable", nom: "Publiable", avec: "Publiables", sans: "Non publiables" },
];

/**
 * Un jeu de filtres complet, tenu comme une valeur.
 *
 * Les réglages vivaient dans six `useState` séparés, ce qui suffisait
 * tant que personne d'autre n'en avait besoin. Une vue doit maintenant
 * en POSER un d'un coup, et surtout COMPTER ce qu'il donnerait SANS
 * l'appliquer — « Sans catalogue 22 » se lit avant de cliquer, sinon
 * la vue ne dit rien de plus que son nom. Six états dispersés ne se
 * comptent pas ; un objet, si.
 */
type Filtre = {
  recherche: string;
  etat: Etat;
  pays: string;
  categorie: string;
  gamme: string;
  /** Pour chaque critère retenu, dans quel sens on l'a pris. */
  criteres: Partial<Record<Cle, Sens>>;
};

const FILTRE_VIDE: Filtre = {
  recherche: "",
  etat: "tout",
  pays: "",
  categorie: "",
  gamme: "",
  criteres: {},
};

/**
 * Cette marque passe-t-elle ce filtre ?
 *
 * Hors du composant parce qu'elle sert deux fois : à la liste qu'on
 * affiche, et au compteur de chaque vue, qui interroge le même filtre
 * sur des réglages qui ne sont pas ceux en cours.
 */
function correspond(b: BrandAdmin, f: Filtre): boolean {
  if (f.etat !== "tout" && b.status !== f.etat) return false;
  if (f.pays && b.country !== f.pays) return false;
  if (f.categorie && !(b.categories ?? []).includes(f.categorie)) return false;
  if (f.gamme && b.price_tier !== f.gamme) return false;
  // Plusieurs critères se cumulent : « sans visuel » ET « sans pièce »
  // donne les fiches les plus incomplètes, pas leur somme.
  for (const [cle, sens] of Object.entries(f.criteres) as [Cle, Sens][]) {
    if (TESTS[cle](b) !== (sens === "avec")) return false;
  }
  const mot = f.recherche.trim().toLowerCase();
  if (!mot) return true;
  // Le nom, mais aussi le pseudo et l'adresse : on cherche souvent une
  // marque dont on a l'Instagram en tête, pas l'orthographe.
  return [b.name, b.slug, b.instagram, b.tagline, b.city, b.shop_url, b.website_url]
    .filter(Boolean)
    .some((champ) => String(champ).toLowerCase().includes(mot));
}

/** Deux jeux de critères disent-ils la même chose ? L'ordre ne compte pas. */
function memesCriteres(a: Filtre["criteres"], b: Filtre["criteres"]): boolean {
  const cles = Object.keys(a) as Cle[];
  return cles.length === Object.keys(b).length && cles.every((c) => a[c] === b[c]);
}

type Vue = { nom: string; filtre: Filtre };

/**
 * Les vues : des combinaisons de `TESTS` qui existaient déjà, nommées.
 *
 * AUCUNE LOGIQUE DE FILTRAGE NEUVE. Chaque vue n'est qu'un jeu de
 * réglages que les faces avec/sans savaient déjà poser. Ce qu'elle
 * ajoute est un nom et un nombre, c'est-à-dire la réponse à « par où
 * je commence » — qu'on n'obtenait qu'en dépliant un panneau et en
 * cliquant deux boutons, donc en sachant d'avance ce qu'on cherchait.
 *
 * Les compteurs sont calculés sur les marques reçues. Les écrire en
 * dur, c'est promettre onze fiches prêtes et en montrer trois.
 *
 * « Publiables » ne retient QUE les brouillons : la vue existe pour
 * tout cocher et publier d'un coup, et une fiche déjà en ligne n'a
 * rien à y faire. « Incomplètes » ignore l'état au contraire — une
 * fiche partie en ligne avant qu'on ne durcisse la règle, ou dont la
 * boutique s'est vidée depuis, est exactement celle qu'on cherche.
 */
const VUES: Vue[] = [
  { nom: "Toutes", filtre: FILTRE_VIDE },
  {
    nom: "Publiables",
    filtre: { ...FILTRE_VIDE, etat: "draft", criteres: { publiable: "avec" } },
  },
  { nom: "Incomplètes", filtre: { ...FILTRE_VIDE, criteres: { publiable: "sans" } } },
  { nom: "Sans catalogue", filtre: { ...FILTRE_VIDE, criteres: { piece: "sans" } } },
  { nom: "À la une", filtre: { ...FILTRE_VIDE, criteres: { aLaUne: "avec" } } },
];

/* ---- les vues qu'on garde soi-même ----
 *
 * Dans le `localStorage`, et c'est assumé : « les brouillons français
 * sans pièce » est le confort d'UNE personne devant SON écran, pas une
 * donnée du site. Une table pour ça demanderait une migration, une
 * politique d'accès et une requête de plus à chaque chargement, pour
 * un réglage qui ne regarde personne d'autre. Le prix à payer est
 * connu : changer de navigateur les perd, et la tuile le dit.
 */
const CLE_VUES = "admin:vues-marques";
/** Au-delà, la rangée de vues devient plus haute que la liste. */
const VUES_MAX = 8;
/** Un nom qui déborde de sa pastille ne se lit plus. */
const NOM_MAX = 40;

type VueGardee = Vue & { tri: Tri };

const ETATS: Etat[] = ["tout", "published", "draft"];
const TRIS: Tri[] = ["nom", "recentes", "pieces"];
const CLES = Object.keys(TESTS) as Cle[];

/**
 * Relit un filtre gardé en se méfiant de ce qu'il contient.
 *
 * CE QUI EST STOCKÉ A ÉTÉ ÉCRIT PAR UNE VERSION D'AVANT. Un critère
 * qu'on retirerait de `TESTS` reviendrait ici en clé inconnue, et
 * `TESTS[cle](b)` — appelé sur chaque marque — ferait tomber la page
 * entière au chargement, sans que rien à l'écran n'explique pourquoi.
 * On ne garde donc que ce qu'on sait encore lire, et le reste part
 * sans bruit : une vue amputée vaut mieux qu'un écran blanc.
 */
function assainir(brut: unknown): Filtre {
  const o = (brut ?? {}) as Record<string, unknown>;
  const texte = (v: unknown) => (typeof v === "string" ? v : "");

  const criteres: Filtre["criteres"] = {};
  for (const [k, v] of Object.entries((o.criteres ?? {}) as Record<string, unknown>)) {
    /* `k in TESTS` aurait laissé passer `__proto__`, que `JSON.parse`
       pose en propriété ordinaire mais que `in` trouve sur le
       prototype : on aurait alors appelé `TESTS["__proto__"](b)`,
       c'est-à-dire un objet, sur chaque marque. La liste des clés
       réelles ne se laisse pas raconter d'histoires. */
    if (CLES.includes(k as Cle) && (v === "avec" || v === "sans")) criteres[k as Cle] = v;
  }

  return {
    recherche: texte(o.recherche),
    etat: ETATS.includes(o.etat as Etat) ? (o.etat as Etat) : "tout",
    pays: texte(o.pays),
    categorie: texte(o.categorie),
    gamme: texte(o.gamme),
    criteres,
  };
}

function lireVues(): VueGardee[] {
  try {
    const brut = localStorage.getItem(CLE_VUES);
    if (!brut) return [];
    const lu: unknown = JSON.parse(brut);
    if (!Array.isArray(lu)) return [];
    return lu
      .flatMap((v: unknown): VueGardee[] => {
        const o = (v ?? {}) as Record<string, unknown>;
        const nom = typeof o.nom === "string" ? o.nom.trim().slice(0, NOM_MAX) : "";
        if (!nom) return [];
        return [
          {
            nom,
            filtre: assainir(o.filtre),
            tri: TRIS.includes(o.tri as Tri) ? (o.tri as Tri) : "nom",
          },
        ];
      })
      .slice(0, VUES_MAX);
  } catch {
    // navigation privée, stockage refusé, JSON abîmé : on repart des
    // seules vues d'origine, qui n'ont besoin de rien pour exister
    return [];
  }
}

/** Rend faux quand le navigateur refuse d'écrire, pour qu'on le dise. */
function ecrireVues(vues: VueGardee[]): boolean {
  try {
    localStorage.setItem(CLE_VUES, JSON.stringify(vues));
    return true;
  } catch {
    return false;
  }
}

const CHAMP =
  "w-full rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[13px] text-white placeholder:text-white/45 focus:border-white/60 focus:outline-none";

/** Une pastille de vue : le nom, puis son nombre. */
const PUCE = "rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition";

export default function BrandBulkList({ brands }: { brands: BrandAdmin[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();
  const { cle, demander, desarmer } = useConfirmationCle();

  /* ---- filtres ---- */
  const [filtre, setFiltre] = useState<Filtre>(FILTRE_VIDE);
  /* Le tri n'est pas dans le filtre : il ne retire aucune ligne, il
     les remet dans un autre ordre. Une vue le garde quand même — on
     enregistre ce qu'on voit, et l'ordre en fait partie. */
  const [tri, setTri] = useState<Tri>("nom");
  /*
   * IL NE RESTE PLUS QUE LES CAS FINS DERRIÈRE LE BOUTON.
   *
   * Tout était replié, y compris le pays et la catégorie — c'est-à-dire
   * le geste le plus courant après la recherche, et il demandait
   * d'ouvrir un panneau pour le trouver. Les quatre menus sont donc
   * sortis : avec la recherche, cinq contrôles ne font pas un mur. Les
   * douze faces avec/sans et l'état, eux, servent à une question
   * précise qu'on ne se pose pas à chaque visite ; ils restent ici, et
   * le compteur du bouton dit combien y sont posés pour qu'un filtre
   * oublié ne se cache jamais.
   */
  const [ouverts, setOuverts] = useState(false);
  /** Le nom en cours de frappe, ou null quand la tuile est au repos. */
  const [aNommer, setANommer] = useState<string | null>(null);
  const [vues, setVues] = useState<VueGardee[]>([]);

  /*
   * Les vues gardées ne sont lues qu'après le premier rendu.
   *
   * Le serveur n'a aucun moyen de connaître le stockage de qui regarde :
   * les lire dans l'état initial ferait diverger les deux rendus, et
   * React jetterait l'arbre entier pour le refaire.
   */
  useEffect(() => setVues(lireVues()), []);

  // Les choix proposés viennent des marques elles-mêmes : une liste
  // figée finirait par proposer des pays qu'on n'a plus, et par taire
  // ceux qu'on vient d'ajouter.
  const lesPays = useMemo(
    () => Array.from(new Set(brands.map((b) => b.country).filter(Boolean))).sort(),
    [brands]
  );
  const lesCategories = useMemo(
    () => Array.from(new Set(brands.flatMap((b) => b.categories ?? []))).sort(),
    [brands]
  );

  /** Combien de marques de chaque côté, pour l'afficher sur le bouton. */
  const comptes = useMemo(() => {
    const total = {} as Record<Cle, { avec: number; sans: number }>;
    for (const { cle } of CRITERES) {
      const avec = brands.filter(TESTS[cle]).length;
      total[cle] = { avec, sans: brands.length - avec };
    }
    return total;
  }, [brands]);

  const visibles = useMemo(() => {
    const gardees = brands.filter((b) => correspond(b, filtre));

    if (tri === "recentes") {
      return gardees
        .slice()
        .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
    }
    if (tri === "pieces") {
      return gardees.slice().sort((a, b) => b.pieces - a.pieces);
    }
    return gardees;
  }, [brands, filtre, tri]);

  /* Ce que chaque vue donnerait, compté sur TOUTES les marques et non
     sur la liste en cours : une vue annonce ce vers quoi elle mène, pas
     ce qui reste de ce qu'on regarde déjà. */
  const comptesVues = useMemo(
    () => VUES.map((v) => brands.filter((b) => correspond(b, v.filtre)).length),
    [brands]
  );
  const comptesGardees = useMemo(
    () => vues.map((v) => brands.filter((b) => correspond(b, v.filtre)).length),
    [brands, vues]
  );

  /** Ce qui est posé derrière le bouton « Filtres ». */
  const nbReplies = Object.keys(filtre.criteres).length + (filtre.etat !== "tout" ? 1 : 0);
  /** Tout ce qui retient la liste, y compris ce qui est à l'air libre. */
  const nbFiltres =
    nbReplies +
    [filtre.recherche, filtre.pays, filtre.categorie, filtre.gamme].filter(Boolean).length;

  const filtreActif = nbFiltres > 0;

  /*
   * La sélection ne porte que sur ce qui est affiché.
   *
   * Sans cette précaution, on filtrerait sur « brouillons », on
   * cocherait tout, on changerait de filtre, et on publierait sans le
   * savoir des marques qu'on n'a jamais vues à l'écran.
   */
  const idsVisibles = useMemo(() => new Set(visibles.map((b) => b.id)), [visibles]);
  const retenues = useMemo(
    () => Array.from(selection).filter((id) => idsVisibles.has(id)),
    [selection, idsVisibles]
  );
  const toutCoche = visibles.length > 0 && retenues.length === visibles.length;

  function basculer(id: string) {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  /** Changer une partie du filtre sans toucher au reste. */
  function poser(partiel: Partial<Filtre>) {
    setFiltre((prev) => ({ ...prev, ...partiel }));
  }

  /** Cliquer sur une face l'active ; recliquer dessus la relâche. */
  function basculerCritere(cle: Cle, sens: Sens) {
    setFiltre((prev) => {
      const suivant = { ...prev.criteres };
      if (suivant[cle] === sens) delete suivant[cle];
      else suivant[cle] = sens;
      return { ...prev, criteres: suivant };
    });
  }

  function reinitialiser() {
    setFiltre(FILTRE_VIDE);
  }

  /*
   * Une vue d'origine ne pose QUE l'état et les critères : c'est le
   * seul axe qu'elle possède. Le pays, la catégorie et la recherche
   * restent donc en place — « Sans catalogue » PUIS « France » est le
   * geste attendu, et une vue qui balaierait tout obligerait à reposer
   * ce qu'on venait de choisir. C'est aussi pourquoi elle reste allumée
   * pendant qu'on affine : ce qu'ELLE pose n'a pas bougé.
   *
   * Recliquer sur la vue allumée la relâche, comme les faces avec/sans.
   */
  const surLAxeDe = (f: Filtre) =>
    f.etat === filtre.etat && memesCriteres(f.criteres, filtre.criteres);

  function appliquerVue(v: Vue, allumee: boolean) {
    poser(
      allumee
        ? { etat: "tout", criteres: {} }
        : { etat: v.filtre.etat, criteres: { ...v.filtre.criteres } }
    );
  }

  /*
   * Une vue gardée, elle, enregistre TOUT ce qu'on voyait : elle n'est
   * donc allumée que quand on est exactement dessus, et la reposer
   * remplace le filtre entier plutôt que de s'ajouter à ce qui traîne.
   */
  const estGardeeActive = (v: VueGardee) =>
    surLAxeDe(v.filtre) &&
    v.filtre.recherche === filtre.recherche &&
    v.filtre.pays === filtre.pays &&
    v.filtre.categorie === filtre.categorie &&
    v.filtre.gamme === filtre.gamme;

  function appliquerGardee(v: VueGardee, allumee: boolean) {
    if (allumee) {
      setFiltre(FILTRE_VIDE);
      return;
    }
    setFiltre(v.filtre);
    setTri(v.tri);
  }

  function enregistrerVue(nom: string) {
    const propre = nom.trim().slice(0, NOM_MAX);
    if (!propre) return;
    // Deux pastilles « Publiables » côte à côte, dont une seule porte
    // une croix : on ne saurait plus laquelle on vient de cliquer.
    if (VUES.some((v) => v.nom.toLowerCase() === propre.toLowerCase())) {
      setNote(`« ${propre} » est déjà le nom d'une vue d'origine. Donne-lui un autre nom.`);
      return;
    }
    // Même nom = on remplace. Sinon on finit avec trois « France » qui
    // ne filtrent pas la même chose et qu'on ne distingue plus.
    const suivant = [...vues.filter((v) => v.nom !== propre), { nom: propre, filtre, tri }].slice(
      -VUES_MAX
    );
    setVues(suivant);
    setANommer(null);
    if (!ecrireVues(suivant)) {
      setNote(
        "Ce navigateur refuse d'enregistrer : la vue tient pour cette page, elle ne sera plus là au retour."
      );
    }
  }

  function oublierVue(nom: string) {
    const suivant = vues.filter((v) => v.nom !== nom);
    setVues(suivant);
    ecrireVues(suivant);
  }

  function agir(intent: "publish" | "draft" | "delete") {
    // Deuxième appui = confirmation. Une boîte de dialogue native se
    // fait escamoter par les navigateurs mobiles, et le bouton semblait
    // alors ne rien faire.
    if (intent === "delete" && !demander("delete")) {
      setNote(
        `Appuie encore sur Supprimer pour effacer définitivement ${retenues.length} marque${retenues.length > 1 ? "s" : ""} et toutes leurs pièces.`
      );
      return;
    }
    desarmer();

    const formData = new FormData();
    formData.set("intent", intent);
    retenues.forEach((id) => formData.append("ids", id));

    demarrer(async () => {
      const res = await bulkBrandAction(formData);
      if (!res.ok) {
        setNote(res.error ?? "L'action a échoué.");
        annoncer(res.error ?? "L'action a échoué.", "erreur");
        return;
      }

      const n = res.traitees ?? 0;
      const verbe =
        intent === "publish" ? "publiée" : intent === "draft" ? "remise en brouillon" : "supprimée";
      const bilan =
        `${n} marque${n > 1 ? "s" : ""} ${verbe}${n > 1 ? "s" : ""}.` +
        (res.ecartees
          ? ` ${res.ecartees} laissée${res.ecartees > 1 ? "s" : ""} de côté : il leur manque un visuel ou un texte.`
          : "");
      setNote(bilan);
      // Le même texte dans le bandeau : la barre d'actions est en haut
      // de page, et l'on vient souvent de faire défiler la liste pour
      // cocher la dernière ligne.
      annoncer(bilan, intent === "delete" ? "info" : "ok");
      setSelection(new Set());
      router.refresh();
    });
  }

  const bouton =
    "rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.07em] transition disabled:opacity-45";

  return (
    <>
      {/* ---------- filtres ---------- */}
      <div className="glass mb-4 flex flex-col gap-3 p-4 sm:px-5">
        {/* Première ligne : les vues, et le nombre qu'elles promettent.
            C'est ce qui remplace le repli en tête de panneau — on entre
            dans la liste par une question (« qu'est-ce qui est prêt ? »)
            plutôt que par un bouton qui ne dit rien de ce qu'il cache. */}
        <div className="flex flex-wrap items-center gap-2">
          {VUES.map((v, i) => {
            const allumee = surLAxeDe(v.filtre);
            return (
              <button
                key={v.nom}
                type="button"
                onClick={() => appliquerVue(v, allumee)}
                aria-pressed={allumee}
                className={
                  allumee
                    ? `${PUCE} border-white bg-white text-[var(--color-ink)]`
                    : `${PUCE} border-white/25 text-white/75 hover:bg-white/12 hover:text-white`
                }
              >
                {v.nom}
                <span className={allumee ? "ml-1.5 text-[#6a5a92]" : "ml-1.5 text-white/45"}>
                  {comptesVues[i]}
                </span>
              </button>
            );
          })}

          {vues.map((v, i) => {
            const allumee = estGardeeActive(v);
            return (
              <div
                key={v.nom}
                className={
                  allumee
                    ? "flex items-center overflow-hidden rounded-full border border-white bg-white"
                    : "flex items-center overflow-hidden rounded-full border border-white/25"
                }
              >
                <button
                  type="button"
                  onClick={() => appliquerGardee(v, allumee)}
                  aria-pressed={allumee}
                  className={
                    allumee
                      ? "min-w-0 px-3.5 py-2 text-[12.5px] font-bold text-[var(--color-ink)]"
                      : "min-w-0 px-3.5 py-2 text-[12.5px] font-bold text-white/75 transition hover:bg-white/12 hover:text-white"
                  }
                >
                  <span className="block max-w-[180px] truncate">
                    {v.nom}
                    <span className={allumee ? "ml-1.5 text-[#6a5a92]" : "ml-1.5 text-white/45"}>
                      {comptesGardees[i]}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => oublierVue(v.nom)}
                  aria-label={`Oublier la vue ${v.nom}`}
                  className={
                    allumee
                      ? "border-l border-black/10 px-2.5 py-2 text-[13px] font-bold text-[#6a5a92] hover:text-[var(--color-ink)]"
                      : "border-l border-white/20 px-2.5 py-2 text-[13px] font-bold text-white/45 transition hover:bg-white/12 hover:text-white"
                  }
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* La tuile n'est proposée que quand il y a quelque chose à
              garder : enregistrer un filtre vide donnerait une vue qui
              fait exactement ce que « Toutes » fait déjà. Elle dit aussi
              où va ce qu'elle garde — ce navigateur, et rien d'autre. */}
          {aNommer === null ? (
            <button
              type="button"
              onClick={() => setANommer("")}
              disabled={!filtreActif || vues.length >= VUES_MAX}
              title={
                !filtreActif
                  ? "Filtre d'abord la liste : une vue sans filtre, c'est « Toutes »."
                  : vues.length >= VUES_MAX
                    ? `${VUES_MAX} vues au maximum : oublies-en une pour en garder une autre.`
                    : "Garder ces filtres sous un nom, dans ce navigateur."
              }
              className="rounded-full border border-dashed border-white/35 px-3.5 py-2 text-[12.5px] font-bold text-white/60 transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/35 disabled:hover:text-white/60"
            >
              + Enregistrer cette vue
            </button>
          ) : (
            /* Un champ à la place de la tuile, pas une invite du
               navigateur : `prompt()` se fait escamoter sur téléphone
               exactement comme `confirm()`, et le bouton semble alors
               n'avoir rien fait. */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enregistrerVue(aNommer);
              }}
              className="flex items-center gap-1 rounded-full border border-dashed border-white/45 bg-white/10 py-1 pl-3 pr-1"
            >
              <input
                autoFocus
                value={aNommer}
                onChange={(e) => setANommer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setANommer(null);
                }}
                maxLength={NOM_MAX}
                placeholder="Nom de la vue"
                aria-label="Nom de la vue"
                className="w-[128px] min-w-0 bg-transparent text-[12.5px] font-bold text-white placeholder:font-semibold placeholder:text-white/45 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!aNommer.trim()}
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-[var(--color-ink)] disabled:opacity-40"
              >
                Garder
              </button>
              <button
                type="button"
                onClick={() => setANommer(null)}
                aria-label="Annuler l'enregistrement"
                className="shrink-0 px-2 py-1.5 text-[13px] font-bold text-white/55 transition hover:text-white"
              >
                ×
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            value={filtre.recherche}
            onChange={(e) => poser({ recherche: e.target.value })}
            placeholder="Nom, pseudo, ville, site"
            aria-label="Chercher une marque"
            className={`${CHAMP} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={() => setOuverts((o) => !o)}
            aria-expanded={ouverts}
            className={`shrink-0 rounded-full border px-4 py-2 text-[12.5px] font-bold transition ${
              nbReplies > 0 || ouverts
                ? "border-white/60 bg-white/18 text-white"
                : "border-white/30 text-white/78 hover:bg-white/12 hover:text-white"
            }`}
          >
            Filtres
            {nbReplies > 0 && <span className="ml-1.5 text-white/60">{nbReplies}</span>}
          </button>
          <span className="shrink-0 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
            {visibles.length}
            {filtreActif && ` / ${brands.length}`}
          </span>
          {filtreActif && (
            <button
              type="button"
              onClick={reinitialiser}
              className="shrink-0 text-[12.5px] font-bold text-white/70 underline underline-offset-2 transition hover:text-white"
            >
              Tout afficher
            </button>
          )}
        </div>

        {/* Les quatre menus, dépliés.
            `grid-cols-[minmax(0,1fr)]` dès le premier palier : sans lui,
            la piste implicite se dimensionne sur le contenu, et un nom
            de catégorie un peu long pousse la page entière en travers
            sur téléphone. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={filtre.pays}
            onChange={(e) => poser({ pays: e.target.value })}
            aria-label="Filtrer par pays"
            className={CHAMP}
          >
            <option value="">Tous les pays</option>
            {lesPays.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filtre.categorie}
            onChange={(e) => poser({ categorie: e.target.value })}
            aria-label="Filtrer par catégorie"
            className={CHAMP}
          >
            <option value="">Toutes les catégories</option>
            {lesCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filtre.gamme}
            onChange={(e) => poser({ gamme: e.target.value })}
            aria-label="Filtrer par gamme de prix"
            className={CHAMP}
          >
            <option value="">Toutes les gammes</option>
            <option value="accessible">Accessible</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="premium">Premium</option>
          </select>

          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            aria-label="Trier"
            className={CHAMP}
          >
            <option value="nom">Par nom</option>
            <option value="recentes">Publiées en dernier</option>
            <option value="pieces">Le plus de pièces</option>
          </select>
        </div>

        {ouverts && (
        <div className="flex flex-col gap-2.5 border-t border-white/12 pt-3">
          {/* L'état reste ici : les vues répondent déjà à « qu'est-ce
              qui est prêt à partir », et « en ligne uniquement » est la
              question fine, celle qu'on se pose une fois sur dix. */}
          <select
            value={filtre.etat}
            onChange={(e) => poser({ etat: e.target.value as Etat })}
            aria-label="Filtrer par état"
            className={`${CHAMP} sm:max-w-[260px]`}
          >
            <option value="tout">Tous les états</option>
            <option value="published">En ligne</option>
            <option value="draft">En brouillon</option>
          </select>

          {/* Chaque critère se prend dans les deux sens, côte à côte, et
              porte son nombre : un côté à zéro se voit avant d'être
              cliqué, ce qui évite un aller-retour pour rien. */}
          <div className="flex flex-wrap gap-2">
            {CRITERES.map((critere) => {
              const choisi = filtre.criteres[critere.cle];
              const faces: { sens: Sens; texte: string; n: number }[] = [
                { sens: "avec", texte: critere.avec, n: comptes[critere.cle].avec },
                { sens: "sans", texte: critere.sans, n: comptes[critere.cle].sans },
              ];

              return (
                <div
                  key={critere.cle}
                  role="group"
                  aria-label={critere.nom}
                  className="flex items-center overflow-hidden rounded-full border border-white/25"
                >
                  {faces.map((f, i) => {
                    const actif = choisi === f.sens;
                    return (
                      <button
                        key={f.sens}
                        type="button"
                        onClick={() => basculerCritere(critere.cle, f.sens)}
                        aria-pressed={actif}
                        disabled={f.n === 0 && !actif}
                        className={`px-3 py-1.5 text-[11.5px] font-bold transition disabled:opacity-25 ${
                          i === 1 ? "border-l border-white/20" : ""
                        } ${
                          actif
                            ? "bg-white text-[var(--color-ink)]"
                            : "text-white/72 hover:bg-white/12 hover:text-white"
                        }`}
                      >
                        {f.texte}
                        <span className={actif ? "ml-1.5 text-[#6a5a92]" : "ml-1.5 text-white/40"}>
                          {f.n}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* ---------- barre d'action ----------
          Elle n'apparaît qu'une fois quelque chose de coché. Une barre
          de boutons désactivés en permanence n'apprend rien et occupe
          la place où l'on cherche justement la liste. */}
      {retenues.length > 0 && (
        /*
         * LA BARRE EST PASSÉE EN BAS, ET C'EST UNE CORRECTION D'USAGE.
         *
         * Elle était au-dessus de la liste. On coche donc en descendant,
         * on arrive au bout, et les boutons sont trois écrans plus haut :
         * il faut remonter pour agir, puis redescendre pour vérifier. En
         * bas et flottante, elle est là où se trouve la main au moment où
         * la sélection est finie.
         *
         * « sur N affichées » rend visible une règle que le code
         * appliquait déjà en silence : la sélection ne porte JAMAIS sur
         * des lignes masquées par un filtre.
         */
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(680px,calc(100%-2rem))] flex-wrap items-center justify-between gap-3 rounded-[999px] border border-white/20 bg-[rgba(8,2,30,0.72)] px-4 py-3 shadow-[0_18px_44px_-16px_rgba(12,3,36,0.9)] backdrop-blur-[24px] sm:px-5">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/70">
            {retenues.length} sélectionnée{retenues.length > 1 ? "s" : ""}
            <span className="ml-1.5 font-semibold normal-case tracking-normal text-white/45">
              sur {visibles.length} affichée{visibles.length > 1 ? "s" : ""}
            </span>
            {!toutCoche && (
              <button
                type="button"
                onClick={() => setSelection(new Set(visibles.map((b) => b.id)))}
                className="ml-2 font-bold normal-case tracking-normal text-white underline underline-offset-2 hover:text-white"
              >
                Tout cocher
              </button>
            )}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("publish")}
              className={`${bouton} bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] hover:shadow-[0_8px_20px_rgba(35,12,85,0.4)]`}
            >
              {pending ? "…" : "Publier"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("draft")}
              className={`${bouton} border border-white/35 text-white hover:bg-white/12`}
            >
              Retirer
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("delete")}
              onBlur={desarmer}
              className={
                cle === "delete"
                  ? `${bouton} border border-[#ff9db0] bg-[rgba(194,39,63,0.35)] text-white`
                  : `${bouton} border border-white/25 text-white/70 hover:border-white/50 hover:text-white`
              }
            >
              {cle === "delete" ? "Confirmer" : "Supprimer"}
            </button>
          </div>
        </div>
      )}

      {note && <p className="glass m-0 mb-4 px-5 py-3 text-[13.5px] text-white">{note}</p>}

      {/* ---------- la liste ---------- */}
      {visibles.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">
            {brands.length === 0
              ? "Aucune marque pour l'instant."
              : "Aucune marque ne correspond à ces filtres."}
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              setSelection(toutCoche ? new Set() : new Set(visibles.map((b) => b.id)))
            }
            className="mb-3 rounded-full border border-white/35 px-4 py-2 text-[12px] font-bold text-white/85 transition hover:bg-white/12"
          >
            {toutCoche ? "Tout décocher" : `Cocher les ${visibles.length} affichées`}
          </button>

          {/* La barre flotte au-dessus du bas de page : ce dégagement
              évite qu'elle recouvre la dernière ligne, celle qu'on vient
              justement de cocher. */}
          <div className={`flex flex-col gap-3 ${retenues.length > 0 ? "pb-24" : ""}`}>
            {visibles.map((b) => {
              const coche = selection.has(b.id);
              const visuel = b.logo_url ?? b.cover_url;
              const sousTitre = [
                b.country,
                `${b.pieces} pièce${b.pieces > 1 ? "s" : ""}`,
                b.gerants > 0 ? "gérée" : null,
                !visuel ? "sans visuel" : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={b.id}
                  className={`card-light relative flex items-center gap-4 p-4 transition ${
                    coche ? "ring-3 ring-white" : ""
                  }`}
                >
                  <div className="relative z-3 flex w-full items-center gap-4">
                    <label className="flex shrink-0 cursor-pointer items-center p-1">
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => basculer(b.id)}
                        aria-label={`Sélectionner ${b.name}`}
                        className="case"
                      />
                    </label>

                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#e6dcfb]">
                      {visuel && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={visuel} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>

                    {/* DROIT SUR L'ÉDITEUR, et non sur `/admin/marques/[id]`
                        qui ne fait plus qu'y renvoyer, par politesse pour
                        les liens déjà partagés. Il n'existe qu'un écran
                        pour modifier une fiche, et c'est le même que
                        celui qu'ouvre la marque chez elle : par l'adresse
                        de la page, donc, et non par l'identifiant. */}
                    <Link href={`/espace-marque/${b.slug}/modifier`} className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">
                        {b.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#6a5a92]">
                        {sousTitre}
                      </span>
                    </Link>

                    <Publiable brand={b} />

                    <StatusPill status={b.status} />

                    <Link
                      href={`/espace-marque/${b.slug}/modifier`}
                      aria-label={`Ouvrir ${b.name}`}
                      className="text-[18px] font-black text-[#3a2470]"
                    >
                      →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

/**
 * Ce qui manque à cette fiche, lu dans la ligne.
 *
 * LE MANQUE ÉTAIT INVISIBLE JUSQU'AU MOMENT D'ÉCHOUER. On cochait
 * quarante fiches, on cliquait « Publier », et le bandeau annonçait que
 * dix-sept avaient été « laissées de côté » — sans dire lesquelles, ni
 * pourquoi. Il fallait les rouvrir une par une pour le découvrir.
 *
 * La jauge répond avant le clic. Le libellé NOMME la condition qui
 * bloque — c'est le titre que rend `conditionsDePublication`, pas une
 * reformulation — et la phrase exacte de `obstacleAPublication` est dans
 * l'infobulle, là où il y a la place de l'écrire en entier.
 */
function Publiable({ brand }: { brand: BrandAdmin }) {
  const fiche = {
    tagline: brand.tagline,
    description: brand.description,
    cover_url: brand.cover_url,
    logo_url: brand.logo_url,
    pieces: brand.pieces,
    exigeDesPieces: doitAvoirDesPieces(brand),
  };

  const conditions = conditionsDePublication(fiche);
  const manquantes = conditions.filter((c) => c.obstacle);
  const tenues = conditions.length - manquantes.length;
  const obstacle = obstacleAPublication(fiche);

  const enLigne = brand.status === "published";
  const vert = "#1d7a4f";
  const rouge = "#c2273f";

  /* Une fiche en ligne reste évaluée : c'est ainsi qu'on repère celle
     qui est passée avant qu'on ne durcisse la règle, ou dont la
     boutique s'est vidée depuis. */
  const couleur = obstacle ? rouge : vert;
  const libelle = obstacle
    ? (manquantes[0]?.titre.replace(/^Un(e)? /, "Sans ").replace(/^Du /, "Sans ") ??
      "Incomplète")
    : enLigne
      ? "Complète"
      : "Prête";

  return (
    <div
      className="hidden w-[130px] shrink-0 md:block"
      title={obstacle ?? "Rien ne retient cette fiche."}
    >
      <span
        aria-hidden
        className="block h-[4px] w-full overflow-hidden rounded-full bg-[rgba(23,10,51,0.12)]"
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.round((tenues / conditions.length) * 100)}%`,
            background: couleur,
          }}
        />
      </span>
      <span
        className="mt-1.5 block text-[11px] font-extrabold uppercase tracking-[0.06em]"
        style={{ color: couleur }}
      >
        {libelle}
      </span>
    </div>
  );
}
