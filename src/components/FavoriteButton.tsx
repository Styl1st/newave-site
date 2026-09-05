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
  className = "h-9 w-9",
}: {
  brandId: string;
  initial: boolean;
  /**
   * Où le bouton est posé, plus que sa taille.
   *
   * `compacte` : une pastille sur le VISUEL d'une carte. Le fond sombre
   * n'est pas décoratif, c'est ce qui garantit qu'un cœur blanc reste
   * lisible quelle que soit la photo dessous.
   *
   * `claire` : la même pastille, mais sur une surface CLAIRE — la ligne
   * de marque de l'annuaire, qui est une carte blanche et non une
   * photo. Le fond sombre y faisait une tache d'encre, et le cœur blanc
   * y était le seul élément à ne pas suivre le reste de la ligne.
   */
  taille?: "normale" | "compacte" | "claire";
  /** Nom de la marque, pour que le bouton reste compréhensible sans texte. */
  etiquette?: string;
  /**
   * De quoi retoucher la PASTILLE, et rien d'autre.
   *
   * Elle mesure trente-six pixels, ce qui va partout à la souris et
   * reste sous la cible de quarante-quatre au doigt. Plutôt qu'une
   * seconde taille nommée — qui n'aurait de sens que sur un écran étroit,
   * alors que le composant ne mesure rien — l'appelant dit ce qu'il veut
   * là où il connaît son gabarit. Sans effet sur la forme `normale`, qui
   * est un bouton à libellé et non une pastille.
   *
   * ⚠️ La taille par défaut est ICI et non dans la classe de base : deux
   * hauteurs écrites dans le même attribut ne se départagent pas par
   * leur ordre d'écriture mais par celui de la feuille compilée, que
   * personne ne contrôle. Une valeur, une seule.
   */
  className?: string;
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

  if (taille === "compacte" || taille === "claire") {
    const surClair = taille === "claire";
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
        className={`grid ${className} place-items-center rounded-full text-[15px] transition active:scale-90 disabled:opacity-60 ${
          surClair
            ? favorited
              ? "bg-[var(--color-ink)] text-white"
              : "bg-[rgba(20,8,50,0.1)] text-[var(--color-ink)] hover:bg-[rgba(20,8,50,0.18)]"
            : favorited
              ? "bg-white text-[var(--color-ink)] backdrop-blur-sm"
              : "bg-[rgba(20,8,50,0.62)] text-white backdrop-blur-sm hover:bg-[rgba(20,8,50,0.92)]"
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
