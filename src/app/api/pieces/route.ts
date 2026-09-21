import { NextResponse } from "next/server";
import { lireUnePageDeVitrine, type FiltresVitrine } from "@/lib/queries";

/**
 * Une page de la vitrine, à la demande.
 *
 * C'est ce qui permet à `/pieces` de parcourir les vingt-six mille
 * pièces du site au lieu des douze cent trente qu'elle descendait
 * autrefois avec la page. La page rend elle-même la PREMIÈRE page —
 * pour que la grille soit là au premier coup d'œil et que les robots la
 * lisent — et cette route sert toutes les suivantes : « Charger 24 de
 * plus », un rayon coché, un prix resserré, un mot tapé.
 *
 * LA GRAINE VIENT DU NAVIGATEUR, ET CE N'EST PAS UN OUBLI. L'ordre
 * « au hasard » alterne les marques et doit rester le même d'une page à
 * la suivante, sinon une pièce sort deux fois et une autre jamais. La
 * page en tire une au chargement et la redonne à chaque appel. En
 * tirer une ici rendrait un ordre différent à chaque requête.
 *
 * Aucun cache partagé : chaque visite a sa graine, une réponse ne
 * servirait jamais deux fois. La base, elle, trie vingt-six mille
 * lignes en quelques dizaines de millisecondes.
 */
export const dynamic = "force-dynamic";

/** Le même plafond que la fonction SQL : personne ne demande plus. */
const MAX = 96;

function entier(v: string | null, defaut: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : defaut;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;

  /* Bornée comme la saisie du champ : une recherche s'écrit à la main,
     et quelques milliers de caractères collés dans l'adresse ne
     cherchent rien et débordent la ligne de requête. */
  const filtres: FiltresVitrine = {
    q: p.get("q")?.slice(0, 80) ?? "",
    rayons: p.getAll("rayon").slice(0, 12),
    marque: p.get("marque"),
    prixMin: p.has("prixMin") ? entier(p.get("prixMin"), 0) : null,
    prixMax: p.has("prixMax") ? entier(p.get("prixMax"), 0) : null,
    stock: p.get("stock") === "1",
    promo: p.get("promo") === "1",
    tri:
      p.get("tri") === "croissant"
        ? "croissant"
        : p.get("tri") === "decroissant"
          ? "decroissant"
          : "hasard",
  };

  const graine = p.get("graine")?.slice(0, 64) || "vitrine";
  const depuis = Math.max(entier(p.get("depuis"), 0), 0);
  const combien = Math.min(Math.max(entier(p.get("combien"), 24), 1), MAX);

  const page = await lireUnePageDeVitrine(graine, filtres, depuis, combien);

  /* Une lecture qui échoue n'est pas une liste vide : la grille doit
     pouvoir dire « ça n'a pas répondu » et proposer de réessayer,
     plutôt que d'annoncer un catalogue vide. */
  if (!page) {
    return NextResponse.json({ error: "Lecture impossible" }, { status: 503 });
  }

  return NextResponse.json(page, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
