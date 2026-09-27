import { initiales } from "@/lib/forum";
import { teinteDe } from "@/lib/messages";

/**
 * Les initiales d'une personne sur une pastille de couleur. La couleur
 * vient de son identifiant : la même personne garde la même teinte
 * d'une conversation à l'autre, sans qu'on ait à la ranger nulle part.
 */
export default function Avatar({
  id,
  nom,
  taille = 48,
}: {
  id: string;
  nom: string | null;
  taille?: number;
}) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[14px] font-black text-[var(--color-ink)]"
      style={{
        background: teinteDe(id),
        width: taille,
        height: taille,
        fontSize: Math.round(taille * 0.3),
      }}
    >
      {initiales(nom)}
    </span>
  );
}
