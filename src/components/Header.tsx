import Link from "next/link";
import { getProfile } from "@/lib/auth";

const NAV = [
  { href: "/marques", label: "Marques" },
  { href: "/posts", label: "Posts" },
  { href: "/a-propos", label: "À propos" },
];

export default async function Header() {
  const profile = await getProfile();

  const link =
    "rounded-full px-3 py-2.5 text-[13px] font-bold text-white/85 transition hover:bg-white/14 hover:text-white active:scale-[.97]";

  return (
    <header className="relative z-10 w-full">
      {/* Sur mobile, le logo tient sa ligne et la navigation passe en
          dessous : entasser cinq liens a cote d'un logo donnait des
          cibles de 20 px, intouchables au doigt. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-[var(--pad)] py-5 md:flex-row md:items-center md:justify-between md:gap-6 md:py-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Accueil NEWAVE SPHERE" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-white.webp"
              alt="NEWAVE SPHERE"
              className="h-7 w-auto drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)] sm:h-8"
            />
          </Link>

          {/* Le compte reste accessible en haut a droite sur mobile. */}
          <div className="md:hidden">
            {profile ? (
              <Link
                href="/compte"
                aria-label="Mon compte"
                className="grid h-9 w-9 place-items-center rounded-full bg-white text-[13px] font-black text-[var(--color-ink)]"
              >
                {(profile.display_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="rounded-full border border-white/40 px-4 py-2 text-[12.5px] font-bold text-white"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto md:mx-0 md:justify-end [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`${link} shrink-0`}>
              {item.label}
            </Link>
          ))}

          {profile?.role === "admin" && (
            <Link href="/admin" className={`${link} shrink-0 !text-white`}>
              Admin
            </Link>
          )}

          <Link
            href="/candidature"
            className="shrink-0 rounded-full border border-white/40 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-white/14 active:scale-[.97]"
          >
            Proposer sa marque
          </Link>

          {/* Version bureau du compte : l'initiale plus le libelle. */}
          <div className="hidden md:block">
            {profile ? (
              <Link
                href="/compte"
                className="ml-1 flex items-center gap-2 rounded-full bg-white/12 py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-bold text-white transition hover:bg-white/22 active:scale-[.97]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[12px] font-black text-[var(--color-ink)]">
                  {(profile.display_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
                </span>
                Mon compte
              </Link>
            ) : (
              <Link href="/connexion" className={`${link} ml-1`}>
                Connexion
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
