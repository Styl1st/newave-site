import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, fingerprint } from "@/lib/gate";

export async function POST(request: NextRequest) {
  const gate = process.env.SITE_PASSWORD;
  const form = await request.formData();
  const given = String(form.get("password") ?? "");
  const suite = String(form.get("suite") ?? "/");

  // Le site n'est pas verrouille : rien a valider.
  if (!gate) return NextResponse.redirect(new URL("/", request.url), { status: 303 });

  if (given !== gate) {
    const url = new URL("/acces", request.url);
    url.searchParams.set("suite", suite);
    url.searchParams.set("erreur", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  // On ne renvoie pas vers une adresse absolue fournie par le
  // formulaire : ce serait une redirection ouverte.
  const safeSuite = suite.startsWith("/") && !suite.startsWith("//") ? suite : "/";

  const response = NextResponse.redirect(new URL(safeSuite, request.url), { status: 303 });
  response.cookies.set(GATE_COOKIE, await fingerprint(gate), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
