/**
 * L'attente d'une photo, posée JUSTE AVANT elle.
 *
 * Un aplat discret qui respire, à la taille du cadre. À placer
 * immédiatement avant l'image, dans le même cadre en
 * `position: relative`, et à donner à cette image `data-progressif` :
 * c'est ce voisinage direct que lit le CSS
 * (`.attente-visuel:has(+ img[data-charge])`) pour la retirer dès que
 * la photo est là.
 *
 * ELLE REMPLACE L'APERÇU FLOU, et ce n'est pas un recul. L'aperçu était
 * la même photo en trente-deux pixels, demandée au même hébergeur :
 * une requête de plus par image, qui arrivait à peine avant la vraie
 * et lui prenait sa place dans la file. On voyait donc trois états
 * (vide, flou, net) là où il n'en faut qu'un. Ici, rien ne voyage :
 * l'attente est dans la page, elle est là au premier affichage.
 *
 * Et on la voit rarement. Le script du <head> charge les photos avant
 * qu'elles n'entrent à l'écran (voir `lib/image-progressive`) : cet
 * aplat ne reste visible que sur une connexion lente ou un défilement
 * très rapide.
 *
 * Composant sans état ni effet : il se pose aussi bien dans une page
 * rendue par le serveur que dans un composant client.
 */
export default function AttentePhoto({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`attente-visuel pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
