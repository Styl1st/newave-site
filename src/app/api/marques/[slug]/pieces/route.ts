import { NextResponse } from "next/server";
import { getBrand, getProductsByBrand } from "@/lib/queries";

/**
 * Les pieces d'une marque, pour l'apercu au survol dans l'annuaire.
 *
 * Charge a la demande plutot qu'avec la page : un annuaire de trente
 * marques n'a aucune raison de transporter des centaines de pieces
 * que personne ne regardera.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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
