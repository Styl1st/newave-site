import { NextResponse } from "next/server";
import { compterLeCatalogue } from "@/lib/queries";

/**
 * Les comptes du catalogue, pour la vitrine qui ne les a pas eus au rendu.
 *
 * `/pieces` les lit normalement au serveur, avec la page. Quand la base
 * n'a pas répondu à temps, la page part quand même — avec l'échantillon
 * et sans colonne de filtres — et c'est ici que `PieceDirectory` vient
 * les rechercher une fois montée. C'est la MÊME lecture, gardée cinq
 * minutes en mémoire : si elle a réussi entre-temps pour quelqu'un
 * d'autre, la réponse est immédiate.
 *
 * 503 quand la lecture échoue, et non un objet vide : le navigateur
 * doit savoir qu'il peut retenter.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const catalogue = await compterLeCatalogue();

  if (!catalogue) {
    return NextResponse.json(
      { error: "Lecture impossible" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(catalogue, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
