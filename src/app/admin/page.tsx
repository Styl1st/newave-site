import Link from "next/link";
import { IconDownload, IconPlus } from "@/components/Icons";
import EtatDuSite, { type CompteurDeSite } from "@/components/admin/EtatDuSite";
import FileDeTravail, { type CarteDeFile } from "@/components/admin/FileDeTravail";
import StatsPanel from "@/components/admin/StatsPanel";
import { doitAvoirDesPieces } from "@/lib/acces";
import {
  adminCounts,
  adminGetApplications,
  adminGetBrandsDetaillees,
  type BrandAdmin,
} from "@/lib/admin-queries";
import { getSignalements } from "@/lib/moderation";
import { obstacleAPublication } from "@/lib/publication";
import { getStats } from "@/lib/stats";

/**
 * Le résumé d'un obstacle, pour le faire tenir sur une carte.
 *
 * LA CLÉ EST LE MESSAGE EXACT DE `obstacleAPublication()`.
 *
 * On aurait pu relire `cover_url` et `pieces` ici pour classer les
 * fiches par nature de manque : ce serait une deuxième définition de
 * « publiable », et `publication.ts` explique précisément pourquoi il
 * n'en existe qu'une. Le compte vient donc de la fonction, et ce
 * tableau ne fait que raccourcir sa phrase.
 *
 * Si un message y est réécrit un jour, la répartition affichera
 * « autre obstacle » — visible, et donc réparable, plutôt que faux.
 */
const RESUME_OBSTACLE: Record<string, string> = {
  "Cette fiche n'a ni visuel ni texte. Ajoute au moins une image et une accroche avant de la publier.":
    "ni visuel ni texte",
  "Cette fiche n'a ni couverture ni logo. Une carte sans image dessert la marque : ajoute un visuel avant de la publier.":
    "sans visuel",
  "Cette fiche n'a ni accroche ni description. Remplis-en au moins une avant de la publier.":
    "sans texte",
  "Cette fiche n'a aucune pièce. Lance l'import du catalogue, ou ajoute au moins une pièce à la main avant de la publier.":
    "sans catalogue",
};

/** Les trois natures de signalement, pour dire de quoi la pile est faite. */
const NATURES = [
  { cle: "avis", un: "avis", plusieurs: "avis" },
  { cle: "piece", un: "pièce", plusieurs: "pièces" },
  { cle: "marque", un: "marque", plusieurs: "marques" },
] as const;

/**
 * L'attente d'une candidature, dite en clair.
 *
 * Une date de dépôt oblige à compter dans sa tête pour savoir si c'est
 * grave. « Depuis onze jours » se lit d'un coup, et c'est la seule
 * chose qu'on veut savoir devant une pile.
 */
function anciennete(iso: string): string {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return "la plus ancienne est arrivée aujourd'hui";
  if (jours === 1) return "la plus ancienne attend depuis hier";
  return `la plus ancienne attend depuis ${jours} jours`;
}

