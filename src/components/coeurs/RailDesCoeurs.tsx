import Link from "next/link";
import { CoeurPlein } from "../LigneMarque";
import { enChiffres } from "../chiffres";
import { vignette } from "@/lib/vignette";
import type { MiseDeCote } from "@/lib/favorites";

/**
 * La colonne de droite de la page des coups de cœur.
 *
 * TROIS BLOCS QUI RÉPONDENT AUX TROIS QUESTIONS QU'ON SE POSE DEVANT UN
 * CLASSEMENT JEUNE. « Sur quoi repose ce classement ? » — le premier
 * bloc, qui dit le chiffre qui gouverne l'onglet en cours. « Est-ce que
 * ça bouge ? » — les trois dernières mises de côté, qui prouvent que la
 * page est vivante même quand le classement ne change pas. « Et moi ? » —
 * le renvoi vers sa propre liste.
 *
 * IL ACCOMPAGNE LES CINQ ONGLETS, PLUS SEULEMENT CELUI DES MARQUES. Il
 * ne vivait que dans le classement des plus suivies, et la page changeait
 * donc de gabarit selon l'onglet. Mais il ne pouvait pas déménager tel
 * quel : sa jauge « 40 sur 100 cœurs » n'a aucun sens au-dessus d'un
 * classement de notes, où le chiffre qui décide de tout est le nombre
 * d'avis minimum. D'où `EnTeteDuRail` : le premier bloc change de
 * contenu, jamais de place, et il dit à chaque fois la VRAIE règle de
 * l'onglet plutôt que de recopier celle du voisin.
 *
 * CE COMPOSANT RESTE UN COMPOSANT SERVEUR, ET IL FAUT QUE ÇA DURE. Il
 * affiche des anciennetés — « il y a 2 jours » — fabriquées sur le
 * serveur par `getDerniersFavoris`. Lui ajouter un `use client` ne
 * casserait rien tout de suite, mais inviterait la première personne qui
 * y touche à recalculer l'écart dans le navigateur, et un écart
 * recalculé quelques secondes plus tard peut avoir franchi minuit : deux
 * textes différents pour un même instant, et React signale une erreur
 * d'hydratation sur toute la page. Voir `LignePost` pour la même
 * histoire, vécue une première fois.
 */

/**
 * Ce que le premier bloc du rail annonce, selon l'onglet.
 *
 * Un objet discriminé plutôt que quatre champs facultatifs : avec des
 * champs facultatifs, « aucun rempli » et « tous remplis » deviennent des
 * états représentables qu'il faut arbitrer quelque part, et c'est
 * exactement comme ça qu'une jauge de cœurs finit par s'afficher sur un
 * classement de notes.
 */
export type EnTeteDuRail =
  /** Les marques les plus suivies : combien de cœurs avant le podium. */
  | { genre: "podium"; total: number; seuil: number }
  /** Les deux classements de notes : le minimum d'avis pour figurer. */
  | { genre: "avis"; seuil: number }
  /** Les coups de cœur sur les pièces : ce qui a été compté, et sur quand. */
  | {
      genre: "coups-de-coeur";
      total: number;
      pieces: number;
      fenetre: "semaine" | "toujours";
    };

