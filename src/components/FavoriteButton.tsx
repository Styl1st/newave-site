"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/favorites";

/**
 * Un cœur, plus une étoile.
 *
 * Depuis que les marques et les pièces se notent sur cinq étoiles,
 * l'étoile veut dire « voici ce que j'en pense ». La garder ici, où
 * elle voulait dire « je veux la suivre », mettait deux sens
 * différents derrière le même dessin.
 */
function Coeur({ plein }: { plein: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[1.15em] w-[1.15em]"
      fill={plein ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.5 4.3 13a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9A4.8 4.8 0 0 1 19.7 13Z" />
    </svg>
  );
}

export default function FavoriteButton({
  brandId,
  initial,
  taille = "normale",
  etiquette,
}: {
  brandId: string;
  initial: boolean;
  /** « compacte » pour une pastille posée sur une carte de l'annuaire. */
  taille?: "normale" | "compacte";
  /** Nom de la marque, pour que le bouton reste compréhensible sans texte. */
  etiquette?: string;
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

  if (taille === "compacte") {
    // Posée sur le visuel d'une carte : le fond sombre garantit que
    // l'étoile reste lisible quelle que soit la photo dessous.
    return (
      <button
        onClick={onClick}
        disabled={pending}
        aria-pressed={favorited}
        aria-label={
          favorited
            ? `Retirer ${etiquette ?? "cette marque"} de mes favoris`
            : `Mettre ${etiquette ?? "cette marque"} en favori`
        }
        title={favorited ? "En favori" : "Mettre en favori"}
        className={`grid h-9 w-9 place-items-center rounded-full text-[15px] backdrop-blur-sm transition active:scale-90 disabled:opacity-60 ${
          favorited
            ? "bg-white text-[var(--color-ink)]"
            : "bg-[rgba(20,8,50,0.62)] text-white hover:bg-[rgba(20,8,50,0.92)]"
        }`}
      >
        <Coeur plein={favorited} />
      </button>
    );
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
        <Coeur plein={favorited} />
        {favorited ? "En favori" : "Mettre en favori"}
      </button>
      {note && <p className="m-0 mt-2 text-[12.5px] text-white/80">{note}</p>}
    </div>
  );
}
