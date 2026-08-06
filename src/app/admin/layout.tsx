import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/marques", label: "Marques" },
  { href: "/admin/pieces", label: "Pièces" },
  { href: "/admin/candidatures", label: "Candidatures" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-10">
      <div className="glass mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
        <nav className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white/82 transition hover:bg-white/14 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
            {profile.display_name ?? profile.email}
          </span>
          <form action="/auth/deconnexion" method="post">
            <button className="rounded-full border border-white/35 px-3.5 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-white/12">
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}
