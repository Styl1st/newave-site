import { rubrique } from "@/lib/forum";

/**
 * La rubrique d'une annonce : un point de couleur et son nom.
 *
 * TROIS HABITS, UN SEUL OBJET.
 *   `photo`  : pastille blanche posée sur l'image, lisible sur n'importe
 *              quelle photo ;
 *   `carte`  : pastille lavande pâle, en tête d'une carte sans photo ;
 *   `texte`  : le point et le nom, sans fond, dans une ligne de
 *              métadonnées.
 *
 * Les couleurs sont celles de la palette du site. La crème d'« Idées
 * pour NEWAVE » est presque blanche : le point porte donc un fin liseré
 * pour rester visible sur fond clair.
 */
export default function PastilleRubrique({
  cle,
  habit = "photo",
  className = "",
}: {
  cle: string;
  habit?: "photo" | "carte" | "texte";
  className?: string;
}) {
  const r = rubrique(cle);

  const point = (
    <span
      aria-hidden
      className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
      style={{ background: r.couleur, boxShadow: "inset 0 0 0 1px rgba(23,10,51,.22)" }}
    />
  );

  if (habit === "texte") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-extrabold ${className}`}>
        {point}
        {r.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11px] font-extrabold leading-none text-[var(--color-ink)] ${
        habit === "photo"
          ? "bg-white shadow-[0_2px_10px_rgba(23,10,51,0.18)]"
          : "bg-[rgba(123,82,232,0.10)]"
      } ${className}`}
    >
      {point}
      {r.label}
    </span>
  );
}
