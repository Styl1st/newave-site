import Link from "next/link";

/**
 * Bandeau reserve a l'admin et aux gerants de la marque.
 * Il explique pourquoi la section "Les pieces" est absente, plutot que
 * de laisser croire que l'import n'a pas fonctionne.
 *
 * Il dit le geste qui debloque, et seulement un geste que celui qui lit
 * peut faire : un gerant ne publie pas sa page lui-meme, lui dire de
 * « passer la marque en Publie » l'envoyait chercher un bouton qu'il n'a
 * pas.
 */
export default function CatalogueNotice({
  slug,
  brandName,
  brandPublished,
  insight,
  voix = "gerant",
  peutPublier = false,
}: {
  slug: string;
  brandName: string;
  brandPublished: boolean;
  insight: { total: number; published: number; drafts: number };
  /** Les mots, comme dans `BarreGerant` : « mes pièces » ou « ses pièces ». */
  voix?: "gerant" | "administration";
  /** Seul un administrateur peut mettre la marque elle-même en ligne. */
  peutPublier?: boolean;
}) {
  const { total, published, drafts } = insight;
  const aMoi = voix !== "administration";

  // Tout va bien : rien a signaler.
  if (published > 0 && brandPublished) return null;

  let title: string;
  let body: string;

  if (total === 0) {
    title = "Aucune pièce enregistrée pour cette marque";
    body = `La base ne contient aucune pièce rattachée à ${brandName}. Si tu viens de faire un import, vérifie que tu étais bien sur l'espace de cette marque-ci.`;
  } else if (published === 0) {
    title = `${drafts} pièce${drafts > 1 ? "s" : ""} en brouillon, aucune en ligne`;
    body = `L'import range toujours les pièces en brouillon pour que tu les relises. Elles n'apparaîtront ici qu'une fois en ligne : dans ${aMoi ? "Mes pièces" : "Ses pièces"}, coche-les et choisis « Mettre en ligne ».`;
  } else if (!brandPublished) {
    title = aMoi ? "Ta page n'est pas encore en ligne" : "La marque elle-même est en brouillon";
    const enLigne = `${published} pièce${published > 1 ? "s sont en ligne" : " est en ligne"}`;
    body = peutPublier
      ? `${enLigne}, mais une fiche en brouillon n'affiche pas son catalogue. Passe la marque en « Publié » depuis la barre du haut.`
      : `${enLigne}. Elles s'afficheront avec ta page, dès que la rédaction l'aura relue et mise en ligne.`;
  } else {
    return null;
  }

  return (
    <div className="glass mt-8 border-white/45 p-6">
      <p className="eyebrow m-0">Visible seulement par toi</p>
      <h2 className="m-0 mt-2 text-[16px] font-extrabold text-white">{title}</h2>
      <p className="m-0 mt-2 text-[14px] leading-relaxed text-white/82">{body}</p>

      <p className="m-0 mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
        {total} au total · {published} en ligne · {drafts} en brouillon
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/espace-marque/${slug}/pieces`} className="card-light px-5 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">
            {aMoi ? "Mes pièces" : "Ses pièces"}
          </span>
        </Link>
        <Link
          href={`/espace-marque/${slug}/import`}
          className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
        >
          {aMoi ? "Importer depuis ma boutique" : "Importer depuis la boutique"}
        </Link>
      </div>
    </div>
  );
}
