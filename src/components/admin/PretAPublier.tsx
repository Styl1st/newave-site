"use client";

import Link from "next/link";
import { obstacleAPublication, type FichePubliable } from "@/lib/publication";

/**
 * Ce qui manque pour que la fiche parte en ligne, pendant qu'on la remplit.
 *
 * LE PROBLÈME QU'ELLE RÈGLE. `obstacleAPublication()` connaissait déjà la
 * réponse, mais on ne l'entendait qu'au moment d'échouer : on cliquait
 * sur Publier, on lisait une phrase, on revenait corriger. En
 * publication groupée c'était pire — la fiche était « laissée de côté »,
 * sans qu'on sache laquelle ni pourquoi.
 *
 * ELLE NE JUGE RIEN ELLE-MÊME, comme `JaugePublication`. Les trois
 * lignes ci-dessous ne relisent jamais les champs pour deviner ce qui
 * manque : elles posent la question à `publication.ts` et affichent la
 * phrase renvoyée, telle quelle. Recopier ces phrases ici en aurait fait
 * une deuxième définition, et c'est exactement ce que ce fichier-là dit
 * vouloir éviter.
 *
 * TROIS CONDITIONS, PAS QUATRE. La boutique, les catégories, le pays et
 * le logo seul n'entrent pas dans la règle : une boutique fermée n'est
 * pas une fiche incomplète. Ajouter une quatrième ligne ici reviendrait
 * à durcir la règle dans un seul chemin, ce qui est la faute que
 * `publication.ts` existe pour empêcher.
 */

/** Ce qui part. */
const VERT = "#57d99a";
/** Ce qui retient — la même couleur que le décompte du sommaire. */
const AMBRE = "#f2b03c";

/**
 * Une fiche dont tout est en règle.
 *
 * Elle sert de socle : on n'y repose qu'un manque à la fois, et l'on
 * demande à `obstacleAPublication` ce qu'elle en dit. La fonction ne
 * rend que le PREMIER manque qu'elle rencontre — elle est faite pour
 * trancher, pas pour inventorier — alors que la check-list montre les
 * trois lignes en même temps. On l'interroge donc trois fois, isolément,
 * et chaque phrase affichée sort de sa bouche.
 */
const EN_REGLE: FichePubliable = { tagline: "…", cover_url: "…", pieces: 1 };

function seule(manque: FichePubliable): string | null {
  return obstacleAPublication({ ...EN_REGLE, ...manque });
}

