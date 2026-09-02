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

export default function SommaireFiche({ entrees }: { entrees: EntreeSommaire[] }) {
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
