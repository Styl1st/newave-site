"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleLike } from "@/lib/likes";

/**
 * Coup de cœur sur une pièce.
 *
 * Le compteur bouge tout de suite, avant la réponse du serveur : sur un
 * geste aussi léger, attendre un aller-retour donne l'impression que
 * le clic n'a pas pris. En cas d'échec, on revient à l'état d'avant.
 */
export default function LikeButton({
  productId,
  initialLiked,
  initialCount,
  taille = "normal",
}: {
  productId: string;
  initialLiked: boolean;
  initialCount: number;
  taille?: "normal" | "compact";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const avant = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));

    startTransition(async () => {
      const res = await toggleLike(productId);
      if (res.reason === "non-connecte") {
        setLiked(avant.liked);
        setCount(avant.count);
        router.push(`/connexion?suite=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) {
        setLiked(avant.liked);
        setCount(avant.count);
      }
    });
  }

  const compact = taille === "compact";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Retirer mon coup de cœur" : "Ajouter à mes coups de cœur"}
      className={
        compact
          ? `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold transition active:scale-95 ${
              liked ? "bg-[#c2273f] text-white" : "bg-[rgba(23,10,51,0.07)] text-[#4a3a78] hover:bg-[rgba(23,10,51,0.15)]"
            }`
          : `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-extrabold transition active:scale-[.97] ${
              liked
                ? "bg-[#c2273f] text-white"
                : "border border-white/40 bg-white/8 text-white hover:border-white/70 hover:bg-white/20"
            }`
      }
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="M12 20.5 4.3 13a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9A4.8 4.8 0 0 1 19.7 13Z" />
      </svg>
      {count > 0 ? count : compact ? "" : "J'aime"}
    </button>
  );
}
