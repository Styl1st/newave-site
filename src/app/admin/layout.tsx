import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { IconGrid, IconImage, IconInbox, IconTag } from "@/components/Icons";

const NAV = [
  { href: "/admin", label: "Tableau de bord", Icon: IconGrid },
  { href: "/admin/posts", label: "Posts", Icon: IconImage },
  { href: "/admin/marques", label: "Marques", Icon: IconTag },
  { href: "/admin/candidatures", label: "Candidatures", Icon: IconInbox },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-10">
      <div className="glass mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto md:mx-0 md:flex-wrap [&::-webkit-scrollbar]:hidden">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[12.5px] font-bold text-white/82 transition hover:bg-white/14 hover:text-white active:scale-[.97]"
            >
              <Icon /> {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
            {profile.display_name ?? profile.email}
          </span>
          <form action="/auth/deconnexion" method="post">
            <button className="rounded-full border border-white/35 bg-white/8 px-4 py-2 text-[11.5px] font-bold text-white transition hover:border-white/60 hover:bg-white/18 active:scale-[.97]">
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}
