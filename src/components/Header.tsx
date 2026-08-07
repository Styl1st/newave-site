import Link from "next/link";
import { getProfile } from "@/lib/auth";

const NAV = [
  { href: "/marques", label: "Marques" },
  { href: "/posts", label: "Posts" },
];

export default async function Header() {
  const profile = await getProfile();

  const link =
    "rounded-full px-3 py-2 text-[12px] font-bold tracking-[0.06em] text-white/85 transition hover:bg-white/12 hover:text-white sm:px-3.5 sm:text-[13px]";

  return (
    <header className="relative z-10 w-full">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-[var(--pad)] py-6">
        <Link href="/" aria-label="Accueil NEWAVE SPHERE" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white.webp"
            alt="NEWAVE SPHERE"
            className="h-7 w-auto drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)] sm:h-8"
          />
        </Link>

        <nav className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={link}>
              {item.label}
            </Link>
          ))}

          {profile?.role === "admin" && (
            <Link href="/admin" className={`${link} !text-white`}>
              Admin
            </Link>
          )}

          {profile ? (
            <>
              <Link href="/espace-marque" className={link}>
                Espace marque
              </Link>
              <Link href="/favoris" className={link}>
                Favoris
              </Link>
            </>
          ) : (
            <Link href="/connexion" className={link}>
              Connexion
            </Link>
          )}

          <Link
            href="/candidature"
            className="ml-1 rounded-full border border-white/40 px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-white/12 sm:text-[13px]"
          >
            Proposer sa marque
          </Link>
        </nav>
      </div>
    </header>
  );
}
