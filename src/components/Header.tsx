import Link from "next/link";

const NAV = [
  { href: "/marques", label: "Marques" },
  { href: "/journal", label: "Journal" },
  { href: "/candidature", label: "Proposer sa marque" },
];

export default function Header() {
  return (
    <header className="relative z-10 w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-[var(--pad)] py-6">
        <Link href="/" aria-label="Accueil NEWAVE SPHERE" className="shrink-0">
          <img
            src="/brand/logo-white.webp"
            alt="NEWAVE SPHERE"
            className="h-7 w-auto drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)] sm:h-8"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-[12px] font-bold tracking-[0.06em] text-white/85 transition hover:bg-white/12 hover:text-white sm:px-4 sm:text-[13px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
