"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  const [lettreActive, setLettreActive] = useState<string | null>(null);

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
  useEffect(() => setLettreActive(null), [brands]);

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
  function allerA(lettre: string) {
    setLettreActive((actuelle) => (actuelle === lettre ? null : lettre));
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
                onChoisir={allerA}
                onTout={() => setLettreActive(null)}
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
                      <h2
                        id={`lettre-${lettre}`}
                        className={`m-0 mb-1 scroll-mt-24 text-[26px] font-extrabold leading-none tracking-[-0.03em] text-white/42 ${
                          i === 0 ? "" : "mt-4"
                        }`}
                      >
                        {lettre}
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
                      />
                    </div>
                  </Fragment>
                );
              })}
            </>
          ) : (
            visiblesMelangees.map((b) => (
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
        <div className="mt-6 flex flex-col items-center gap-2.5 rounded-[999px] border border-white/20 bg-[rgba(8,2,30,0.44)] px-5 py-4 backdrop-blur-[20px] sm:flex-row sm:justify-center sm:gap-5">
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
 * La rangée de lettres.
 *
 * UNE LETTRE VIDE RESTE VISIBLE MAIS S'ÉTEINT. La retirer ferait
 * glisser toutes les suivantes sous le doigt d'une recherche à l'autre :
 * on viserait « M » et l'on toucherait « N ». Une rangée qui garde
 * toujours la même forme se vise sans regarder, et l'extinction dit déjà
 * qu'il n'y a rien à y trouver.
 */
function IndexAlphabet({
  pleines,
  active,
  combien,
  onChoisir,
  onTout,
}: {
  pleines: Set<string>;
  active: string | null;
  /** Combien de marques sous la lettre active. */
  combien: number;
  onChoisir: (lettre: string) => void;
  onTout: () => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      {/* « Lettre » et non « Aller à » : le mot promettait un défilement,
          et l'on filtre. Un libellé qui décrit autre chose que ce qui se
          passe est un bogue à lui seul. */}
      <span className="eyebrow m-0 mr-1 text-white/45">Lettre</span>

      <div className="flex flex-wrap gap-0.5">
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
              className={`grid h-[26px] min-w-[26px] place-items-center rounded-[8px] px-1 text-[12px] transition ${
                active === l
                  ? "bg-white font-black text-[var(--color-ink)]"
                  : dispo
                    ? "font-extrabold text-white hover:bg-white/15"
                    : "cursor-default font-extrabold text-white/24"
              }`}
            >
              {l}
            </button>
          );
        })}
      </div>

      {active && combien > 0 && (
        <span className="flex items-center gap-2 text-[11.5px] font-semibold text-white/55">
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
  );
}
