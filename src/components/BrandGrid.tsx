"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import FeuilleFiltres from "./feuille/FeuilleFiltres";
import BrandCard from "./BrandCard";
import BrandPreview from "./BrandPreview";
import LigneMarque from "./LigneMarque";
import Grille from "./Grille";
import type { Densite } from "./densite";
import type { Brand } from "@/lib/types";

/**
 * Grille de marques avec aperçu des pièces.
 *
 * L'aperçu s'ouvre uniquement au clic sur le bouton, jamais au survol :
 * un panneau qui surgit tout seul pendant qu'on parcourt la liste
 * interrompt plus qu'il n'aide.
 */

/**
 * Combien de marques d'un coup.
 *
 * CE N'EST PAS UNE QUESTION DE CONFORT DE LECTURE, c'est ce qui empêche
 * le téléphone de recharger la page en boucle. Une couverture pèse
 * quelques centaines de kilo-octets sur le réseau, mais une fois
 * décodée pour être affichée elle occupe largeur × hauteur × 4 octets
 * en mémoire vive : plusieurs mégaoctets par carte. Le navigateur les
 * garde toutes tant qu'elles sont dans la page, même sorties de
 * l'écran, et `loading="lazy"` n'y change rien puisqu'il ne retarde que
 * le téléchargement.
 *
 * Passé une soixantaine de marques, l'onglet dépasse ce qu'iOS accorde
 * à une page et Safari le relance. De l'extérieur, ça ressemble
 * exactement à une page qui se rafraîchit toute seule sans fin.
 *
 * Vingt-quatre, c'est huit lignes de trois sur un écran large et déjà
 * beaucoup à faire défiler. Le même remède que pour les pièces d'une
 * marque, qui avait réglé le problème la première fois.
 */
const LOT = 24;

/** L'index. `#` recueille les chiffres et les symboles, à la fin. */
const LETTRES = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

/**
 * La lettre de rangement d'un nom.
 *
 * Les accents sont rabattus sur la lettre nue : personne ne cherche
 * « Épée » sous un « É » qui n'existe pas dans l'index, et une rangée de
 * lettres accentuées en doublerait la longueur pour rien.
 */
function lettreDe(nom: string): string {
  const brut = nom.trim().charAt(0).toUpperCase();
  const nue = brut.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /^[A-Z]$/.test(nue) ? nue : "#";
}

