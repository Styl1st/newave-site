import type { Metadata } from "next";
import Link from "next/link";
import ClassementEnRayons from "@/components/coeurs/ClassementEnRayons";
import PhraseDuClassement from "@/components/coeurs/PhraseDuClassement";
import type { MenuDeLaPhrase } from "@/components/coeurs/PhraseDuClassement";
import PremierCoeur from "@/components/coeurs/PremierCoeur";
import RailDesCoeurs from "@/components/coeurs/RailDesCoeurs";
import type { EnTeteDuRail } from "@/components/coeurs/RailDesCoeurs";
import type { Contenu, Mesure, Quoi } from "@/components/coeurs/classement";
import {
  laMesure,
  leQuoi,
  MESURE_URL,
  LIEN_DE_LA_PERIODE,
  MOT_DE_LA_MESURE_LUE,
  MOT_DE_LA_PERIODE,
  MOT_DU_QUOI,
} from "@/components/coeurs/classement";
import {
  MISES_DE_COTE_RECENTES,
  RESERVE_A_DECOUVRIR,
  SEUIL_PODIUM,
} from "@/components/coeurs/seuils";
import { enChiffres } from "@/components/chiffres";
import { getMostLiked, getMyLikes, getTotauxLikes } from "@/lib/likes";
import { getDerniersFavoris, getMyFavorites, getPaysageDesCoeurs } from "@/lib/favorites";
import type { PaysageDesCoeurs, PeriodeCoeurs } from "@/lib/favorites";
import { melanger } from "@/lib/melange";
import { rayonDe } from "@/lib/rayons";
import { avisMinimum, getMieuxNoteesMarques, getMieuxNoteesPieces } from "@/lib/avis";

export const metadata: Metadata = {
  title: "Coups de cœur",
  description:
    "Les pièces les plus aimées et les marques les plus suivies par la communauté NEWAVE SPHERE.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    quoi?: string;
    mesure?: string;
    periode?: string;
  }>;
};

/*
 * Trois gestes, trois classements, et surtout : jamais mélangés.
 *
 *   Le coup de cœur part en un clic et n'engage à rien. Il dit ce qui
 *   plaît, pas ce qui est bon.
 *   Le favori est un signet posé sur une marque qu'on veut suivre.
 *   L'avis, lui, est une note argumentée. C'est le seul des trois qui
 *   prétend juger.
 *
 * Les additionner donnerait un chiffre qui ne voudrait plus rien dire.
 *
 * ⚠️ LA PHRASE RÉGLABLE A REMPLACÉ LES CINQ ONGLETS, ET CELA NE CHANGE
 * RIEN À CE COMMENTAIRE. Elle sépare enfin trois questions que les
 * onglets confondaient — quoi, par quoi, sur quand — mais elle choisit
 * toujours UNE mesure et ordonne dessus. Rien dans la page ne sait
 * fabriquer un score composite : le type `Contenu` n'a de place que pour
 * une mesure par ligne, ce qui rend le mélange impossible à écrire par
 * distraction.
 */

/** L'adresse d'un réglage, avec les trois mots en clair. */
function adresse(quoi: Quoi, mesure: Mesure, periode?: PeriodeCoeurs): string {
  const p = new URLSearchParams({ quoi, mesure: MESURE_URL[mesure] });
  if (periode) p.set("periode", periode);
  return `/populaires?${p}`;
}

/** La part d'une entrée reçue sur la fenêtre, de 0 à 100. */
function partDe(fenetre: number, total: number): number {
  return total > 0 ? Math.round((fenetre / total) * 1000) / 10 : 0;
}

