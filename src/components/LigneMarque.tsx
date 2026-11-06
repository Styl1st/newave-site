"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import FavoriteButton from "./FavoriteButton";
import { IconEye } from "./Icons";
import { enChiffres } from "./chiffres";
import Notee from "./coeurs/Notee";
import type { Elan } from "./coeurs/classement";
import { vignette } from "@/lib/vignette";
import { chargerApercu, semerApercu, useApercuInitial } from "@/lib/apercus-client";
import { ACCES_ETIQUETTE, unAcces } from "@/lib/acces";
import type { FicheDAnnuaire } from "@/lib/fiche-annuaire";

/**
 * Une marque sur une seule ligne, avec ce qu'elle fabrique posé dedans.
 *
 * DEUX HABITS. `carte` (par défaut) : la ligne claire, dans sa carte,
 * celle des classements et des favoris. `halo` : la ligne de l'annuaire,
 * posée à même le fond entre deux filets, qu'un halo aux couleurs de
 * l'ambiance éclaire sous la souris (voir `Halo` et `.ligne-halo`). Au
 * doigt, il n'y a pas de survol : c'est la ligne qui passe au milieu de
 * l'écran qui s'allume, pendant qu'on fait défiler.
 *
 * POURQUOI CETTE FORME EXISTE À CÔTÉ DE LA CARTE. Une grille de cartes
 * est faite pour flâner : de grandes images, peu d'entrées à l'écran,
 * et l'on descend jusqu'à ce que quelque chose accroche. Passé une
 * centaine de marques, ce n'est plus flâner, c'est chercher — et l'on
 * cherche mal en faisant défiler des vignettes de trois cents pixels.
 * La ligne met dix marques là où la grille en met trois, en gardant le
 * nom lisible.
 *
 * ET SURTOUT ELLE MONTRE LES PIÈCES. C'est la vraie idée de cet écran :
 * quatre photos posées DANS la ligne répondent à la question qu'on se
 * pose devant un annuaire — « ils font quoi, au juste ? » — sans ouvrir
 * la fiche, donc sans perdre sa place dans la liste. Un aller-retour
 * évité par marque, sur cent trente-six marques.
 *
 * ON NE CHARGE RIEN TANT QUE LA LIGNE EST LOIN. Même mécanique que
 * `VitrineMarque` et pour la même raison : cent trente-six requêtes
 * lancées d'un coup pour des photos qu'on ne verra pas, c'est la page
 * qui rame avant d'avoir rien montré.
 *
 * ELLE SERT AUSSI AUX CLASSEMENTS ET AUX FAVORIS. Ces deux écrans
 * demandent exactement la même ligne — logo, identité, quatre pièces,
 * action, cœur — plus, pour le classement, deux colonnes de chiffres.
 * D'où `rang` et `coeurs`, tous deux facultatifs : une ligne
 * d'annuaire ne les passe pas et ne change pas d'un pixel.
 *
 * ⚠️ `coeurs` ET `note` OCCUPENT LA MÊME PLACE, ET JAMAIS EN MÊME TEMPS.
 * Le classement des marques les mieux notées avait besoin de la même
 * ligne, avec une autre mesure : une colonne de plus l'aurait rendue
 * plus longue sur l'onglet des notes que sur celui des cœurs — deux
 * gabarits pour une seule page. Surtout, un cœur et une note affichés
 * côte à côte inviteraient à les additionner, alors que le favori dit
 * qu'on suit et que l'avis dit que c'est bon. Une seule mesure par
 * ligne : c'est la règle d'`ONGLETS`, appliquée jusque dans la balise.
 */

/** Quatre : ça tient dans la ligne, et ça suffit à dire le style. */
const CASES = 4;

/**
 * Le cœur plein, celui des compteurs.
 *
 * Il est exporté parce que le podium du classement et l'état vide des
 * favoris affichent le même geste : deux dessins de cœur légèrement
 * différents sur une même page se remarquent tout de suite.
 */
export function CoeurPlein({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className ?? "h-3.5 w-3.5"}
    >
      <path d="M12 20.5 4.3 13a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9A4.8 4.8 0 0 1 19.7 13Z" />
    </svg>
  );
}

