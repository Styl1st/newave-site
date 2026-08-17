"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allegerImage, poids } from "@/lib/alleger-image";
import { FIELD, Label } from "./fields";

/** Les formats de vidéo qu'un navigateur lit sans greffon. */
const VIDEO = /\.(mp4|webm|m4v)(\?|#|$)/i;

/** Au-delà, on refuse : c'est de la bande passante à chaque visite. */
const MAX_VIDEO_MO = 15;

/**
 * La couverture d'une marque : une image, une vidéo, ou les deux.
 *
 * Il y avait deux champs, l'un pour l'image et l'autre pour l'adresse
 * d'une vidéo, plus bas. C'était une erreur de découpage : personne ne
 * pense « couverture fixe » et « couverture animée », on pense « le
 * visuel de la marque ». On collait donc l'adresse d'un MP4 dans le
 * champ image, et le site tentait de l'afficher comme une photo.
 *
 * Un seul bloc, donc, qui reconnaît ce qu'on lui donne.
 *
 * L'IMAGE RESTE OBLIGATOIRE, et c'est le point à comprendre. Les cartes
 * de l'annuaire et l'aperçu quand on partage un lien ne savent pas lire
 * une vidéo : sans image fixe, la marque n'a pas de vignette et son
 * lien s'affiche nu. Plutôt que de l'exiger, on la FABRIQUE — la
 * première image de la vidéo est extraite dans le navigateur et envoyée
 * comme couverture. Personne n'a rien à faire, et la fiche est
 * complète.
 */
export default function VisuelCouverture({
  image,
  video,
  folder = "marques",
}: {
  image?: string | null;
  video?: string | null;
  folder?: string;
}) {
  const [urlImage, setUrlImage] = useState(image ?? "");
  const [urlVideo, setUrlVideo] = useState(video ?? "");
  /*
   * Ce que montre le champ de texte.
   *
   * Il était en `defaultValue`, donc figé à sa valeur de départ : après
   * un envoi de fichier, l'adresse partait bien en base mais le champ
   * restait vide, et l'on croyait que rien ne s'était enregistré. Un
   * état à part, mis à jour partout, lève le doute.
   */
  const [saisie, setSaisie] = useState(video || image || "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /**
   * La première image d'une vidéo, extraite dans le navigateur.
   *
   * On se place à une demi-seconde plutôt qu'à zéro : beaucoup de
   * vidéos commencent sur un fondu au noir, et une vignette noire ne
   * rend service à personne.
   */
  async function premiereImage(source: string | File): Promise<File | null> {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.crossOrigin = "anonymous";
      v.src = typeof source === "string" ? source : URL.createObjectURL(source);

      const abandonner = () => resolve(null);
      v.onerror = abandonner;
      // Une vidéo hébergée ailleurs peut refuser d'être lue pixel par
      // pixel : on n'insiste pas, la marque mettra une image à la main.
      setTimeout(abandonner, 8000);

      v.onloadeddata = () => {
        v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
      };

      v.onseeked = () => {
        try {
          const canevas = document.createElement("canvas");
          canevas.width = v.videoWidth;
          canevas.height = v.videoHeight;
          const ctx = canevas.getContext("2d");
          if (!ctx || !canevas.width) return abandonner();
          ctx.drawImage(v, 0, 0);
          canevas.toBlob(
            (b) => resolve(b ? new File([b], "couverture.webp", { type: "image/webp" }) : null),
            "image/webp",
            0.85
          );
        } catch {
          abandonner();
        }
      };
    });
  }

  async function envoyer(fichier: File, dossier: string): Promise<string | null> {
    const supabase = createClient();
    if (!supabase) return null;

    const ext = fichier.name.split(".").pop()?.toLowerCase() ?? "bin";
    const chemin = `${dossier}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(chemin, fichier, {
        cacheControl: "31536000",
        upsert: false,
        contentType: fichier.type,
      });
    if (error) return null;
    return supabase.storage.from("media").getPublicUrl(chemin).data.publicUrl;
  }

  /** Une image posée d'après une vidéo, si la couverture est vide. */
  async function completerAvecUnePhoto(source: string | File) {
    if (urlImage) return;
    const capture = await premiereImage(source);
    if (!capture) {
      setNote(
        "Vidéo enregistrée. Ajoute une image de couverture : les cartes de l'annuaire " +
          "et l'aperçu de partage ne savent pas lire une vidéo."
      );
      return;
    }
    const allege = await allegerImage(capture, { maxCote: 1600, qualite: 0.85 });
    const adresse = await envoyer(allege.fichier, folder);
    if (adresse) {
      setUrlImage(adresse);
      setNote("Vidéo enregistrée, et sa première image reprise comme vignette.");
    }
  }

  async function surFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setBusy(true);
    setNote(null);

    if (fichier.type.startsWith("video/")) {
      const mo = fichier.size / (1024 * 1024);
      if (mo > MAX_VIDEO_MO) {
        setBusy(false);
        setNote(
          `Cette vidéo fait ${mo.toFixed(0)} Mo, et le maximum est de ${MAX_VIDEO_MO} Mo. ` +
            "Une couverture se rejoue à chaque visite : au-delà, c'est la page qui traîne. " +
            "Ré-exporte-la en 1080p, ou colle plutôt l'adresse de celle qui est déjà en ligne " +
            "chez la marque."
        );
        e.target.value = "";
        return;
      }

      const adresse = await envoyer(fichier, folder);
      if (!adresse) {
        setBusy(false);
        setNote("L'envoi a été refusé.");
        return;
      }
      setUrlVideo(adresse);
      setSaisie(adresse);
      await completerAvecUnePhoto(fichier);
      setBusy(false);
      e.target.value = "";
      return;
    }

    const allege = await allegerImage(fichier, { maxCote: 1800, qualite: 0.82 });
    const adresse = await envoyer(allege.fichier, folder);
    setBusy(false);
    e.target.value = "";

    if (!adresse) {
      setNote("L'envoi a été refusé.");
      return;
    }
    setUrlImage(adresse);
    setSaisie(adresse);
    if (allege.modifie) setNote(`Allégée : ${poids(allege.avant)} → ${poids(allege.apres)}.`);
  }

  /** L'adresse collée part dans le bon champ, selon ce qu'elle désigne. */
  async function surAdresse(valeur: string) {
    const propre = valeur.trim();

    if (VIDEO.test(propre)) {
      setUrlVideo(propre);
      setSaisie(propre);
      setBusy(true);
      await completerAvecUnePhoto(propre);
      setBusy(false);
      return;
    }
    setUrlVideo("");
    setUrlImage(propre);
    setSaisie(propre);
  }

  const apercu = urlVideo || urlImage;

  return (
    <div>
      <Label
        htmlFor="couverture-fichier"
        hint="Une image ou une vidéo. JPG, PNG, WebP, MP4, WebM. Les images sont compressées automatiquement."
      >
        Visuel de couverture
      </Label>

      {apercu && (
        <div className="mb-3 overflow-hidden rounded-[13px] border border-white/25">
          {urlVideo ? (
            <video
              src={urlVideo}
              poster={urlImage || undefined}
              autoPlay
              muted
              loop
              playsInline
              className="block max-h-64 w-full object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={urlImage} alt="" className="block max-h-64 w-full object-cover" />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          id="couverture-fichier"
          type="file"
          accept="image/*,video/mp4,video/webm"
          onChange={surFichier}
          disabled={busy}
          className="flex-1 text-[13px] font-semibold text-white/85 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-[12px] file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[var(--color-ink)]"
        />
        {urlVideo && (
          <button
            type="button"
            onClick={() => {
              setUrlVideo("");
              setSaisie(urlImage);
            }}
            className="rounded-full border border-white/30 bg-white/8 px-4 py-2 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18"
          >
            Retirer l&apos;animation
          </button>
        )}
      </div>

      <input
        type="text"
        className={`${FIELD} mt-3`}
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onBlur={(e) => surAdresse(e.target.value)}
        placeholder="…ou colle une adresse, image ou vidéo"
      />

      {/* Les deux valeurs partent séparément : le site a besoin de
          l'image fixe pour les vignettes, et de la vidéo pour la fiche. */}
      <input type="hidden" name="cover_url" value={urlImage} />
      <input type="hidden" name="cover_video_url" value={urlVideo} />

      {/* L'état, écrit noir sur blanc. Un aperçu peut ne pas s'afficher
          — une image dont le site interdit la reprise, par exemple — et
          l'on en concluait qu'il n'y avait rien. */}
      <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white/55">
        {urlVideo && urlImage
          ? "En place : une vidéo, et une image fixe pour les vignettes."
          : urlVideo
            ? "En place : une vidéo."
            : urlImage
              ? "En place : une image."
              : "Aucun visuel pour l'instant."}
      </p>

      {busy && <p className="m-0 mt-2 text-[12.5px] font-bold text-white/80">Envoi en cours…</p>}
      {note && <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white">{note}</p>}

      {urlVideo && !urlImage && (
        <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white/70">
          Il manque une image fixe : les cartes de l&apos;annuaire et l&apos;aperçu de
          partage ne savent pas lire une vidéo.
        </p>
      )}
    </div>
  );
}
