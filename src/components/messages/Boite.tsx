"use client";

import Link from "next/link";
import { momentCourt, nomDeLAutre, type ConversationResumee } from "@/lib/messages";
import { BadgeMarque } from "@/components/forum/CarteAnnonce";
import Avatar from "./Avatar";

export type Onglet = "toutes" | "non-lues" | "mes-annonces";

const ONGLETS: { cle: Onglet; label: string }[] = [
  { cle: "toutes", label: "Toutes" },
  { cle: "non-lues", label: "Non lues" },
  { cle: "mes-annonces", label: "Mes annonces" },
];

/**
 * La boîte : une ligne par conversation, la plus récente en haut.
 *
 * Chaque ligne dit QUI (avec le badge MARQUE), QUAND, À PROPOS DE QUOI
 * (« ↳ » et le titre de l'annonce) et le dernier message. Non lue : en
 * gras, avec une pastille rose. Le dernier message est le mien : il
 * commence par « Vous : », et la ligne n'est jamais non lue.
 */
export default function Boite({
  conversations,
  selection,
  onglet,
  onOnglet,
  onChoisir,
  moiId,
}: {
  conversations: ConversationResumee[];
  selection: string | null;
  onglet: Onglet;
  onOnglet: (o: Onglet) => void;
  onChoisir: (id: string) => void;
  moiId: string;
}) {
  const visibles = conversations.filter((c) =>
    onglet === "non-lues" ? c.nonLu : onglet === "mes-annonces" ? c.monAnnonce : true
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-1 pb-3 md:px-4 md:pt-5">
        <h1 className="m-0 text-[clamp(28px,6vw,32px)] font-extrabold tracking-[-0.035em] text-white">Messages</h1>
        <div
          role="tablist"
          aria-label="Filtrer les conversations"
          className="mt-3 flex rounded-full border border-white/18 bg-[rgba(var(--voile),0.42)] p-1"
        >
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              role="tab"
              aria-selected={onglet === o.cle}
              onClick={() => onOnglet(o.cle)}
              className={`min-h-[38px] flex-1 whitespace-nowrap rounded-full px-1.5 text-[12px] font-extrabold transition ${
                onglet === o.cle ? "bg-white text-[var(--color-ink)]" : "text-white/85 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:px-2 md:pb-3">
        {visibles.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="m-0 text-[14px] font-bold text-white">
              {conversations.length === 0
                ? "Aucune conversation pour l'instant."
                : onglet === "non-lues"
                  ? "Tout est lu."
                  : "Personne n'a encore répondu à tes annonces."}
            </p>
            {conversations.length === 0 && (
              <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-white/70">
                Réponds en privé à une annonce du{" "}
                <Link href="/forum" className="font-bold text-white underline underline-offset-2">
                  forum
                </Link>{" "}
                pour en commencer une.
              </p>
            )}
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {visibles.map((c) => {
              const actif = c.id === selection;
              const deMoi = c.dernier.auteurId === moiId;
              const apercu = c.dernier.texte || (c.dernier.pieceNom ? `Pièce jointe · ${c.dernier.pieceNom}` : "");
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onChoisir(c.id)}
                    aria-current={actif ? "true" : undefined}
                    className={`flex w-full items-start gap-3 rounded-[16px] px-2.5 py-3 text-left transition md:px-3 ${
                      actif ? "bg-white/16" : "hover:bg-white/8"
                    }`}
                  >
                    <Avatar
                      id={c.autre.id}
                      nom={c.autreEstLaMarque ? c.annonce?.marqueNom ?? null : c.autre.nom ?? c.autre.handle}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14.5px] font-extrabold text-white">{nomDeLAutre(c)}</span>
                        {c.autreEstLaMarque && <BadgeMarque sombre />}
                        <span className="ml-auto shrink-0 pl-2 text-[11px] font-bold text-white/65" suppressHydrationWarning>
                          {momentCourt(c.dernier.at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] font-bold text-white/65">
                        ↳ {c.annonce ? c.annonce.titre : "Annonce retirée"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span
                          className={`min-w-0 flex-1 truncate text-[13px] ${
                            c.nonLu ? "font-extrabold text-white" : "font-medium text-white/80"
                          }`}
                        >
                          {deMoi ? "Vous : " : ""}
                          {apercu}
                        </span>
                        {c.nonLu && (
                          <span aria-label="Non lu" className="h-2 w-2 shrink-0 rounded-full bg-[#e58ad8]" />
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