export default function LigneMarque({
  brand,
  favori,
  onApercu,
  rang,
  coeurs,
  elan,
  note,
  prioritaire = false,
  variante = "carte",
}: {
  /** Une fiche complète convient aussi : la ligne n'en lit pas plus. */
  brand: FicheDAnnuaire;
  /** Présent = on affiche le cœur, avec son état de départ. */
  favori?: { initial: boolean };
  /** Ouvre le panneau d'aperçu. Absent = le bouton mène à la fiche. */
  onApercu?: () => void;
  /** Place au classement, posée avant le logo. Absent = pas de rang. */
  rang?: number;
  /** Cœurs reçus, à droite. Absent = la ligne ne classe rien. */
  coeurs?: number;
  /**
   * La part reçue sur la fenêtre, À LA PLACE des cœurs.
   *
   * Jamais avec : c'est la même colonne, et deux nombres côte à côte
   * inviteraient à les comparer alors qu'ils ne se comparent pas.
   */
  elan?: Elan;
  /**
   * La note moyenne et son nombre d'avis, À LA PLACE DES CŒURS.
   *
   * Jamais avec eux : voir l'avertissement en tête de fichier. Le type
   * est écrit ici plutôt qu'importé d'`@/lib/avis`, qui est un module
   * « use server » — le même arbitrage que `ProductCard`.
   */
  note?: { moyenne: number; avis: number };
  /**
   * Dans le premier écran : le visuel part tout de suite et en priorité,
   * au lieu d'attendre la mise en page comme une image `lazy`.
   */
  prioritaire?: boolean;
  /** L'habit de la ligne. Voir l'en-tête du fichier. */
  variante?: "carte" | "halo";
}) {
  const halo = variante === "halo";
  const ancre = useRef<HTMLDivElement>(null);
  /*
   * LES PREMIÈRES LIGNES ARRIVENT PLEINES. Leurs photos ont été lues
   * avec la page (voir `ApercusInitiaux`) : elles sont dans le HTML, et
   * la ligne n'a rien à demander. Les autres partent vides et se
   * remplissent en approchant.
   */
  const initial = useApercuInitial(brand.slug);
  const [pieces, setPieces] = useState<string[]>(() => initial?.images.slice(0, CASES) ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  /*
   * « Pas encore de réponse » et « rien à montrer » ne sont pas la même
   * chose, et les confondre affiche « pas encore de pièces » sur une
   * marque qui en a quarante, le temps que la requête revienne.
   */
  const [cherche, setCherche] = useState(!initial);

  useEffect(() => {
    if (initial) {
      /* Rangée pour les autres : la carte de la grille, la recherche. */
      semerApercu(brand.slug, initial);
      return;
    }
    const el = ancre.current;
    if (!el) return;
    let vivant = true;

    const guetteur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        guetteur.disconnect();

        /* Une demande par marque et par visite, partagée avec les
           autres composants : voir `chargerApercu`. Déjà dédoublonnée :
           quatre fois la même photo dans une ligne de quatre, c'est une
           ligne qui ne dit rien. */
        chargerApercu(brand.slug)
          .then(({ images, total: tout }) => {
            if (!vivant) return;
            setPieces(images.slice(0, CASES));
            setTotal(tout);
            setCherche(false);
          })
          .catch(() => {
            if (vivant) setCherche(false);
          });
      },
      /*
       * Huit cents pixels d'avance, et non trois cents : la réponse est
       * devenue légère (huit adresses), on peut la demander deux ou
       * trois lignes avant qu'elle ne serve, et la trouver prête.
       */
      { rootMargin: "800px" }
    );

    guetteur.observe(el);
    return () => {
      vivant = false;
      guetteur.disconnect();
    };
  }, [brand.slug, initial]);

  /*
   * AU DOIGT, LA LUMIÈRE SUIT LE DÉFILEMENT.
   *
   * Sans souris, le halo n'a rien à suivre. La ligne qui traverse le
   * milieu de l'écran s'allume donc à sa place : une bande de quelques
   * pour cent, au centre, que guette un `IntersectionObserver`. Pas
   * d'écouteur de défilement, pas de calcul à chaque image : c'est le
   * navigateur qui prévient quand une ligne entre ou sort de la bande.
   * L'état est posé en attribut, sans rendu React.
   */
  useEffect(() => {
    const el = ancre.current;
    if (!el || !halo) return;
    if (!window.matchMedia("(hover: none)").matches) return;

    const guetteur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) el.dataset.centre = "1";
          else delete el.dataset.centre;
        }
      },
      { rootMargin: "-46% 0px -46% 0px" }
    );
    guetteur.observe(el);
    return () => guetteur.disconnect();
  }, [halo]);

  const visuel = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  const acces = unAcces(brand.acces);
  const etiquetteAcces = acces === "ouvert" ? null : ACCES_ETIQUETTE[acces];

  /*
   * La sous-ligne : d'où, puis quoi. L'origine d'abord parce que c'est
   * ce qu'on cherche le plus souvent dans un annuaire de marques
   * indépendantes, et deux catégories au plus — la troisième déborde sur
   * une ligne de mille pixels comme sur un téléphone.
   */
  const sousLigne = [
    [brand.city, brand.country].filter(Boolean).join(halo ? ", " : " · "),
    ...brand.categories.slice(0, 2),
  ]
    .filter(Boolean)
    .join(halo ? ", " : " · ");

  const vide = !cherche && pieces.length === 0;

  /*
   * AUTANT DE CASES QUE DE PHOTOS, PAS UNE DE PLUS.
   *
   * Une marque qui n'a que deux pièces affichait deux photos puis deux
   * cases grises : la ligne avait l'air de ne pas avoir fini de charger.
   * Une fois la réponse arrivée, on ne pose donc que les cases qui ont
   * quelque chose à montrer. La grille reste à quatre colonnes, pour que
   * les vignettes gardent la même taille et le même alignement d'une
   * ligne à l'autre : la place restante est simplement laissée libre.
   *
   * Pendant le chargement, les quatre cases grises restent : là, elles
   * annoncent bien quelque chose.
   *
   * Au doigt, le bouton d'aperçu prend la case qui suit la dernière
   * photo (ou la quatrième quand la bande est pleine). Quand cette case
   * n'existe que pour lui, elle disparaît à la souris, où le bouton
   * « Aperçu » vit déjà à droite.
   */
  const caseBouton = !onApercu
    ? -1
    : cherche
      ? CASES - 1
      : Math.min(pieces.length, CASES - 1);
  const nbCases = cherche ? CASES : Math.max(pieces.length, caseBouton + 1);
  /* Le « +8 » ne parle que d'une bande pleine : avec moins de quatre
     photos, il n'y a rien d'autre à voir. */
  const reste = pieces.length === CASES ? total - CASES : 0;

  /* Les blocs laissent passer le clic vers le lien étalé sous la ligne ;
     seuls les boutons le reprennent. Même procédé que `BrandCard`. */
  const bloc = "pointer-events-none relative z-3";

  /*
   * UNE LIGNE DE CLASSEMENT PORTE DEUX COLONNES DE PLUS, ET IL FAUT LES
   * LOGER QUELQUE PART.
   *
   * Le rang et le total de cœurs prennent à eux deux la centaine de
   * pixels qu'il restait à la bande de vignettes sur une tablette : la
   * ligne dépassait alors de sa carte, sans que rien ne le rattrape
   * puisqu'elle est en `flex-nowrap` dès 640 pixels.
   *
   * La ligne de classement recule donc son repli d'un cran : la bande
   * garde sa propre ligne jusqu'à 1024 pixels, comme elle le fait sur
   * téléphone, et ne remonte à côté de l'identité que lorsqu'il y a
   * vraiment la place. Une ligne d'annuaire, qui n'a pas ces colonnes,
   * ne change pas d'un pixel.
   *
   * Les classes sont écrites en toutes lettres et non composées à la
   * volée : Tailwind lit le fichier tel quel, un préfixe calculé ne
   * produirait aucune règle.
   */
  const serree =
    rang !== undefined || coeurs !== undefined || elan !== undefined || note !== undefined;

  const rangee = halo
    ? "ligne-halo group relative flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-5"
    : serree
      ? "card-light group relative flex flex-wrap items-center gap-3 overflow-hidden p-3.5 sm:gap-4 sm:p-4 lg:flex-nowrap"
      : "card-light group relative flex flex-wrap items-center gap-3 overflow-hidden p-3.5 sm:flex-nowrap sm:gap-4 sm:p-4";

  const identite = serree
    ? `${bloc} min-w-0 flex-1 lg:w-[240px] lg:flex-none`
    : halo
      ? `${bloc} ligne-halo-identite min-w-0 flex-1 sm:w-[260px] sm:flex-none`
      : `${bloc} min-w-0 flex-1 sm:w-[240px] sm:flex-none`;

  const bande = serree
    ? `${bloc} order-last w-full lg:order-none lg:w-auto lg:min-w-0 lg:flex-1`
    : `${bloc} order-last w-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1`;

  const actions = serree
    ? `${bloc} ml-auto flex shrink-0 items-center gap-2 lg:ml-0`
    : `${bloc} ml-auto flex shrink-0 items-center gap-2 sm:ml-0`;

  return (
    <div ref={ancre} className={rangee} data-halo={halo ? "" : undefined}>
      {/* Le décor de la ligne : les deux filets, le halo et les traits
          qu'il allume. Tout est en CSS, voir `.ligne-halo`. */}
      {halo && (
        <span className="ligne-halo-decor" aria-hidden="true">
          <span className="ligne-halo-trait" />
        </span>
      )}

      {/*
       * Le lien passe DERRIÈRE la ligne, en calque. Un <button> ne peut
       * pas vivre dans un <a> — le navigateur refuse cette imbrication —
       * et le cœur comme l'aperçu doivent garder leur propre clic.
       */}
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        /* La flèche s'ouvre déjà toute seule sur un lien ; le mot dit
           seulement CE QUE le clic va faire. Voir `Curseur.tsx`. */
        data-curseur-mot="Ouvrir"
        className="absolute inset-0 z-2"
      />

      {/* 0. Le rang, quand la ligne sert un classement.
             En chiffres nus et non en médaille : une médaille par ligne
             sur cinquante lignes ne hiérarchise plus rien, et le podium
             juste au-dessus s'est déjà chargé de distinguer les trois
             premières. Il passe avant le logo parce que c'est la
             colonne qu'on suit du regard en descendant. */}
      {rang !== undefined && (
        <div
          className={`${bloc} w-[18px] shrink-0 text-[15px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#8a7bab] sm:w-[26px] sm:text-[17px] lg:w-[46px] lg:text-[20px]`}
        >
          {/* Un chiffre nu, lu à voix haute, ne dit pas ce qu'il compte. */}
          <span className="sr-only">
            {rang === 1 ? "Première" : `${rang}ᵉ`} place du classement
          </span>
          <span aria-hidden="true">{rang}</span>
        </div>
      )}

      {/* 1. Le logo. Un logo se montre en entier, une photo peut remplir
             son cadre : lui couper le nom serait lui retirer ce qui
             sert justement à la reconnaître. */}
      <div
        className={
          halo
            ? `${bloc} ligne-halo-logo grid h-[54px] w-[54px] shrink-0 place-items-center overflow-hidden rounded-[16px] sm:h-[64px] sm:w-[64px] ${estUnLogo ? "est-un-logo" : ""}`
            : `${bloc} grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[rgba(23,10,51,0.06)] sm:h-[62px] sm:w-[62px]`
        }
      >
        {visuel ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vignette(visuel, 160, { logo: estUnLogo })}
            alt=""
            loading={prioritaire ? "eager" : "lazy"}
            fetchPriority={prioritaire ? "high" : "auto"}
            decoding="async"
            className={`h-full w-full ${estUnLogo ? "object-contain p-1.5" : "object-cover"}`}
          />
        ) : (
          <span className="text-[20px] font-black text-[#a795c9]">
            {brand.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      {/* 2. L'identité. */}
      <div className={identite}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3
            className={
              halo
                ? "m-0 min-w-0 truncate text-[20px] font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-[24px]"
                : "m-0 min-w-0 truncate text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)] sm:text-[16px]"
            }
          >
            {brand.name}
          </h3>
          {brand.featured && <span className="badge shrink-0">À la une</span>}
          {etiquetteAcces && (
            <span
              className={
                halo
                  ? "shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-white ring-1 ring-white/25"
                  : "shrink-0 rounded-full bg-[var(--color-ink)] px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-white"
              }
            >
              {etiquetteAcces}
            </span>
          )}
        </div>
        {sousLigne && (
          <p
            className={
              halo
                ? "m-0 mt-1.5 truncate text-[12.5px] font-semibold text-white/72 sm:text-[13px]"
                : "m-0 mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]"
            }
          >
            {sousLigne}
          </p>
        )}
      </div>

      {/* 3. Ce qu'elle fabrique. Sur téléphone la bande passe à la ligne
             et prend toute la largeur : quatre vignettes serrées entre
             un logo et deux boutons ne montreraient plus rien. */}
      <div className={bande}>
        {vide ? (
          <div
            className={
              halo
                ? "grid h-[52px] place-items-center rounded-[12px] bg-white/6 sm:h-[58px]"
                : "grid h-[52px] place-items-center rounded-[10px] bg-[rgba(23,10,51,0.05)] sm:h-[58px]"
            }
          >
            <span
              className={
                halo
                  ? "text-[12px] font-semibold text-white/60"
                  : "text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8a7bab]"
              }
            >
              Pas encore de pièces
            </span>
          </div>
        ) : (
          <div className={halo ? "grid grid-cols-4 gap-1.5 sm:gap-2" : "grid grid-cols-4 gap-1.5"}>
            {Array.from({ length: nbCases }).map((_, i) => {
              const source = pieces[i];
              const derniere = i === CASES - 1;
              /*
               * AU DOIGT, LA QUATRIÈME VIGNETTE EST LE BOUTON.
               *
               * Sur téléphone, la ligne s'est déjà repliée en deux
               * étages : identité en haut, bande de vignettes en bas. Un
               * bouton « Aperçu » de plus lui ajoutait un troisième
               * rang, et la ligne passait la barre des deux cents
               * pixels — on n'en voyait plus que trois par écran, ce qui
               * annule tout l'intérêt du mode liste.
               *
               * La dernière case porte donc le geste au lieu d'une
               * quatrième photo. Elle disait déjà « il y en a huit
               * autres » ; elle dit maintenant « il y en a huit autres,
               * touche ici pour les voir », ce qui est la même idée
               * menée à son terme. Trois photos suffisent à dire le
               * style.
               */
              const enBouton = i === caseBouton;
              /* Une case qui ne porte que le bouton, sans photo dessous. */
              const seulBouton = enBouton && !source && !cherche;

              return (
                <div
                  key={i}
                  className={`relative aspect-square overflow-hidden ${
                    halo
                      ? "ligne-halo-vignette rounded-[12px] bg-white/8"
                      : "rounded-[10px] bg-[rgba(23,10,51,0.05)]"
                  } ${seulBouton ? "sm:hidden" : ""}`}
                >
                  {source && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      /* Elle arrive en fondu plutôt que d'un coup : voir
                         `image-progressive`. */
                      data-progressif=""
                      suppressHydrationWarning
                      src={vignette(source, 160)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      /* En habit `halo`, la photo reste sous le bouton,
                         assombrie : une case pleine d'encre pesait plus
                         lourd que les trois photos d'à côté. */
                      className={`h-full w-full object-cover ${enBouton && !halo ? "hidden sm:block" : ""}`}
                    />
                  )}
                  {derniere && reste > 0 && source && (
                    /*
                     * Le compte par-dessus la photo, pas à sa place. Une
                     * case « +8 » vide, c'est une photo de moins montrée
                     * pour un chiffre qui tient dans un coin.
                     */
                    <span
                      className={`absolute inset-0 grid place-items-center bg-[rgba(var(--voile),0.66)] text-[11px] font-extrabold text-white ${
                        enBouton ? "hidden sm:grid" : ""
                      }`}
                    >
                      +{reste}
                    </span>
                  )}
                  {enBouton && (
                    <button
                      type="button"
                      onClick={onApercu}
                      aria-label={`Aperçu des pièces de ${brand.name}`}
                      className={`pointer-events-auto absolute inset-0 grid place-items-center gap-0.5 transition active:scale-95 sm:hidden ${
                        halo
                          ? "bg-[rgba(var(--voile),0.68)] text-[#fff]"
                          : "bg-[var(--color-ink)] text-white"
                      }`}
                    >
                      <IconEye className="h-4 w-4" />
                      {reste > 0 && (
                        <span className="text-[10.5px] font-extrabold leading-none">+{reste}</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4, 5 et 6. Le total, l'aperçu et le cœur. Sur téléphone ils
             remontent au bout de la première ligne, à droite du nom. */}
      <div className={actions}>
        {coeurs !== undefined && (
          /*
           * Le chiffre porte son cœur, et c'est ce qui le rend lisible
           * sans en-tête de colonne : la ligne est une bande souple, pas
           * une grille, et un intitulé posé au-dessus se décalerait de sa
           * colonne dès que la largeur change.
           */
          <span
            title={`${enChiffres(coeurs)} ${coeurs > 1 ? "personnes suivent" : "personne suit"} cette marque`}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-extrabold tabular-nums text-[var(--color-ink)] sm:mr-1 sm:text-[17px]"
          >
            <CoeurPlein className="h-3 w-3 text-[#8a7bab] sm:h-3.5 sm:w-3.5" />
            {enChiffres(coeurs)}
          </span>
        )}

        {/*
          L'ÉLAN S'ÉCRIT EN POUR CENT, ET SANS CŒUR À CÔTÉ.
          Un cœur suivi de « 18 » se lit « dix-huit cœurs » ; ici c'est
          une part, et le signe pour cent est ce qui l'empêche d'être
          confondue avec un volume. Les deux nombres qui la fabriquent
          sont dans l'infobulle : une part sans son total ne se vérifie
          pas.
        */}
        {elan && (
          <span
            title={`${enChiffres(elan.fenetre)} sur ${enChiffres(elan.total)} cœurs`}
            className="inline-flex shrink-0 items-baseline gap-0.5 text-[13px] font-extrabold tabular-nums text-[var(--color-ink)] sm:mr-1 sm:text-[17px]"
          >
            {elan.part}
            <span className="text-[9px] font-black sm:text-[11px]">%</span>
          </span>
        )}

        {/* La même note que sur une ligne de pièce, au même endroit et
            avec le même dessin. Voir `coeurs/Notee`. */}
        {note && <Notee note={note} />}

        {vide || !onApercu ? (
          /*
           * Rien à prévisualiser : le bouton dit alors ce qu'il fait
           * vraiment. Ouvrir un panneau vide sur « Aperçu » est la
           * façon la plus sûre de faire croire à une page cassée.
           */
          <Link
            href={`/marques/${brand.slug}`}
            className={
              halo
                ? "bouton-halo pointer-events-auto hidden shrink-0 sm:inline-flex"
                : "pointer-events-auto hidden shrink-0 rounded-full bg-[rgba(23,10,51,0.1)] px-3.5 py-2 text-[10.5px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)] transition hover:bg-[rgba(23,10,51,0.18)] active:scale-95 sm:inline-block"
            }
          >
            Voir la fiche
          </Link>
        ) : (
          <button
            type="button"
            onClick={onApercu}
            aria-label={`Aperçu des pièces de ${brand.name}`}
            /* Au doigt, c'est la dernière vignette qui porte le geste :
               deux boutons pour la même chose sur une ligne de quatre
               cents pixels, c'est un de trop. */
            className={
              halo
                ? "bouton-halo pointer-events-auto hidden shrink-0 sm:inline-flex"
                : "pointer-events-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-3 py-2 text-[10.5px] font-black uppercase tracking-[0.1em] text-white transition hover:opacity-90 active:scale-95 sm:inline-flex sm:px-3.5"
            }
          >
            <IconEye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Aperçu</span>
          </button>
        )}

        {favori && (
          <div className={halo ? "coeur-halo pointer-events-auto" : "pointer-events-auto"}>
            <FavoriteButton
              brandId={brand.id}
              initial={favori.initial}
              etiquette={brand.name}
              taille={halo ? "compacte" : "claire"}
              /* Quarante-quatre pixels au doigt, trente-six à la souris :
                 c'est la cible minimale de la section mobile, et le cœur
                 est le seul bouton qui reste sur la première ligne. */
              className="h-11 w-11 sm:h-9 sm:w-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}
