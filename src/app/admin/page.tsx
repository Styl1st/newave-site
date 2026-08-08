import Link from "next/link";
import { IconImage, IconInbox, IconPlus, IconTag } from "@/components/Icons";
import { adminCounts } from "@/lib/admin-queries";

export default async function AdminHome() {
  const c = await adminCounts();

  const cards = [
    { href: "/admin/posts", label: "Posts", value: c.posts, note: c.postsDraft ? `${c.postsDraft} en brouillon` : "tous publiés", Icon: IconImage },
    { href: "/admin/marques", label: "Marques", value: c.brands, note: c.brandsDraft ? `${c.brandsDraft} en brouillon` : "toutes publiées", Icon: IconTag },
    { href: "/admin/candidatures", label: "Candidatures", value: c.applications, note: c.applicationsNew ? `${c.applicationsNew} à traiter` : "rien de nouveau", Icon: IconInbox },
  ];

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow m-0">Administration</p>
        <h1 className="m-0 mt-2 text-[clamp(26px,6vw,38px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Tableau de bord
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="card-light p-6">
            <div className="relative z-3">
              <p className="m-0 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92]">
                <card.Icon /> {card.label}
              </p>
              <p className="m-0 mt-2 text-[34px] font-black leading-none text-[var(--color-ink)]">
                {card.value}
              </p>
              <p className="m-0 mt-2 text-[12px] font-semibold text-[#6a5a92]">{card.note}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="glass mt-8 p-6 sm:p-8">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Actions rapides</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin/posts/nouveau" className="card-light px-5 py-3">
            <span className="relative z-3 flex items-center gap-2 text-[13.5px] font-extrabold">
              <IconPlus /> Nouveau post
            </span>
          </Link>
          <Link href="/admin/marques/nouveau" className="card-light px-5 py-3">
            <span className="relative z-3 flex items-center gap-2 text-[13.5px] font-extrabold">
              <IconPlus /> Nouvelle marque
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
