"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/favorites";

export default function FavoriteButton({
  brandId,
  initial,
}: {
  brandId: string;
  initial: boolean;
}) {
  const [favorited, setFavorited] = useState(initial);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const res = await toggleFavorite(brandId);

      if (res.reason === "non-connecte") {
        // On n'affiche pas un faux succès : on emmène vers la connexion.
        router.push(`/connexion?suite=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) {
        setNote("Impossible d'enregistrer. Réessaie dans un instant.");
        return;
      }
      setNote(null);
      setFavorited(res.favorited);
    });
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={pending}
        aria-pressed={favorited}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.08em] transition disabled:opacity-60 ${
          favorited
            ? "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]"
            : "border border-white/40 text-white hover:bg-white/12"
        }`}
      >
        <span aria-hidden="true">{favorited ? "★" : "☆"}</span>
        {favorited ? "En favori" : "Mettre en favori"}
      </button>
      {note && <p className="m-0 mt-2 text-[12.5px] text-white/80">{note}</p>}
    </div>
  );
}
