"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "sending" | "sent" | "error";
type Relationship = "proprietaire" | "decouvreur";

const FIELD =
  "w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55";
const LABEL = "eyebrow mb-2 block";

export default function ApplicationForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("proprietaire");
  const proprietaire = relationship === "proprietaire";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");

    const form = new FormData(e.currentTarget);
    const payload = {
      brand_name: String(form.get("brand_name") ?? "").trim(),
      contact_name: String(form.get("contact_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      instagram: String(form.get("instagram") ?? "").trim() || null,
      website: String(form.get("website") ?? "").trim() || null,
      pitch: String(form.get("pitch") ?? "").trim(),
      relationship,
    };

    const supabase = createClient();

    // Sans Supabase configure, on n'invente pas un succes : on bascule sur l'email.
    if (!supabase) {
      setState("error");
      setMessage(
        "Le formulaire n'est pas encore branché. Écris-nous directement à contact@newavesphere.fr, on répond à tout."
      );
      return;
    }

    // Si la marque est connectee, on retient son compte : ca permettra de
    // lui donner les droits sur sa fiche en un clic apres validation.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("applications")
      .insert({ ...payload, user_id: user?.id ?? null });

    if (error) {
      setState("error");
      setMessage(
        "L'envoi a échoué. Réessaie, ou écris-nous à contact@newavesphere.fr."
      );
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="glass p-8 text-center">
        <h2 className="m-0 text-[20px] font-extrabold text-white">C&apos;est reçu.</h2>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-white/84">
          {proprietaire
            ? "On lit chaque dossier nous-mêmes. Compte quelques jours, et une réponse arrivera à l'adresse que tu as laissée — même si c'est un non."
            : "Merci pour la recommandation. On va regarder cette marque, et on la contactera directement si son travail nous parle."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass flex flex-col gap-5 p-6 sm:p-8">
      {/* Le choix conditionne tout le reste : les libellés, ce qu'on
          demande, et surtout les droits accordés en cas d'acceptation. */}
      <fieldset className="m-0 border-0 p-0">
        <legend className="eyebrow mb-3 p-0">Tu es…</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "proprietaire" as const,
                titre: "À la tête de cette marque",
                texte: "Tu la fondes ou la diriges. Si le dossier est retenu, tu pourras gérer ta page toi-même.",
              },
              {
                value: "decouvreur" as const,
                titre: "Tu la recommandes",
                texte: "Tu n'en fais pas partie, tu trouves son travail juste. On la contactera nous-mêmes.",
              },
            ]
          ).map((choix) => {
            const actif = relationship === choix.value;
            return (
              <label
                key={choix.value}
                className={`cursor-pointer rounded-[var(--radius)] border p-4 transition ${
                  actif
                    ? "border-white bg-white/18"
                    : "border-white/25 bg-white/6 hover:border-white/50 hover:bg-white/12"
                }`}
              >
                <input
                  type="radio"
                  name="relationship"
                  value={choix.value}
                  checked={actif}
                  onChange={() => setRelationship(choix.value)}
                  className="sr-only"
                />
                <span className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                      actif ? "border-white" : "border-white/45"
                    }`}
                  >
                    {actif && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span>
                    <span className="block text-[14px] font-extrabold text-white">{choix.titre}</span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-white/70">
                      {choix.texte}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="brand_name">Nom de la marque *</label>
          <input className={FIELD} id="brand_name" name="brand_name" required placeholder="Engineered By Aryes" />
        </div>
        <div>
          <label className={LABEL} htmlFor="contact_name">Ton nom *</label>
          <input className={FIELD} id="contact_name" name="contact_name" required placeholder="Prénom Nom" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="email">Email *</label>
          <input className={FIELD} id="email" name="email" type="email" required placeholder="toi@tamarque.fr" />
        </div>
        <div>
          <label className={LABEL} htmlFor="instagram">Instagram</label>
          <input className={FIELD} id="instagram" name="instagram" placeholder="@tamarque" />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="website">Site ou boutique</label>
        <input className={FIELD} id="website" name="website" type="url" placeholder="https://" />
      </div>

      <div>
        <label className={LABEL} htmlFor="pitch">Raconte ta démarche *</label>
        <textarea
          className={`${FIELD} min-h-[150px] resize-y`}
          id="pitch"
          name="pitch"
          required
          placeholder={
            proprietaire
              ? "Ce que tu fabriques, comment, et pourquoi. Trois phrases honnêtes valent mieux qu'une page de communication."
              : "Pourquoi cette marque mérite d'être connue. Ce qui t'a marqué chez elle."
          }
        />
      </div>

      {state === "error" && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
          {message}
        </p>
      )}

      <button type="submit" disabled={state === "sending"} className="card-light self-start px-7 py-3.5 disabled:opacity-60">
        <span className="relative z-3 text-[14px] font-extrabold">
          {state === "sending" ? "Envoi…" : proprietaire ? "Envoyer mon dossier" : "Recommander cette marque"}
        </span>
      </button>

      <p className="m-0 text-[12.5px] leading-relaxed text-white/62">
        Tes informations servent uniquement à étudier ta candidature. Elles ne sont ni
        revendues ni transmises. Tu peux demander leur suppression à tout moment à
        contact@newavesphere.fr.
      </p>
    </form>
  );
}
