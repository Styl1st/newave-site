"use client";

/**
 * Le sommaire de l'éditeur de fiche.
 *
 * C'EST UN REPÈRE, PAS UNE ÉTAPE. Rien n'est verrouillé, rien ne se
 * fait dans l'ordre : on ouvre la page pour corriger une accroche, et
 * l'on n'a aucune envie qu'un assistant nous fasse traverser quatre
 * écrans avant. Chaque entrée dit seulement où en est sa section —
 * coche verte si tout est rempli, pastille ambre avec le nombre de
 * champs vides sinon.
 *
 * « VIDE » N'EST PAS « PAS PUBLIABLE », et les deux ne se mélangent
 * pas. Le compte ci-dessous suit les champs de la section ; ce qui
 * décide de la mise en ligne est la check-list, et elle seule, parce
 * qu'elle interroge `obstacleAPublication`. Une fiche peut très bien
 * partir en ligne avec trois pastilles ambre — pays, ville, Instagram
 * ne retiennent personne.
 *
 * DES ANCRES, ET RIEN D'AUTRE. `html { scroll-behavior: smooth }` fait
 * déjà le défilement doux dans `globals.css`, et le `scroll-mt` des
 * sections dégage la hauteur des barres collantes. Surtout pas de
 * `scrollIntoView` : il ignore le réglage « animations réduites » du
 * système, que le site respecte partout ailleurs.
 *
 * SUR TÉLÉPHONE, IL S'ENROULE. Trois colonnes ne tiennent pas sur 390
 * pixels : le sommaire devient une rangée de pastilles qui passe à la
 * ligne, posée au-dessus du formulaire. Elle s'enroule, elle ne défile
 * pas latéralement — une entrée qu'il faut aller chercher en balayant
 * n'existe pas, c'est déjà la leçon de la nav d'administration.
 */

/** Ce qui retient — la même couleur que la check-list. */
const AMBRE = "#f2b03c";
/** Ce qui est en règle. */
const VERT = "#57d99a";

export type EntreeSommaire = {
  /** L'ancre, sans le dièse. */
  id: string;
  titre: string;
  /** Combien de champs restent vides dans cette section. */
  vides: number;
};

export default function SommaireFiche({
  entrees,
  obstacle,
}: {
  entrees: EntreeSommaire[];
  /**
   * Ce qui retient la fiche, tel que `obstacleAPublication` l'a écrit.
   *
   * Il s'affiche SOUS LA RANGÉE, et seulement au doigt. La check-list
   * qui le porte vit dans la troisième colonne ; à 390 pixels cette
   * colonne passe sous le formulaire, donc trois écrans plus bas — on
   * ne découvrait ce qui bloque qu'après avoir tout fait défiler, ou
   * après avoir essayé de publier. Au grand écran, la check-list est à
   * côté, en entier, et le répéter ici ne servirait à rien.
   */
  obstacle?: string | null;
}) {
  return (
    <nav
      aria-label="Sections de la fiche"
      className="glass p-2.5 lg:sticky lg:top-[152px] lg:p-3"
    >
      <p className="eyebrow m-0 hidden px-1.5 pb-2 lg:block">Sur cette page</p>

      {/* Enroulé en pastilles sur téléphone, empilé en liste dès que la
          colonne existe. Une seule liste dans le document : le
          sommaire ne se dédouble pas d'un format à l'autre. */}
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 lg:flex-col lg:flex-nowrap lg:gap-0.5">
        {entrees.map((entree) => (
          <li key={entree.id}>
            <a
              href={`#${entree.id}`}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-[12.5px] font-bold text-white/78 transition hover:bg-white/14 hover:text-white active:scale-[.97] lg:rounded-[12px] lg:px-2.5"
            >
              <Pastille vides={entree.vides} />
              <span className="truncate">{entree.titre}</span>
              {/* La pastille est un dessin : ce qu'elle dit doit aussi
                  s'entendre, sinon l'entrée n'annonce plus rien. */}
              <span className="sr-only">
                {entree.vides === 0
                  ? " — section complète"
                  : ` — ${entree.vides} champ${entree.vides > 1 ? "s" : ""} vide${entree.vides > 1 ? "s" : ""}`}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {obstacle !== undefined && (
        /* Il mène à la check-list plutôt que de la recopier : le détail
           condition par condition y est déjà, et deux listes du même
           verdict finiraient par ne plus dire la même chose. */
        <a
          href="#publier"
          className="mt-2 flex items-start gap-2.5 rounded-[13px] px-3 py-2.5 transition active:scale-[.98] lg:hidden"
          style={{
            background: obstacle ? "rgba(242,176,60,0.14)" : "rgba(87,217,154,0.14)",
          }}
        >
          <span
            aria-hidden
            className="mt-[3px] h-[9px] w-[9px] shrink-0 rounded-full"
            style={{ background: obstacle ? AMBRE : VERT }}
          />
          <span className="text-[12px] font-semibold leading-snug text-white/85">
            {obstacle ?? "Rien ne retient cette fiche : elle peut partir en ligne."}
          </span>
        </a>
      )}
    </nav>
  );
}

/**
 * La coche, ou le compte.
 *
 * Un nombre plutôt qu'un simple point : « 3 » dit combien il reste à
 * faire dans la section, et c'est ce qui permet de choisir par où
 * commencer sans l'ouvrir.
 */
function Pastille({ vides }: { vides: number }) {
  const complete = vides === 0;

  return (
    <span
      aria-hidden
      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-black tabular-nums"
      style={
        complete
          ? { background: "rgba(87,217,154,0.22)", color: VERT }
          : { background: "rgba(242,176,60,0.22)", color: AMBRE }
      }
    >
      {complete ? "✓" : vides}
    </span>
  );
}
