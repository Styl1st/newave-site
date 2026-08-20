import type { Metadata } from "next";
import Link from "next/link";
import BrandCard from "@/components/BrandCard";
import Grille from "@/components/Grille";
import { getFavoriteBrands } from "@/lib/favorites";
import { getNotesMarques } from "@/lib/avis";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes favoris" };
export const dynamic = "force-dynamic";

export default async function FavorisPage() {
  const profile = await requireUser();
  const brands = await getFavoriteBrands();
  const notes = await getNotesMarques(brands.map((b) => b.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-9">
        <p className="eyebrow m-0">{profile.display_name ?? profile.email}</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Mes favoris
        </h1>
      </header>

      {brands.length === 0 ? (
        /*
         * Une page vide avec un lien noyé dans une phrase, ça se lit
         * comme une impasse. On garde la page — y renvoyer
         * automatiquement vers l'annuaire priverait de tout repère
         * quelqu'un qui a cliqué exprès sur « Mes favoris » — mais on
         * en fait une invitation, avec un bouton qu'on voit.
         */
        <div className="glass flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <p className="m-0 max-w-md text-[15px] leading-relaxed text-white/88">
            Tu n&apos;as encore rien mis de côté. Le cœur, sur une carte de marque, la
            range ici. C&apos;est ta liste à toi, elle ne se voit nulle part ailleurs.
          </p>
          <Link href="/marques" className="card-light px-7 py-3.5">
            <span className="relative z-3 text-[14px] font-extrabold">
              Parcourir l&apos;annuaire
            </span>
          </Link>
        </div>
      ) : (
        <Grille variante="marques" memoire="favoris">
          {brands.map((b) => (
            <BrandCard key={b.id} brand={b} note={notes.get(b.id)} />
          ))}
        </Grille>
      )}
    </div>
  );
}
