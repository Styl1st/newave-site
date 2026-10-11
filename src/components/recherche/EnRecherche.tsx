/**
 * « Recherche de “denim”… », pendant que la réponse est en route.
 *
 * Sans cache, la recherche met deux à trois secondes : sans cette
 * ligne, on voyait les entrées « En ce moment » (ordinateur) ou
 * « Rien ne correspond » (téléphone), et l'on croyait la recherche
 * vide. `role="status"` le dit aussi aux lecteurs d'écran, sans
 * couper la frappe. La roue s'arrête si l'on a demandé moins
 * d'animations ; le texte suffit.
 */
export default function EnRecherche({ mot }: { mot: string }) {
  return (
    <p role="status" className="m-0 flex items-center gap-2.5 px-2 py-4 text-[13.5px] font-semibold text-white/85">
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white motion-reduce:animate-none"
      />
      Recherche de « {mot} »…
    </p>
  );
}
