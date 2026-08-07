"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "@/app/compte/actions";
import { createClient } from "@/lib/supabase/client";
import SubmitBar from "./admin/SubmitBar";
import { FIELD, Label } from "./admin/fields";

type Result = { ok: boolean; error?: string; message?: string };

/** Nom affiché. */
export function DisplayNameForm({ current }: { current: string }) {
  const [state, formAction] = useActionState(
    async (_prev: Result | null, formData: FormData) => updateDisplayName(formData),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="display_name" hint="C'est ce qui s'affiche dans ton espace.">
          Nom affiché
        </Label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={current}
          required
          className={FIELD}
        />
      </div>

      {state?.error && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="m-0 text-[13px] font-bold text-white/85">{state.message}</p>
      )}

      <SubmitBar label="Enregistrer" />
    </form>
  );
}

/** Changement de mot de passe, pour la personne déjà connectée. */
export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (password.length < 8) {
      setNote({ ok: false, text: "Huit caractères minimum." });
      return;
    }
    if (password !== confirm) {
      setNote({ ok: false, text: "Les deux saisies ne correspondent pas." });
      return;
    }

    setPending(true);
    setNote(null);

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      setNote({ ok: false, text: "Supabase n'est pas configuré." });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setNote({ ok: false, text: `Supabase répond : ${error.message}` });
      return;
    }
    form.reset();
    setNote({ ok: true, text: "Mot de passe changé. Il est actif immédiatement." });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="password" hint="Huit caractères minimum.">
          Nouveau mot de passe
        </Label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={FIELD}
        />
      </div>

      <div>
        <Label htmlFor="confirm">Confirmation</Label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={FIELD}
        />
      </div>

      {note && (
        <p
          className={
            note.ok
              ? "m-0 text-[13px] font-bold text-white/85"
              : "m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white"
          }
        >
          {note.text}
        </p>
      )}

      <button type="submit" disabled={pending} className="card-light self-start px-7 py-3.5 disabled:opacity-60">
        <span className="relative z-3 text-[14px] font-extrabold">
          {pending ? "…" : "Changer le mot de passe"}
        </span>
      </button>
    </form>
  );
}

/** Déconnexion. Passe par une route serveur pour vider le cookie. */
export function LogoutButton() {
  const router = useRouter();

  return (
    <form
      action="/auth/deconnexion"
      method="post"
      onSubmit={() => setTimeout(() => router.refresh(), 100)}
    >
      <button
        type="submit"
        className="rounded-full border border-white/40 px-6 py-3 text-[13px] font-extrabold text-white transition hover:bg-white/12"
      >
        Se déconnecter
      </button>
    </form>
  );
}
