"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";
import ChoixPseudo from "@/components/forum/ChoixPseudo";
import { createClient } from "@/lib/supabase/client";
import { allegerImage } from "@/lib/alleger-image";
import { envoyerMessage, ouvrirConversation } from "@/app/messages/actions";
import { libelleDates, rubrique, type Annonce } from "@/lib/forum";
import {
  MESSAGE_MAX,
  nomDeFichier,
  phrasesRapides,
  PIECE_JOINTE_MAX,
  PIECES_ACCEPTEES,
  poidsLisible,
} from "@/lib/messages";

/**
 * Le premier message, écrit depuis l'annonce (2b).
 *
 * UNE FENÊTRE, PAS UNE PAGE. On reste devant l'annonce pendant qu'on y
 * répond : c'est elle qu'on relit pour trouver quoi dire. Trois phrases
 * s'ajoutent au clic pour amorcer (« Je suis disponible le 14 oct. »),
 * et une pièce jointe (book, portfolio) part avec.
 *
 * Envoyer ouvre la conversation (ou rouvre celle qui existe), y dépose
 * le message, puis emmène dans la messagerie, où la réponse arrivera.
 */
export default function PremierMessage({
  annonce: a,
  signatureAuteur,
  moi,
  ouvert,
  onFermer,
}: {
  annonce: Annonce;
  signatureAuteur: string;
  moi: { id: string; handle: string | null; nom: string | null };
  ouvert: boolean;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState(false);
  const choix = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const r = rubrique(a.rubrique);
  const date = a.details.date ?? a.details.dates ?? null;

  useEffect(() => {
    if (!ouvert) return;
    const minuteur = setTimeout(() => zone.current?.focus(), 80);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && !pseudo && onFermer();
    document.addEventListener("keydown", echap);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(minuteur);
      document.removeEventListener("keydown", echap);
      document.body.style.overflow = avant;
    };
  }, [ouvert, onFermer, pseudo]);

  function ajouter(phrase: string) {
    setTexte((t) => (t.trim() ? `${t.trimEnd()} ${phrase}` : phrase).slice(0, MESSAGE_MAX));
    zone.current?.focus();
  }

  function choisirFichier(f: File | undefined) {
    setErreur(null);
    if (!f) return;
    if (!PIECES_ACCEPTEES.includes(f.type)) return setErreur("PDF ou image seulement (JPG, PNG, WebP).");
    if (f.size > PIECE_JOINTE_MAX) return setErreur("10 Mo au plus.");
    setFichier(f);
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);

    const ouverture = await ouvrirConversation(a.id);
    if (ouverture.raison === "non-connecte") {
      router.push(`/connexion?suite=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (ouverture.raison === "pseudo") {
      setEnvoi(false);
      setPseudo(true);
      return;
    }
    if (!ouverture.ok || !ouverture.id) {
      setEnvoi(false);
      return setErreur(ouverture.error ?? "La conversation n'a pas pu s'ouvrir.");
    }
    const id = ouverture.id;

    let pieceJointe: { chemin: string; nom: string; taille: number } | null = null;
    if (fichier) {
      const supabase = createClient();
      const envoye = fichier.type.startsWith("image/")
        ? (await allegerImage(fichier, { maxCote: 2000, qualite: 0.85 })).fichier
        : fichier;
      const chemin = `${id}/${moi.id}/${Date.now()}-${nomDeFichier(envoye.name)}`;
      const televersement = await supabase?.storage
        .from("messages")
        .upload(chemin, envoye, { contentType: envoye.type, upsert: false });
      if (!televersement || televersement.error) {
        setEnvoi(false);
        return setErreur(
          `La pièce jointe n'est pas passée${televersement?.error ? ` : ${televersement.error.message}` : "."}`
        );
      }
      pieceJointe = { chemin, nom: fichier.name, taille: envoye.size };
    }

    const res = await envoyerMessage({ conversationId: id, texte, pieceJointe });
    if (!res.ok) {
      setEnvoi(false);
      return setErreur(res.error ?? "Le message n'est pas parti.");
    }
    router.push(`/messages?c=${id}`);
  }

  if (!ouvert) return null;

  const pret = (texte.trim().length > 0 || fichier) && !envoi;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[88] flex items-end justify-center bg-[rgba(15,5,38,0.62)] backdrop-blur-sm sm:items-center sm:px-4"
        onMouseDown={(e) => e.target === e.currentTarget && !envoi && onFermer()}
      >
        <form
          role="dialog"
          aria-modal
          aria-labelledby="titre-premier-message"
          onSubmit={(e) => {
            e.preventDefault();
            if (pret) void envoyer();
          }}
          className="max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-[26px] bg-[#fff] p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] text-[var(--color-ink)] shadow-[0_30px_80px_rgba(15,5,38,0.55)] sm:rounded-[26px] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="titre-premier-message" className="m-0 text-[22px] font-extrabold tracking-[-0.03em]">
              Répondre à {signatureAuteur}
            </h2>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(123,82,232,0.10)] text-[15px] font-black transition active:scale-95"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-[#f5f0ff] p-2.5">
            {a.images[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={a.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
            ) : (
              <span aria-hidden className="h-11 w-11 shrink-0 rounded-[10px]" style={{ background: r.couleur }} />
            )}
            <div className="min-w-0">
              <p className="m-0 truncate text-[11.5px] font-bold text-[#6a5a92]">
                {r.label}
                {a.ville ? ` · ${a.ville}` : ""}
                {date ? ` · ${libelleDates(date)}` : ""}
              </p>
              <p className="m-0 truncate text-[14px] font-extrabold">{a.titre}</p>
            </div>
          </div>

          <textarea
            ref={zone}
            value={texte}
            onChange={(e) => setTexte(e.target.value.slice(0, MESSAGE_MAX))}
            rows={5}
            placeholder="Présente-toi en deux lignes : qui tu es, pourquoi ce projet."
            aria-label="Ton message"
            className="mt-4 w-full resize-y rounded-[14px] border border-[rgba(23,10,51,0.16)] bg-[#fff] px-4 py-3 text-[16px] leading-relaxed outline-none placeholder:text-[#9a8fb8] focus:border-[#7b52e8] sm:text-[15px]"
          />

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {phrasesRapides(a.rubrique, date).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ajouter(p)}
                className="rounded-full bg-[rgba(123,82,232,0.10)] px-3 py-1.5 text-[12px] font-extrabold transition hover:bg-[rgba(123,82,232,0.18)] active:scale-[.97]"
              >
                + {p.replace(/\.$/, "")}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => (fichier ? setFichier(null) : choix.current?.click())}
            className="mt-4 flex w-full items-center gap-3 rounded-[14px] border border-dashed border-[rgba(23,10,51,0.22)] px-3.5 py-3 text-left transition hover:border-[rgba(23,10,51,0.4)]"
          >
            <span className="grid h-9 w-8 shrink-0 place-items-center rounded-[7px] bg-[var(--color-ink)] text-[9px] font-black text-white">
              {fichier && fichier.type.startsWith("image/") ? "IMG" : "PDF"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold">
              {fichier ? fichier.name : "Joindre un book ou un portfolio"}
            </span>
            <span className="shrink-0 text-[12px] font-bold text-[#6a5a92]">
              {fichier ? `${poidsLisible(fichier.size)} · retirer` : "10 Mo max"}
            </span>
          </button>
          <input
            ref={choix}
            type="file"
            accept={PIECES_ACCEPTEES.join(",")}
            hidden
            onChange={(e) => {
              choisirFichier(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {erreur && (
            <p className="m-0 mt-3 rounded-[11px] bg-[#fdeaf2] px-3 py-2 text-[13px] font-semibold text-[#b0306a]">
              {erreur}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-[12.5px] font-bold text-[#6a5a92]">
              {signatureAuteur} verra ton profil et tes votes reçus.
            </p>
            <button
              type="submit"
              disabled={!pret}
              className="min-h-[46px] rounded-[16px] px-6 text-[14.5px] font-black text-[#fff] shadow-[0_8px_22px_rgba(123,82,232,0.35)] transition active:scale-[.97] disabled:opacity-50"
              style={{ backgroundImage: "linear-gradient(110deg, #e58ad8, #7b52e8)" }}
            >
              {envoi ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      </div>

      <ChoixPseudo
        ouvert={pseudo}
        nomInitial={moi.nom}
        onFermer={() => setPseudo(false)}
        onChoisi={() => {
          setPseudo(false);
          void envoyer();
        }}
      />
    </Portal>
  );
}
