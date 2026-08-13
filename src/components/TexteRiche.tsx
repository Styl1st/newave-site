import { Fragment } from "react";

/**
 * Un texte libre, avec le gras et l'italique de la mise en forme
 * courante — celle qu'on tape sans y penser dans un message.
 *
 *   **gras**   *italique*   _italique_
 *
 * Trois partis pris.
 *
 * ON NE PASSE PAS PAR DU HTML. Ces textes viennent des marques, donc
 * de l'extérieur, et les insérer comme du HTML reviendrait à laisser
 * n'importe qui exécuter ce qu'il veut sur la page de quelqu'un
 * d'autre. On découpe la chaîne et on rend de vrais éléments React :
 * ce qui n'est pas reconnu reste du texte, toujours.
 *
 * ON RESTE VOLONTAIREMENT PAUVRE. Pas de titres, pas de listes, pas de
 * liens. Une description de marque n'est pas un article, et un jeu de
 * mise en forme complet finirait par produire des fiches qui ne se
 * ressemblent plus.
 *
 * ET ON NE CASSE RIEN. Un texte sans aucune étoile ressort identique à
 * lui-même, retours à la ligne compris — c'est le cas de presque tout
 * ce qui est déjà en base.
 */

/** Le gras d'abord : sinon `**mot**` serait lu comme deux italiques. */
const DECOUPE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;

function ligne(texte: string, cle: string) {
  return texte.split(DECOUPE).map((morceau, i) => {
    const k = `${cle}-${i}`;

    if (morceau.startsWith("**") && morceau.endsWith("**") && morceau.length > 4) {
      return (
        <strong key={k} className="font-extrabold text-white">
          {morceau.slice(2, -2)}
        </strong>
      );
    }
    if (
      (morceau.startsWith("*") && morceau.endsWith("*") && morceau.length > 2) ||
      (morceau.startsWith("_") && morceau.endsWith("_") && morceau.length > 2)
    ) {
      return <em key={k}>{morceau.slice(1, -1)}</em>;
    }
    return <Fragment key={k}>{morceau}</Fragment>;
  });
}

export default function TexteRiche({
  texte,
  className = "",
}: {
  texte: string | null | undefined;
  className?: string;
}) {
  if (!texte) return null;

  /*
   * Les retours à la ligne sont rendus par des <br> plutôt que laissés
   * à `white-space: pre-line`. La raison est le gras : une balise
   * ouverte sur une ligne et fermée sur la suivante n'a pas de sens, et
   * découper ligne par ligne garantit qu'une étoile oubliée n'emporte
   * pas la mise en forme de tout le paragraphe.
   */
  const lignes = texte.split("\n");

  return (
    <span className={className}>
      {lignes.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {ligne(l, String(i))}
        </Fragment>
      ))}
    </span>
  );
}
