import Link from "next/link";

export default function BrandSpaceNav({
  slug,
  name,
  isAdmin,
  published,
}: {
  slug: string;
  name: string;
  isAdmin: boolean;
  published: boolean;
}) {
  const link =
    "rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white/82 transition hover:bg-white/14 hover:text-white";

  return (
    <div className="glass mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-1">
        <Link href="/espace-marque" className={link}>← Mes marques</Link>
        <Link href={`/espace-marque/${slug}`} className={link}>Présentation</Link>
        <Link href={`/espace-marque/${slug}/pieces`} className={link}>Pièces</Link>
        <Link href={`/espace-marque/${slug}/import`} className={link}>Importer</Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
          {name}
        </span>
        {published ? (
          <Link
            href={`/marques/${slug}`}
            className="rounded-full border border-white/35 bg-white/8 px-4 py-2 text-[11.5px] font-bold text-white transition hover:border-white/60 hover:bg-white/18 active:scale-[.97]"
          >
            Voir la page
          </Link>
        ) : (
          <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-[11.5px] font-bold text-white/70">
            Pas encore publiée
          </span>
        )}
        {isAdmin && (
          <span className="rounded-full bg-white px-3 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)]">
            Admin
          </span>
        )}
      </div>
    </div>
  );
}
