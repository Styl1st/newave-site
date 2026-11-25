import { NextResponse } from "next/server";
import { getBrands } from "@/lib/queries";
import type { MarqueTrouvee } from "@/lib/types";

/**
 * TOUTES LES MARQUES, EN UNE PETITE LISTE, POUR LA RECHERCHE.
 *
 * Le panneau de suggestions attendait la base à chaque frappe pour
 * proposer des marques : trois secondes avant le moindre résultat, alors
 * que les marques tiennent en une quinzaine de kilo-octets. Le navigateur
 * descend cette liste une fois, à la première lettre tapée, et filtre
 * ensuite sur place : les marques s'affichent à la frappe. La base ne sert
 * plus qu'aux pièces.
 *
 * Gardée dix minutes par le navigateur, une heure par le CDN : une marque
 * publiée dans l'heure n'est pas une urgence pour une liste de
 * suggestions.
 */
export async function GET() {
  const marques: MarqueTrouvee[] = (await getBrands()).map((b) => ({
    slug: b.slug,
    name: b.name,
    ville: [b.city, b.country].filter(Boolean).join(" · "),
    categorie: b.categories?.[0] ?? null,
    visuel: b.logo_url ?? b.cover_url,
  }));

  return NextResponse.json(
    { marques },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
