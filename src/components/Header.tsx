import Link from "next/link";
import MobileMenu from "./MobileMenu";
import { getProfile } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/marques", label: "Marques" },
  { href: "/posts", label: "Posts" },
  { href: "/populaires", label: "Coups de cœur" },
  { href: "/a-propos", label: "À propos" },
  { href: "/candidature", label: "Proposer une marque" },
];

export default async function Header() {
  const profile = await getProfile();

  // Le menu déroulant reprend la navigation, plus tout ce qui dépend
  // de la session — inutile de l'empiler dans la barre du haut.
  const compte = profile
    ? {
        titre: profile.display_name ?? profile.email ?? "Mon compte",
        liens: [
          { href: "/compte", label: "Mon compte" },
          { href: "/favoris", label: "Mes favoris" },
          { href: "/espace-marque", label: "Espace marque" },
          ...(profile.role === "admin" ? [{ href: "/admin", label: "Administration" }] : []),
        ],
      }
    : {
        titre: "Ton compte",
        liens: [{ href: "/connexion", label: "Se connecter ou s'inscrire" }],
      };

  const link =
    "rounded-full px-3 py-2.5 text-[13px] font-bold text-white/85 transition hover:bg-white/14 hover:text-white active:scale-[.97]";

  return (
    <header className="relative z-10 w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-[var(--pad)] py-5 md:py-6">
        <Link href="/" aria-label="Accueil NEWAVE SPHERE" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white.webp"
            alt="NEWAVE SPHERE"
            className="h-7 w-auto drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)] sm:h-8"
          />
        </Link>

        {/* ---------- ordinateur ---------- */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* "À propos" n'apparaît qu'en grand : entre 768 et 1024 px
              la barre serait trop chargée, et c'est le lien le moins
              utile des quatre. */}
          {NAV.slice(0, 5).map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${link} ${i >= 3 ? "hidden lg:inline-block" : ""}`}
            >
              {item.label}
            </Link>
          ))}

          {profile?.role === "admin" && (
            <Link href="/admin" className={`${link} !text-white`}>
              Admin
            </Link>
          )}

          <Link
            href="/candidature"
            className="ml-1 rounded-full border border-white/40 bg-white/8 px-4 py-2.5 text-[13px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            Proposer une marque
          </Link>

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
        </nav>

        {/* ---------- mobile et tablette ---------- */}
        <div className="flex items-center gap-2 md:hidden">
          {profile && (
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-[14px] font-black text-[var(--color-ink)] active:scale-95"
            >
              {(profile.display_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </Link>
          )}
          <MobileMenu liens={NAV} compte={compte} />
        </div>
      </div>
    </header>
  );
}
