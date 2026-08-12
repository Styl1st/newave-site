"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ConnexionFournisseurs from "./ConnexionFournisseurs";

type Mode = "connexion" | "inscription" | "oubli";

const FIELD =
  "w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55";
const LABEL = "eyebrow mb-2 block";

export default function AuthForm({ suite }: { suite: string }) {
  const [mode, setMode] = useState<Mode>("connexion");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  /** Retenue pour l'écran de confirmation et pour le renvoi du lien. */
  const [adresse, setAdresse] = useState("");
  const router = useRouter();

  /** Redemande un lien de confirmation, sans recréer de compte. */
  async function renvoyer() {
    setPending(true);
    setNote(null);

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      setNote("Supabase n'est pas encore branché.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: adresse,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?suite=${encodeURIComponent(suite)}`,
      },
    });

    setPending(false);
    setNote(
      error
        ? error.message.toLowerCase().includes("rate")
          ? "Trop de demandes d'affilée. Attends quelques minutes."
          : error.message
        : "C'est reparti. Le nouveau lien annule le précédent."
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setNote(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("display_name") ?? "").trim();
    setAdresse(email);

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      setNote("Supabase n'est pas encore branché. Remplis .env.local et relance le serveur.");
      return;
    }

    if (mode === "oubli") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // On passe par /auth/callback : c'est lui qui echange le jeton
        // du lien contre une vraie session, sans quoi la page de
        // reinitialisation s'ouvrirait sans droits.
        redirectTo: `${window.location.origin}/auth/callback?suite=/reinitialisation`,
      });
      setPending(false);
      if (error) {
        setNote(`Supabase répond : ${error.message}`);
        return;
      }
      setDone(true);
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);

    if (error) {
      // On traduit ce qu'on sait traduire, et on montre le reste tel
      // quel : masquer la vraie raison derriere "mot de passe
      // incorrect" fait chercher au mauvais endroit pendant une heure.
      const brut = error.message.toLowerCase();
      if (brut.includes("invalid login credentials")) {
        setNote("Email ou mot de passe incorrect.");
      } else if (brut.includes("email not confirmed")) {
        // Message écrit pour la personne, pas pour l'administrateur :
        // c'est elle qui le lira, et elle a une action à sa portée.
        setAdresse(email);
        setDone(true);
        setMode("inscription");
        setNote(
          "Ce compte existe mais son adresse n'a jamais été confirmée. Renvoie-toi un lien ci-dessous."
        );
        return;
      } else if (brut.includes("rate limit") || brut.includes("too many")) {
        setNote("Trop de tentatives. Attends quelques minutes avant de réessayer.");
      } else {
        setNote(`Supabase répond : ${error.message}`);
      }
      return;
    }

    // Une connexion sans session, c'est un cookie qui n'a pas pu
    // s'ecrire : le dire plutot que de rediriger vers une page qui
    // renverra ici.
    if (!data.session) {
      setNote(
        "Connexion acceptée mais la session n'a pas pu être enregistrée. Vérifie que les cookies ne sont pas bloqués pour ce site."
      );
      return;
    }

    router.push(suite);
    router.refresh();
  }

  if (done) {
    return (
      <div className="glass flex flex-col items-center gap-4 p-8 text-center">
        <span
          className="grid h-14 w-14 place-items-center rounded-full bg-white/14 text-[24px]"
          aria-hidden
        >
          ✉
        </span>

        <h2 className="m-0 text-[19px] font-extrabold text-white">Vérifie ta boîte mail</h2>

        <p className="m-0 max-w-md text-[14.5px] leading-relaxed text-white/84">
          {mode === "oubli"
            ? "Si un compte existe avec cette adresse, un lien vient de partir. Il n'est valable qu'une fois et pour peu de temps."
            : (
              <>
                Un lien de confirmation vient de partir vers{" "}
                <strong className="font-extrabold text-white">{adresse}</strong>. Clique
                dessus et ton compte sera actif. Tant que ce n&apos;est pas fait, la
                connexion sera refusée.
              </>
            )}
        </p>

        <p className="m-0 max-w-md text-[13px] leading-relaxed text-white/60">
          Rien n&apos;arrive ? Regarde dans les indésirables. L&apos;expéditeur intégré de
          Supabase est limité à quelques messages par heure.
        </p>

        {/* Le renvoi. Un lien perdu ou expiré est le premier motif
            d'abandon à l'inscription, et sans ce bouton il faudrait
            recréer un compte pour s'en sortir. */}
        {mode === "inscription" && (
          <button
            type="button"
            onClick={renvoyer}
            disabled={pending}
            className="rounded-full border border-white/40 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/18 active:scale-[.97] disabled:opacity-55"
          >
            {pending ? "Envoi…" : "Renvoyer le lien"}
          </button>
        )}

        {note && (
          <p className="m-0 max-w-md rounded-[13px] bg-white/12 px-4 py-3 text-[13px] leading-relaxed text-white">
            {note}
          </p>
        )}
      </div>
    );
  }

  const tab = "flex-1 rounded-full py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] transition";

  return (
    <form onSubmit={onSubmit} className="glass flex flex-col gap-5 p-4 sm:p-7">
      {/* En haut, parce que c'est le chemin le plus court et le plus
          sûr. Le mot de passe qu'on invente à contrecœur est faible ;
          celui qu'on ne crée pas ne peut pas fuir. Rien ici quand on a
          simplement oublié son mot de passe : le sujet est ailleurs. */}
      {mode !== "oubli" && <ConnexionFournisseurs suite={suite} />}

      <div className="flex gap-1.5 rounded-full bg-white/10 p-1.5">
        <button
          type="button"
          onClick={() => { setMode("connexion"); setNote(null); }}
          className={`${tab} ${mode !== "inscription" ? "bg-white text-[var(--color-ink)]" : "text-white/75 hover:text-white"}`}
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

      {mode !== "oubli" && (
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
      )}

      {note && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
          {note}
        </p>
      )}

      <button type="submit" disabled={pending} className="card-light px-7 py-3.5 disabled:opacity-60">
        <span className="relative z-3 text-[14px] font-extrabold">
          {pending
            ? "…"
            : mode === "connexion"
              ? "Se connecter"
              : mode === "inscription"
                ? "Créer mon compte"
                : "Recevoir un lien"}
        </span>
      </button>

      {mode === "connexion" ? (
        <button
          type="button"
          onClick={() => { setMode("oubli"); setNote(null); }}
          className="m-0 self-start text-[12.5px] font-semibold text-white/65 underline underline-offset-2 transition hover:text-white"
        >
          Mot de passe oublié ?
        </button>
      ) : mode === "oubli" ? (
        <button
          type="button"
          onClick={() => { setMode("connexion"); setNote(null); }}
          className="m-0 self-start text-[12.5px] font-semibold text-white/65 underline underline-offset-2 transition hover:text-white"
        >
          Retour à la connexion
        </button>
      ) : null}
    </form>
  );
}
