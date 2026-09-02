"use client";

import { useConfirmation } from "@/lib/confirmation";

/**
 * La barre d'enregistrement, en bas de l'écran.
 *
 * ELLE N'APPARAÎT QU'À PARTIR DE LA PREMIÈRE MODIFICATION. Un bouton
 * « Enregistrer » posé en permanence n'apprend rien : il est là que
 * l'on ait touché à quelque chose ou non, et l'on finit par ne plus
 * savoir si la dernière correction est partie. Ici, la barre EST
 * l'information — tant qu'elle est visible, il reste quelque chose à
 * enregistrer, et le compte dit combien.
 *
 * ELLE FLOTTE PARCE QUE LE FORMULAIRE EST LONG. Le bouton vivait tout
 * en bas : on corrigeait une accroche en haut de page et il fallait
 * traverser quatre sections pour l'enregistrer, ce qui suffit à faire
 * oublier pourquoi on était venu. La page réserve la place de la barre
 * en bas (voir `EditeurFiche`) pour qu'elle ne recouvre jamais le
 * dernier champ.
 *
 * « ANNULER » SE DEMANDE DEUX FOIS. Il jette du travail, et c'est le
 * bouton voisin de celui qu'on vient chercher. Deux appuis dans la
 * page, jamais un `confirm()` natif : les navigateurs mobiles
 * l'escamotent, et le bouton paraît alors inerte.
 *
 * « ENREGISTRER ET PUBLIER » SE DÉSACTIVE, IL NE MENT PAS. Tant que la
 * check-list n'est pas complète, il porte en infobulle le message exact
 * de `obstacleAPublication` — celui qui dit quoi faire. Et ce n'est
 * qu'un confort : l'action serveur revérifie la même règle, un bouton
 * désactivé n'ayant jamais empêché personne d'envoyer un formulaire.
 */

/** Ce qui attend d'être enregistré. */
const AMBRE = "#f2b03c";

export default function BarreEnregistrement({
  modifications,
  enCours,
  obstacle,
  peutPublier,
  onEnregistrer,
  onPublier,
  onAnnuler,
}: {
  /** Combien de champs diffèrent de ce qui est en base. */
  modifications: number;
  enCours: boolean;
  /** Le message de `obstacleAPublication`, ou null si la fiche peut partir. */
  obstacle: string | null;
  /** Publier n'appartient qu'à l'administration : ailleurs, pas de bouton. */
  peutPublier: boolean;
  onEnregistrer: () => void;
  onPublier: () => void;
  onAnnuler: () => void;
}) {
  const { arme, demander, desarmer } = useConfirmation();

  if (modifications === 0) return null;

  return (
    <div
      /* Centrée, et bornée à la largeur de l'écran moins ses marges :
         sur 390 pixels, trois boutons et une phrase ne tiennent pas sur
         une ligne, ils passent donc à la ligne dans la pilule plutôt
         que d'en déborder. */
      className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-20px)] max-w-2xl -translate-x-1/2 sm:bottom-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-[22px] border border-white/20 bg-[rgba(var(--voile),0.78)] px-3.5 py-3 shadow-[0_16px_42px_-12px_rgba(var(--voile),0.9)] backdrop-blur-[24px] sm:rounded-full sm:px-5">
        <p className="m-0 flex min-w-0 items-center gap-2.5 text-[12.5px] font-bold text-white">
          <span
            aria-hidden
            className="h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: AMBRE, boxShadow: `0 0 0 3px rgba(242,176,60,0.22)` }}
          />
          <span className="truncate">
            {modifications} modification{modifications > 1 ? "s" : ""} non enregistrée
            {modifications > 1 ? "s" : ""}
          </span>
        </p>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (!demander()) return;
              onAnnuler();
            }}
            onBlur={desarmer}
            disabled={enCours}
            className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-[.97] disabled:opacity-50 ${
              arme
                ? "bg-white/22 text-white ring-2 ring-white/70"
                : "text-white/70 hover:bg-white/14 hover:text-white"
            }`}
          >
            {arme ? "Tout reprendre ?" : "Annuler"}
          </button>

          <button
            type="button"
            onClick={onEnregistrer}
            disabled={enCours}
            className="rounded-full bg-white px-5 py-2 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-60"
          >
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>

          {peutPublier && (
            <button
              type="button"
              onClick={onPublier}
              disabled={enCours || Boolean(obstacle)}
              /* L'infobulle porte la phrase entière de
                 `obstacleAPublication`, pas un « indisponible » : un
                 bouton grisé sans raison est une impasse. */
              title={obstacle ?? "La fiche a de quoi paraître dans l'annuaire."}
              className="rounded-full bg-linear-to-r from-[rgba(var(--accent-1),0.95)] to-[rgba(var(--accent-2),0.95)] px-5 py-2 text-[12.5px] font-black text-white transition active:scale-[.97] disabled:opacity-45"
            >
              Enregistrer et publier
            </button>
          )}
        </div>

        {/* La raison, écrite. L'infobulle ne s'ouvre pas au doigt, et
            c'est justement sur téléphone qu'on ne comprend pas pourquoi
            le bouton refuse. */}
        {peutPublier && obstacle && (
          <p className="m-0 w-full text-[11.5px] leading-relaxed text-white/60 sm:hidden">
            {obstacle}
          </p>
        )}
      </div>
    </div>
  );
}
