import { initiales } from "@/lib/forum";
import { teinteDe } from "@/lib/messages";

/**
 * La photo d'un membre, ou ses initiales sur une pastille de couleur.
 *
 * La couleur vient de son identifiant : la même personne garde la même
 * teinte partout, sans qu'on ait à la ranger nulle part. La photo, quand
 * il y en a une (`src`, déjà passée par `photoSure` à la lecture),
 * REMPLACE les initiales : un logo détouré (PNG transparent) les
 * laisserait voir à travers.
 *
 * Pour une annonce au nom d'une marque, on ne passe JAMAIS la photo de
 * la personne : elle trahirait qui se cache derrière la marque.
 */
export default function Avatar({
  id,
  nom,
  src = null,
  taille = 48,
  arrondi,
}: {
  id: string;
  nom: string | null;
  src?: string | null;
  taille?: number;
  /** Le rayon des coins, en pixels. Par défaut, proportionnel à la taille. */
  arrondi?: number;
}) {
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center overflow-hidden font-black text-[var(--color-ink)]"
      style={{
        background: teinteDe(id),
        width: taille,
        height: taille,
        borderRadius: arrondi ?? Math.round(taille * 0.3),
        fontSize: Math.round(taille * 0.3),
      }}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        initiales(nom)
      )}
    </span>
  );
}
