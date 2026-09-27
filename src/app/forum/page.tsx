import type { Metadata } from "next";
import Link from "next/link";
import Fil from "@/components/forum/Fil";
import OngletsForum from "@/components/forum/OngletsForum";
import { lireLeFil, moiForum } from "@/lib/forum-queries";
import { estUneRubrique, estUnTri, VILLES, type FiltresForum } from "@/lib/forum";

export const metadata: Metadata = {
  title: "Le forum",
  description:
    "Castings, recherches de photographes, collabs, pop-ups et idées pour le site : les annonces de la communauté NEWAVE SPHERE.",
};

/*
 * Dynamique : le fil dit à chacun ce pour quoi il a déjà voté, et la
 * page dépend donc de la session.
 */
export const dynamic = "force-dynamic";

type Params = { tri?: string; ville?: string; rubrique?: string; q?: string };

export default async function ForumPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;

  /* Une valeur inconnue dans l'adresse est ignorée : un lien de travers
     ouvre le fil entier, pas un fil vide. */
  const filtres: FiltresForum = {
    tri: estUnTri(p.tri) ? p.tri : "populaires",
    ville: p.ville && VILLES.includes(p.ville) ? p.ville : null,
    rubrique: estUneRubrique(p.rubrique) ? p.rubrique : null,
    q: (p.q ?? "").slice(0, 80),
  };

  const [page, moi] = await Promise.all([lireLeFil(filtres), moiForum()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 pb-28 sm:py-11 md:pb-11">
      <header className="rise mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-8">
        <div className="min-w-0">
          <p className="eyebrow m-0">La communauté</p>
          <h1 className="m-0 mt-2 text-[clamp(28px,6vw,44px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-white">
            Le forum
          </h1>
          <p className="m-0 mt-3 max-w-2xl text-[15px] leading-relaxed text-white/84">
            Castings, collabs, pop-ups, idées pour le site. Les votes font l&apos;ordre, rien
            d&apos;autre.
          </p>
        </div>

        <Link
          href="/forum/publier"
          className="cta-barre hidden min-h-[44px] shrink-0 items-center rounded-full bg-white px-5 text-[13.5px] font-black text-[var(--color-ink)] shadow-[0_8px_24px_rgba(23,10,51,0.25)] transition active:scale-[.97] md:inline-flex"
        >
          + Publier une annonce
        </Link>
      </header>

      <Fil premierePage={page} filtresInitiaux={filtres} moiId={moi?.id ?? null} />

      {/* Au doigt, les quatre gestes du forum restent sous le pouce
          pendant qu'on descend le fil, « Publier » compris. */}
      <OngletsForum actif="forum" connecte={Boolean(moi)} handle={moi?.handle} />
    </div>
  );
}
