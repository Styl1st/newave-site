"use client";

import { useActionState, useEffect, useState } from "react";
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

/**
 * Le mot de passe se change PAR EMAIL, et jamais directement ici.
 *
 * Il y avait avant, à cet endroit, un simple « nouveau mot de passe »
 * suivi d'une confirmation. C'était trop facile, au sens propre : une
 * session laissée ouverte sur un téléphone posé sur une table, et
 * n'importe qui pouvait changer le mot de passe en deux champs, donc
 * s'emparer du compte sans jamais avoir eu à prouver quoi que ce soit.
 *
 * Le détour par la boîte mail rétablit cette preuve. Il faut accéder à
 * la messagerie de la personne, ce qu'une session ouverte ne donne
 * pas. C'est une gêne de trente secondes contre une prise de compte,
 * et le marché est bon.
 *
 * Cela règle au passage le cas de qui s'est inscrit avec Google : il
 * n'a jamais eu de mot de passe, et ce chemin est aussi celui qui lui
 * permet d'en avoir un.
 *
 * Le délai de soixante secondes n'est pas de la méfiance envers la
 * personne : sans lui, un clic répété par impatience envoie cinq
 * messages identiques, et c'est exactement ce qui fait basculer un
 * expéditeur dans les indésirables.
 */
export function LienReinitialisation({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [attente, setAttente] = useState(0);

  useEffect(() => {
    if (attente <= 0) return;
    const t = setTimeout(() => setAttente((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  async function envoyer() {
    setPending(true);
    setNote(null);

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      setNote({ ok: false, text: "Supabase n'est pas configuré." });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Le meme detour que sur la page de connexion : c'est
      // /auth/callback qui echange le jeton du lien contre une vraie
      // session, sans quoi la page de reinitialisation s'ouvre sans
      // droits.
      redirectTo: `${window.location.origin}/auth/callback?suite=/reinitialisation`,
    });
    setPending(false);

    if (error) {
      setNote({ ok: false, text: `Supabase répond : ${error.message}` });
      return;
    }
    setAttente(60);
    setNote({
      ok: true,
      text: `Email envoyé à ${email}. Le lien est valable une heure, et une seule fois.`,
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={envoyer}
        disabled={pending || attente > 0}
        className="card-light px-7 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative z-3 text-[14px] font-extrabold">
          {pending
            ? "Envoi…"
            : attente > 0
              ? `Renvoyer dans ${attente} s`
              : "Réinitialiser mon mot de passe"}
        </span>
      </button>

      {note && (
        <p
          className={
            note.ok
              ? "m-0 mt-4 text-[13px] font-bold text-white/85"
              : "m-0 mt-4 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white"
          }
        >
          {note.text}
        </p>
      )}
    </div>
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
        className="rounded-full border border-white/40 bg-white/8 px-6 py-3 text-[13px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
      >
        Se déconnecter
      </button>
    </form>
  );
}
