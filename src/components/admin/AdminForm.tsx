"use client";

import { useActionState } from "react";
import SubmitBar from "./SubmitBar";

type Result = { ok: boolean; error?: string };

/**
 * Enveloppe commune aux formulaires d'administration : gère l'état
 * d'envoi et affiche l'erreur renvoyée par l'action serveur.
 */
export default function AdminForm({
  action,
  children,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<Result>;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: Result | null, formData: FormData) => action(formData),
    null
  );

  return (
    <form action={formAction} className="glass flex flex-col gap-6 p-4 sm:p-7">
      {children}

      {state?.error && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
          {state.error}
        </p>
      )}

      <SubmitBar label={submitLabel} />
    </form>
  );
}