export default async function AdminHome() {
  /*
   * Les candidatures et les marques sont relues en entier.
   *
   * `adminCounts()` en rend le nombre, et c'est tout ce qu'il faut au
   * bandeau du bas. La file de travail, elle, a besoin de la date de la
   * plus vieille candidature et de l'état de chaque brouillon : aucun
   * compteur ne peut les donner. Les quatre lectures partent ensemble,
   * elles ne s'attendent pas.
   */
  const [c, stats, candidatures, marques, signalements] = await Promise.all([
    adminCounts(),
    getStats(),
    adminGetApplications(),
    adminGetBrandsDetaillees(),
    getSignalements(),
  ]);

  /* ---------- candidatures ---------- */
  const nouvelles = candidatures.filter((a) => a.status === "nouvelle");
  // La lecture les rend de la plus récente à la plus ancienne : la
  // dernière du tableau est celle qui attend depuis le plus longtemps.
  const plusVieille = nouvelles[nouvelles.length - 1];

  /* ---------- signalements ---------- */
  // `getSignalements()` regroupe par cible : un avis signalé six fois
  // fait une entrée. Le compteur de la carte annonce les signalements
  // non traités, la phrase dit sur quoi ils portent.
  const signalementsOuverts = signalements.reduce((n, s) => n + s.signalements.length, 0);
  const parNature = NATURES.map((n) => ({
    ...n,
    total: signalements.filter((s) => s.cible === n.cle).length,
  })).filter((n) => n.total > 0);

  /* ---------- brouillons ---------- */
  const brouillons = marques.filter((m) => m.status === "draft");
  const juges = brouillons.map((m) => ({
    marque: m,
    /*
     * Le catalogue n'est exigé que des boutiques qui en ont un.
     *
     * Sans `exigeDesPieces`, une marque qui vend en privé ou qui n'a
     * qu'un Instagram compterait pour une fiche incomplète, et on
     * passerait ses journées à essayer de réparer ce qui n'est pas
     * cassé. La règle est dans `acces.ts`, on la lui demande.
     */
    obstacle: obstacleAPublication({ ...m, exigeDesPieces: doitAvoirDesPieces(m) }),
  }));

  const publiables = juges.filter((j) => j.obstacle === null);
  const bloquees = juges.filter(
    (j): j is { marque: BrandAdmin; obstacle: string } => j.obstacle !== null
  );

  const parObstacle = new Map<string, number>();
  for (const j of bloquees) parObstacle.set(j.obstacle, (parObstacle.get(j.obstacle) ?? 0) + 1);
  const repartition = [...parObstacle.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([message, n]) => `${n} ${RESUME_OBSTACLE[message] ?? "autre obstacle"}`)
    .join(", ");

  /*
   * LES DEUX CARTES DE MARQUES PORTENT UN PARAMÈTRE QUE LA LISTE NE LIT
   * PAS ENCORE.
   *
   * `/admin/marques` ne regarde aucun paramètre d'adresse aujourd'hui :
   * ses filtres vivent dans l'état de `BrandBulkList`. Le paramètre est
   * posé pour le jour où les vues enregistrées de l'écran `9c` le
   * liront ; d'ici là, le libellé du lien ne promet que ce qui arrive
   * vraiment — l'annuaire, entier. Un bouton « Voir les 17 incomplètes »
   * qui ouvre les cent trente-six est pire que pas de bouton.
   */
  const cartes: CarteDeFile[] = [
    {
      titre: "Candidatures à traiter",
      compte: nouvelles.length,
      phrase: plusVieille ? anciennete(plusVieille.created_at) : "rien n'attend de réponse",
      href: "/admin/candidatures",
      lien: "Ouvrir la pile",
      pastille: "#c2273f",
      clair: true,
    },
    {
      titre: "Signalements ouverts",
      compte: signalementsOuverts,
      phrase:
        parNature.length === 0
          ? "personne n'a rien signalé"
          : `${parNature
              .map((n) => `${n.total} ${n.total > 1 ? n.plusieurs : n.un}`)
              .join(", ")} à regarder`,
      href: "/admin/signalements",
      lien: "Ouvrir la pile",
      pastille: "#c2273f",
      clair: true,
    },
    {
      titre: "Brouillons publiables",
      compte: publiables.length,
      phrase:
        publiables.length > 0
          ? "rien ne leur manque : elles partiraient telles quelles"
          : "aucun brouillon n'est prêt à partir",
      href: "/admin/marques?vue=publiables",
      lien: "Ouvrir l'annuaire",
      pastille: "#1d7a4f",
    },
    {
      titre: "Fiches incomplètes",
      compte: bloquees.length,
      phrase: repartition || "tous les brouillons sont complets",
      href: "/admin/marques?vue=incompletes",
      lien: "Ouvrir l'annuaire",
      pastille: "rgba(240,192,90,.9)",
    },
  ];

  const compteurs: CompteurDeSite[] = [
    {
      label: "Posts",
      valeur: c.posts,
      note: c.postsDraft ? `${c.postsDraft} en brouillon` : "tous publiés",
      href: "/admin/posts",
    },
    {
      label: "Marques",
      valeur: c.brands,
      note: c.brandsDraft ? `${c.brandsDraft} en brouillon` : "toutes publiées",
      href: "/admin/marques",
    },
    {
      label: "Candidatures",
      valeur: c.applications,
      note: c.applicationsNew ? `${c.applicationsNew} à traiter` : "rien de nouveau",
      href: "/admin/candidatures",
    },
    {
      label: "Comptes",
      valeur: c.users,
      note: c.admins > 1 ? `${c.admins} administrateurs` : "1 administrateur",
      href: "/admin/utilisateurs",
    },
  ];

  return (
    <>
      {/* Les actions rapides étaient tout en bas, après les chiffres et
          les classements. On ouvre l'administration pour faire quelque
          chose : elles remontent à hauteur du titre, et disparaissent
          sous lui quand l'écran est trop étroit pour les deux. */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Administration</p>
          <h1 className="m-0 mt-2 text-[clamp(22px,4.9vw,33px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
            Ce qui t&apos;attend
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/catalogues"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/8 px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            <IconDownload /> Mettre à jour les catalogues
          </Link>
          <Link
            href="/admin/posts/nouveau"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/8 px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            <IconPlus /> Nouveau post
          </Link>
          <Link href="/admin/marques/nouveau" className="card-light px-5 py-3">
            <span className="relative z-3 flex items-center gap-2 text-[13.5px] font-extrabold">
              <IconPlus /> Nouvelle marque
            </span>
          </Link>
        </div>
      </header>

      <FileDeTravail cartes={cartes} />

      <div className="mt-4">
        <EtatDuSite compteurs={compteurs} />
      </div>

      {stats && <StatsPanel stats={stats} />}

      {/* Proposition du dessin, laissée inerte et dite comme telle.
          Le site n'écrit nulle part qui a publié quoi : reconstituer un
          journal à partir des dates de publication donnerait une liste
          plausible et fausse — elle raterait les retraits, les
          suppressions, et attribuerait tout à la même main. Mieux vaut
          un bloc vide qui explique pourquoi. */}
      <section className="glass mt-8 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[17px] font-extrabold text-white">Dernières actions</h2>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60">
            À venir
          </span>
        </div>
        <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white/55">
          Le site ne tient pas de journal d&apos;activité. Savoir qui a publié quoi, et
          quand, demande une table d&apos;audit : tant qu&apos;elle n&apos;existe pas, ce
          bloc reste vide plutôt que d&apos;afficher une reconstitution.
        </p>
      </section>
    </>
  );
}
