"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enregistrerProfilForum } from "@/app/forum/actions";
import { BIO_MAX, handleNettoye } from "@/lib/forum";

/**
 * « Sur le forum » : le pseudo, la ville et la phrase de présentation,
 * depuis Mon compte.
 *
 * C'est l'endroit pour CHANGER son pseudo ; on le CHOISIT d'abord au
 * premier geste sur le forum (voir `ChoixPseudo`). Le vider est permis :
 * on disparaît alors de la liste publique des membres, et il faudra en
 * reprendre un pour publier à nouveau.
 */
export default function ProfilForum({
  handle,
  ville,
  bio,
}: {
  handle: string | null;
  ville: string | null;
  bio: string | null;
}) {
  const router = useRouter();
  const [h, setH] = useState(handle ?? "");
  const [v, setV] = useState(ville ?? "");
  const [b, setB] = useState(bio ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; texte: string } | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setNote(null);
    const res = await enregistrerProfilForum({ handle: h, ville: v, bio: b });
    setEnvoi(false);
    setNote({ ok: res.ok, texte: res.ok ? res.message ?? "Enregistré." : res.error ?? "Rien n'a été enregistré." });
    if (res.ok) router.refresh();
  }

  const etiquette = "mb-1.5 block text-[12.5px] font-extrabold text-white";

  return (
    <section className="glass rise rise-3 p-4 sm:p-[26px]">
      <h2 className="m-0 text-[17px] font-extrabold text-white">Sur le forum</h2>
      <p className="m-0 mt-2 text-[13.5px] leading-relaxed text-white/70">
        Ce que les autres membres voient de toi à côté de tes annonces et de tes réponses. Ton
        adresse email, elle, n&apos;apparaît nulle part.
      </p>

      <form onSubmit={enregistrer} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={etiquette}>Pseudo</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-white/55">
              @
            </span>
            <input
              value={h}
              onChange={(e) => setH(handleNettoye(e.target.value).slice(0, 24))}
              placeholder="lea.grain"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="champ champ-loupe"
            />
          </span>
        </label>

        <label className="block">
          <span className={etiquette}>Ville</span>
          <input value={v} onChange={(e) => setV(e.target.value.slice(0, 60))} placeholder="Lyon" className="champ" />
        </label>

        <label className="block sm:col-span-2">
          <span className={`${etiquette} flex justify-between`}>
            <span>En une phrase</span>
            <span className="font-bold tabular-nums text-white/55">
              {b.length} / {BIO_MAX}
            </span>
          </span>
          <input
            value={b}
            onChange={(e) => setB(e.target.value.slice(0, BIO_MAX))}
            placeholder="Photographe argentique, portraits et lookbooks"
            className="champ"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={envoi}
            className="min-h-[44px] rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] transition active:scale-[.97] disabled:opacity-60"
          >
            {envoi ? "…" : "Enregistrer"}
          </button>
          {note && (
            <p role="status" className={`m-0 text-[13px] font-bold ${note.ok ? "text-white" : "text-white/85"}`}>
              {note.texte}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
