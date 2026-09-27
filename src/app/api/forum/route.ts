import { NextResponse } from "next/server";
import { lireLeFil } from "@/lib/forum-queries";
import { estUneRubrique, estUnTri, LOT_FORUM, VILLES } from "@/lib/forum";

/**
 * Le fil du forum, par lots, pour le défilement et les filtres.
 *
 * Le premier lot est rendu par la page elle-même ; cette route sert
 * les suivants et chaque changement de filtre. Même contrat que
 * `/api/pieces` : une lecture ratée répond 503, jamais une liste vide,
 * pour que l'écran puisse dire « ça n'a pas répondu ».
 */

export const dynamic = "force-dynamic";

const MAX = 48;

function entier(v: string | null, defaut: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : defaut;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;

  const tri = p.get("tri");
  const rubrique = p.get("rubrique");
  const ville = p.get("ville");

  const page = await lireLeFil(
    {
      tri: estUnTri(tri) ? tri : "populaires",
      // Une ville hors liste ne filtre rien : un lien de travers doit
      // ouvrir le fil entier, pas un fil vide.
      ville: ville && VILLES.includes(ville) ? ville : null,
      rubrique: estUneRubrique(rubrique) ? rubrique : null,
      q: (p.get("q") ?? "").slice(0, 80),
    },
    Math.max(entier(p.get("depuis"), 0), 0),
    Math.min(Math.max(entier(p.get("combien"), LOT_FORUM), 1), MAX)
  );

  if (!page) return NextResponse.json({ error: "Lecture impossible" }, { status: 503 });

  return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store" } });
}
