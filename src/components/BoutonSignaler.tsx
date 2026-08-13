"use client";

import { useState } from "react";
import { signaler } from "@/lib/moderation";
import { MOTIFS, NOM_CIBLE, type CibleSignalement } from "@/lib/signalement";

/**
 * « Signaler » — pour un avis, une pièce ou une marque.
 *
 * Un seul composant pour les trois, parce que c'est le même geste. Ce
 * qui change, ce sont les motifs proposés : on ne reproche pas la même
 * chose à un commentaire, à une pièce et à une fiche de marque.
 *
 * Deux partis pris d'écriture.
 *
 * Le lien est DISCRET. Un bouton rouge bien visible sous chaque
 * contenu transforme un annuaire en tribunal, et donne l'idée de
 * signaler à des gens qui n'y pensaient pas.
 *
 * Et le panneau dit explicitement que le signalement NE SUPPRIME RIEN.
 * Sans cette phrase, quelqu'un qui signale, revient, et voit le
 * contenu toujours là conclut que le site est cassé — puis recommence,
 * ou écrit pour se plaindre.
 */
export default function BoutonSignaler({
  cible,
  cibleId,
  chemin,
  connecte,
  dejaFait = false,
  className = "",
}: {
  cible: CibleSignalement;
  cibleId: string;
  /** La page où l'on se trouve, pour la rafraîchir après coup. */
  chemin: string;
  connecte: boolean;
  dejaFait?: boolean;
  className?: string;
}) {
  const motifs = MOTIFS[cible];
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState(motifs[0].cle);
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; texte: string } | null>(
    dejaFait ? { ok: true, texte: "Tu l'as déjà signalé. On s'en occupe." } : null
  );

  async function envoyer() {
    setPending(true);

    const formData = new FormData();
    formData.set("cible", cible);
    formData.set("cibleId", cibleId);
    formData.set("motif", motif);
    formData.set("detail", detail);
    formData.set("chemin", chemin);

    const res = await signaler(formData);
    setPending(false);

    if (!res.ok) {
      setNote({ ok: false, texte: res.error ?? "Le signalement n'est pas parti." });
      return;
    }
    setOuvert(false);
    setDetail("");
    setNote({ ok: true, texte: res.message ?? "Merci, c'est signalé." });
  }

  if (!connecte) {
    return (
      <a
        href="/connexion"
        className={`text-[12px] font-bold text-white/40 underline decoration-white/20 underline-offset-4 transition hover:text-white/70 ${className}`}
      >
        Connecte-toi pour signaler
      </a>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="text-[12px] font-bold text-white/45 underline decoration-white/25 underline-offset-4 transition hover:text-white/80 hover:decoration-white/60"
      >
        {ouvert ? "Annuler" : `Signaler ${NOM_CIBLE[cible]}`}
      </button>

      {ouvert && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-[14px] border border-white/15 bg-white/6 p-3.5">
          <p className="m-0 text-[12px] leading-relaxed text-white/60">
            Un signalement ne supprime rien. Il met {NOM_CIBLE[cible]} dans la liste que
            l&apos;administration regarde.
          </p>

          <div>
            <p className="m-0 mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
              Motif
            </p>
            <div className="flex flex-wrap gap-1.5">
              {motifs.map((m) => (
                <button
                  key={m.cle}
                  type="button"
                  onClick={() => setMotif(m.cle)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                    motif === m.cle
                      ? "bg-white text-[var(--color-ink)]"
                      : "border border-white/25 text-white/75 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="m-0 mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
              Ce que tu as constaté
            </p>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="Facultatif, mais c'est ce qui permet de trancher vite."
              className="w-full resize-y rounded-[11px] border border-white/20 bg-white/8 px-3 py-2 text-[13px] leading-relaxed text-white outline-none placeholder:text-white/35 focus:border-white/45"
            />
          </div>

          <button
            type="button"
            onClick={envoyer}
            disabled={pending}
            className="self-start rounded-full bg-white px-5 py-2 text-[12.5px] font-black text-[var(--color-ink)] transition active:scale-[.97] disabled:opacity-55"
          >
            {pending ? "Envoi…" : "Envoyer le signalement"}
          </button>
        </div>
      )}

      {note && (
        <p
          className={`m-0 mt-2.5 text-[12.5px] ${
            note.ok ? "font-bold text-white/70" : "text-white"
          }`}
        >
          {note.texte}
        </p>
      )}
    </div>
  );
}
