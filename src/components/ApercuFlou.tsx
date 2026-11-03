import { apercuFlou } from "@/lib/vignette";

/**
 * L'aperçu flou d'une photo, posé JUSTE AVANT elle.
 *
 * À placer immédiatement avant l'image nette, dans le même cadre en
 * `position: relative`, et à donner à cette image `data-progressif` :
 * c'est ce voisinage direct que lit le CSS (`.apercu-flou:has(+ img
 * [data-charge])`) pour retirer l'aperçu une fois la photo arrivée.
 *
 * Il ne rend rien quand l'hébergeur ne sait pas réduire la photo (voir
 * `apercuFlou`) : l'image nette apparaît alors simplement en fondu, sur
 * le fond du cadre.
 *
 * Composant sans état ni effet : il se pose aussi bien dans une page
 * rendue par le serveur que dans un composant client.
 */
export default function ApercuFlou({
  src,
  prioritaire = false,
  className = "",
}: {
  src: string | null | undefined;
  /** Dans le premier écran : on ne le fait pas attendre. */
  prioritaire?: boolean;
  className?: string;
}) {
  const petite = apercuFlou(src);
  if (!petite) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={petite}
      alt=""
      aria-hidden="true"
      loading={prioritaire ? "eager" : "lazy"}
      decoding="async"
      className={`apercu-flou ${className}`}
    />
  );
}
