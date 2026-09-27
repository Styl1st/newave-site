"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { heure, poidsLisible, type Message } from "@/lib/messages";

/**
 * Une pièce jointe dans le fil d'une conversation.
 *
 * LE FICHIER N'A PAS D'ADRESSE PUBLIQUE (bucket privé, migration 38).
 * On demande un lien signé, valable dix minutes, au moment où on en a
 * besoin : à l'affichage pour une image, au clic pour un PDF (un lien
 * demandé à l'avance aurait peut-être expiré quand on clique). Seuls
 * les deux participants peuvent l'obtenir.
 */

const DUREE = 600;

async function lienSigne(chemin: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.storage.from("messages").createSignedUrl(chemin, DUREE);
  return data?.signedUrl ?? null;
}

export default function PieceJointe({ m, aMoi }: { m: Message; aMoi: boolean }) {
  const chemin = m.pieceJointe as string;
  const image = /\.(jpe?g|png|webp)$/i.test(chemin);
  const [url, setUrl] = useState<string | null>(null);
  const [panne, setPanne] = useState(false);

  useEffect(() => {
    if (!image) return;
    let vivant = true;
    lienSigne(chemin).then((u) => {
      if (!vivant) return;
      if (u) setUrl(u);
      else setPanne(true);
    });
    return () => {
      vivant = false;
    };
  }, [chemin, image]);

  /* La fenêtre s'ouvre TOUT DE SUITE, dans le geste du clic, puis reçoit
     le lien : ouverte après l'attente du lien signé, elle serait prise
     pour une fenêtre surgissante et bloquée par le navigateur. */
  async function ouvrir() {
    const fenetre = window.open("about:blank", "_blank");
    if (fenetre) fenetre.opener = null;
    const u = await lienSigne(chemin);
    if (u && fenetre) fenetre.location.href = u;
    else {
      fenetre?.close();
      setPanne(true);
    }
  }

  if (image) {
    return (
      <button
        type="button"
        onClick={ouvrir}
        className="block overflow-hidden rounded-[16px] border border-white/20 bg-white/8"
        aria-label={`Ouvrir ${m.pieceJointeNom ?? "l'image"}`}
      >
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt={m.pieceJointeNom ?? ""} className="block max-h-[260px] w-auto max-w-[260px] object-cover" />
        ) : (
          <span className="grid h-[140px] w-[200px] place-items-center text-[12px] font-bold text-white/60">
            {panne ? "Image indisponible" : "Chargement…"}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={ouvrir}
      className={`flex max-w-[280px] items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition active:scale-[.98] ${
        aMoi ? "border-white/25 bg-[rgba(23,10,51,0.35)]" : "border-white/20 bg-white/10"
      }`}
    >
      <span className="grid h-10 w-9 shrink-0 place-items-center rounded-[8px] bg-[#fff] text-[9.5px] font-black text-[var(--color-ink)]">
        PDF
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-extrabold text-white">{m.pieceJointeNom ?? "Document"}</span>
        <span className="block text-[11.5px] font-semibold text-white/65" suppressHydrationWarning>
          {panne ? "Indisponible pour l'instant" : `${poidsLisible(m.pieceJointeTaille)} · ${heure(m.createdAt)}`}
        </span>
      </span>
    </button>
  );
}
