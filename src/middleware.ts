import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, fingerprint, isOpenPath } from "@/lib/gate";

/**
 * Deux roles, dans cet ordre :
 *   1. le verrou d'acces, tant que le site est en test
 *   2. le rafraichissement du jeton Supabase, sans quoi une session
 *      expire au bout d'une heure et l'admin se retrouve deconnecte
 *      en pleine saisie
 */
export async function middleware(request: NextRequest) {
  const gate = process.env.SITE_PASSWORD;
  const path = request.nextUrl.pathname;

  if (gate && !isOpenPath(path)) {
    const given = request.cookies.get(GATE_COOKIE)?.value;
    const expected = await fingerprint(gate);

    if (given !== expected) {
      const url = request.nextUrl.clone();
      url.pathname = "/acces";
      url.search = "";
      url.searchParams.set("suite", path);
      return NextResponse.redirect(url);
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return withNoIndex(NextResponse.next(), Boolean(gate));

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();
  return withNoIndex(response, Boolean(gate));
}

/**
 * Ceinture et bretelles : meme derriere le mot de passe, on demande aux
 * moteurs de ne rien indexer. Une adresse partagee par megarde ne doit
 * pas se retrouver dans Google.
 */
function withNoIndex(response: NextResponse, gated: boolean): NextResponse {
  if (gated) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};
