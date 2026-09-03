import type { Metadata } from "next";
import Link from "next/link";
import SelecteurClassement from "@/components/SelecteurClassement";
import ClassementEnRayons from "@/components/coeurs/ClassementEnRayons";
import PremierCoeur from "@/components/coeurs/PremierCoeur";
import RailDesCoeurs from "@/components/coeurs/RailDesCoeurs";
import type { EnTeteDuRail } from "@/components/coeurs/RailDesCoeurs";
import SelecteurPeriode from "@/components/coeurs/SelecteurPeriode";
import type { Contenu, Mesure, RayonVide } from "@/components/coeurs/classement";
import {
  MISES_DE_COTE_RECENTES,
  RESERVE_A_DECOUVRIR,
  SEUIL_PODIUM,
  SEUIL_RAYON,
} from "@/components/coeurs/seuils";
import { enChiffres } from "@/components/chiffres";
import { getMostLiked, getMyLikes } from "@/lib/likes";
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

type Props = { searchParams: Promise<{ vue?: string; periode?: string }> };

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
 * ⚠️ LES CINQ ONGLETS PARTAGENT MAINTENANT LE MÊME GABARIT — ligne de
 * rayons, lignes, colonne de droite — ET CELA NE CHANGE RIEN À CE
 * COMMENTAIRE. Unifier l'APPARENCE n'est pas mélanger les CHIFFRES :
 * chaque onglet garde sa mesure, son vocabulaire et son seuil, et rien
 * dans la page ne sait fabriquer un score composite. C'est même
 * l'inverse : le type `Contenu` n'a de place que pour UNE mesure par
 * ligne, ce qui rend le mélange impossible à écrire par distraction.
 */
const ONGLETS = [
  { id: "semaine", court: "Du moment", label: "Coups de cœur du moment" },
  { id: "toujours", court: "Tout temps", label: "Coups de cœur, tout temps" },
  { id: "marques", court: "Plus suivies", label: "Marques les plus suivies" },
  { id: "notes-pieces", court: "Pièces notées", label: "Pièces les mieux notées" },
  { id: "notes-marques", court: "Marques notées", label: "Marques les mieux notées" },
] as const;

/**
 * La période demandée dans l'adresse, ou « depuis toujours ».
 *
 * Écrit en toutes lettres plutôt qu'avec un transtypage : `?periode=` est
 * une chaîne que n'importe qui peut écrire à la main, et un
 * `as PeriodeCoeurs` la ferait passer pour une valeur du type sans que
 * rien ne l'ait vérifiée. Elle finirait dans un calcul de date.
 */
function laPeriode(valeur: string | undefined): PeriodeCoeurs {
  return valeur === "semaine" || valeur === "mois" ? valeur : "toujours";
}

