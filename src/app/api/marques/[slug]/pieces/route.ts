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
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const brand = await getBrand(slug);
  if (!brand) return NextResponse.json({ error: "Marque introuvable" }, { status: 404 });

  const products = await getProductsByBrand(brand.id);

  /*
   * LE MODE LÉGER, POUR LE DÉFILÉ DES CARTES.
   *
   * L'annuaire affiche vingt-quatre marques, et chacune veut désormais
   * faire défiler ses pièces. Vingt-quatre appels qui renvoient prix,
   * disponibilité et remises pour n'en garder que les adresses d'images,
   * ce serait du gâchis à chaque affichage de la page.
   *
   * Surtout, cette réponse-là ne dépend de personne : ce sont des
   * photos publiques. Elle peut donc être gardée par le cache PARTAGÉ,
   * là où l'aperçu complet reste privé. Une marque n'interroge la base
   * qu'une fois toutes les cinq minutes pour tout le monde, au lieu
   * d'une fois par visiteur.
   */
  if (new URL(request.url).searchParams.get("images") === "1") {
    const images = products
      .map((p) => p.images?.[0] ?? p.image_url)
      .filter((u): u is string => Boolean(u));

    return NextResponse.json(
      {
        images: images.slice(0, 8),
        /*
         * LE TOTAL, PARCE QU'ON N'ENVOIE QU'UN ÉCHANTILLON.
         *
         * La ligne de marque de l'annuaire pose quatre vignettes et
         * écrit « +8 » sur la dernière. Sans ce nombre, elle ne pouvait
         * l'écrire qu'à partir des huit adresses reçues : une marque à
         * quarante pièces annonçait « +4 », c'est-à-dire moins que la
         * vérité, précisément là où le chiffre sert à donner envie
         * d'ouvrir.
         *
         * On compte les pièces MONTRABLES et non toutes les pièces :
         * c'est ce que le visiteur verra en cliquant, et promettre des
         * pièces sans photo serait promettre des cases vides.
         */
        total: images.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  }

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
