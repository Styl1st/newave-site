"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BoutonSignaler from "@/components/BoutonSignaler";
import { createClient } from "@/lib/supabase/client";
import { allegerImage } from "@/lib/alleger-image";
import { bloquer, debloquer, envoyerMessage } from "@/app/messages/actions";
import { lienAnnonce, lienMembre, rubrique } from "@/lib/forum";
import {
  heure,
  libelleJour,
  MESSAGE_MAX,
  nomDeFichier,
  nomDeLAutre,
  PIECE_JOINTE_MAX,
  PIECES_ACCEPTEES,
  poidsLisible,
  type ConversationResumee,
  type Message,
} from "@/lib/messages";
import Avatar from "./Avatar";
import PieceJointe from "./PieceJointe";
import { BadgeMarque } from "@/components/forum/CarteAnnonce";

/**
 * Une conversation : l'annonce épinglée en haut, les messages, et la
 * zone de saisie.
 *
 * L'ANNONCE RESTE ÉPINGLÉE, avec son état (active, clôturée, la vôtre,
 * retirée) : on sait toujours de quoi on parle, même trois semaines
 * plus tard.
 *
 * Entrée envoie, Maj+Entrée va à la ligne. Les messages arrivent en
 * temps réel (voir `Messagerie`) ; celui qu'on envoie s'affiche dès que
 * la base l'a accepté.
 */
