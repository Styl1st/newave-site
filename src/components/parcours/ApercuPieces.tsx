"use client";

import type { PieceLue } from "@/lib/catalogue-commun";
import { vignette } from "@/lib/vignette";

/**
 * Les pièces trouvées en lisant le site, en vignettes.
 *
 * C'est ce qui remplace « 42 pièces lues pour établir ces
 * suppositions ». Un chiffre ne dit pas si la lecture a pris les bons
 * articles, ni s'ils ont une photo ; huit vignettes le disent d'un coup
 * d'œil, et c'est à ça que ressemblera le catalogue de la fiche.
 *
 * Rien ne s'affiche quand la boutique n'a rien donné : un cadre vide
 * ferait croire à une panne alors que beaucoup de marques vendent en
 * message privé, sans catalogue à lire.
 */
export default function ApercuPieces({
  pieces,
  total,
  note,
}: {
  pieces: PieceLue[];
  /** Combien la lecture en a vu en tout, au-delà des vignettes. */
  total: number;
  note: string;
}) {
  if (pieces.length === 0) return null;

  return (
    <section className="glass overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/12 bg-[rgba(var(--voile),0.52)] px-3.5 py-2.5">
        <p className="eyebrow m-0">Ses pièces</p>
        <span className="text-[11px] font-bold tabular-nums text-white/60">
          {total > pieces.length
            ? `${pieces.length} sur ${total} lues`
            : `${total} lue${total > 1 ? "s" : ""}`}
        </span>
      </div>

      <ul className="m-0 grid list-none grid-cols-4 gap-2 p-3.5">
        {pieces.map((piece) => {
          const prix = prixLisible(piece);
          return (
            <li key={piece.image} className="min-w-0" title={piece.nom}>
              <div className="aspect-[4/5] overflow-hidden rounded-[10px] bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vignette(piece.image, 240)}
                  alt={piece.nom}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              {prix && (
                <p className="m-0 mt-1 truncate text-[10.5px] font-bold tabular-nums text-white/70">
                  {prix}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="m-0 border-t border-white/12 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-white/50">
        {note}
      </p>
    </section>
  );
}

/** Le prix tel qu'on l'affiche, ou rien si la boutique ne le donne pas. */
function prixLisible(piece: PieceLue): string | null {
  if (piece.prix === null) return null;
  const montant = piece.prix / 100;
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: piece.devise,
      maximumFractionDigits: Number.isInteger(montant) ? 0 : 2,
    }).format(montant);
  } catch {
    // Une devise que le navigateur ne connaît pas : le chiffre suffit.
    return `${Math.round(montant)} ${piece.devise}`;
  }
}
