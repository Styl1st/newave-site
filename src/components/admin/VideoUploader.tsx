"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "./fields";

const MAX_MO = 50;

/**
 * Envoi d'une vidéo dans le bucket media.
 *
 * La limite n'est pas un caprice, c'est celle de l'hébergement : au
 * delà de 50 Mo, Supabase refuse le fichier. On le dit donc AVANT
 * l'envoi, plutôt que de laisser la barre monter pendant deux minutes
 * pour finir sur un refus.
 *
 * Mais le vrai sujet n'est pas la limite, c'est la bande passante. Le
 * forfait gratuit sert cinq gigaoctets par mois : une vidéo de 200 Mo
 * est épuisée en vingt-cinq lectures. La même séquence compressée à
 * 10 Mo en tient cinq cents. Et ce n'est pas qu'une question de
 * facture — un téléphone en 4G télécharge le fichier entier avant de
 * l'afficher, donc plus il est lourd, plus on attend devant un écran
 * noir.
 *
 * D'où le message ci-dessous, qui donne la marche à suivre au lieu de
 * dire non.
 */
export default function VideoUploader({
  name = "video_url",
  label = "Vidéo",
  defaultValue,
  folder = "videos",
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

    const mo = file.size / (1024 * 1024);
    if (mo > MAX_MO) {
      setNote(
        `Cette vidéo fait ${mo.toFixed(0)} Mo, et le maximum est de ${MAX_MO} Mo. ` +
          "Ré-exporte-la en 1080p (dans HandBrake, le réglage « Fast 1080p30 » suffit) " +
          "et tu devrais tomber autour de 10 Mo pour trente secondes, sans différence visible " +
          "à l'écran. Autre possibilité : ne pas l'héberger du tout et coller le lien " +
          "Instagram ou TikTok plus bas, c'est plus léger pour tout le monde."
      );
      e.target.value = "";
      return;
    }

    // Une alerte, pas un refus : le fichier passe, mais on dit ce que
    // ça coûtera à chaque lecture.
    if (mo > 20) {
      setNote(
        `${mo.toFixed(0)} Mo, c'est lourd pour une vidéo web : compte quelques secondes ` +
          "d'attente sur un téléphone en 4G. Une ré-exportation en 1080p diviserait ça par trois."
      );
    }

    setBusy(true);
    setNote(null);

    const supabase = createClient();
    if (!supabase) {
      setBusy(false);
      setNote("Supabase n'est pas configuré.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });

    if (error) {
      setBusy(false);
      setNote(`Envoi refusé : ${error.message}`);
      return;
    }

    setUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div>
      <Label
        htmlFor={`${name}-file`}
        hint={`MP4 en 1080p, ${MAX_MO} Mo maximum, et vise plutôt 10 à 15 Mo. Laisse vide pour un post en images seulement.`}
      >
        {label}
      </Label>

      {url && (
        <div className="mb-3 overflow-hidden rounded-[13px] border border-white/25">
          <video src={url} controls playsInline preload="metadata" className="block max-h-72 w-full" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          id={`${name}-file`}
          type="file"
          accept="video/*"
          onChange={onFile}
          disabled={busy}
          className="flex-1 text-[13px] font-semibold text-white/85 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-[12px] file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[var(--color-ink)]"
        />
        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="rounded-full border border-white/30 bg-white/8 px-4 py-2 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18"
          >
            Retirer
          </button>
        )}
      </div>

      <input type="hidden" name={name} value={url} />

      {busy && <p className="m-0 mt-2 text-[12.5px] font-bold text-white/80">Envoi en cours…</p>}
      {note && <p className="m-0 mt-2 text-[12.5px] text-white">{note}</p>}
    </div>
  );
}
