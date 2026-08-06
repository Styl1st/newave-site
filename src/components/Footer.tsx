import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-24 w-full">
      <div className="mx-auto w-full max-w-6xl px-[var(--pad)] pb-12">
        <div className="flex flex-col items-center gap-5 border-t border-white/15 pt-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <img src="/brand/mark-white.webp" alt="" className="h-10 w-auto opacity-70" />
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
              © {new Date().getFullYear()} NEWAVE SPHERE
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold text-white/75">
            <a href="https://www.instagram.com/newave.sphere/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
              Instagram
            </a>
            <a href="https://www.tiktok.com/@newave.sphere" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
              TikTok
            </a>
            <a href="mailto:contact@newavesphere.fr" className="transition hover:text-white">
              contact@newavesphere.fr
            </a>
            <Link href="/mentions-legales" className="transition hover:text-white">
              Mentions légales
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
