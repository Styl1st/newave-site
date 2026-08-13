"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allegerImage, poids } from "@/lib/alleger-image";
import { FIELD, Label } from "./fields";

/**
 * Envoie une image dans le bucket "media" de Supabase et remplit
 * le champ caché image_url avec son adresse publique.
 * L'écriture n'est autorisée qu'aux admins, côté base.
 */
export default function ImageUploader({
  name = "image_url",
  label = "Visuel",
  defaultValue,
  folder = "posts",
}: {
  name?: string;
  label?: string;
  defaultValue?: string | null;
  folder?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // La limite s'applique au fichier D'ORIGINE, avant allègement :
    // au-delà, c'est le navigateur qui peine à ouvrir l'image, et le
    // refus doit venir avant qu'il s'y essaie.
    if (file.size > 25 * 1024 * 1024) {
      setNote("Image trop lourde : 25 Mo maximum.");
      return;
    }

    setBusy(true);
    setNote(null);

    // Redimensionnée et convertie en WebP dans le navigateur. Voir
    // lib/alleger-image.ts : l'octet économisé ici l'est à la fois
    // dans le stockage, dans la bande passante et chez le visiteur.
    const allege = await allegerImage(file, { maxCote: 1800, qualite: 0.82 });

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setNote("Supabase n'est pas configuré.");
      return;
    }

    const ext = allege.modifie
      ? "webp"
      : file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(path, allege.fichier, { cacheControl: "31536000", upsert: false });

    if (error) {
      setBusy(false);
      setNote(`Envoi refusé : ${error.message}`);
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setUrl(data.publicUrl);
    setBusy(false);
    if (allege.modifie) {
      setNote(`Allégée : ${poids(allege.avant)} → ${poids(allege.apres)}.`);
    }
  }

  return (
    <div>
      <Label htmlFor={`${name}-file`} hint="JPG, PNG ou WebP. Redimensionnée et compressée automatiquement.">
        {label}
      </Label>

      {url && (
        <div className="mb-3 overflow-hidden rounded-[13px] border border-white/25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="block max-h-64 w-full object-cover" />
        </div>
      )}

      <input
        id={`${name}-file`}
        type="file"
        accept="image/*"
        onChange={onFile}
        disabled={busy}
        className="w-full text-[13px] font-semibold text-white/85 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-[12px] file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[var(--color-ink)]"
      />

      <input
        type="text"
        className={`${FIELD} mt-3`}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        name={name}
        placeholder="…ou colle directement une adresse d'image"
      />

      {busy && <p className="m-0 mt-2 text-[12.5px] font-bold text-white/80">Envoi en cours…</p>}
      {note && <p className="m-0 mt-2 text-[12.5px] text-white">{note}</p>}
    </div>
  );
}
