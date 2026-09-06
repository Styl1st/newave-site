import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Pages qu'on ne compte pas : ton propre travail n'est pas du trafic. */
const IGNORE = ["/admin", "/espace-marque", "/acces", "/api", "/compte", "/reinitialisation"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  /*
   * UN 204 NE PORTE PAS DE CORPS, ET LE NAVIGATEUR REFUSE QU'ON LUI EN
   * DONNE UN.
   *
   * `NextResponse.json` en écrit toujours un : sur Node 22, le
   * constructeur `Response` rejette la combinaison — « Invalid response
   * status code 204 » — et la route répond 500. Elle le faisait à chaque
   * chargement de page, dès que la base n'est pas configurée, c'est-à-dire
   * exactement pendant qu'on travaille le design en local. Une sonde de
   * fréquentation qui tombe en panne blanche pour dire « je n'ai rien à
   * compter » est le contraire de ce qu'on lui demande.
   *
   * En production la branche n'est jamais prise, puisque Supabase est
   * configuré : d'où un bogue qui ne se voyait que dans la console de
   * développement.
   */
  if (!supabase) return new NextResponse(null, { status: 204 });

  let body: { path?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = String(body.path ?? "").slice(0, 300);
  if (!path.startsWith("/") || IGNORE.some((p) => path.startsWith(p))) {
    return NextResponse.json({ ok: true });
  }

  // On ne garde que le domaine de provenance : une URL complete peut
  // transporter des parametres qui identifient la personne.
  let source: string | null = null;
  const brut = String(body.source ?? "");
  if (brut) {
    try {
      const hote = new URL(brut).hostname.replace(/^www\./, "");
      if (hote && hote !== request.nextUrl.hostname) source = hote.slice(0, 120);
    } catch {
      source = null;
    }
  }

  await supabase.from("page_views").insert({ path, source });
  return NextResponse.json({ ok: true });
}
