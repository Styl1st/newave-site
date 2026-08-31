import { NextResponse } from "next/server";
import { rechercher } from "@/lib/queries";

/**
 * La recherche de l'annuaire : marques et pièces, dans la même réponse.
 *
 * POURQUOI UNE ROUTE ET PAS UN FILTRE DANS LA PAGE. Les marques sont
 * déjà toutes dans le navigateur — cent trente-six fiches, c'est peu — et
 * les chercher côté client ne coûte rien. Les PIÈCES, elles, sont plus
 * de mille deux cents : les envoyer avec la page pour que quelqu'un
 * tape peut-être trois lettres reviendrait à faire payer à tout le monde
 * un service dont presque personne ne se sert.
 *
 * ELLE EST GARDÉE PAR LE CACHE PARTAGÉ, et c'est ce qui la rend
 * supportable. La réponse ne dépend de personne — que des fiches
 * publiées — donc « pol » n'interroge la base qu'une fois pour tout le
 * monde. Deux minutes, plus une heure pendant laquelle on sert la
 * réponse un peu vieille en la rafraîchissant derrière : le temps de
 * frappe d'une recherche est de toute façon plus court que ça.
 */
export async function GET(requete: Request) {
  const q = new URL(requete.url).searchParams.get("q") ?? "";

  try {
    const resultat = await rechercher(q);
    return NextResponse.json(resultat, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=3600",
      },
    });
  } catch {
    /*
     * Une recherche qui échoue rend une réponse VIDE et non une erreur.
     * Le panneau de suggestions se referme alors tout seul, et la
     * personne continue de taper ; une erreur 500 y afficherait un
     * message rouge pour un service qui n'est qu'un raccourci.
     */
    return NextResponse.json(
      { marques: [], pieces: [], totalPieces: 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
