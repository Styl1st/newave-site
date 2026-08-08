import Link from "next/link";

export function StatusPill({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#2f7a4f]">
      Publié
    </span>
  ) : (
    <span className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#8a7bab]">
      Brouillon
    </span>
  );
}

export function ListRow({
  href,
  title,
  subtitle,
  status,
  thumb,
  action,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  status?: "draft" | "published";
  thumb?: string | null;
  /** Bouton facultatif, posé au bout de la ligne. */
  action?: React.ReactNode;
}) {
  return (
    /*
     * Toute la ligne mène à la fiche, mais un bouton posé dessus doit
     * garder son propre clic. Un <button> ne peut pas vivre dans un <a>
     * (le navigateur refuse cette imbrication, et React s'en plaint) :
     * le lien passe donc DERRIÈRE la ligne, en calque, et seul le
     * bouton reprend la main sur le curseur.
     */
    <div className="card-light relative flex items-center gap-4 p-4">
      <Link href={href} aria-label={title} data-calque="" className="absolute inset-0 z-2" />

      <div className="pointer-events-none relative z-3 flex w-full items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#e6dcfb]">
          {thumb && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">{title}</p>
          {subtitle && (
            <p className="m-0 mt-0.5 truncate text-[12px] font-semibold text-[#6a5a92]">{subtitle}</p>
          )}
        </div>
        {status && <StatusPill status={status} />}
        {action && <div className="pointer-events-auto shrink-0">{action}</div>}
        <span className="text-[18px] font-black text-[#3a2470]">→</span>
      </div>
    </div>
  );
}
