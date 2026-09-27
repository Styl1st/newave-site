"use client";

import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";
import { choisirPseudo, verifierPseudo } from "@/app/forum/actions";
import { handleNettoye, handleValide, proposerHandle } from "@/lib/forum";

/**
 * Le pseudo, demandé au premier geste public.
 *
 * ON NE LE DEMANDE PAS À L'INSCRIPTION. La plupart des comptes ne
 * publieront jamais sur le forum ; leur imposer un pseudo, c'est une
 * question de plus à l'entrée pour rien. Il arrive donc au moment où il
 * sert : la première annonce ou le premier commentaire. Voter ne le
 * demande pas, puisque ça n'affiche aucun nom.
 *
 * Pré-rempli à partir du nom, vérifié pendant qu'on tape (sans dire à
 * qui appartient un pseudo déjà pris), modifiable ensuite dans « Mon
 * compte ». Le nom affiché se confirme au même endroit : par défaut
 * c'est le début de l'adresse email, et on ne veut pas le publier sans
 * que la personne l'ait vu.
 */
export default function ChoixPseudo({
  ouvert,
  nomInitial,
  onFermer,
  onChoisi,
}: {
  ouvert: boolean;
  nomInitial: string | null;
  onFermer: () => void;
  onChoisi: (handle: string) => void;
}) {
  const [nom, setNom] = useState(nomInitial ?? "");
  const [handle, setHandle] = useState(() => proposerHandle(nomInitial));
  const [verdict, setVerdict] = useState<{ libre: boolean; message?: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const minuteur = setTimeout(() => champ.current?.focus(), 80);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", echap);
    return () => {
      clearTimeout(minuteur);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, onFermer]);

  /* La vérification attend que la frappe s'arrête. */
  useEffect(() => {
    if (!ouvert) return;
    const h = handleNettoye(handle);
    if (!handleValide(h)) {
      setVerdict(h.length === 0 ? null : { libre: false, message: "3 à 24 caractères : a-z, 0-9, point, tiret bas." });
      return;
    }
    setVerdict(null);
    const minuteur = setTimeout(async () => setVerdict(await verifierPseudo(h)), 350);
    return () => clearTimeout(minuteur);
  }, [handle, ouvert]);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const res = await choisirPseudo({ handle, nom });
    setEnvoi(false);
    if (!res.ok || !res.handle) {
      setErreur(res.error ?? "Le pseudo n'a pas été enregistré.");
      return;
    }
    onChoisi(res.handle);
  }

  if (!ouvert) return null;

  const pret = verdict?.libre === true && nom.trim().length > 0;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(15,5,38,0.62)] px-4 backdrop-blur-sm"
        onMouseDown={(e) => e.target === e.currentTarget && onFermer()}
      >
        <form
          role="dialog"
          aria-modal
          aria-labelledby="titre-pseudo"
          onSubmit={valider}
          className="w-full max-w-[440px] rounded-[24px] bg-[#fff] p-6 text-[var(--color-ink)] shadow-[0_30px_80px_rgba(15,5,38,0.55)] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="titre-pseudo" className="m-0 text-[22px] font-extrabold tracking-[-0.03em]">
              Ton nom sur le forum
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
          <p className="m-0 mt-2 text-[13.5px] leading-relaxed text-[#4a3a78]">
            Il s&apos;affiche sur tes annonces et tes réponses. Tu pourras le changer dans Mon
            compte.
          </p>

          <label className="mt-5 block">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6a5a92]">Nom affiché</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value.slice(0, 60))}
              placeholder="Léa Grain"
              className="mt-1.5 w-full rounded-[13px] border border-[rgba(23,10,51,0.16)] bg-[#f7f3ff] px-4 py-3 text-[15px] font-semibold outline-none focus:border-[#7b52e8]"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#6a5a92]">Pseudo</span>
            <span className="relative mt-1.5 block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-[#8a7bab]">
                @
              </span>
              <input
                ref={champ}
                value={handle}
                onChange={(e) => setHandle(handleNettoye(e.target.value).slice(0, 24))}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-[13px] border border-[rgba(23,10,51,0.16)] bg-[#f7f3ff] py-3 pl-9 pr-4 text-[15px] font-semibold outline-none focus:border-[#7b52e8]"
              />
            </span>
          </label>
          <p
            aria-live="polite"
            className={`m-0 mt-2 min-h-[18px] text-[12.5px] font-bold ${
              verdict?.libre ? "text-[#1f7a45]" : "text-[#b0306a]"
            }`}
          >
            {verdict ? (verdict.libre ? "Disponible." : verdict.message) : ""}
          </p>

          {erreur && (
            <p className="m-0 mt-2 rounded-[11px] bg-[#fdeaf2] px-3 py-2 text-[13px] font-semibold text-[#b0306a]">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={!pret || envoi}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full text-[14px] font-black text-[#fff] transition active:scale-[.98] disabled:opacity-45"
            style={{ backgroundImage: "linear-gradient(110deg, #e58ad8, #7b52e8)" }}
          >
            {envoi ? "…" : "C'est mon nom"}
          </button>
        </form>
      </div>
    </Portal>
  );
}