export default function PretAPublier({
  fiche,
  hrefPieces,
  enLigne,
}: {
  /** L'état courant de la saisie, tel que le lit `useValeursDuFormulaire`. */
  fiche: FichePubliable;
  /** Où l'on importe le catalogue : l'espace de la marque. */
  hrefPieces: string;
  /** Déjà en ligne : seul le mot de conclusion change, jamais le verdict. */
  enLigne: boolean;
}) {
  /*
   * Les pièces ne sont pas toujours exigées, et c'est le champ « Comment
   * on achète » qui en décide (voir `doitAvoirDesPieces`). La ligne le
   * dit en toutes lettres plutôt que de disparaître : une condition qui
   * s'évapore laisse croire à un bug.
   */
  const exigeDesPieces = fiche.exigeDesPieces !== false;

  const conditions = [
    {
      cle: "visuel",
      titre: "Un visuel",
      attendu: "Une couverture, ou à défaut le logo.",
      obstacle: seule({ cover_url: fiche.cover_url, logo_url: fiche.logo_url }),
      raccourci: { libelle: "Aller au visuel", href: "#identite" as string, externe: false },
      note: null as string | null,
    },
    {
      cle: "texte",
      titre: "Du texte",
      attendu: "Une accroche, ou à défaut la description.",
      obstacle: seule({ tagline: fiche.tagline, description: fiche.description }),
      raccourci: { libelle: "Aller à l'accroche", href: "#identite", externe: false },
      note: null,
    },
    {
      cle: "pieces",
      titre: "Au moins une pièce",
      attendu: exigeDesPieces
        ? `${fiche.pieces ?? 0} pièce${(fiche.pieces ?? 0) > 1 ? "s" : ""} au catalogue.`
        : "Pas exigé pour cette fiche.",
      obstacle: seule({ pieces: fiche.pieces, exigeDesPieces: fiche.exigeDesPieces }),
      raccourci: { libelle: "Importer depuis la boutique", href: hrefPieces, externe: true },
      note: exigeDesPieces
        ? null
        : "La boutique n'est pas ouverte à qui passe : son catalogue vide est l'état annoncé, pas un raté. Voir « Comment on achète ».",
    },
  ];

  const remplies = conditions.filter((c) => !c.obstacle).length;
  const part = Math.round((remplies / conditions.length) * 100);

  /*
   * LE VERDICT VIENT DE LA FONCTION, PAS DU COMPTE CI-DESSUS. Les trois
   * lignes sont un affichage ; ce qui décide reste un appel entier, sur
   * la fiche entière — le même que celui du serveur.
   */
  const obstacle = obstacleAPublication(fiche);

  return (
    /* Le dégagement suit le nombre de barres collantes au-dessus : la
       seule barre du site sur un téléphone, celle-ci plus l'en-tête de
       la fiche dès que l'écran est assez large pour le garder en haut. */
    <section id="publier" className="glass scroll-mt-[92px] p-4 sm:scroll-mt-[156px] sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow m-0">Prêt à publier</h2>
        <span
          className="text-[11.5px] font-black tabular-nums"
          style={{ color: obstacle ? AMBRE : VERT }}
        >
          {remplies} / {conditions.length}
        </span>
      </div>

      <span
        aria-hidden
        className="mt-2.5 block h-[6px] w-full overflow-hidden rounded-full bg-white/14"
      >
        <span
          className="block h-full rounded-full transition-[width] duration-300"
          style={{ width: `${part}%`, background: obstacle ? AMBRE : VERT }}
        />
      </span>

      <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {conditions.map((condition) => (
          <li key={condition.cle} className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-black"
              style={
                condition.obstacle
                  ? { background: "rgba(242,176,60,0.22)", color: AMBRE }
                  : { background: "rgba(87,217,154,0.22)", color: VERT }
              }
            >
              {condition.obstacle ? "!" : "✓"}
            </span>

            <div className="min-w-0">
              <p className="m-0 text-[13px] font-extrabold text-white">{condition.titre}</p>

              {/* La phrase EXACTE de `obstacleAPublication`. Elle est
                  écrite pour être montrée telle quelle : elle dit ce qui
                  manque et pourquoi, et la reformuler en plus court
                  perdrait justement le pourquoi. */}
              <p className="m-0 mt-0.5 text-[12px] leading-relaxed text-white/70">
                {condition.obstacle ?? condition.attendu}
              </p>

              {condition.note && (
                <p className="m-0 mt-1 text-[11.5px] leading-relaxed text-white/50">
                  {condition.note}
                </p>
              )}

              {condition.obstacle &&
                (condition.raccourci.externe ? (
                  <Link
                    href={condition.raccourci.href}
                    className="mt-1.5 inline-block text-[11.5px] font-bold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                  >
                    {condition.raccourci.libelle}
                  </Link>
                ) : (
                  /* Une ancre, et rien de plus : `html { scroll-behavior:
                     smooth }` fait déjà le défilement doux, et le
                     `scroll-mt` des sections dégage la hauteur des deux
                     barres collantes. Pas de `scrollIntoView`, qui
                     ignorerait le réglage « animations réduites » du
                     système. */
                  <a
                    href={condition.raccourci.href}
                    className="mt-1.5 inline-block text-[11.5px] font-bold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                  >
                    {condition.raccourci.libelle}
                  </a>
                ))}
            </div>
          </li>
        ))}
      </ul>

      <p
        className="m-0 mt-4 border-t border-white/12 pt-3 text-[12px] font-semibold leading-relaxed"
        style={{ color: obstacle ? "rgba(255,255,255,0.72)" : VERT }}
      >
        {obstacle
          ? "Il reste quelque chose à faire avant la mise en ligne."
          : enLigne
            ? "Cette fiche est complète."
            : "Cette fiche peut partir en ligne."}
      </p>
    </section>
  );
}