export default function BrandGrid({
  brands,
  memoire = "marques",
  aside,
  favoris,
  notes,
  defaut = "confort",
  densite: densiteImposee,
  onDensite,
  lettre,
  onLettre,
  auDoigt = false,
  selecteur = true,
}: {
  brands: Brand[];
  /** Sous quel nom retenir la densité choisie pour cette liste. */
  memoire?: string;
  aside?: React.ReactNode;
  /** La densité au premier affichage. L'annuaire ouvre en `liste`. */
  defaut?: Densite;
  /** Densité tenue par le parent, quand il affiche le rail lui-même. */
  densite?: Densite;
  onDensite?: (d: Densite) => void;
  /** Lettre d'index tenue par le parent, quand elle part dans l'adresse. */
  lettre?: string | null;
  onLettre?: (l: string | null) => void;
  /**
   * Vrai sous 640 px, mesuré par le parent.
   *
   * L'annuaire le calcule déjà pour sa feuille de recherche : le passer
   * évite un second écouteur de redimensionnement, et surtout garantit
   * que les deux formes basculent au même pixel. Faux par défaut, ce qui
   * donne la rangée du grand écran — la bonne valeur pour une liste qui
   * ne mesure rien.
   */
  auDoigt?: boolean;
  selecteur?: boolean;
  /** Les marques déjà suivies. Absent = on n'affiche pas l'étoile. */
  favoris?: string[];
  /**
   * Les moyennes, par identifiant de marque.
   *
   * Un objet simple et non une Map : ces données traversent la
   * frontière du serveur vers le navigateur, et un objet est ce qui
   * passe le plus sûrement.
   */
  notes?: Record<string, { moyenne: number; avis: number }>;
}) {
  const suivies = new Set(favoris ?? []);
  const [open, setOpen] = useState<string | null>(null);
  const [combien, setCombien] = useState(LOT);
  /*
   * LA LETTRE PEUT ÊTRE TENUE PLUS HAUT, comme la densité juste au
   * dessus. L'annuaire la met dans l'adresse — `?lettre=a` — pour qu'un
   * lien partagé rouvre exactement le même écran ; les autres listes
   * n'ont rien à en faire et la laissent ici.
   */
  const [lettreLocale, setLettreLocale] = useState<string | null>(null);
  const lettreActive = lettre !== undefined ? lettre : lettreLocale;
  const poserLettre = onLettre ?? setLettreLocale;

  /*
   * Filtrer repart du début.
   *
   * Sans ça, quelqu'un qui a déroulé cent marques puis coche
   * « Bijoux » verrait la page essayer d'en afficher cent d'un coup,
   * ce qui est précisément la situation qu'on cherche à éviter. Le
   * tableau reçu change de référence à chaque filtre, ce qui suffit à
   * déclencher la remise à zéro.
   */
  useEffect(() => setCombien(LOT), [brands]);

  /*
   * Et la lettre choisie retombe aussi.
   *
   * Sans ça, quelqu'un qui filtre sur « W » puis coche « Denim » garde
   * un filtre de lettre invisible par-dessus le nouveau : la liste
   * paraît vide alors que trente marques correspondent. Deux filtres
   * dont un seul se voit, c'est toujours celui qu'on ne voit pas qu'on
   * accuse le site d'avoir cassé.
   */
  const premierLot = useRef(true);
  useEffect(() => {
    /* Sauf au tout premier rendu : `?lettre=a` vient justement d'en
       poser une, et l'effacer ici rouvrirait l'annuaire entier sur un
       lien qui demandait les A. */
    if (premierLot.current) {
      premierLot.current = false;
      return;
    }
    poserLettre(null);
    // `poserLettre` change d'identité à chaque rendu quand le parent la
    // tient : le remettre en dépendance relancerait l'effet en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands]);

  /*
   * EN MODE LISTE, L'ORDRE EST ALPHABÉTIQUE, ET C'EST LA CONDITION DE
   * L'INDEX.
   *
   * L'annuaire est mélangé à chaque visite (voir `ordonnerLAnnuaire`),
   * pour que les mêmes marques ne tiennent pas éternellement la
   * première page. C'est le bon comportement quand on flâne. Mais une
   * rangée de lettres qui promet « aller à S » n'a aucun sens sur une
   * liste où les S sont éparpillés : on saute à un endroit, et la
   * marque suivante commence par B.
   *
   * Chaque mode garde donc son ordre, et c'est cohérent avec ce qu'il
   * sert à faire : on flâne dans le désordre, on cherche dans l'ordre.
   */
  const alphabetique = useMemo(
    () =>
      [...brands].sort((a, b) =>
        a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
      ),
    [brands]
  );

  const lettresPleines = useMemo(
    () => new Set(alphabetique.map((b) => lettreDe(b.name))),
    [alphabetique]
  );

  /* L'épaisseur de chaque groupe, pour l'écrire à côté de son titre. Sur
     la liste ENTIÈRE et non sur ce qui est déplié : « M · 12 marques »
     au-dessus de trois lignes se lirait comme une erreur, alors que
     c'est la pagination qui n'en a montré que trois. */
  const parLettreCompte = useMemo(() => {
    const compte = new Map<string, number>();
    for (const b of alphabetique) {
      const l = lettreDe(b.name);
      compte.set(l, (compte.get(l) ?? 0) + 1);
    }
    return compte;
  }, [alphabetique]);

  /*
   * UNE LETTRE FILTRE, ELLE NE FAIT PLUS DÉFILER — ET C'EST UNE
   * CORRECTION DE BOGUE, PAS UN CHANGEMENT D'AVIS.
   *
   * Elle sautait à la lettre, ce qui obligeait à CHARGER tout ce qui la
   * précède : cliquer sur « W » dépliait cent quarante-quatre marques
   * d'un coup pour atteindre les cinq du bout. Sur un téléphone, chacune
   * garde en mémoire vive son logo et ses quatre vignettes décodés —
   * plusieurs mégaoctets par ligne — et l'onglet dépassait ce qu'iOS
   * accorde à une page. Safari la vidait et la rechargeait. De
   * l'extérieur : on clique sur « W », la page se relance, et l'on ne
   * voit jamais les W.
   *
   * C'est exactement le rechargement en boucle que la pagination par
   * lots de vingt-quatre existait pour empêcher (voir `LOT`) — et que le
   * saut contournait sans le savoir.
   *
   * Filtrer coûte au contraire moins que de ne rien faire : on affiche
   * les cinq marques en W et RIEN d'autre. C'est aussi ce que quelqu'un
   * veut dire en touchant « W » sur un annuaire de cent trente-six
   * entrées — « montre-moi les W », pas « fais défiler jusqu'aux W ».
   *
   * Retoucher la même lettre efface le filtre.
   */
  function allerA(choisie: string) {
    poserLettre(lettreActive === choisie ? null : choisie);
  }

  const parLettre = useMemo(
    () =>
      lettreActive ? alphabetique.filter((b) => lettreDe(b.name) === lettreActive) : null,
    [alphabetique, lettreActive]
  );

  const visiblesMelangees = brands.slice(0, combien);
  /*
   * Une lettre tient toujours dans un lot : la plus fournie d'un
   * annuaire en compte une vingtaine. On ne la pagine donc pas — la
   * dérouler d'un coup ne coûte rien et évite un « voir plus » qui ne
   * servirait jamais.
   */
  const visiblesAlpha = parLettre ?? alphabetique.slice(0, combien);
  const reste = parLettre ? 0 : brands.length - combien;

  const boutonApercu = (b: Brand) => (
    <button
      type="button"
      onClick={() => setOpen(b.slug)}
      aria-label={`Aperçu des pièces de ${b.name}`}
      className="puce-apercu inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white transition duration-200 active:scale-95"
    >
      {/* Un œil : le mot seul ne disait pas qu'on allait regarder sans
          quitter la page. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
      Aperçu
    </button>
  );

  return (
    <>
      {/* Les cartes du dessous remontent combler le vide laissé par
          celles du dessus. Une marque sans accroche est plus courte, et
          il n'y a aucune raison que sa voisine du dessous attende la
          fin de la rangée pour commencer. */}
      <Grille
        variante="marques"
        memoire={memoire}
        aside={aside}
        mosaique
        defaut={defaut}
        densite={densiteImposee}
        onDensite={onDensite}
        selecteur={selecteur}
      >
        {(densite) =>
          densite === "liste" ? (
            <>
              {/* L'index, posé en tête de la pile : c'est là que le
                  gabarit le veut, juste sous les filtres et au-dessus
                  de la première ligne. */}
              <IndexAlphabet
                pleines={lettresPleines}
                active={lettreActive}
                combien={parLettre?.length ?? 0}
                restantes={parLettre?.length ?? brands.length}
                auDoigt={auDoigt}
                onChoisir={allerA}
                onTout={() => poserLettre(null)}
              />

              {visiblesAlpha.map((b, i) => {
                const lettre = lettreDe(b.name);
                const premiere = i === 0 || lettreDe(visiblesAlpha[i - 1].name) !== lettre;

                return (
                  /*
                   * Un fragment et non un bloc : le titre de lettre et la
                   * ligne doivent être FRÈRES dans la pile. Enveloppés,
                   * ils auraient formé un seul élément, et l'espacement
                   * de la colonne se serait appliqué au groupe au lieu de
                   * séparer les lignes.
                   *
                   * Pas de `carte-eco-etroit` ici non plus : cette classe
                   * réserve 360 px de hauteur, celle d'une CARTE. Sur une
                   * ligne de quatre-vingts pixels, elle ferait sauter la
                   * barre de défilement à chaque groupe. Une ligne est de
                   * toute façon légère — un logo et quatre vignettes de
                   * cent soixante pixels.
                   */
                  <Fragment key={b.id}>
                    {premiere && (
                      /*
                       * LE COMPTE DU GROUPE À DROITE DU TITRE, et il a
                       * une raison : le rail parti, plus rien ne dit
                       * l'épaisseur d'une lettre pendant qu'on descend.
                       * On lisait « M » sans savoir s'il y en avait
                       * trois ou trente.
                       */
                      <h2
                        id={`lettre-${lettre}`}
                        className={`m-0 mb-1 flex items-baseline justify-between gap-3 scroll-mt-24 text-[26px] font-extrabold leading-none tracking-[-0.03em] text-white/42 ${
                          i === 0 ? "" : "mt-4"
                        }`}
                      >
                        {lettre}
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                          {parLettreCompte.get(lettre) ?? 0} marque
                          {(parLettreCompte.get(lettre) ?? 0) > 1 ? "s" : ""}
                        </span>
                      </h2>
                    )}
                    {/* `ligne-eco` met de côté ce qui est hors écran sur
                        téléphone : le navigateur cesse de peindre les
                        lignes qu'on ne regarde pas. Voir globals.css. */}
                    <div className="ligne-eco">
                      <LigneMarque
                        brand={b}
                        favori={favoris ? { initial: suivies.has(b.id) } : undefined}
                        onApercu={() => setOpen(b.slug)}
                        prioritaire={i < 10}
                      />
                    </div>
                  </Fragment>
                );
              })}

              {/*
               * QUATRE-VINGT-SEIZE PIXELS DE VIDE SOUS LA DERNIÈRE
               * MARQUE, et ce n'est pas une marge de confort : le bouton
               * d'index flotte à vingt pixels du bord bas et recouvre
               * tout ce qui passe dessous. Sans ce rembourrage, la
               * dernière ligne de la liste est sous le bouton, et il n'y
               * a aucun moyen de l'atteindre.
               */}
              {auDoigt && <div aria-hidden className="h-24" />}
            </>
          ) : (
            visiblesMelangees.map((b, i) => (
              /* `data-reveal` déplace l'animation de défilement sur
                 l'ensemble carte + bouton. Quand seule la carte bougeait,
                 le bouton restait en place et venait flotter au-dessus de
                 la carte de la ligne du dessus. */
              <div key={b.id} data-reveal className="carte-eco-etroit relative">
                <BrandCard
                  brand={b}
                  note={notes?.[b.id]}
                  favori={favoris ? { initial: suivies.has(b.id) } : undefined}
                  apercu={boutonApercu(b)}
                  // Les six premières sont dans le premier écran.
                  prioritaire={i < 6}
                />
              </div>
            ))
          )
        }
      </Grille>

      {reste > 0 && (
        /*
         * LE PIED REPREND LA MATIÈRE DE LA LIGNE DE FILTRES, et pas
         * celle d'une carte. Un bouton en carte claire au bas d'une
         * liste de cartes claires ressemblait à une entrée de plus, et
         * l'on cliquait dessus en croyant ouvrir une marque.
         *
         * Le compte D'ABORD, le bouton ensuite : « 24 sur 136 » est ce
         * qui décide de cliquer ou d'aller chercher autrement.
         */
        <div
          className="barre barre-pied mt-6 flex flex-col items-center gap-2.5 px-5 py-4 sm:flex-row sm:justify-center sm:gap-5"
        >
          <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/55">
            {Math.min(combien, brands.length)} sur {brands.length} affichées
          </p>
          <button
            type="button"
            onClick={() => setCombien((n) => n + LOT)}
            className="rounded-full bg-white px-5 py-2 text-[13px] font-extrabold text-[var(--color-ink)] transition active:scale-95"
          >
            Charger {Math.min(reste, LOT)} marque{Math.min(reste, LOT) > 1 ? "s" : ""} de plus
          </button>
          <p className="m-0 hidden text-[11.5px] font-semibold text-white/50 lg:block">
            ou tape ⌘K pour chercher directement
          </p>
        </div>
      )}

      {open && <BrandPreview slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/**
 * La rangée de lettres — et, au doigt, le bouton qui ouvre l'alphabet.
 *
 * UNE LETTRE VIDE RESTE VISIBLE MAIS S'ÉTEINT. La retirer ferait
 * glisser toutes les suivantes sous le doigt d'une recherche à l'autre :
 * on viserait « M » et l'on toucherait « N ». Une rangée qui garde
 * toujours la même forme se vise sans regarder, et l'extinction dit déjà
 * qu'il n'y a rien à y trouver.
 *
 * SUR TÉLÉPHONE, LE RAIL DU BORD DROIT EST PARTI. Vingt-sept lettres
 * dressées dans une pilule, c'était une liste qui défilait dans une
 * liste qui défile : dès qu'un écran était court, les dernières lettres
 * sortaient de la pilule et il fallait faire défiler l'index lui-même
 * pour atteindre le W. Les cibles y faisaient vingt-deux pixels, la
 * moitié de ce qu'un doigt demande, et la gouttière de trente pixels
 * qu'il réservait au bord droit coûtait à quatre endroits du code.
 *
 * À sa place, UN SEUL BOUTON SOUS LE POUCE, qui porte la lettre posée,
 * et une feuille où les vingt-sept cibles tiennent en quatre rangées —
 * toutes visibles, quelle que soit la hauteur de l'écran. Le geste
 * devient celui d'un menu et non d'une visée, et c'est déjà le couple
 * bouton + feuille de la vitrine.
 *
 * ⚠️ UNE SEULE DES DEUX FORMES EST RENDUE, ET C'EST LE JAVASCRIPT QUI
 * DÉCIDE. Les deux formes ne sont plus le même objet : d'un côté une
 * rangée de vingt-sept boutons, de l'autre un bouton qui en ouvre
 * vingt-sept ailleurs. Les faire coexister en CSS annoncerait
 * cinquante-quatre boutons à un lecteur d'écran. La mesure vient de
 * `BrandDirectory`, qui la fait déjà pour la feuille de recherche : une
 * seule mesure de largeur pour toute la page.
 *
 * ⚠️ ELLE FILTRE, ELLE NE FAIT PAS DÉFILER — voir `allerA`. Le bouton
 * lui ressemble pourtant beaucoup, et c'est justement pour ça que le
 * libellé dit « Lettre » et non « Aller à » : il ne promet pas un
 * défilement.
 */
function IndexAlphabet({
  pleines,
  active,
  combien,
  restantes,
  auDoigt,
  onChoisir,
  onTout,
}: {
  pleines: Set<string>;
  active: string | null;
  /** Combien de marques sous la lettre active. */
  combien: number;
  /** Combien de marques la page affiche derrière la feuille. */
  restantes: number;
  /** Vrai sous 640 px. Mesuré une seule fois, dans `BrandDirectory`. */
  auDoigt: boolean;
  onChoisir: (lettre: string) => void;
  onTout: () => void;
}) {
  const [feuille, setFeuille] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const dejaOuverte = useRef(false);

  /* En repassant au grand écran, la feuille n'a plus de raison d'être :
     la rangée est là, entière, sous les yeux. */
  useEffect(() => {
    if (!auDoigt) setFeuille(false);
  }, [auDoigt]);

  /*
   * LE FOCUS REVIENT SUR LE BOUTON QUAND LA FEUILLE SE REFERME.
   *
   * Sans ça, Échap renvoie au début du document : la personne qui
   * navigue au clavier repart du logo pour retrouver l'endroit où elle
   * était. Le bouton est démonté pendant que la feuille est ouverte, il
   * revient donc neuf — d'où le drapeau, qui empêche de voler le focus
   * au premier rendu de la page.
   */
  useEffect(() => {
    if (feuille) {
      dejaOuverte.current = true;
      return;
    }
    if (dejaOuverte.current) bouton.current?.focus();
  }, [feuille]);

  const legende = "Les lettres pâles n'ont aucune marque avec ces filtres";

  if (auDoigt) {
    return (
      <>
        {/*
         * LE BOUTON EST EN BAS À DROITE, ET C'EST LE POINT DE L'ÉCRAN.
         * Sauter à une lettre est le geste qu'on refait dix fois en
         * parcourant cent trente-six marques ; il doit être là où le
         * pouce se trouve déjà. Il porte la lettre posée, donc il dit
         * aussi ce qui filtre la liste — ce qu'un rail refermé sur
         * lui-même ne disait plus.
         *
         * `z-40` : au-dessus de la liste, SOUS les feuilles. Quand
         * celle de la recherche ou des filtres s'ouvre, son voile le
         * recouvre, et il n'y a aucune condition à écrire pour ça.
         */}
        {!feuille && (
          <button
            ref={bouton}
            type="button"
            onClick={() => setFeuille(true)}
            aria-haspopup="dialog"
            aria-controls="index-alphabet"
            aria-expanded={feuille}
            aria-label={active ? `Lettre ${active} — changer` : "Aller à une lettre"}
            className="bouton-index fixed z-40 inline-flex h-[54px] items-center gap-3 rounded-full bg-white pl-5 pr-2 text-[19px] font-black tracking-[-0.01em] text-[var(--color-ink)] transition active:scale-[.97]"
            style={{
              right: "calc(env(safe-area-inset-right, 0px) + 16px)",
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            }}
          >
            {active ?? "A–Z"}
            {/* Le rond est ce qui dit « ça ouvre quelque chose » : sans
                lui, le bouton se lit comme une étiquette. */}
            <span
              aria-hidden
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-white"
            >
              <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h9" />
              </svg>
            </span>
          </button>
        )}

        <FeuilleFiltres
          ouvert={feuille}
          onFermer={() => setFeuille(false)}
          id="index-alphabet"
          titre="Aller à une lettre"
          pied={
            <button
              type="button"
              onClick={() => setFeuille(false)}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.98]"
            >
              Voir {restantes > 1 ? "les" : "la"} {restantes} marque
              {restantes > 1 ? "s" : ""}
            </button>
          }
        >
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.2em] text-white/72">
              Aller à la lettre
            </p>
            {/* La sortie, et seulement quand il y a de quoi sortir. */}
            {active && (
              <button
                type="button"
                onClick={() => {
                  onTout();
                  setFeuille(false);
                }}
                className="text-[12.5px] font-bold text-white underline underline-offset-[3px]"
              >
                Tout afficher
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {LETTRES.map((l) => {
              const dispo = pleines.has(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    onChoisir(l);
                    setFeuille(false);
                  }}
                  disabled={!dispo}
                  aria-label={
                    active === l ? `Afficher toutes les marques` : `Voir les marques en ${l}`
                  }
                  aria-current={active === l ? "true" : undefined}
                  /* Quarante-quatre pixels de haut : c'est la cible d'un
                     doigt, et c'est tout l'objet de ce chantier. */
                  className={`grid h-[44px] place-items-center rounded-[12px] text-[15px] font-extrabold transition ${
                    active === l
                      ? "bg-white text-[var(--color-ink)]"
                      : dispo
                        ? "bg-white/12 text-white active:scale-95"
                        : "cursor-default bg-white/[0.03] text-white/24"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>

          {/*
            LA LÉGENDE SUIT L'ALPHABET LÀ OÙ IL EST, et c'est pour ça
            qu'elle est écrite ici plutôt que rendue deux fois. Sans
            elle, une grille à moitié éteinte passe pour un défaut
            d'affichage : elle est la seule chose qui dise que les
            lettres suivent les filtres posés au-dessus.
          */}
          <p className="m-0 mt-3.5 text-center text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/55">
            {legende}
          </p>
        </FeuilleFiltres>
      </>
    );
  }

  return (
    <div className="mb-2">
      <nav
        aria-label="Index alphabétique des marques"
        /* UNE SEULE RANGÉE, JUSTIFIÉE D'UN BORD À L'AUTRE, sans matière :
           c'est l'outil de navigation le plus utilisé de la page, il
           prend donc toute la largeur au lieu d'être traité comme une
           légende.

           `hidden sm:flex` en plus de la mesure : le premier rendu se
           fait toujours en « grand écran », avant que `matchMedia` ait
           répondu. Sur un téléphone, cette rangée-là déborderait de
           l'écran le temps d'une image. */
        className="hidden w-full flex-row flex-nowrap items-center justify-between gap-0 sm:flex"
      >
        {LETTRES.map((l) => {
          const dispo = pleines.has(l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => onChoisir(l)}
              disabled={!dispo}
              aria-label={
                active === l ? `Afficher toutes les marques` : `Voir les marques en ${l}`
              }
              aria-current={active === l ? "true" : undefined}
              /*
               * TOUTES LES LETTRES PORTENT LE MÊME REMBOURRAGE, pas
               * seulement celle qui est posée. Deux raisons, et la
               * seconde compte plus que la première : la rangée ne
               * grandit pas de six pixels sous les yeux au moment où
               * l'on choisit une lettre, et surtout un « W » de onze
               * pixels de large devient une cible de vingt-sept, ce qui
               * est la différence entre viser et attraper. Le blanc ne
               * se voit que sur la lettre courante ; la boîte, elle,
               * existe pour les vingt-six autres.
               */
              className={`grid min-w-[26px] shrink-0 place-items-center rounded-[6px] px-2 pb-[5px] pt-[4px] text-[15px] font-extrabold transition ${
                active === l
                  ? "bg-white text-[var(--color-ink)]"
                  : dispo
                    ? "text-white hover:text-[rgb(var(--accent-1))]"
                    : "cursor-default text-white/32"
              }`}
            >
              {l}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="m-0 hidden text-[11px] font-bold uppercase tracking-[0.14em] text-white/68 sm:block">
          {legende}
        </p>

        {active && combien > 0 && (
          <span className="flex items-center gap-2 text-[11.5px] font-semibold text-white/60">
            {active} — {combien} marque{combien > 1 ? "s" : ""}
            {/* Une sortie visible : sans elle, il faut deviner qu'on
                retouche la même lettre pour tout revoir. */}
            <button
              type="button"
              onClick={onTout}
              className="font-bold text-white/75 underline underline-offset-2 hover:text-white"
            >
              Tout afficher
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
