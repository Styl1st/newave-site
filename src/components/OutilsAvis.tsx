"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BoutonSignaler from "./BoutonSignaler";
import { retirerAvis } from "@/lib/moderation";

/**
 * Ce qu'on peut faire de l'avis de QUELQU'UN D'AUTRE.
 *
 * Deux commandes qui ne s'adressent pas aux mêmes personnes : signaler,
 * ouvert à tout compte, et retirer, réservé à l'administration.
 *
 * Le retrait demande confirmation. Un avis effacé ne se récupère pas,
 * et il emporte avec lui ce que quelqu'un avait pris le temps
 * d'écrire — même quand c'était à tort.
 */
export default function OutilsAvis({
  avisId,
  chemin,
  connecte,
  estAdmin,
  dejaSignale,
}: {
  avisId: string;
  chemin: string;
  connecte: boolean;
  estAdmin: boolean;
  dejaSignale: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function supprimer() {
    if (!confirm("Retirer cet avis définitivement ?")) return;

    setPending(true);
    setErreur(null);

    const formData = new FormData();
    formData.set("id", avisId);
    formData.set("chemin", chemin);

    const res = await retirerAvis(formData);
    setPending(false);

    if (!res.ok) {
      setErreur(res.error ?? "La suppression a échoué.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <BoutonSignaler
          cible="avis"
          cibleId={avisId}
          chemin={chemin}
          connecte={connecte}
          dejaFait={dejaSignale}
          className="min-w-0 flex-1"
        />

        {estAdmin && (
          <button
            type="button"
            onClick={supprimer}
            disabled={pending}
            className="shrink-0 rounded-full border border-white/30 px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-white/80 transition hover:border-white/60 hover:bg-white/12 hover:text-white disabled:opacity-50"
          >
            Retirer
          </button>
        )}
      </div>

      {erreur && <p className="m-0 mt-2.5 text-[12.5px] text-white">{erreur}</p>}
    </div>
  );
}
