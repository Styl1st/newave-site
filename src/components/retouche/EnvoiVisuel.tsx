"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allegerImage, poids } from "@/lib/alleger-image";

/**
 * Poser un visuel sans quitter sa page.
 *
 * POURQUOI CE N'EST PAS `admin/ImageUploader`. Celui-là tient l'adresse
 * dans son propre état et la dépose dans un champ caché : il parle au
 * formulaire qui l'entoure, et à personne d'autre. La retouche n'a pas
 * de formulaire — elle a un brouillon, et deux façons d'y écrire, la
 * page et la feuille. Il fallait donc un envoi qui RENDE son adresse à
 * qui l'appelle, plutôt que de la garder pour lui.
 *
 * Le reste est identique, volontairement : même compression dans le
 * navigateur, même seau `media`, mêmes limites. L'octet économisé ici
 * l'est à la fois dans le stockage, dans la bande passante et chez le
 * visiteur.
 *
 * L'ÉCRITURE RESTE GARDÉE PAR LA BASE. Ce composant envoie un fichier
 * au nom de la personne connectée ; ce sont les règles du seau qui
 * décident si elle en a le droit, pas cette classe CSS.
 */

/** Au-delà, c'est le navigateur qui peine à ouvrir l'image. */
const MAX_IMAGE_MO = 25;
/** Au-delà, c'est de la bande passante à chaque visite. */
const MAX_VIDEO_MO = 15;

export default function EnvoiVisuel({
  dossier,
  libelle,
  accepte = "image/*",
  className = "",
  onEnvoye,
}: {
  /** Où ranger le fichier dans le seau : `marques/<adresse>`. */
  dossier: string;
  libelle: string;
  accepte?: string;
  /** L'apparence du bouton : elle change d'un endroit à l'autre. */
  className?: string;
  onEnvoye: (adresse: string) => void;
}) {
  const id = useId();
  const [enCours, setEnCours] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function surFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    const mo = fichier.size / (1024 * 1024);
    const video = fichier.type.startsWith("video/");
    const limite = video ? MAX_VIDEO_MO : MAX_IMAGE_MO;

    // Le refus vient AVANT que le navigateur s'essaie à ouvrir le
    // fichier : passé la limite, c'est lui qui cale, sans un mot.
    if (mo > limite) {
      e.target.value = "";
      setNote(
        video
          ? `Cette vidéo fait ${mo.toFixed(0)} Mo, et le maximum est de ${MAX_VIDEO_MO} Mo. Une couverture se rejoue à chaque visite : au-delà, c'est la page qui traîne.`
          : `Image trop lourde : ${MAX_IMAGE_MO} Mo maximum.`
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setNote("Supabase n'est pas configuré.");
      return;
    }

    setEnCours(true);
    setNote(null);

    // `allegerImage` rend le fichier tel quel dès qu'il n'est pas une
    // image : une vidéo, un SVG et un GIF y passent sans y toucher.
    const aEnvoyer = await allegerImage(fichier, { maxCote: 1800, qualite: 0.82 });

    const extension = aEnvoyer.modifie
      ? "webp"
      : (fichier.name.split(".").pop()?.toLowerCase() ?? "bin");
    const chemin = `${dossier}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(chemin, aEnvoyer.fichier, {
        cacheControl: "31536000",
        upsert: false,
        contentType: fichier.type,
      });

    setEnCours(false);
    e.target.value = "";

    if (error) {
      setNote(`Envoi refusé : ${error.message}`);
      return;
    }

    setNote(
      aEnvoyer.modifie ? `Allégée : ${poids(aEnvoyer.avant)} → ${poids(aEnvoyer.apres)}.` : null
    );
    onEnvoye(supabase.storage.from("media").getPublicUrl(chemin).data.publicUrl);
  }

  return (
    <>
      {/* Le champ de fichier du navigateur ne se met pas en pilule : on
          l'escamote et c'est son étiquette qu'on habille. Elle reste un
          vrai `label`, donc atteignable au clavier comme au doigt. */}
      <label
        htmlFor={id}
        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 transition active:scale-[.97] ${
          enCours ? "pointer-events-none opacity-60" : ""
        } ${className}`}
      >
        {enCours ? "Envoi en cours…" : libelle}
      </label>
      <input
        id={id}
        type="file"
        accept={accepte}
        onChange={surFichier}
        disabled={enCours}
        className="sr-only"
      />

      {note && (
        <p className="m-0 mt-2 w-full text-[11.5px] leading-relaxed text-white">{note}</p>
      )}
    </>
  );
}
