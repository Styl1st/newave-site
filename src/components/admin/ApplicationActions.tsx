"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptApplication,
  deleteApplication,
  setApplicationStatus,
} from "@/app/admin/actions";
import { IconCheck, IconCross, IconTrash } from "@/components/Icons";

/**
 * Décision sur une candidature.
 *
 * Accepter fait le travail complet : fiche marque créée en brouillon,
 * et droits accordés au candidat — mais seulement s'il dirige la marque.
 */
export default function ApplicationActions({
  id,
  status,
  brandName,
}: {
  id: string;
  status: "nouvelle" | "en_cours" | "acceptee" | "refusee";
  brandName: string;
}) {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(intent: "accepter" | "refuser" | "supprimer") {
    if (intent === "accepter") {
      const ok = window.confirm(
        `Accepter « ${brandName} » créera une fiche marque en brouillon. Continuer ?`
      );
      if (!ok) return;
    }
    if (intent === "supprimer") {
      const ok = window.confirm(
        `Effacer définitivement la candidature de « ${brandName} » ? La marque déjà créée, s'il y en a une, ne sera pas touchée.`
      );
      if (!ok) return;
    }

    const formData = new FormData();
    formData.set("id", id);

    startTransition(async () => {
      if (intent === "accepter") {
        const res = await acceptApplication(formData);
        setNote(
          res.ok
            ? { ok: true, text: res.message ?? "Candidature acceptée." }
            : { ok: false, text: res.error ?? "L'opération a échoué." }
        );
      } else if (intent === "supprimer") {
        await deleteApplication(formData);
      } else {
        formData.set("status", "refusee");
        await setApplicationStatus(formData);
        setNote(null);
      }
      router.refresh();
    });
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-extrabold transition disabled:opacity-50 active:scale-[.97]";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {status !== "acceptee" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("accepter")}
            className={`${btn} bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] hover:shadow-[0_8px_20px_rgba(35,12,85,0.42)]`}
          >
            <IconCheck /> Accepter
          </button>
        )}
        {status !== "refusee" && status !== "acceptee" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("refuser")}
            className={`${btn} border border-white/35 bg-white/8 text-white hover:border-white/70 hover:bg-white/20`}
          >
            <IconCross /> Refuser
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run("supprimer")}
          aria-label="Supprimer la candidature"
          title="Supprimer définitivement"
          className={`${btn} border border-white/20 text-white/60 hover:border-white/50 hover:text-white`}
        >
          <IconTrash />
        </button>
      </div>

      {note && (
        <p
          className={`m-0 max-w-md text-[12.5px] leading-relaxed sm:text-right ${
            note.ok ? "text-white/85" : "text-white"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
