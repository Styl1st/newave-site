"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { voterAnnonce, voterCommentaire } from "@/app/forum/actions";
import { IconVote } from "./icones";

/**
 * Faire monter une annonce ou un commentaire, ou retirer son vote.
 *
 * UN SEUL GESTE, ET PAS DE VOTE NÉGATIF. Le compteur change tout de
 * suite (on n'attend pas la base pour voir son clic compter) et revient
 * en arrière si elle refuse.
 *
 * Sur ses propres contenus le bouton reste visible, mais inerte : le
 * total est une information pour tout le monde, le geste ne l'est pas.
 */
export default function BoutonVote({
  cible,
  id,
  votes,
  aVote,
  estAuteur = false,
  habit = "carte",
  apercu = false,
}: {
  cible: "annonce" | "commentaire";
  id: string;
  votes: number;
  aVote: boolean;
  estAuteur?: boolean;
  /** `carte` et `grand` sur fond clair, `sombre` sur les commentaires. */
  habit?: "carte" | "grand" | "sombre";
  /** Dans l'aperçu du formulaire : un dessin, pas un bouton. */
  apercu?: boolean;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState({ votes, aVote });
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function basculer(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (estAuteur || apercu) return;

    const avant = etat;
    const pour = !etat.aVote;
    setEtat({ aVote: pour, votes: Math.max(0, etat.votes + (pour ? 1 : -1)) });
    setErreur(null);

    startTransition(async () => {
      const res = cible === "annonce" ? await voterAnnonce(id, pour) : await voterCommentaire(id, pour);
      if (res.raison === "non-connecte") {
        setEtat(avant);
        router.push(`/connexion?suite=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) {
        setEtat(avant);
        setErreur(res.error ?? "Le vote n'est pas passé.");
        return;
      }
      if (typeof res.votes === "number") setEtat({ aVote: pour, votes: res.votes });
    });
  }

  const habits = {
    carte: etat.aVote
      ? "bg-[var(--color-ink)] text-white"
      : "bg-[rgba(123,82,232,0.10)] text-[var(--color-ink)] hover:bg-[rgba(123,82,232,0.18)]",
    grand: etat.aVote
      ? "bg-[var(--color-ink)] text-white"
      : "bg-[rgba(123,82,232,0.10)] text-[var(--color-ink)] hover:bg-[rgba(123,82,232,0.18)]",
    sombre: etat.aVote
      ? "bg-white text-[var(--color-ink)]"
      : "bg-white/14 text-white hover:bg-white/22",
  }[habit];

  const taille =
    habit === "grand"
      ? "min-h-[44px] gap-2 px-4 text-[14px]"
      : habit === "sombre"
        ? "min-h-[30px] gap-1.5 px-2.5 text-[12px]"
        : "min-h-[34px] gap-1.5 px-3 text-[12.5px]";

  const libelle = estAuteur
    ? `${etat.votes} vote${etat.votes > 1 ? "s" : ""}`
    : etat.aVote
      ? "Retirer mon vote"
      : "Voter pour faire monter";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={basculer}
        disabled={pending && !apercu}
        aria-pressed={etat.aVote}
        aria-label={`${libelle} (${etat.votes})`}
        title={estAuteur ? "On ne vote pas pour soi" : libelle}
        className={`inline-flex items-center rounded-full font-extrabold tabular-nums transition active:scale-95 ${taille} ${habits} ${
          estAuteur || apercu ? "cursor-default active:scale-100" : ""
        }`}
      >
        <IconVote plein={etat.aVote} className={habit === "grand" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        {etat.votes}
      </button>
      {erreur && (
        <span
          role="status"
          className="absolute left-0 top-full z-10 mt-1.5 w-max max-w-[220px] rounded-[10px] bg-[var(--color-ink)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-lg"
        >
          {erreur}
        </span>
      )}
    </span>
  );
}
