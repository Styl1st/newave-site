"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "./fields";

/**
 * Envoie une ou plusieurs images dans le bucket "media" et garde
 * l'ordre choisi. Chaque image devient un champ cache portant le meme
 * nom, que l'action serveur relit avec formData.getAll().
 *
 * La premiere image sert de vignette dans les listes et d'apercu au
 * partage : d'ou les fleches pour la choisir.
 */
export default function MultiImageUploader({
  name = "images",
  label = "Visuels",
  defaultValue,
  folder = "posts",
}: {
  name?: string;
  label?: string;
  defaultValue?: string[] | null;
  folder?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue ?? []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const supabase = createClient();
    if (!supabase) {
      setNote("Supabase n'est pas configuré.");
      return;
    }

    setBusy(true);
    setNote(null);
    const added: string[] = [];

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        setNote(`« ${file.name} » dépasse 8 Mo, elle a été ignorée.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (error) {
        setNote(`Envoi refusé : ${error.message}`);
        continue;
      }
      added.push(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
    }

    setUrls((prev) => [...prev, ...added]);
    setBusy(false);
    e.target.value = "";
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= urls.length) return;
    setUrls((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (i: number) => setUrls((prev) => prev.filter((_, n) => n !== i));

  const iconBtn =
    "grid h-7 w-7 place-items-center rounded-full bg-black/55 text-[13px] font-black text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-30";

  return (
    <div>
      <Label htmlFor={`${name}-file`} hint="JPG, PNG ou WebP, 8 Mo par image. La première sert de vignette.">
        {label}
      </Label>

      {urls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, i) => (
            <div key={url} className="relative overflow-hidden rounded-[13px] border border-white/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="block aspect-square w-full object-cover" />
              <input type="hidden" name={name} value={url} />

              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)]">
                  Vignette
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/60 to-transparent p-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className={iconBtn} aria-label="Reculer">‹</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === urls.length - 1} className={iconBtn} aria-label="Avancer">›</button>
                </div>
                <button type="button" onClick={() => remove(i)} className={iconBtn} aria-label="Retirer">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        id={`${name}-file`}
        type="file"
        accept="image/*"
        multiple
        onChange={onFiles}
        disabled={busy}
        className="w-full text-[13px] font-semibold text-white/85 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-[12px] file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[var(--color-ink)]"
      />

      {busy && <p className="m-0 mt-2 text-[12.5px] font-bold text-white/80">Envoi en cours…</p>}
      {note && <p className="m-0 mt-2 text-[12.5px] text-white">{note}</p>}
      {urls.length === 0 && <input type="hidden" name={name} value="" />}
    </div>
  );
}
