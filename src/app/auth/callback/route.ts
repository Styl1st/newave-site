import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Point d'arrivee du lien de confirmation envoye par email. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const suite = searchParams.get("suite") ?? "/";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${suite}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
}
