import { obstacleAPublication, type FichePubliable } from "@/lib/publication";

/**
 * La colonne « Publiable ? » d'une ligne d'administration.
 *
 * ELLE NE JUGE RIEN ELLE-MÊME, et c'est tout l'intérêt de ce fichier.
 * Le verdict vient entièrement de `obstacleAPublication()` : on lit le
 * message qu'elle renvoie, on ne relit jamais les champs de la fiche
 * pour deviner ce qui manque. C'est la règle posée par `publication.ts`
 * — une seule définition, sinon il finit par exister un chemin plus
 * permissif que les autres, et les fiches bancales passent par là.
 *
 * Ce que ce composant ajoute est uniquement de la mise en forme : le
 * message est écrit pour être montré tel quel, il fait deux lignes, et
 * la colonne en fait cent quatre-vingt-dix pixels. On en garde donc un
 * intitulé court à l'écran ; la phrase entière reste en infobulle et
 * pour les lecteurs d'écran.
 */

/** Les deux seules couleurs d'état : ça part, ou ça ne part pas. */
const VERT = "#1d7a4f";
const ROUGE = "#c2273f";

/**
 * De quel obstacle il s'agit, reconnu à son message.
 *
 * L'ordre est celui de `obstacleAPublication` : elle rend le premier
 * manque qu'elle rencontre, du plus grave au plus léger. La part
 * remplie de la barre suit ce rang et rien d'autre — elle dit « il
 * reste à peu près ça à faire », elle ne mesure aucune complétude.
 */
const RESUMES: { fragment: string; libelle: string; part: number }[] = [
  { fragment: "ni visuel ni texte", libelle: "Vide", part: 0.14 },
  { fragment: "ni couverture ni logo", libelle: "Sans visuel", part: 0.44 },
  { fragment: "ni accroche ni description", libelle: "Sans texte", part: 0.62 },
  { fragment: "aucune pièce", libelle: "Sans catalogue", part: 0.8 },
];

/**
 * Le repli, quand le message ne ressemble à aucun de ceux qu'on connaît.
 *
 * `publication.ts` peut gagner un cas sans que ce fichier le sache : il
 * vaut mieux un intitulé vague qu'un « Prête » faux, qui ferait passer
 * pour publiable une fiche que la même fonction refusera ensuite.
 */
const INCONNU = { fragment: "", libelle: "À compléter", part: 0.5 };

export default function JaugePublication({
  fiche,
  enLigne,
}: {
  fiche: FichePubliable;
  /** Déjà en ligne : seul le mot change, jamais le verdict. */
  enLigne: boolean;
}) {
  const obstacle = obstacleAPublication(fiche);
  const resume = obstacle
    ? (RESUMES.find((r) => obstacle.includes(r.fragment)) ?? INCONNU)
    : null;

  const libelle = resume ? resume.libelle : enLigne ? "Complète" : "Prête";
  const part = resume ? resume.part : 1;
  const teinte = resume ? ROUGE : VERT;
  const dit = obstacle ?? (enLigne ? "Cette fiche est complète." : "Cette fiche peut partir en ligne.");

  return (
    <div className="min-w-0" title={dit}>
      <span
        aria-hidden
        className="block h-[5px] w-full overflow-hidden rounded-full bg-[var(--color-ink)]/12"
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.round(part * 100)}%`, background: teinte }}
        />
      </span>
      <span
        className="mt-1.5 block truncate text-[11px] font-black uppercase tracking-[0.06em]"
        style={{ color: teinte }}
      >
        {libelle}
      </span>
      {/* La phrase entière : à l'écran elle ne tiendrait pas, à l'oreille
          elle est la seule qui explique quoi faire. */}
      <span className="sr-only">{dit}</span>
    </div>
  );
}