export default function RailDesCoeurs({
  entete,
  recentes,
}: {
  entete: EnTeteDuRail;
  /** Les dernières marques mises de côté. Jamais par qui. */
  recentes: MiseDeCote[];
}) {
  return (
    <aside className="flex flex-col gap-4">
      <EnTete entete={entete} />

      {/*
       * « VIENT D'ÊTRE MIS DE CÔTÉ » RESTE SUR LES CINQ ONGLETS, et ce
       * n'est pas une facilité de mise en page. Ce bloc ne parle pas du
       * classement affiché : il dit que le SITE bouge, et cette réponse
       * vaut autant sous un classement de pièces notées que sous celui
       * des marques suivies. C'est même là qu'elle sert le plus, sur les
       * onglets où le classement met des semaines à changer.
       */}
      {recentes.length > 0 && (
        <section className="glass p-5">
          <p className="eyebrow m-0 text-white/50">Vient d&apos;être mis de côté</p>

          <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
            {recentes.map(({ brand, quand, depuis }) => {
              const visuel = brand.logo_url ?? brand.cover_url;
              const estUnLogo = Boolean(brand.logo_url);

              return (
                <li key={`${brand.id}-${quand}`}>
                  <Link
                    href={`/marques/${brand.slug}`}
                    className="group flex items-center gap-3 no-underline"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-white/12">
                      {visuel ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={vignette(visuel, 96, { logo: estUnLogo })}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className={`h-full w-full ${estUnLogo ? "object-contain p-1" : "object-cover"}`}
                        />
                      ) : (
                        <span className="text-[13px] font-black text-white/70">
                          {brand.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold text-white transition group-hover:text-white">
                        {brand.name}
                      </span>
                      {/* L'horodatage brut dans l'attribut, la phrase
                          dans le texte : un lecteur d'écran annonce la
                          date exacte, l'œil lit l'ancienneté. */}
                      <time
                        dateTime={quand}
                        className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/45"
                      >
                        {depuis}
                      </time>
                    </span>

                    <CoeurPlein className="h-3.5 w-3.5 shrink-0 text-white/35" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/*
           * ⚠️ LA NOTE N'EST PAS DÉCORATIVE. Une liste « vient d'être mis
           * de côté » se lit spontanément comme « untel a mis ceci de
           * côté » : c'est ce que font les autres sites, et c'est
           * précisément ce qu'on ne fait pas ici. La règle est écrite dans
           * `favorites.ts`, elle mérite d'être écrite sur la page aussi —
           * une garantie que personne ne lit ne rassure personne. Elle
           * suit le bloc sur les cinq onglets, sans exception.
           */}
          <p className="m-0 mt-4 border-t border-white/12 pt-3 text-[11px] leading-relaxed text-white/50">
            On ne dit jamais qui a mis quoi de côté.
          </p>
        </section>
      )}

      {/* Le renvoi vers sa propre liste EN DERNIER : on vient de lire ce
          que suivent les autres, c'est le moment où l'on pense à la
          sienne. Même raisonnement que le pied du classement. */}
      <Link href="/favoris" className="card-light block p-4 no-underline">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-white">
            <CoeurPlein className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-extrabold leading-tight text-[var(--color-ink)]">
              Ta liste à toi
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold text-[#6a5a92]">
              Les marques que tu suis, rien qu&apos;à toi.
            </span>
          </span>
        </span>
      </Link>
    </aside>
  );
}

/**
 * Le premier bloc : la règle qui gouverne l'onglet en cours.
 *
 * ⚠️ IL DIT LA RÈGLE DE L'ONGLET, PAS UNE VARIANTE DE CELLE DU VOISIN.
 * C'est la seule chose à respecter en y touchant : recopier ici la jauge
 * des cœurs sous un classement de notes reviendrait à annoncer un seuil
 * qui ne s'y applique pas, et un chiffre faux sur un classement public
 * coûte plus cher qu'un chiffre absent.
 */
function EnTete({ entete }: { entete: EnTeteDuRail }) {
  if (entete.genre === "podium") {
    /*
     * LE COMPTEUR N'A DE SENS QU'EN DESSOUS DU SEUIL. « 340 sur 100 »
     * ne se lit pas, et une barre pleine à ras bord ne dit plus rien du
     * tout. Passé le seuil, le podium est là pour répondre à sa place :
     * le bloc s'efface au lieu de se contredire.
     */
    if (entete.total >= entete.seuil) return null;

    const { total, seuil } = entete;
    const part = Math.min(100, Math.round((total / seuil) * 100));

    return (
      <section className="glass p-5">
        <p className="eyebrow m-0 text-white/50">Le classement complet</p>
        <p className="m-0 mt-2 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-white">
          {enChiffres(total)} sur {enChiffres(seuil)} cœurs
        </p>

        <div
          role="progressbar"
          aria-valuenow={total}
          aria-valuemin={0}
          aria-valuemax={seuil}
          aria-label={`${total} cœurs sur les ${seuil} qui ouvriront le podium`}
          className="mt-3 h-[6px] w-full overflow-hidden rounded-full bg-white/16"
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${part}%`,
              background:
                "linear-gradient(90deg, rgba(232,111,216,.95), rgba(180,122,234,.9))",
            }}
          />
        </div>

        {/*
         * L'EXPLICATION EN TOUTES LETTRES, ET PAS UNE INFOBULLE. Une
         * barre de progression sans motif ressemble à un objectif
         * commercial — « aidez-nous à atteindre cent » — alors que
         * c'est une précaution méthodologique. Écrite, elle se
         * comprend ; cachée derrière un point d'interrogation, elle
         * n'est jamais lue.
         */}
        <p className="m-0 mt-3 text-[12px] leading-relaxed text-white/60">
          En dessous de cent cœurs, un podium ne veut rien dire : trois voix d&apos;écart
          suffiraient à tout changer.
        </p>
      </section>
    );
  }

  if (entete.genre === "avis") {
    /*
     * PAS DE JAUGE ICI, ET C'EST VOULU. Le seuil d'avis n'est pas un
     * objectif que le site progresse vers : c'est une porte, franchie
     * fiche par fiche. Une barre de progression laisserait croire qu'on
     * attend un total collectif, alors que ce qu'on attend est trois avis
     * SUR LA MÊME pièce.
     */
    return (
      <section className="glass p-5">
        <p className="eyebrow m-0 text-white/50">Le minimum pour figurer</p>
        <p className="m-0 mt-2 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-white">
          {enChiffres(entete.seuil)} avis
        </p>
        <p className="m-0 mt-3 text-[12px] leading-relaxed text-white/60">
          En dessous, une seule opinion prendrait la première place : cinq étoiles données
          par une personne passeraient devant quatre et demie données par quarante. Ce ne
          serait plus un classement, mais un tirage au sort.
        </p>
      </section>
    );
  }

  const { total, pieces, fenetre } = entete;

  return (
    <section className="glass p-5">
      <p className="eyebrow m-0 text-white/50">Ce que compte ce classement</p>
      <p className="m-0 mt-2 text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-white">
        {enChiffres(total)} coup{total > 1 ? "s" : ""} de cœur
      </p>
      {/* Le nombre de pièces sous le total, parce que l'un ne se lit pas
          sans l'autre : trois cents cœurs sur douze pièces et trois cents
          sur deux cents ne racontent pas la même chose. */}
      <p className="m-0 mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/45">
        sur {enChiffres(pieces)} pièce{pieces > 1 ? "s" : ""} classée
        {pieces > 1 ? "s" : ""}
      </p>
      <p className="m-0 mt-3 text-[12px] leading-relaxed text-white/60">
        {fenetre === "semaine"
          ? "Seuls les sept derniers jours sont comptés ici. Les plus anciens ne disparaissent pas : ils vivent dans « tout temps »."
          : "Le total depuis l'ouverture du site. Rien n'est jamais effacé, et rien ne s'achète pour y figurer."}
      </p>
    </section>
  );
}
