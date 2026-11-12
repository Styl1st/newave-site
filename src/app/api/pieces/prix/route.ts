import { NextResponse } from "next/server";
import { lireHistogrammeDeVitrine } from "@/lib/queries";

/**
 * La forme des prix de la vitrine : combien de pièces par tranche, pour
 * les filtres posés sauf le prix. Ce sont les barres au-dessus du rail
 * de prix de `/pieces`. Voir `lireHistogrammeDeVitrine`.
 *
 * Contrairement à une page de vitrine, la réponse ne dépend d'aucune
 * graine : deux visiteurs qui posent « Hauts, en M » demandent la même
 * chose. Elle se garde donc cinq minutes au bord du réseau.
 */
export const dynamic = "force-dynamic";

const TAILLES = ["XS", "S", "M", "L", "XL", "XXL"];

function entier(v: string | null, defaut: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : defaut;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;

  const formes = await lireHistogrammeDeVitrine(
    {
      q: p.get("q")?.slice(0, 80) ?? "",
      rayons: p.getAll("rayon").slice(0, 1),
      tags: p.getAll("tag").map((t) => t.slice(0, 60)).slice(0, 24),
      tailles: TAILLES.includes(p.get("taille") ?? "") ? [p.get("taille") as string] : [],
      marque: p.get("marque"),
      stock: p.get("stock") === "1",
      promo: p.get("promo") === "1",
    },
    Math.max(entier(p.get("bas"), 0), 0),
    Math.max(entier(p.get("pas"), 1250), 1),
    Math.min(Math.max(entier(p.get("tranches"), 24), 1), 60)
  );

  if (!formes) {
    return NextResponse.json({ error: "Lecture impossible" }, { status: 503 });
  }

  return NextResponse.json(
    { tranches: formes },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
