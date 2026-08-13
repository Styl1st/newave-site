import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { IconGrid, IconImage, IconInbox, IconTag, IconUser } from "@/components/Icons";

/** Le fanion de la modération : aucune icône existante ne convenait. */
function IconDrapeau() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V4" />
      <path d="M4 4h11l-1.6 3.5L15 11H4" />
    </svg>
  );
}

const NAV = [
  { href: "/admin", label: "Tableau de bord", Icon: IconGrid },
  { href: "/admin/posts", label: "Posts", Icon: IconImage },
  { href: "/admin/marques", label: "Marques", Icon: IconTag },
  { href: "/admin/candidatures", label: "Candidatures", Icon: IconInbox },
  { href: "/admin/signalements", label: "Signalements", Icon: IconDrapeau },
  { href: "/admin/utilisateurs", label: "Comptes", Icon: IconUser },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    // Même raison que l'espace marque : on ne fait pas danser une
    // table de travail. Voir espace-marque/layout.tsx.
    <div data-no-reveal className="mx-auto w-full max-w-6xl px-[var(--pad)] py-6 sm:py-9">
      <div data-no-reveal className="glass mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
        {/* Elle s'enroule, elle ne défile plus.
            Six entrées ne tiennent pas sur la largeur d'un téléphone :
            on les faisait glisser latéralement, ce qui veut dire que
            les deux dernières — dont les signalements — n'existaient
            pas pour qui ne pensait pas à balayer. Deux rangs visibles
            valent mieux qu'un rang caché. */}
        <nav className="flex flex-wrap items-center gap-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold text-white/82 transition hover:bg-white/14 hover:text-white active:scale-[.97] sm:px-3.5 sm:py-2.5 sm:text-[12.5px]"
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