export default async function PopulairesPage({ searchParams }: Props) {
  const { quoi: quoiDemande, mesure: mesureDemandee, periode: periodeDemandee } =
    await searchParams;

  /* `?vue=` — les cinq anciens onglets — est redirigé en 308 par le
     middleware, avant tout rendu. Voir `lib/anciennes-adresses`. */

  const quoi = leQuoi(quoiDemande);
  const mesureVoulue = laMesure(mesureDemandee);

  const seuil = await avisMinimum();

  /*
   * Le paysage entier, pas seulement le haut du classement : c'est le
   * TOTAL des cœurs de l'annuaire qui décide s'il y a un podium. Voir
   * `getPaysageDesCoeurs` et le seuil de `ClassementMarques`.
   *
   * DEUX LECTURES, ET LA PREMIÈRE DÉCIDE DE LA SECONDE. On lit d'abord
   * « depuis toujours » — c'est la seule fenêtre qui donne le total, donc
   * la seule qui sache si la fenêtre a le droit d'exister. On ne
   * redemande le classement borné dans le temps que si la réponse est
   * oui ET qu'une fenêtre a effectivement été choisie. Tant que
   * l'annuaire n'a pas atteint le seuil, la seconde lecture n'est jamais
   * faite : on ne construit pas un delta hebdomadaire que personne ne
   * peut demander.
   */
  const surDesCoeurs = quoi === "marques" && mesureVoulue !== "avis";
  const paysageComplet: PaysageDesCoeurs = surDesCoeurs
    ? await getPaysageDesCoeurs()
    : { total: 0, classement: [], sansCoeur: [], rayons: [] };

  const surLeSeuil = paysageComplet.total >= SEUIL_PODIUM;

  /*
   * ------------------------------------------------------------------
   * CE QUE LA PHRASE A LE DROIT DE DIRE
   *
   * Trois règles, et la même à chaque fois : un réglage impossible n'est
   * pas grisé, il n'est pas là — et s'il était demandé, on retombe sur
   * le plus proche qui existe. Un menu qui propose ce qu'il refusera
   * pose une question pour rien.
   *
   *   1. La note ne dépend pas du temps : la clause « sur … » disparaît.
   *   2. Les marques n'ont de fenêtre qu'au-dessus de `SEUIL_PODIUM`
   *      cœurs sur l'annuaire. En dessous, découper le total en trois
   *      donne trois listes de presque rien, qui se lisent comme des
   *      classements alors que ce sont des accidents.
   *   3. Les pièces n'ont que deux fenêtres, et c'est la base qui le
   *      dit : `product_like_counts` est une vue figée à sept jours,
   *      `product_like_counts_total` compte tout. Il n'existe aucune vue
   *      à trente jours, donc « 30 jours » n'est pas dans le menu.
   *
   * L'élan, lui, a besoin d'une fenêtre pour vouloir dire quelque chose :
   * la part reçue « depuis toujours » vaut cent pour cent par
   * construction. Sans fenêtre disponible, il n'est pas proposé.
   * ------------------------------------------------------------------
   */
  const fenetresPossibles: PeriodeCoeurs[] =
    mesureVoulue === "avis"
      ? []
      : quoi === "marques"
        ? surLeSeuil
          ? ["semaine", "mois", "toujours"]
          : []
        : ["semaine", "toujours"];

  const elanTenable = fenetresPossibles.some((f) => f !== "toujours");
  const mesure: Mesure =
    mesureVoulue === "elan" && !elanTenable ? "coeurs" : mesureVoulue;

  /* L'élan retire « depuis toujours » du menu : cent pour cent par
     construction n'est pas un classement. */
  const fenetres = mesure === "elan" ? fenetresPossibles.filter((f) => f !== "toujours") : fenetresPossibles;

  /*
   * SANS `?periode=`, C'EST SEPT JOURS ET NON « TOUJOURS ».
   *
   * `laPeriode` répond « toujours » à une adresse muette, parce qu'elle
   * a été écrite pour l'ancien classement des marques, où l'absence de
   * paramètre voulait dire le total. La phrase, elle, ouvre sur
   * l'équivalent de l'ancien onglet « du moment ». La valeur par défaut
   * appartient donc à la page, pas à la fonction de lecture.
   */
  const demandee: PeriodeCoeurs =
    periodeDemandee === "semaine" ||
    periodeDemandee === "mois" ||
    periodeDemandee === "toujours"
      ? periodeDemandee
      : "semaine";
  const periode: PeriodeCoeurs = fenetres.includes(demandee)
    ? demandee
    : (fenetres[0] ?? "toujours");

  const paysage =
    !surDesCoeurs || periode === "toujours"
      ? paysageComplet
      : await getPaysageDesCoeurs(60, periode);

  const marques = paysage.classement;
  const marquesNotees =
    quoi === "marques" && mesure === "avis" ? await getMieuxNoteesMarques() : [];
  const piecesNotees =
    quoi === "pieces" && mesure === "avis" ? await getMieuxNoteesPieces() : [];

  /*
   * Les pièces n'ont que deux fenêtres en base : toute fenêtre bornée se
   * lit sur la vue des sept jours. Voir la règle 3 plus haut.
   */
  const classement =
    quoi === "pieces" && mesure !== "avis"
      ? await getMostLiked(120, periode === "toujours" ? "toujours" : "semaine")
      : [];

  /*
   * L'ÉLAN COÛTE UNE LECTURE DE PLUS, MAIS D'UN SEUL CÔTÉ.
   *
   * Pour une marque, le total de toujours sort de la même lecture que le
   * compte de la fenêtre — l'agrégat complet est lu à chaque fois pour
   * établir le seuil, voir `getPaysageDesCoeurs`. Pour une pièce, les
   * deux fenêtres sont deux vues séparées : il faut donc redemander les
   * totaux, bornés aux pièces déjà classées.
   */
  const totauxPieces =
    quoi === "pieces" && mesure === "elan"
      ? await getTotauxLikes(classement.map((c) => c.product.id))
      : new Map<string, number>();

  const idsAimes = [
    ...classement.map((c) => c.product.id),
    ...piecesNotees.map((c) => c.product.id),
  ];
  const myLikes = await getMyLikes(idsAimes);

  /*
   * LES MARQUES SANS CŒUR, MÉLANGÉES ICI ET PAS DANS LE NAVIGATEUR.
   *
   * Un tirage au sort dans le composant donnerait un ordre sur le
   * serveur et un autre à l'hydratation : React trouverait deux listes
   * différentes et signalerait une erreur sur toute la page. Le hasard
   * se tire donc une seule fois, ici, et `PremierCoeur` ne fait plus que
   * se déplacer dans la liste reçue.
   *
   * La réserve est plafonnée : « sans cœur », sur un site jeune, veut
   * dire presque tout l'annuaire, et l'envoyer entier au navigateur
   * coûterait plusieurs centaines de kilo-octets pour un bloc de quatre
   * cartes. Voir `RESERVE_A_DECOUVRIR`.
   */
  const aDecouvrir = surDesCoeurs
    ? melanger(paysageComplet.sansCoeur).slice(0, RESERVE_A_DECOUVRIR)
    : [];

  /*
   * Le bloc de découverte prend-il le relais ? La question se pose ici
   * parce que DEUX endroits en dépendent — le message de vide, qui
   * s'efface devant lui, et le bloc lui-même — et que les laisser
   * décider chacun de son côté finirait par les faire diverger : on
   * verrait soit les deux, soit aucun des deux.
   */
  const decouverteSuit = surDesCoeurs && aDecouvrir.length > 0;

  /*
   * Les dernières mises de côté : la marque et l'ancienneté, jamais par
   * qui. C'est la règle de `favorites.ts`, et elle ne change pas.
   *
   * ON LES LIT SUR LES CINQ ONGLETS depuis que le rail les accompagne
   * tous. Ce bloc ne parle pas du classement affiché — il dit que le
   * SITE bouge — et c'est justement sur les onglets où le classement
   * change lentement qu'il sert le plus. Deux requêtes de plus sur une
   * page déjà en `force-dynamic`, contre une colonne de droite qui
   * n'apparaît plus qu'un onglet sur cinq.
   */
  const recentes = await getDerniersFavoris(MISES_DE_COTE_RECENTES);

  /*
   * Le cœur du classement des marques était décoratif : il affichait un
   * total sans jamais proposer d'y ajouter le sien. Une seule requête
   * pour toute la page — jamais une par ligne, c'est déjà la règle de
   * `getMyFavorites` — et le geste redevient possible là où il est le
   * plus tentant, c'est-à-dire en lisant ce que suivent les autres.
   *
   * Les marques à découvrir entrent dans la MÊME requête, et non dans
   * une seconde : elles portent elles aussi un bouton cœur, et sans leur
   * état de départ ce bouton s'afficherait vide sur une marque déjà
   * suivie — le clic suivant la retirerait alors des favoris en croyant
   * l'ajouter.
   *
   * LES MARQUES NOTÉES Y SONT ENTRÉES POUR EXACTEMENT LA MÊME RAISON :
   * leurs lignes portent le même bouton depuis qu'elles s'affichent en
   * lignes et non plus en cartes. Une seule requête couvre les trois
   * listes ; les faire en trois fois aurait été trois allers-retours
   * pour une question qui se pose d'un coup.
   */
  const aInterroger = [
    ...marques.map((m) => m.brand.id),
    ...marquesNotees.map((m) => m.brand.id),
    ...aDecouvrir.map((b) => b.id),
  ];
  const mesFavoris =
    aInterroger.length > 0 ? await getMyFavorites(aInterroger) : new Set<string>();

  /*
   * LE CLASSEMENT, RAMENÉ À UNE SEULE FORME POUR LES SIX RÉGLAGES.
   *
   * Chaque entrée porte ses rayons, parce que la question « dans quel
   * rayon est-ce rangé ? » ne se répond pas de la même façon des deux
   * côtés : une marque déclare ses catégories dans sa fiche, une pièce
   * doit passer par la déduction de `lib/rayons`. En posant la réponse
   * ici, sur le serveur, chaque entrée sait où elle est rangée sans
   * qu'on ait à le redemander. La ligne de filtre qui s'en servait est
   * partie, mais la fiche de marque et la vitrine, elles, l'affichent
   * toujours.
   *
   * UNE SEULE MESURE PAR ENTRÉE, et le `...` ci-dessous est ce qui le
   * garantit : c'est `coeurs` OU `elan`, jamais les deux champs à la
   * fois. Le type n'a de place que pour l'un des trois.
   *
   * Aucune de ces formes n'a de champ où loger qui a mis quoi de côté ou
   * qui a aimé quoi : `suivies` et `aimee` ne parlent que de la personne
   * qui regarde, et de ses propres gestes.
   */
  const contenu: Contenu =
    quoi === "marques"
      ? {
          quoi: "marques",
          entrees:
            mesure === "avis"
              ? marquesNotees.map(({ brand, note }) => ({
                  brand,
                  rayons: brand.categories ?? [],
                  note,
                }))
              : marques.map(({ brand, favoris, total }) => ({
                  brand,
                  rayons: brand.categories ?? [],
                  ...(mesure === "elan"
                    ? { elan: { fenetre: favoris, total, part: partDe(favoris, total) } }
                    : { coeurs: favoris }),
                })),
          suivies: [...mesFavoris],
          total: mesure === "avis" ? undefined : paysageComplet.total,
        }
      : {
          quoi: "pieces",
          entrees:
            mesure === "avis"
              ? piecesNotees.map(({ product, note }) => ({
                  product,
                  rayons: [rayonDe(product)],
                  note,
                  aimee: myLikes.has(product.id),
                }))
              : classement.map(({ product, likes }) => {
                  const total = totauxPieces.get(product.id) ?? likes;
                  return {
                    product,
                    rayons: [rayonDe(product)],
                    ...(mesure === "elan"
                      ? { elan: { fenetre: likes, total, part: partDe(likes, total) } }
                      : { coeurs: likes }),
                    aimee: myLikes.has(product.id),
                  };
                }),
        };

  /*
   * L'ÉLAN NE SORT PAS DE LA BASE DANS SON ORDRE.
   *
   * Les deux lectures rendent leurs lignes triées par VOLUME — c'est ce
   * qu'elles savent faire, et c'est l'ordre de la mesure « cœurs ». La
   * part, elle, se calcule ici : il faut donc reclasser, sinon la phrase
   * annoncerait un classement par élan sur un ordre de cœurs.
   *
   * À part égale, le volume départage. Sans ce second critère, toutes
   * les entrées à cent pour cent — un cœur reçu cette semaine, un seul
   * depuis toujours — se rangeraient au hasard de la lecture précédente.
   * Ça ne les empêche pas d'être en tête : c'est la limite connue de
   * cette mesure sur un site jeune, et l'inventer un seuil de volume
   * serait fabriquer une règle que personne n'a écrite.
   */
  if (mesure === "elan") {
    contenu.entrees.sort(
      (a, b) => (b.elan?.part ?? 0) - (a.elan?.part ?? 0) ||
        (b.elan?.fenetre ?? 0) - (a.elan?.fenetre ?? 0)
    );
  }

  /*
   * LE PREMIER BLOC DU RAIL DIT LA RÈGLE DU RÉGLAGE EN COURS, PAS CELLE
   * DU VOISIN. Une jauge « 40 sur 100 cœurs » posée au-dessus d'un
   * classement de notes annoncerait un seuil qui ne s'y applique pas —
   * et sur un classement public, un chiffre faux coûte plus cher qu'un
   * chiffre absent.
   */
  const entete: EnTeteDuRail =
    mesure === "avis"
      ? { genre: "avis", seuil }
      : quoi === "marques"
        ? { genre: "podium", total: paysageComplet.total, seuil: SEUIL_PODIUM }
        : {
            genre: "coups-de-coeur",
            total: classement.reduce((somme, c) => somme + c.likes, 0),
            pieces: classement.length,
            fenetre: periode === "toujours" ? "toujours" : "semaine",
          };

  const explication =
    mesure === "avis" ? (
      <>
        Des <strong className="font-extrabold text-white">notes</strong>, pas des cœurs.
        Il faut au moins {seuil} avis pour apparaître.
      </>
    ) : mesure === "elan" ? (
      <>
        L&apos;élan, c&apos;est la{" "}
        <strong className="font-extrabold text-white">part des cœurs reçue</strong> sur la
        fenêtre choisie, pas leur nombre. Une entrée qui vient d&apos;arriver y monte plus
        haut qu&apos;une autre qui a déjà tout reçu.
      </>
    ) : quoi === "marques" ? (
      <>
        <strong className="font-extrabold text-white">
          Rien n&apos;est acheté ici : c&apos;est le nombre de cœurs, et rien d&apos;autre,
          qui fait l&apos;ordre.
        </strong>
      </>
    ) : periode === "toujours" ? (
      <>
        Le total des coups de cœur depuis l&apos;ouverture du site :{" "}
        <strong className="font-extrabold text-white">rien n&apos;est jamais effacé</strong>.
        Les sept derniers jours ne font que compter les plus récents.
      </>
    ) : (
      <>
        Ce que la communauté préfère en ce moment : seuls les coups de cœur des{" "}
        <strong className="font-extrabold text-white">sept derniers jours</strong> sont
        comptés ici. Les anciens ne disparaissent pas pour autant, ils vivent dans la
        fenêtre « depuis toujours ». Rien ne s&apos;achète pour figurer dans ces
        classements.
      </>
    );

  /*
   * LE COMPTEUR NE COMPTE QUE CE QUI EST À L'ÉCRAN.
   *
   * Il serait facile d'écrire « 3 412 cœurs · 136 marques » en allant
   * chercher les totaux du site. Mais le chiffre serait posé au-dessus
   * d'une liste qui en montre quarante, et l'on comparerait sans le
   * savoir deux ensembles différents. Ce qu'on affiche ici est la somme
   * exacte de ce qui est classé en dessous, ni plus ni moins.
   *
   *
   * SUR L'ÉLAN, LE COMPTEUR REVIENT AU VOLUME. Additionner des
   * pourcentages ne veut rien dire, et une moyenne de parts serait un
   * chiffre inventé. On annonce donc les cœurs de la fenêtre, qui sont
   * exactement ce que la part rapporte au total.
   */
  const combien = contenu.entrees.length;
  const compteurs =
    combien === 0
      ? null
      : mesure === "avis"
        ? `${combien} ${quoi === "marques" ? "marques notées" : "pièces notées"} · ${seuil} avis minimum`
        : quoi === "marques"
          ? `${enChiffres(marques.reduce((somme, m) => somme + m.favoris, 0))} cœurs · ${combien} marques classées`
          : `${enChiffres(classement.reduce((somme, c) => somme + c.likes, 0))} coups de cœur · ${combien} pièces classées`;

  const vide =
    mesure === "avis"
      ? quoi === "marques"
        ? "Aucune marque n'a encore reçu assez d'avis."
        : "Aucune pièce n'a encore reçu assez d'avis."
      : quoi === "marques"
        ? periode === "toujours"
          ? "Aucune marque n'a encore été mise en favori."
          : "Aucune marque n'a été mise de côté sur cette période."
        : "Personne n'a encore donné de coup de cœur.";

  /*
   * LES TROIS MENUS DE LA PHRASE SE CONSTRUISENT ICI, ET C'EST VOULU.
   *
   * Les règles de disponibilité — quelle fenêtre existe, quelle mesure
   * est tenable, sous quel seuil — sont déjà écrites plus haut, à côté
   * des lectures qu'elles gouvernent. Les redonner au composant lui
   * demanderait de les rejouer, et deux copies d'une même règle finissent
   * toujours par diverger. Il ne reçoit donc que des listes toutes
   * prêtes, avec leurs adresses.
   *
   * La fenêtre du lien SUIT la mesure du lien : passer de « note » à
   * « cœurs » redonne la fenêtre par défaut plutôt que d'emmener une
   * période qui n'existait pas dans la phrase qu'on quitte.
   */
  const fenetrePour = (m: Mesure): PeriodeCoeurs | undefined => {
    if (m === "avis") return undefined;
    if (m === mesure) return periode;
    const possibles = m === "elan" ? fenetres.filter((f) => f !== "toujours") : fenetres;
    return possibles.includes(periode) ? periode : (possibles[0] ?? "toujours");
  };

  const menuQuoi: MenuDeLaPhrase = {
    mot: MOT_DU_QUOI[quoi],
    libelle: "Classer",
    options: (["marques", "pieces"] as Quoi[]).map((q) => ({
      mot: MOT_DU_QUOI[q],
      href: adresse(q, mesure, fenetrePour(mesure)),
      actif: q === quoi,
    })),
  };

  const GLOSE: Record<Mesure, string> = {
    coeurs: "volume",
    elan: "part récente",
    avis: `min. ${seuil} avis`,
  };

  const menuMesure: MenuDeLaPhrase = {
    mot: MOT_DE_LA_MESURE_LUE[mesure],
    libelle: "Classer par",
    /* L'élan n'est proposé que si une fenêtre peut le porter : sans
       fenêtre, la part vaut cent pour cent et ne classe rien. */
    options: (elanTenable
      ? (["coeurs", "elan", "avis"] as Mesure[])
      : (["coeurs", "avis"] as Mesure[])
    ).map((m) => ({
      mot: MOT_DE_LA_MESURE_LUE[m],
      glose: GLOSE[m],
      href: adresse(quoi, m, fenetrePour(m)),
      actif: m === mesure,
    })),
  };

  /*
   * La clause « sur … » existe dès que la mesure dépend du temps, même
   * quand il n'y a rien à régler : c'est `PhraseDuClassement` qui décide
   * alors de l'écrire sans menu. Elle ne disparaît que sur la note, qui
   * ne connaît pas de fenêtre.
   */
  const menuPeriode: MenuDeLaPhrase | undefined =
    mesure === "avis"
      ? undefined
      : {
          mot: MOT_DE_LA_PERIODE[periode],
          lien: LIEN_DE_LA_PERIODE[periode],
          libelle: "Sur",
          options: fenetres.map((f) => ({
            mot: MOT_DE_LA_PERIODE[f],
            href: adresse(quoi, mesure, f),
            actif: f === periode,
          })),
        };

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-6">
        <p className="eyebrow m-0">Le classement</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Coups de cœur
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          {explication}
        </p>
        {compteurs && (
          <p className="m-0 mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
            {compteurs}
          </p>
        )}
      </header>

      {/*
       * LA PHRASE A REMPLACÉ CINQ ONGLETS ET UNE LIGNE DE PÉRIODE.
       *
       * « Recompté à chaque visite » reste écrit à côté d'elle et non
       * « mis à jour ce matin » : cette page est en `force-dynamic`, le
       * classement est établi au moment où elle s'ouvre. Annoncer une
       * heure de calcul qui n'existe pas serait faux, et sur un
       * classement public un chiffre faux coûte plus cher qu'un chiffre
       * absent.
       */}
      {/* `relative z-30` : les menus de la phrase s'ouvrent PAR-DESSUS le
          classement. Sans ça, la grille qui suit — elle porte `rise`,
          donc une animation, donc son propre plan — passerait devant, et
          les options seraient visibles mais pas cliquables. */}
      <div className="relative z-30 mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <PhraseDuClassement quoi={menuQuoi} mesure={menuMesure} periode={menuPeriode} />
        <p className="m-0 shrink-0 text-[10.5px] font-black uppercase tracking-[0.18em] text-white/45">
          Recompté à chaque visite
        </p>
      </div>

      {/*
       * LE MÊME GABARIT POUR TOUS LES RÉGLAGES.
       *
       * C'était le vrai défaut de cette page : la ligne de rayons, le
       * podium et la colonne de droite n'existaient que dans l'onglet des
       * marques suivies, et les quatre autres restaient des grilles de
       * cartes. On changeait donc de page en changeant de classement, et
       * la forme la plus lisible était cachée derrière le troisième
       * onglet. Il n'y a plus qu'une seule mise en page ; ce qui change
       * d'un onglet à l'autre, ce sont les chiffres et les mots, jamais
       * la structure.
       *
       * LE RAIL PASSE SOUS LE CONTENU SUR PETIT ÉCRAN, IL NE LE
       * COMPRIME PAS. D'où une seule colonne jusqu'à 1024 pixels, et
       * `minmax(0,1fr)` plutôt que `1fr` : une piste implicite en
       * `auto` prend la largeur de son contenu le plus large — ici une
       * ligne de marque avec ses quatre vignettes — et fait déborder
       * TOUTE la page vers la droite, ascenseur horizontal compris.
       * C'est un bug qu'on a déjà eu trois fois sur ce site ; la borne
       * basse à zéro est ce qui autorise la colonne à rétrécir.
       *
       * `items-start` pour que le rail garde sa hauteur au lieu de
       * s'étirer sur celle du classement, qui fait plusieurs écrans.
       */}
      <div className="rise rise-1 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-7">
        <div className="min-w-0">
          {contenu.entrees.length > 0 ? (
            <ClassementEnRayons contenu={contenu} mesure={mesure} />
          ) : (
            /*
             * DEUX FAÇONS DE N'AVOIR RIEN À CLASSER, ET UNE SEULE PHRASE
             * À CHAQUE FOIS.
             *
             * Quand le bloc « le premier cœur est à prendre » suit — il
             * ne suit que l'onglet des marques, et seulement s'il reste
             * des fiches à proposer — il EST la page dans cet état-là :
             * il dit déjà que personne n'a voté, il explique que ce ne
             * sont pas les moins bonnes mais les moins vues, et il pose
             * quatre cartes sur lesquelles le geste se fait. Ajouter
             * au-dessus « Aucune marque n'a encore été mise en favori,
             * parcours les marques » écrit deux fois le même constat et
             * envoie ailleurs quelqu'un à qui on vient de donner de quoi
             * rester.
             *
             * Partout ailleurs — les pièces, les notes, ou une marque
             * dont l'annuaire n'a plus rien à proposer — il n'y a rien
             * derrière, et la phrase reste le seul moyen de ne pas
             * laisser une colonne blanche.
             */
            !decouverteSuit && <Vide>{vide}</Vide>
          )}

          {/* Il ne suit QUE le classement des marques suivies : « le
              premier cœur est à prendre » parle de fiches d'annuaire que
              personne n'a encore mises de côté, et cette phrase n'a aucun
              sens sous une liste de pièces notées. */}
          {decouverteSuit && (
            <PremierCoeur
              marques={aDecouvrir}
              combien={paysageComplet.sansCoeur.length}
              suivies={[...mesFavoris]}
            />
          )}
        </div>

        {/* Le compte des marques sans cœur n'existe que si l'on a lu le
            paysage complet, donc sur un classement de marques. Ailleurs,
            le raccourci ne s'affiche pas. */}
        <RailDesCoeurs
          entete={entete}
          recentes={recentes}
          sansCoeur={decouverteSuit ? paysageComplet.sansCoeur.length : 0}
        />
      </div>
    </div>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass p-8 text-center">
      <p className="m-0 text-[15px] leading-relaxed text-white/85">
        {children}{" "}
        <Link href="/marques" className="font-bold text-white underline underline-offset-2">
          Parcours les marques
        </Link>{" "}
        et lance le mouvement.
      </p>
    </div>
  );
}
