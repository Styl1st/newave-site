import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sortie tracee vers une boutique.
 *
 * L'adresse de destination est lue EN BASE a partir d'un identifiant,
 * jamais prise dans l'URL : un parametre ?url= permettrait a n'importe
 * qui de faire pointer un lien newavesphere.fr vers n'importe ou, et
 * de se servir de ta credibilite pour du hameconnage.
 *
 * Le clic est enregistre dans outbound_clicks, ce qui donnera la
 * mesure de l'affiliation le jour venu.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const home = new URL("/", request.url);

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(home);

  let destination: string | null = null;
  let brandId: string | null = null;
  let productId: string | null = null;

  if (type === "piece") {
    const { data } = await supabase
      .from("products")
      .select("shop_url, brand_id")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    const row = data as { shop_url: string; brand_id: string } | null;
    if (row) {
      destination = row.shop_url;
      productId = id;
      brandId = row.brand_id;
    }
  } else if (type === "marque") {
    const { data } = await supabase
      .from("brands")
      .select("shop_url, website_url")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    const row = data as { shop_url: string | null; website_url: string | null } | null;
    if (row) {
      destination = row.shop_url ?? row.website_url;
      brandId = id;
    }
  }

  if (!destination) return NextResponse.redirect(home);

  // Dernier garde-fou : on ne redirige que vers du web public.
  let target: URL;
  try {
    target = new URL(destination);
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      return NextResponse.redirect(home);
    }
  } catch {
    return NextResponse.redirect(home);
  }

  // La mesure ne doit jamais retarder le visiteur : si l'ecriture
  // echoue, on redirige quand meme.
  try {
    await supabase.from("outbound_clicks").insert({
      brand_id: brandId,
      product_id: productId,
      referer: request.headers.get("referer"),
    });
  } catch {
    // sans effet
  }

  return NextResponse.redirect(target, { status: 302 });
}
