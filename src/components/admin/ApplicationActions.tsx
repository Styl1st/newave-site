"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptApplication, setApplicationStatus } from "@/app/admin/actions";
import { IconCheck, IconClock, IconCross } from "@/components/Icons";

/**
 * Décision sur une candidature.
 * Accepter fait le travail complet : fiche marque créée en brouillon
 * et droits attribués au compte du candidat.
 */
export default function ApplicationActions({
  id,
  status,
}: {
  id: string;
  status: "nouvelle" | "en_cours" | "acceptee" | "refusee";
}) {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(intent: "accepter" | "refuser" | "en_cours") {
    if (intent === "accepter") {
      const ok = window.confirm(
        "Accepter ce dossier créera une fiche marque en brouillon et donnera les droits au compte du candidat. Continuer ?"
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
      } else {
        formData.set("status", intent === "refuser" ? "refusee" : "en_cours");
        await setApplicationStatus(formData);
        setNote(null);
      }
      router.refresh();
    });
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-extrabold transition disabled:opacity-50 active:scale-[.97]";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
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
        {status !== "en_cours" && status !== "acceptee" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("en_cours")}
            className={`${btn} border border-white/35 text-white hover:bg-white/12`}
          >
            <IconClock /> En cours
          </button>
        )}
        {status !== "refusee" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("refuser")}
            className={`${btn} border border-white/22 text-white/70 hover:border-white/50 hover:text-white`}
          >
            <IconCross /> Refuser
          </button>
        )}
      </div>

      {note && (
        <p
          className={`m-0 max-w-md text-right text-[12.5px] leading-relaxed ${
            note.ok ? "text-white/85" : "text-white"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
