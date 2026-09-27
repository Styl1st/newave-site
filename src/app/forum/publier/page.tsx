import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import FormulaireAnnonce from "@/components/forum/FormulaireAnnonce";
import { getMesMarques } from "@/lib/brand-space";
import { moiForum } from "@/lib/forum-queries";

export const metadata: Metadata = {
  title: "Publier une annonce · Forum",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function PublierPage() {
  const moi = await moiForum();
  if (!moi) redirect("/connexion?suite=/forum/publier");

  /* Les marques qu'on gère : on peut publier en leur nom (la base le
     vérifie à nouveau, voir la règle « publier une annonce »). */
  const marques = moi.pret ? await getMesMarques() : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <Link
        href="/forum"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-white/80 transition hover:text-white"
      >
        ← Forum
      </Link>
      <p className="eyebrow m-0">Nouvelle annonce</p>
      <h1 className="m-0 mt-2 mb-7 text-[clamp(26px,5vw,38px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-white">
        Qu&apos;est-ce que tu cherches ?
      </h1>

      {moi.pret ? (
        <FormulaireAnnonce moi={moi} marques={marques} />
      ) : (
        /* La migration 37 n'est pas passée : la table des annonces
           n'existe pas encore. On le dit plutôt que de laisser remplir
           un formulaire qui échouera à l'envoi. */
        <p className="glass m-0 px-5 py-6 text-[15px] leading-relaxed text-white/90">
          Le forum n&apos;est pas encore ouvert. Reviens très vite.
        </p>
      )}
    </div>
  );
}
