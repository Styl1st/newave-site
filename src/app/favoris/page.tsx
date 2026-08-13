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
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] leading-relaxed text-white/88">
            Rien pour l&apos;instant.{" "}
            <Link href="/marques" className="font-bold text-white underline underline-offset-2">
              Parcours l&apos;annuaire
            </Link>{" "}
            et mets de côté ce qui te parle.
          </p>
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