export default async function PopulairesPage({ searchParams }: Props) {
  const { vue, periode: periodeDemandee } = await searchParams;
  const onglet = ONGLETS.some((o) => o.id === vue) ? (vue as string) : "semaine";

  const seuil = await avisMinimum();

  /*
   * Le paysage entier, pas seulement le haut du classement : c'est le
   * TOTAL des cœurs de l'annuaire qui décide s'il y a un podium. Voir
   * `getPaysageDesCoeurs` et le seuil de `ClassementMarques`.
   *
   * DEUX LECTURES, ET LA PREMIÈRE DÉCIDE DE LA SECONDE. On lit d'abord
   * « depuis toujours » — c'est la seule fenêtre qui donne le total, donc
   * la seule qui sache si le sélecteur de période a le droit d'exister.
   * On ne redemande le classement borné dans le temps que si la réponse
   * est oui ET que quelqu'un a effectivement choisi une période. Tant que
   * l'annuaire n'a pas atteint le seuil, la seconde lecture n'est jamais
   * faite : on ne construit pas un delta hebdomadaire que personne ne
   * peut demander.
   */
  const vueDesCoeurs = onglet === "marques";
  const paysageComplet: PaysageDesCoeurs = vueDesCoeurs
    ? await getPaysageDesCoeurs()
    : { total: 0, classement: [], sansCoeur: [], rayons: [] };

  const surLeSeuil = paysageComplet.total >= SEUIL_PODIUM;
  const periode = surLeSeuil ? laPeriode(periodeDemandee) : "toujours";
  const paysage =
    periode === "toujours" ? paysageComplet : await getPaysageDesCoeurs(60, periode);

  const marques = paysage.classement;
  const marquesNotees = onglet === "notes-marques" ? await getMieuxNoteesMarques() : [];
  const piecesNotees = onglet === "notes-pieces" ? await getMieuxNoteesPieces() : [];
  const classement =
    onglet === "semaine" || onglet === "toujours"
      ? await getMostLiked(120, onglet === "toujours" ? "toujours" : "semaine")
      : [];

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
  const aDecouvrir = vueDesCoeurs
    ? melanger(paysageComplet.sansCoeur).slice(0, RESERVE_A_DECOUVRIR)
    : [];

  /*
   * Le bloc de découverte prend-il le relais ? La question se pose ici
   * parce que DEUX endroits en dépendent — le message de vide, qui
   * s'efface devant lui, et le bloc lui-même — et que les laisser
   * décider chacun de son côté finirait par les faire diverger : on
   * verrait soit les deux, soit aucun des deux.
   */
  const decouverteSuit = vueDesCoeurs && aDecouvrir.length > 0;

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
   * CE QUE COMPTE L'ONGLET, EN UN SEUL ENDROIT.
   *
   * Deux vocabulaires, pas plus : des cœurs — favoris de marque ou coups
   * de cœur sur une pièce — ou des avis. Toute la page en descend : le
   * mot des pastilles de rayon, la mesure au bout de chaque ligne, le
   * bloc du haut du rail. Le déduire une fois ici évite qu'un des trois
   * se trompe tout seul.
   */
  const mesure: Mesure =
    onglet === "notes-pieces" || onglet === "notes-marques" ? "avis" : "coeurs";

  /*
   * LE CLASSEMENT, RAMENÉ À UNE SEULE FORME POUR LES CINQ ONGLETS.
   *
   * Chaque entrée porte ses rayons, parce que la question « dans quel
   * rayon est-ce rangé ? » ne se répond pas de la même façon des deux
   * côtés : une marque déclare ses catégories dans sa fiche, une pièce
   * doit passer par la déduction de `lib/rayons`. En posant la réponse
   * ici, sur le serveur, le filtre du navigateur redevient une seule
   * ligne de code — la même pour les cinq. Voir `rayonsDeLAffichage`.
   *
   * Aucune de ces formes n'a de champ où loger qui a mis quoi de côté ou
   * qui a aimé quoi : `suivies` et `aimee` ne parlent que de la personne
   * qui regarde, et de ses propres gestes.
   */
  const contenu: Contenu =
    onglet === "marques"
      ? {
          quoi: "marques",
          entrees: marques.map(({ brand, favoris }) => ({
            brand,
            rayons: brand.categories ?? [],
            coeurs: favoris,
          })),
          suivies: [...mesFavoris],
          total: paysageComplet.total,
        }
      : onglet === "notes-marques"
        ? {
            quoi: "marques",
            entrees: marquesNotees.map(({ brand, note }) => ({
              brand,
              rayons: brand.categories ?? [],
              note,
            })),
            suivies: [...mesFavoris],
          }
        : onglet === "notes-pieces"
          ? {
              quoi: "pieces",
              entrees: piecesNotees.map(({ product, note }) => ({
                product,
                rayons: [rayonDe(product)],
                note,
                aimee: myLikes.has(product.id),
              })),
            }
          : {
              quoi: "pieces",
              entrees: classement.map(({ product, likes }) => ({
                product,
                rayons: [rayonDe(product)],
                coeurs: likes,
                aimee: myLikes.has(product.id),
              })),
            };

  /*
   * Les rayons de l'annuaire qui n'ont encore aucun cœur.
   *
   * Ils ne se dérivent pas de l'affichage — par définition, ils n'y sont
   * pas — et ils ne concernent que le classement des marques suivies :
   * c'est le seul où « et celles que personne n'a encore vues ? » est
   * une vraie question, et le seul dont la zone du bas mène quelque part
   * (l'annuaire filtré). Voir `LigneDesRayons`.
   *
   * Ils se lisent sur le paysage DE LA PÉRIODE affichée et non sur celui
   * de toujours : en regardant « cette semaine », un rayon qui n'a rien
   * reçu cette semaine-là est bien un rayon sans cœur à l'écran.
   */
  const rayonsVides: RayonVide[] = vueDesCoeurs
    ? paysage.rayons
        .filter((r) => r.coeurs < SEUIL_RAYON)
        .map((r) => ({ nom: r.nom, slug: r.slug, marques: r.marques }))
    : [];

  /*
   * LE PREMIER BLOC DU RAIL DIT LA RÈGLE DE L'ONGLET, PAS CELLE DU
   * VOISIN. Une jauge « 40 sur 100 cœurs » posée au-dessus d'un
   * classement de notes annoncerait un seuil qui ne s'y applique pas —
   * et sur un classement public, un chiffre faux coûte plus cher qu'un
   * chiffre absent.
   */
  const entete: EnTeteDuRail =
    onglet === "marques"
      ? { genre: "podium", total: paysageComplet.total, seuil: SEUIL_PODIUM }
      : mesure === "avis"
        ? { genre: "avis", seuil }
        : {
            genre: "coups-de-coeur",
            total: classement.reduce((somme, c) => somme + c.likes, 0),
            pieces: classement.length,
            fenetre: onglet === "toujours" ? "toujours" : "semaine",
          };

  const explication =
    onglet === "notes-pieces" || onglet === "notes-marques" ? (
      <>
        Ici, ce ne sont pas des cœurs mais des <strong className="font-extrabold text-white">
        notes</strong> : quelqu&apos;un a pris le temps de mettre cinq étoiles ou deux, et
        souvent d&apos;expliquer pourquoi. Il faut au moins {seuil} avis pour apparaître,
        sans quoi une seule opinion suffirait à occuper la première place.
      </>
    ) : onglet === "marques" ? (
      <>
        Les maisons que la communauté suit. Un favori ne s&apos;efface pas avec le temps :
        suivre une marque n&apos;est pas un geste d&apos;humeur.{" "}
        <strong className="font-extrabold text-white">
          Rien n&apos;est acheté ici : c&apos;est le nombre de cœurs, et rien d&apos;autre,
          qui fait l&apos;ordre.
        </strong>
      </>
    ) : onglet === "toujours" ? (
      <>
        Le total des coups de cœur depuis l&apos;ouverture du site :{" "}
        <strong className="font-extrabold text-white">rien n&apos;est jamais effacé</strong>.
        L&apos;onglet « du moment » ne fait que compter les plus récents.
      </>
    ) : (
      <>
        Ce que la communauté préfère en ce moment : seuls les coups de cœur des{" "}
        <strong className="font-extrabold text-white">sept derniers jours</strong> sont
        comptés ici. Les anciens ne disparaissent pas pour autant, ils vivent dans
        l&apos;onglet « depuis toujours ». Rien ne s&apos;achète pour figurer dans ces
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
   * C'est aussi la règle qui gouverne la ligne de rayons depuis qu'elle
   * coiffe les cinq onglets : elle additionne les entrées affichées, et
   * ne va rien redemander en base. Voir `rayonsDeLAffichage`.
   */
  const compteurs =
    onglet === "marques"
      ? marques.length > 0
        ? `${enChiffres(marques.reduce((somme, m) => somme + m.favoris, 0))} cœurs · ${marques.length} marques classées`
        : null
      : onglet === "semaine" || onglet === "toujours"
        ? classement.length > 0
          ? `${enChiffres(classement.reduce((somme, c) => somme + c.likes, 0))} coups de cœur · ${classement.length} pièces classées`
          : null
        : onglet === "notes-pieces"
          ? piecesNotees.length > 0
            ? `${piecesNotees.length} pièces notées · ${seuil} avis minimum`
            : null
          : marquesNotees.length > 0
            ? `${marquesNotees.length} marques notées · ${seuil} avis minimum`
            : null;

  const vide =
    onglet === "marques"
      ? periode === "toujours"
        ? "Aucune marque n'a encore été mise en favori."
        : "Aucune marque n'a été mise de côté sur cette période."
      : onglet === "notes-marques"
        ? "Aucune marque n'a encore reçu assez d'avis."
        : onglet === "notes-pieces"
          ? "Aucune pièce n'a encore reçu assez d'avis."
          : "Personne n'a encore donné de coup de cœur.";

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
       * « Recompté à chaque visite » et non « mis à jour ce matin » :
       * cette page est en `force-dynamic`, le classement est donc établi
       * au moment où elle s'ouvre. Annoncer une heure de calcul qui
       * n'existe pas serait faux, et sur un classement public un chiffre
       * faux coûte plus cher qu'un chiffre absent.
       */}
      <SelecteurClassement
        onglets={ONGLETS}
        actif={onglet}
        base="/populaires"
        defaut="semaine"
        prefixe="Classement"
        aside="Recompté à chaque visite"
      />

      {/*
       * LE SÉLECTEUR DE PÉRIODE N'EXISTE QU'AU-DESSUS DE CENT CŒURS, ET
       * C'EST UNE RÈGLE, PAS UN OUBLI.
       *
       * En dessous, découper le total en trois fenêtres donne trois
       * listes de presque rien : « cette semaine » y affiche deux marques
       * à un cœur, ce qui se lit comme un classement alors que c'est un
       * accident. On ne le grise pas et on ne l'explique pas — un réglage
       * qu'on voit mais qu'on n'a aucune raison d'utiliser est une
       * question posée pour rien. Il n'apparaît pas du tout.
       *
       * ET IL NE TOUCHE QUE LE CLASSEMENT DES MARQUES. Les onglets
       * au-dessus tiennent séparés trois gestes qui ne s'additionnent
       * jamais — le cœur, le favori, l'avis, voir `ONGLETS` — et cette
       * seconde ligne ne choisit pas parmi eux : elle dit seulement sur
       * quelle fenêtre de temps on compte les favoris. Deux questions,
       * deux lignes.
       */}
      {vueDesCoeurs && surLeSeuil && (
        <SelecteurPeriode actif={periode} vue={onglet} />
      )}

      {/*
       * LE MÊME GABARIT POUR LES CINQ CLASSEMENTS.
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
            <ClassementEnRayons contenu={contenu} mesure={mesure} vides={rayonsVides} />
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

        <RailDesCoeurs entete={entete} recentes={recentes} />
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
