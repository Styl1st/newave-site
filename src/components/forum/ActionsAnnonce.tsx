"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BoutonSignaler from "@/components/BoutonSignaler";
import PremierMessage from "@/components/messages/PremierMessage";
import { cloturerAnnonce, supprimerAnnonce } from "@/app/forum/actions";
import { MESSAGERIE_OUVERTE, signature, type Annonce } from "@/lib/forum";
import BoutonVote from "./BoutonVote";

/**
 * La rangée de boutons sous une annonce : voter, répondre en privé,
 * partager, signaler. Et, pour son auteur, clôturer ou retirer.
 *
 * CLÔTURER N'EST PAS RETIRER. Une annonce clôturée reste lisible (ses
 * réponses aussi), sort du tri « Tendance », et on ne peut plus y
 * répondre en privé : c'est « j'ai trouvé », pas « ça n'a jamais
 * existé ». Retirer la supprime, avec ses commentaires et ses votes.
 */
export default function ActionsAnnonce({
  annonce: a,
  moi,
  estAdmin,
  chemin,
  dejaSignalee,
  conversationId,
}: {
  annonce: Annonce;
  moi: { id: string; handle: string | null; nom: string | null } | null;
  estAdmin: boolean;
  chemin: string;
  dejaSignalee: boolean;
  /** La conversation déjà ouverte sur cette annonce, s'il y en a une. */
  conversationId: string | null;
}) {
  const router = useRouter();
  const moiId = moi?.id ?? null;
  const [ecrire, setEcrire] = useState(false);
  const [copie, setCopie] = useState(false);
  const [pending, setPending] = useState<"" | "cloture" | "retrait">("");
  const [erreur, setErreur] = useState<string | null>(null);
  const estAuteur = Boolean(moiId) && moiId === a.auteur.id;

  async function partager() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: a.titre, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2200);
    } catch {
      /* Partage annulé : rien à dire. */
    }
  }

  async function cloturer() {
    setPending("cloture");
    setErreur(null);
    const res = await cloturerAnnonce(a.id, !a.cloturee);
    setPending("");
    if (!res.ok) return setErreur(res.error ?? "L'annonce n'a pas changé.");
    router.refresh();
  }

  async function retirer() {
    if (!confirm("Retirer cette annonce ? Ses réponses et ses votes partent avec elle.")) return;
    setPending("retrait");
    setErreur(null);
    const res = await supprimerAnnonce(a.id);
    setPending("");
    if (!res.ok) return setErreur(res.error ?? "L'annonce n'a pas été retirée.");
    router.push("/forum");
    router.refresh();
  }

  const principal =
    "inline-flex min-h-[44px] items-center rounded-full px-5 text-[13.5px] font-black text-[#fff] shadow-[0_8px_22px_rgba(123,82,232,0.35)] transition active:scale-[.97]";
  const degrade = { backgroundImage: "linear-gradient(110deg, #e58ad8, #7b52e8)" };

  const secondaire =
    "inline-flex min-h-[44px] items-center rounded-full border border-[rgba(23,10,51,0.14)] bg-[#fff] px-4 text-[13px] font-extrabold text-[var(--color-ink)] transition hover:border-[rgba(23,10,51,0.3)] active:scale-[.97]";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <BoutonVote
          cible="annonce"
          id={a.id}
          votes={a.votes}
          aVote={a.aVote}
          estAuteur={estAuteur}
          habit="grand"
        />

        {/*
          RÉPONDRE EN PRIVÉ : la conversation existe déjà, on y retourne ;
          sinon la fenêtre du premier message s'ouvre sur l'annonce. Sans
          compte, on passe par la connexion. Pas de bouton sur sa propre
          annonce, ni sur une annonce clôturée (sauf pour revenir à une
          conversation déjà commencée).
        */}
        {MESSAGERIE_OUVERTE && !estAuteur && (conversationId || !a.cloturee) &&
          (conversationId ? (
            <Link href={`/messages?c=${conversationId}`} className={principal} style={degrade}>
              Voir la conversation
            </Link>
          ) : moi ? (
            <button type="button" onClick={() => setEcrire(true)} className={principal} style={degrade}>
              Répondre en privé
            </button>
          ) : (
            <Link
              href={`/connexion?suite=${encodeURIComponent(chemin)}`}
              className={principal}
              style={degrade}
            >
              Répondre en privé
            </Link>
          ))}

        <button type="button" onClick={partager} className={secondaire}>
          {copie ? "Lien copié" : "Partager"}
        </button>

        {estAuteur && (
          <button type="button" onClick={cloturer} disabled={Boolean(pending)} className={secondaire}>
            {pending === "cloture" ? "…" : a.cloturee ? "Rouvrir" : "Clôturer"}
          </button>
        )}

        {(estAuteur || estAdmin) && (
          <button
            type="button"
            onClick={retirer}
            disabled={Boolean(pending)}
            className="text-[12.5px] font-bold text-[#8a3a6a] underline decoration-[rgba(138,58,106,0.35)] underline-offset-4 transition hover:text-[#b0306a]"
          >
            {pending === "retrait" ? "…" : "Retirer l'annonce"}
          </button>
        )}
      </div>

      {/* Sur sa propre ligne : ouvert, le panneau des motifs prend la
          largeur de la carte au lieu de tasser les boutons. */}
      {!estAuteur && (
        <BoutonSignaler
          cible="annonce"
          cibleId={a.id}
          chemin={chemin}
          connecte={Boolean(moiId)}
          dejaFait={dejaSignalee}
          className="signaler-sur-clair mt-4"
        />
      )}
      {erreur && (
        <p className="m-0 mt-3 rounded-[11px] bg-[#fdeaf2] px-3 py-2 text-[13px] font-semibold text-[#b0306a]">
          {erreur}
        </p>
      )}

      {moi && MESSAGERIE_OUVERTE && (
        <PremierMessage
          annonce={a}
          signatureAuteur={signature(a)}
          moi={moi}
          ouvert={ecrire}
          onFermer={() => setEcrire(false)}
        />
      )}
    </div>
  );
}