export default function Conversation({
  conversation: c,
  messages,
  moiId,
  onEnvoye,
  onRetour,
  onBlocage,
}: {
  conversation: ConversationResumee;
  /** null tant qu'ils se chargent. */
  messages: Message[] | null;
  moiId: string;
  onEnvoye: (m: Message) => void;
  onRetour: () => void;
  onBlocage: (jeBloque: boolean) => void;
}) {
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const fil = useRef<HTMLDivElement>(null);
  const choix = useRef<HTMLInputElement>(null);
  const nom = nomDeLAutre(c);
  // Son profil public ; pas pour une marque, que la personne représente.
  const profil = !c.autreEstLaMarque && c.autre.handle ? lienMembre(c.autre.handle) : null;

  /* Toujours en bas : c'est là qu'est la conversation. */
  useEffect(() => {
    const el = fil.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length, c.id]);

  /* Changer de conversation vide la saisie. */
  useEffect(() => {
    setTexte("");
    setFichier(null);
    setErreur(null);
    setMenu(false);
  }, [c.id]);

  function choisirFichier(f: File | undefined) {
    setErreur(null);
    if (!f) return;
    if (!PIECES_ACCEPTEES.includes(f.type)) {
      setErreur("PDF ou image seulement (JPG, PNG, WebP).");
      return;
    }
    if (f.size > PIECE_JOINTE_MAX) {
      setErreur("10 Mo au plus par pièce jointe.");
      return;
    }
    setFichier(f);
  }

  async function envoyer() {
    const t = texte.trim();
    if ((!t && !fichier) || envoi) return;
    setEnvoi(true);
    setErreur(null);

    let pieceJointe: { chemin: string; nom: string; taille: number } | null = null;
    if (fichier) {
      const supabase = createClient();
      if (!supabase) {
        setEnvoi(false);
        return setErreur("L'envoi de fichiers n'est pas disponible ici.");
      }
      // Les images sont allégées comme ailleurs sur le site ; un PDF
      // part tel quel.
      const envoye = fichier.type.startsWith("image/")
        ? (await allegerImage(fichier, { maxCote: 2000, qualite: 0.85 })).fichier
        : fichier;
      // Dans le dossier de LA conversation et de SON auteur : c'est la
      // seule écriture que la base permet (migration 38).
      const chemin = `${c.id}/${moiId}/${Date.now()}-${nomDeFichier(envoye.name)}`;
      const { error } = await supabase.storage
        .from("messages")
        .upload(chemin, envoye, { contentType: envoye.type, upsert: false });
      if (error) {
        setEnvoi(false);
        return setErreur(`La pièce jointe n'est pas passée : ${error.message}`);
      }
      pieceJointe = { chemin, nom: fichier.name, taille: envoye.size };
    }

    const res = await envoyerMessage({ conversationId: c.id, texte: t, pieceJointe });
    setEnvoi(false);
    if (!res.ok || !res.message) return setErreur(res.error ?? "Le message n'est pas parti.");
    setTexte("");
    setFichier(null);
    onEnvoye(res.message);
  }

  async function basculerBlocage() {
    setMenu(false);
    if (!c.jeBloque && !confirm(`Bloquer ${nom} ? Vous ne pourrez plus vous écrire, ni l'un ni l'autre.`)) return;
    const res = c.jeBloque ? await debloquer(c.autre.id) : await bloquer(c.autre.id);
    if (!res.ok) return setErreur(res.error ?? "Le changement n'a pas été enregistré.");
    onBlocage(!c.jeBloque);
  }

  /* Les messages, par jour. */
  const parJour: { jour: string; liste: Message[] }[] = [];
  for (const m of messages ?? []) {
    const jour = libelleJour(m.createdAt);
    const dernier = parJour[parJour.length - 1];
    if (dernier && dernier.jour === jour) dernier.liste.push(m);
    else parJour.push({ jour, liste: [m] });
  }

  const a = c.annonce;
  const etat = !a
    ? { texte: "Annonce retirée", classe: "bg-white/15 text-white" }
    : c.monAnnonce
      ? { texte: "Votre annonce", classe: "bg-[rgba(123,82,232,0.14)] text-[#4a2a9e]" }
      : a.cloturee
        ? { texte: "Clôturée", classe: "bg-[rgba(23,10,51,0.08)] text-[#4a3a78]" }
        : { texte: "Annonce active", classe: "bg-[#dff5e8] text-[#1f7a45]" };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------------- l'en-tête ---------------- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/15 px-3 py-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] md:px-6 md:py-4 md:pt-4">
        <button
          type="button"
          onClick={onRetour}
          aria-label="Retour à la liste"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[22px] font-bold text-white md:hidden"
        >
          ‹
        </button>
        <Avatar
          id={c.autre.id}
          nom={c.autreEstLaMarque ? a?.marqueNom ?? null : c.autre.nom ?? c.autre.handle}
          src={c.autreEstLaMarque ? null : c.autre.avatar}
          taille={44}
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-center gap-1.5 truncate text-[16px] font-extrabold text-white">
            {profil ? (
              <Link href={profil} className="truncate underline-offset-4 hover:underline">
                {nom}
              </Link>
            ) : (
              <span className="truncate">{nom}</span>
            )}
            {c.autreEstLaMarque && <BadgeMarque sombre />}
          </p>
          <p className="m-0 truncate text-[12px] font-semibold text-white/70">
            {c.autreEstLaMarque ? "Marque vérifiée" : c.autre.nom ?? "Membre"}
            {a?.ville && a.ville !== "En ligne" && c.autreEstLaMarque ? ` · ${a.ville}` : ""}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-label="Plus d'options"
            className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/25 text-[18px] font-black leading-none text-white transition hover:bg-white/10"
          >
            ⋯
          </button>
          {menu && (
            <div className="absolute right-0 top-full z-20 mt-2 w-[220px] overflow-hidden rounded-[14px] border border-white/20 bg-[var(--surface-sombre)] py-1.5 shadow-[0_18px_40px_rgba(8,2,20,0.5)]">
              <button
                type="button"
                onClick={basculerBlocage}
                className="block w-full px-4 py-2.5 text-left text-[13.5px] font-bold text-white transition hover:bg-white/10"
              >
                {c.jeBloque ? `Débloquer ${nom}` : `Bloquer ${nom}`}
              </button>
              {profil && (
                <Link
                  href={profil}
                  className="block px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-white/10"
                >
                  Voir le profil
                </Link>
              )}
              {a && (
                <Link
                  href={lienAnnonce(a)}
                  className="block px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-white/10"
                >
                  Voir l&apos;annonce
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ---------------- l'annonce épinglée ---------------- */}
      <div className="shrink-0 px-3 pt-3 md:px-6 md:pt-4">
        <div className="flex items-center gap-3 rounded-[16px] bg-[#fff] p-2.5 pr-3.5 text-[var(--color-ink)] shadow-[0_8px_22px_rgba(23,10,51,0.2)]">
          {a?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={a.image} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover md:h-12 md:w-12" />
          ) : (
            <span
              aria-hidden
              className="h-11 w-11 shrink-0 rounded-[10px] md:h-12 md:w-12"
              style={{ background: a ? rubrique(a.rubrique).couleur : "#d9d0f3" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[11px] font-bold text-[#6a5a92]">
              {a ? `${rubrique(a.rubrique).label}${a.ville ? ` · ${a.ville}` : ""}` : "Annonce"}
            </p>
            <p className="m-0 truncate text-[13.5px] font-extrabold">
              {a ? a.titre : "Cette annonce a été retirée par son auteur."}
            </p>
          </div>
          <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold sm:inline ${etat.classe}`}>
            {etat.texte}
          </span>
          {a && (
            <Link
              href={lienAnnonce(a)}
              className="shrink-0 text-[12.5px] font-extrabold underline underline-offset-4"
              aria-label="Voir l'annonce"
            >
              <span className="hidden sm:inline">Voir l&apos;annonce</span>
              <span className="sm:hidden">›</span>
            </Link>
          )}
        </div>
      </div>

      {/* ---------------- les messages ---------------- */}
      <div ref={fil} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-6">
        {messages === null ? (
          <p className="m-0 mt-10 text-center text-[13px] font-semibold text-white/60">Chargement…</p>
        ) : (
          parJour.map(({ jour, liste }) => (
            <div key={jour}>
              <p className="m-0 my-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/60" suppressHydrationWarning>
                {jour}
              </p>
              <div className="flex flex-col gap-2.5">
                {liste.map((m) => {
                  const aMoi = m.auteurId === moiId;
                  return (
                    <div key={m.id} className={`flex flex-col gap-1.5 ${aMoi ? "items-end" : "items-start"}`}>
                      {m.pieceJointe && <PieceJointe m={m} aMoi={aMoi} />}
                      {m.texte && (
                        <div
                          className={`max-w-[min(520px,86%)] rounded-[20px] px-4 py-3 ${
                            aMoi
                              ? "rounded-br-[6px] text-[#fff]"
                              : "rounded-bl-[6px] bg-[#fff] text-[var(--color-ink)]"
                          }`}
                          style={
                            aMoi
                              ? { backgroundImage: "linear-gradient(135deg, #e58ad8 0%, #b07ef0 55%, #8f6ff0 100%)" }
                              : undefined
                          }
                        >
                          <p className="m-0 whitespace-pre-line text-[14.5px] font-semibold leading-relaxed [overflow-wrap:anywhere]">
                            {m.texte}
                          </p>
                          <p
                            className={`m-0 mt-1 text-right text-[10.5px] font-bold tabular-nums ${aMoi ? "text-[#fff]/80" : "text-[#6a5a92]"}`}
                            suppressHydrationWarning
                          >
                            {heure(m.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ---------------- la saisie ---------------- */}
      <div className="shrink-0 border-t border-white/15 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-3 md:px-6 md:pb-4">
        {c.bloquee ? (
          <p className="m-0 rounded-[14px] bg-white/10 px-4 py-3 text-[13.5px] font-semibold text-white">
            {c.jeBloque ? (
              <>
                Tu as bloqué {nom}.{" "}
                <button type="button" onClick={basculerBlocage} className="font-extrabold underline underline-offset-2">
                  Débloquer
                </button>
              </>
            ) : (
              "Tu ne peux plus écrire dans cette conversation."
            )}
          </p>
        ) : (
          <>
            {fichier && (
              <div className="mb-2 flex items-center gap-2 rounded-[12px] bg-white/10 px-3 py-2 text-[12.5px] font-bold text-white">
                <span className="min-w-0 flex-1 truncate">
                  {fichier.name} · {poidsLisible(fichier.size)}
                </span>
                <button type="button" onClick={() => setFichier(null)} aria-label="Retirer la pièce jointe" className="text-[15px]">
                  ×
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void envoyer();
              }}
              className="flex items-end gap-2 rounded-[18px] bg-[#fff] p-1.5 md:p-2"
            >
              <button
                type="button"
                onClick={() => choix.current?.click()}
                aria-label="Joindre un fichier"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[rgba(123,82,232,0.12)] text-[20px] font-bold text-[var(--color-ink)] transition active:scale-95"
              >
                +
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
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value.slice(0, MESSAGE_MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void envoyer();
                  }
                }}
                rows={1}
                placeholder={`Écrire à ${nom}…`}
                aria-label={`Écrire à ${nom}`}
                className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] font-medium text-[var(--color-ink)] outline-none placeholder:text-[#8a7bab] md:text-[14.5px] [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={envoi || (!texte.trim() && !fichier)}
                className="min-h-[44px] shrink-0 rounded-[13px] bg-[var(--color-ink)] px-4 text-[13.5px] font-black text-white transition active:scale-[.97] disabled:opacity-50"
              >
                {envoi ? "…" : "Envoyer"}
              </button>
            </form>
          </>
        )}
        {erreur && <p className="m-0 mt-2 text-[12.5px] font-bold text-white">{erreur}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-semibold text-white/70">
          <span>Ne partage jamais de coordonnées bancaires ici.</span>
          <BoutonSignaler cible="conversation" cibleId={c.id} chemin="/messages" connecte />
        </div>
      </div>
    </div>
  );
}
