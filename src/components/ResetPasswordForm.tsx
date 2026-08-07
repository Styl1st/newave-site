"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FIELD, Label } from "./admin/fields";

/**
 * Ecran d'arrivee du lien de reinitialisation.
 *
 * Le lien recu par email ouvre une session temporaire. Tant qu'elle
 * existe, updateUser() peut changer le mot de passe sans connaitre
 * l'ancien. On verifie donc d'abord qu'une session est bien la, plutot
 * que d'afficher un formulaire qui echouera a l'envoi.
 */
export default function ResetPasswordForm() {
  const [state, setState] = useState<"verification" | "pret" | "expire">("verification");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setState("expire");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "pret" : "expire");
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (password.length < 8) return setNote("Huit caractères minimum.");
    if (password !== confirm) return setNote("Les deux saisies ne correspondent pas.");

    setPending(true);
    setNote(null);

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      return setNote("Supabase n'est pas configuré.");
    }

    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) return setNote(`Supabase répond : ${error.message}`);
    setDone(true);
  }

  if (state === "verification") {
    return (
      <div className="glass p-8 text-center">
        <p className="m-0 text-[14.5px] text-white/80">Vérification du lien…</p>
      </div>
    );
  }

  if (state === "expire") {
    return (
      <div className="glass p-8 text-center">
        <h2 className="m-0 text-[18px] font-extrabold text-white">Ce lien n&apos;est plus valide</h2>
        <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-white/84">
          Les liens de réinitialisation expirent vite et ne servent qu&apos;une fois.
          Demandes-en un nouveau depuis la page de connexion.
        </p>
        <Link href="/connexion" className="card-light mt-6 inline-block px-6 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Retour à la connexion</span>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass p-8 text-center">
        <h2 className="m-0 text-[18px] font-extrabold text-white">C&apos;est fait</h2>
        <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-white/84">
          Ton mot de passe est changé, et tu es déjà connecté.
        </p>
        <button
          onClick={() => {
            router.push("/compte");
            router.refresh();
          }}
          className="card-light mt-6 px-6 py-3"
        >
          <span className="relative z-3 text-[13.5px] font-extrabold">Aller à mon compte</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <Label htmlFor="password" hint="Huit caractères minimum.">
          Nouveau mot de passe
        </Label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className={FIELD} />
      </div>

      <div>
        <Label htmlFor="confirm">Confirmation</Label>
        <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className={FIELD} />
      </div>

      {note && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white">{note}</p>
      )}

      <button type="submit" disabled={pending} className="card-light px-7 py-3.5 disabled:opacity-60">
        <span className="relative z-3 text-[14px] font-extrabold">
          {pending ? "…" : "Enregistrer"}
        </span>
      </button>
    </form>
  );
}
