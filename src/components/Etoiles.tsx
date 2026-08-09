/**
 * Cinq étoiles, remplies au demi-cran près.
 *
 * Une étoile à moitié pleine ne s'obtient pas en dessinant une demi-
 * étoile : la découpe tomberait au milieu d'une branche et se verrait.
 * On superpose donc deux rangées identiques, et on rogne la rangée
 * pleine à la largeur voulue. Le trait reste juste à n'importe quel
 * pourcentage, y compris ceux qu'on n'utilise pas.
 *
 * La note reçue est en demi-étoiles, de 1 à 10 : c'est ainsi qu'elle
 * est stockée, et la division par deux appartient à l'affichage.
 */

const TAILLES = {
  petite: "text-[13px]",
  normale: "text-[17px]",
  grande: "text-[26px]",
} as const;

export default function Etoiles({
  note,
  taille = "normale",
  className = "",
}: {
  /** De 1 à 10. 0 ou moins : aucune étoile allumée. */
  note: number;
  taille?: keyof typeof TAILLES;
  className?: string;
}) {
  const proportion = Math.max(0, Math.min(1, note / 10));
  const rangee = "★★★★★";

  return (
    <span
      className={`relative inline-block whitespace-nowrap leading-none ${TAILLES[taille]} ${className}`}
      aria-hidden="true"
    >
      <span className="text-white/25">{rangee}</span>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden text-[#f5c73c]"
        style={{ width: `${proportion * 100}%` }}
      >
        {rangee}
      </span>
    </span>
  );
}

/** « 4,5 » plutôt que « 4.5 » : on écrit en français. */
export function enEtoiles(note: number): string {
  return (note / 2).toFixed(1).replace(".", ",").replace(",0", "");
}
