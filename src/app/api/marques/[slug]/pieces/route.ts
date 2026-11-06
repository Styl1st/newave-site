import { NextResponse } from "next/server";
import { getBrand, getProductsByBrand } from "@/lib/queries";
import { apercuDeMarque, MarqueIntrouvable } from "@/lib/apercus";

/**
 * Les pieces d'une marque, pour l'apercu au survol dans l'annuaire.
 *
 * Charge a la demande plutot qu'avec la page : un annuaire de trente
 * marques n'a aucune raison de transporter des centaines de pieces
 * que personne ne regardera.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  /*
   * LE MODE LÉGER, POUR LES LIGNES ET LES CARTES DE L'ANNUAIRE.
   *
   * Huit photos et un compte, lus à part : voir `apercuDeMarque`. Il
   * passait avant par la lecture complète du catalogue, ce qui coûtait
   * plusieurs mégaoctets pour les grosses marques.
   *
   * Cette réponse ne dépend de personne : ce sont des photos publiques.
   * Elle est donc gardée par le cache PARTAGÉ (cinq minutes) et, une
   * minute, par le navigateur lui-même.
   *
   * LE TOTAL, PARCE QU'ON N'ENVOIE QU'UN ÉCHANTILLON. La ligne de marque
   * pose quatre vignettes et écrit « +8 » sur la dernière ; sans ce
   * nombre, une marque à quarante pièces annonçait « +4 ».
   */
  if (new URL(request.url).searchParams.get("images") === "1") {
    try {
      const apercu = await apercuDeMarque(slug);
      return NextResponse.json(apercu, {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        },
      });
    } catch (e) {
      if (e instanceof MarqueIntrouvable) {
        return NextResponse.json({ error: "Marque introuvable" }, { status: 404 });
      }
      console.error("[newave] aperçu de marque :", e);
      return NextResponse.json({ error: "Aperçu indisponible" }, { status: 503 });
    }
  }

  const brand = await getBrand(slug);
  if (!brand) return NextResponse.json({ error: "Marque introuvable" }, { status: 404 });

  const products = await getProductsByBrand(brand.id);

  return NextResponse.json(
    {
      brand: { name: brand.name, slug: brand.slug, tagline: brand.tagline },
      total: products.length,
      // Un apercu, pas un catalogue : au-dela de douze on renvoie
      // vers la fiche complete.
      products: products.slice(0, 12).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price_cents: p.price_cents,
        compare_at_cents: p.compare_at_cents,
        currency: p.currency,
        available: p.available,
        image: p.images?.[0] ?? p.image_url,
      })),
    },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
