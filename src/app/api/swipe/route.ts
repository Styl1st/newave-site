import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { PRODUCT_CATEGORIES } from "@/lib/taxonomy";
import { premiereImage } from "@/lib/medias";
import { composerLaPile, profilSur, type Carte } from "@/lib/swipe";

/**
 * LA PILE SUIVANTE DU SWIPE.
 *
 * Le navigateur envoie son profil (quelques poids, voir `lib/swipe`) et
 * les pièces déjà vues ; on pioche deux cents pièces au hasard en base
 * (`pioche_de_pieces`, migration 55), on les classe avec ce profil, et
 * l'on rend seize cartes. Rien n'est gardé ici : le profil repart avec la
 * réponse, et la prochaine demande le renverra.
 */

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ligne = {
  id: string;
  slug: string | null;
  name: string;
  image_url: string | null;
  images: string[] | null;
  prix: number | null;
  currency: string | null;
  price_eur_cents: number | null;
  available: boolean | null;
  tags: string[] | null;
  couleurs: string[] | null;
  rayon: string | null;
  brand_slug: string;
  brand_name: string;
};

export async function POST(request: Request) {
  let corps: { profil?: unknown; exclus?: unknown } = {};
  try {
    corps = await request.json();
  } catch {
    // Un corps illisible vaut une première visite.
  }

  const profil = profilSur(corps.profil);
  const exclus = Array.isArray(corps.exclus)
    ? corps.exclus.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(-300)
    : [];

  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ cartes: [] });

  const { data, error } = await supabase.rpc("pioche_de_pieces", {
    p_taxonomie: [...PRODUCT_CATEGORIES],
    p_n: 200,
    p_exclus: exclus.length ? exclus : null,
  });

  if (error || !Array.isArray(data)) {
    if (error) console.error("[newave] pioche du swipe :", error.message);
    return NextResponse.json({ error: "Lecture impossible" }, { status: 503 });
  }

  const pioche: Carte[] = (data as Ligne[])
    .map((l) => {
      const images = (l.images ?? []).filter(Boolean);
      return {
        id: l.id,
        slug: l.slug,
        nom: l.name,
        image: premiereImage(images) ?? l.image_url,
        images,
        prix: l.prix,
        devise: l.price_eur_cents !== null ? "EUR" : (l.currency ?? "EUR"),
        disponible: l.available !== false,
        tags: l.tags ?? [],
        couleurs: l.couleurs ?? [],
        rayon: l.rayon,
        marque: l.brand_slug,
        marqueNom: l.brand_name,
      };
    })
    .filter((c) => c.image);

  return NextResponse.json(
    { cartes: composerLaPile(profil, pioche, 16) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
