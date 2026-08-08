import Link from "next/link";

/**
 * Bandeau reserve a l'admin et aux gerants de la marque.
 * Il explique pourquoi la section "Les pieces" est absente, plutot que
 * de laisser croire que l'import n'a pas fonctionne.
 */
export default function CatalogueNotice({
  slug,
  brandName,
  brandPublished,
  insight,
}: {
  slug: string;
  brandName: string;
  brandPublished: boolean;
  insight: { total: number; published: number; drafts: number };
}) {
  const { total, published, drafts } = insight;

  // Tout va bien : rien a signaler.
  if (published > 0 && brandPublished) return null;

  let title: string;
  let body: string;

  if (total === 0) {
    title = "Aucune pièce enregistrée pour cette marque";
    body = `La base ne contient aucune pièce rattachée à ${brandName}. Si tu viens de faire un import, vérifie que tu étais bien sur l'espace de cette marque-ci.`;
  } else if (published === 0) {
    title = `${drafts} pièce${drafts > 1 ? "s" : ""} en brouillon, aucune publiée`;
    body =
      "L'import range toujours les pièces en brouillon pour que tu les relises. Elles n'apparaîtront ici qu'une fois publiées — le bouton « Publier » de l'onglet Pièces les passe toutes d'un coup.";
  } else if (!brandPublished) {
    title = "La marque elle-même est en brouillon";
    body = `${published} pièce${published > 1 ? "s sont publiées" : " est publiée"}, mais une fiche en brouillon n'affiche pas son catalogue. Passe la marque en « Publié » depuis l'administration.`;
  } else {
    return null;
  }

  return (
    <div className="glass mt-8 border-white/45 p-6">
      <p className="eyebrow m-0">Visible seulement par toi</p>
      <h2 className="m-0 mt-2 text-[16px] font-extrabold text-white">{title}</h2>
      <p className="m-0 mt-2 text-[14px] leading-relaxed text-white/82">{body}</p>

      <p className="m-0 mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
        {total} au total · {published} publiée{published > 1 ? "s" : ""} · {drafts} en brouillon
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/espace-marque/${slug}/pieces`} className="card-light px-5 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Gérer les pièces</span>
        </Link>
        <Link
          href={`/espace-marque/${slug}/import`}
          className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
        >
          Importer un catalogue
        </Link>
      </div>
    </div>
  );
}
