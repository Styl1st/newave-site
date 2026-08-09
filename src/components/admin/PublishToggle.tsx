"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBrandStatus } from "@/app/admin/actions";
import { IconCheck, IconEye } from "@/components/Icons";
import { useConfirmation } from "@/lib/confirmation";

/**
 * Publier ou retirer une marque, sans passer par le formulaire.
 *
 * Le bouton dit ce qui va se passer, pas l'état actuel : « Publier »
 * quand la fiche est en brouillon. Un bouton qui affiche l'état laisse
 * toujours un doute sur ce que fait le clic.
 */
export default function PublishToggle({
  brandId,
  brandName,
  published,
  taille = "normale",
}: {
  brandId: string;
  brandName: string;
  published: boolean;
  /** « compacte » pour une ligne de liste, sur fond clair. */
  taille?: "normale" | "compacte";
}) {
  const [note, setNote] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { arme, demander, desarmer } = useConfirmation();

  function basculer() {
    // Retirer une marque de l'annuaire se demande deux fois. Publier,
    // non : c'est l'action qu'on vient chercher, et elle se défait.
    if (published && !demander()) return;
    desarmer();

    const formData = new FormData();
    formData.set("id", brandId);
    formData.set("publier", published ? "0" : "1");

    startTransition(async () => {
      const res = await toggleBrandStatus(formData);
      setNote(
        res.ok
          ? { ok: true, texte: res.message ?? "C'est fait." }
          : { ok: false, texte: res.error ?? "L'opération a échoué." }
      );
      router.refresh();
    });
  }

  const compacte = taille === "compacte";

  // La version compacte vit sur une carte claire : le contraste s'inverse.
  const styleBouton = compacte
    ? published
      ? "inline-flex items-center gap-1.5 rounded-full border border-[rgba(23,10,51,0.2)] px-3.5 py-2 text-[11.5px] font-bold text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.07)] active:scale-[.97] disabled:opacity-50"
      : "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-[11.5px] font-black text-white transition hover:opacity-85 active:scale-[.97] disabled:opacity-50"
    : published
      ? "inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97] disabled:opacity-50"
      : "inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-50"

  const libelle = arme
    ? compacte
      ? "Confirmer"
      : "Confirmer le retrait"
    : compacte
      ? published
        ? "Retirer"
        : "Publier"
      : published
        ? "Retirer de l'annuaire"
        : "Publier la marque";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={basculer}
        onBlur={desarmer}
        className={arme ? `${styleBouton} ring-2 ring-white/70` : styleBouton}
      >
        {published ? <IconEye /> : <IconCheck />}
        {pending ? "…" : libelle}
      </button>

      {arme && (
        <p
          className={
            compacte
              ? "m-0 max-w-[220px] text-right text-[11px] leading-snug text-[#6a5a92]"
              : "m-0 max-w-xs text-right text-[12px] leading-snug text-white/70"
          }
        >
          {brandName} redevient un brouillon : sa page quitte l&apos;annuaire, rien
          n&apos;est supprimé.
        </p>
      )}

      {note && (
        <p
          className={
            compacte
              ? `m-0 max-w-[220px] text-right text-[11px] leading-snug ${
                  note.ok ? "text-[#6a5a92]" : "text-[#a8243c]"
                }`
              : `m-0 max-w-xs text-right text-[12.5px] leading-relaxed ${
                  note.ok ? "text-white/85" : "text-white"
                }`
          }
        >
          {note.texte}
        </p>
      )}
    </div>
  );
}
