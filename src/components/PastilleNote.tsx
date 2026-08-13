/**
 * La note moyenne, posée sur un visuel de carte.
 *
 * Elle ne s'affiche JAMAIS sans son nombre d'avis. « 5 sur 5 » ne veut
 * rien dire tant qu'on ignore si c'est l'opinion d'une personne ou de
 * deux cents, et une marque notée une fois par son fondateur ne mérite
 * pas de paraître meilleure qu'une marque notée trente fois.
 *
 * La note est stockée en demi-étoiles, de 1 à 10 : la division par deux
 * appartient à l'affichage, et seulement à lui.
 */
export default function PastilleNote({
  moyenne,
  avis,
  className = "",
}: {
  /** De 1 à 10. */
  moyenne: number;
  avis: number;
  className?: string;
}) {
  if (!avis || moyenne <= 0) return null;

  const surCinq = moyenne / 2;
  // Un entier reste un entier : « 4 » se lit mieux que « 4,0 ».
  const texte = surCinq.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return (
    <span
      aria-label={`Noté ${texte} sur 5, ${avis} avis`}
      className={`inline-flex items-center gap-1 rounded-full bg-[rgba(18,6,46,0.62)] px-2.5 py-1 text-[11px] font-black text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24),0_4px_12px_-4px_rgba(10,3,34,0.7)] ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="currentColor">
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
      </svg>
      {texte}
      <span className="font-bold text-white/60">({avis})</span>
    </span>
  );
}
