"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "connexion" | "inscription";

const FIELD =
  "w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55";
const LABEL = "eyebrow mb-2 block";

export default function AuthForm({ suite }: { suite: string }) {
  const [mode, setMode] = useState<Mode>("connexion");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setNote(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("display_name") ?? "").trim();

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      setNote("Supabase n'est pas encore branché. Remplis .env.local et relance le serveur.");
      return;
    }

    if (mode === "inscription") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || null },
          emailRedirectTo: `${window.location.origin}/auth/callback?suite=${encodeURIComponent(suite)}`,
        },
      });
      setPending(false);
      if (error) {
        setNote(error.message);
        return;
      }
      setDone(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      setNote("Email ou mot de passe incorrect.");
      return;
    }
    router.push(suite);
    router.refresh();
  }

  if (done) {
    return (
      <div className="glass p-8 text-center">
        <h2 className="m-0 text-[19px] font-extrabold text-white">Vérifie tes emails</h2>
        <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-white/84">
          On vient de t&apos;envoyer un lien de confirmation. Clique dessus et ton compte
          sera actif. Regarde dans les spams si rien n&apos;arrive.
        </p>
      </div>
    );
  }

  const tab = "flex-1 rounded-full py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] transition";

  return (
    <form onSubmit={onSubmit} className="glass flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex gap-1.5 rounded-full bg-white/10 p-1.5">
        <button
          type="button"
          onClick={() => { setMode("connexion"); setNote(null); }}
          className={`${tab} ${mode === "connexion" ? "bg-white text-[var(--color-ink)]" : "text-white/75 hover:text-white"}`}
        >
          J&apos;ai un compte
        </button>
        <button
          type="button"
          onClick={() => { setMode("inscription"); setNote(null); }}
          className={`${tab} ${mode === "inscription" ? "bg-white text-[var(--color-ink)]" : "text-white/75 hover:text-white"}`}
        >
          Créer un compte
        </button>
      </div>

      {mode === "inscription" && (
        <div>
          <label className={LABEL} htmlFor="display_name">Ton prénom ou pseudo</label>
          <input className={FIELD} id="display_name" name="display_name" placeholder="Dennis" />
        </div>
      )}

      <div>
        <label className={LABEL} htmlFor="email">Email</label>
        <input className={FIELD} id="email" name="email" type="email" required autoComplete="email" placeholder="toi@exemple.fr" />
      </div>

      <div>
        <label className={LABEL} htmlFor="password">Mot de passe</label>
        <input
          className={FIELD}
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "inscription" ? "new-password" : "current-password"}
          placeholder="8 caractères minimum"
        />
      </div>

      {note && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
          {note}
        </p>
      )}

      <button type="submit" disabled={pending} className="card-light px-7 py-3.5 disabled:opacity-60">
        <span className="relative z-3 text-[14px] font-extrabold">
          {pending ? "…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
        </span>
      </button>
    </form>
  );
}
