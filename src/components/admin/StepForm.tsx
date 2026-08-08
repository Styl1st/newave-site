"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconArrow, IconBack, IconCheck } from "@/components/Icons";

type Result = { ok: boolean; error?: string; message?: string };

export type Etape = {
  titre: string;
  /** Une phrase qui dit à quoi sert l'étape, en langage humain. */
  intro: string;
  contenu: React.ReactNode;
};

function Envoyer({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="card-light px-7 py-3.5 disabled:opacity-60">
      <span className="relative z-3 flex items-center gap-2 text-[14px] font-extrabold">
        <IconCheck /> {pending ? "Enregistrement…" : label}
      </span>
    </button>
  );
}

/**
 * Formulaire découpé en étapes.
 *
 * Toutes les étapes restent dans la page, simplement masquées : le
 * formulaire n'est envoyé qu'une fois, à la fin, avec l'ensemble des
 * champs. Découper l'envoi obligerait à sauvegarder des brouillons
 * partiels et à gérer les abandons — beaucoup de complexité pour un
 * confort qu'on obtient sans.
 *
 * La validation du navigateur est désactivée : un champ obligatoire
 * masqué déclencherait « An invalid form control is not focusable ».
 * On vérifie donc étape par étape, à la main.
 */
export default function StepForm({
  action,
  etapes,
  submitLabel = "Enregistrer",
  children,
}: {
  action: (formData: FormData) => Promise<Result>;
  etapes: Etape[];
  submitLabel?: string;
  /** Champs cachés présents à toutes les étapes, comme un identifiant. */
  children?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [manque, setManque] = useState<string | null>(null);
  const conteneurs = useRef<(HTMLDivElement | null)[]>([]);
  const haut = useRef<HTMLDivElement>(null);

  const [state, formAction] = useActionState(
    async (_prev: Result | null, formData: FormData) => action(formData),
    null
  );

  const derniere = index === etapes.length - 1;

  /** Les champs obligatoires de l'étape courante sont-ils remplis ? */
  function etapeValide(): boolean {
    const bloc = conteneurs.current[index];
    if (!bloc) return true;

    const champs = bloc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input[required], textarea[required], select[required]"
    );
    for (const champ of champs) {
      if (!champ.value.trim()) {
        champ.focus();
        setManque("Il manque une information obligatoire à cette étape.");
        return false;
      }
    }
    setManque(null);
    return true;
  }

  function aller(n: number) {
    if (n > index && !etapeValide()) return;
    setIndex(n);
    setManque(null);
    haut.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <div ref={haut} className="scroll-mt-6" />
      {children}

      {/* ---- progression ---- */}
      <div className="glass p-5 sm:px-6">
        <div className="flex items-center gap-2">
          {etapes.map((etape, i) => {
            const fait = i < index;
            const actif = i === index;
            return (
              <button
                key={etape.titre}
                type="button"
                onClick={() => aller(i)}
                aria-current={actif}
                aria-label={`Étape ${i + 1} : ${etape.titre}`}
                className="group flex flex-1 flex-col gap-2"
              >
                <span
                  className={`h-1.5 w-full rounded-full transition-all ${
                    actif ? "bg-white" : fait ? "bg-white/60" : "bg-white/15 group-hover:bg-white/30"
                  }`}
                />
                <span
                  className={`truncate text-left text-[11px] font-bold uppercase tracking-[0.08em] transition ${
                    actif ? "text-white" : "text-white/45 group-hover:text-white/75"
                  }`}
                >
                  {i + 1}. {etape.titre}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- étapes ---- */}
      {etapes.map((etape, i) => (
        <div
          key={etape.titre}
          ref={(el) => {
            conteneurs.current[i] = el;
          }}
          hidden={i !== index}
          className="glass flex flex-col gap-6 p-6 sm:p-8"
        >
          <header>
            <p className="eyebrow m-0">
              Étape {i + 1} sur {etapes.length}
            </p>
            <h2 className="m-0 mt-2 text-[clamp(19px,4.4vw,24px)] font-extrabold tracking-[-0.02em] text-white">
              {etape.titre}
            </h2>
            <p className="m-0 mt-2 text-[14px] leading-relaxed text-white/72">{etape.intro}</p>
          </header>

          {etape.contenu}
        </div>
      ))}

      {manque && (
        <p className="glass m-0 px-5 py-3 text-[13.5px] text-white">{manque}</p>
      )}
      {state?.error && (
        <p className="glass m-0 px-5 py-3 text-[13.5px] leading-relaxed text-white">{state.error}</p>
      )}
      {state?.ok && state.message && (
        <p className="m-0 text-[13.5px] font-bold text-white/85">{state.message}</p>
      )}

      {/* ---- navigation ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => aller(index - 1)}
          disabled={index === 0}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/8 px-5 py-3 text-[13px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97] disabled:pointer-events-none disabled:opacity-30"
        >
          <IconBack /> Retour
        </button>

        {derniere ? (
          <Envoyer label={submitLabel} />
        ) : (
          <button
            type="button"
            onClick={() => aller(index + 1)}
            className="card-light px-7 py-3.5"
          >
            <span className="relative z-3 flex items-center gap-2 text-[14px] font-extrabold">
              Continuer <IconArrow />
            </span>
          </button>
        )}
      </div>
    </form>
  );
}
