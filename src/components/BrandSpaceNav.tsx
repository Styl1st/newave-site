import Link from "next/link";

/**
 * La barre de l'espace marque.
 *
 * Trois destinations, et une seule action. La version précédente en
 * alignait cinq, dont « Importer », qui n'est pas un endroit où l'on
 * va mais quelque chose que l'on fait, et qui apparaissait déjà deux
 * fois sur la page des pièces. Un onglet doit répondre à « où
 * suis-je », pas à « que puis-je faire ».
 */
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
  const onglet =
    "rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white/82 transition hover:bg-white/14 hover:text-white";

  return (
    <div
      data-no-reveal
      className="glass mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-1">
        <Link href="/espace-marque" className={onglet} aria-label="Revenir à mes marques">
          ←
        </Link>
        {/* « Ma page » et non plus « Présentation » : la présentation
            se modifie désormais sur la page elle-même, dans un panneau.
            Cet onglet ramène donc là où l'on travaille vraiment. */}
        <Link href={`/marques/${slug}`} className={onglet}>
          Ma page
        </Link>
        <Link href={`/espace-marque/${slug}/pieces`} className={onglet}>
          Pièces
        </Link>
        <Link href={`/espace-marque/${slug}/stats`} className={onglet}>
          Statistiques
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
          {name}
        </span>
        {isAdmin && (
          <span className="rounded-full bg-white/16 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/80">
            Admin
          </span>
        )}
        {/* Publiée ou non, on peut toujours regarder : la seule
            différence est ce que dit le bouton. Une marque qui prépare
            sa page a justement besoin de la voir avant. */}
        <Link
          href={`/marques/${slug}`}
          className={
            published
              ? "rounded-full border border-white/35 bg-white/8 px-4 py-2 text-[11.5px] font-bold text-white transition hover:border-white/60 hover:bg-white/18 active:scale-[.97]"
              : "rounded-full bg-white px-4 py-2 text-[11.5px] font-black text-[var(--color-ink)] transition hover:shadow-[0_6px_18px_rgba(35,12,85,0.35)] active:scale-[.97]"
          }
        >
          {published ? "Voir ma page" : "Aperçu"}
        </Link>
      </div>
    </div>
  );
}
