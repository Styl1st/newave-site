import Link from "next/link";
import BarreAdmin from "@/components/admin/BarreAdmin";
import { requireAdmin } from "@/lib/auth";
import { compteDeLaPile } from "@/lib/admin-queries";
import {
  IconDrapeau,
  IconGrid,
  IconImage,
  IconInbox,
  IconTag,
  IconUser,
} from "@/components/Icons";

/*
 * La barre du haut reste, mais elle ne sert plus qu'au grand écran.
 *
 * Elle porte les six entrées sur un rang dès qu'il y a la place, et
 * c'est la bonne forme là où le pointeur est déjà en haut de l'écran.
 * En dessous de `lg`, elle s'enroulait sur deux rangs : deux rangs de
 * pastilles au-dessus de chaque page, à viser en haut d'un écran qu'on
 * tient par le bas. C'est `BarreAdmin` qui prend le relais, sous le
 * pouce. Les deux ne coexistent jamais.
 */
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
  /* Deux comptages en tête, sans aucune ligne transportée : voir
     `compteDeLaPile`. C'est ce qui rend le badge tenable sur toutes
     les pages de l'administration. */
  const pile = await compteDeLaPile();

  return (
    // Même raison que l'espace marque : on ne fait pas danser une
    // table de travail. Voir espace-marque/layout.tsx.
    //
    // ⚠️ CENT HUIT PIXELS EN BAS, ET CE N'EST PAS UNE MARGE DE CONFORT.
    // La pilule de navigation flotte au-dessus de la page : sans eux,
    // la dernière ligne de chaque liste se range dessous et devient
    // inatteignable. C'est le défaut le plus probable de cette forme,
    // et il ne se voit qu'en arrivant au bas d'une longue liste.
    <div
      data-no-reveal
      className="mx-auto w-full max-w-6xl px-[var(--pad)] pb-[108px] pt-6 sm:pt-9 lg:pb-9"
    >
      <div
        data-no-reveal
        className="glass mb-8 hidden flex-wrap items-center justify-between gap-4 p-4 sm:px-6 lg:flex"
      >
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

      <BarreAdmin pile={pile.total} qui={profile.display_name ?? profile.email ?? "administrateur"} />
    </div>
  );
}
