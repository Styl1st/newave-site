import type { Metadata } from "next";
import Link from "next/link";
import BrandCard from "@/components/BrandCard";
import { getFavoriteBrands } from "@/lib/favorites";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes favoris" };
export const dynamic = "force-dynamic";

export default async function FavorisPage() {
  const profile = await requireUser();
  const brands = await getFavoriteBrands();

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-12">
      <header className="rise mb-9">
        <p className="eyebrow m-0">{profile.display_name ?? profile.email}</p>
        <h1 className="m-0 mt-2 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </div>
      )}
    </div>
  );
}
