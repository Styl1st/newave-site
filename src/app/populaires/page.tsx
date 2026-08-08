import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getMostLiked, getMyLikes } from "@/lib/likes";

export const metadata: Metadata = {
  title: "Coups de cœur",
  description:
    "Les pièces les plus aimées par la communauté NEWAVE SPHERE, toutes marques confondues.",
};

export const dynamic = "force-dynamic";

export default async function PopulairesPage() {
  const classement = await getMostLiked(24);
  const myLikes = await getMyLikes(classement.map((c) => c.product.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-12">
      <header className="rise mb-9">
        <p className="eyebrow m-0">Le classement</p>
        <h1 className="m-0 mt-2 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Coups de cœur
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Les pièces que la communauté préfère en ce moment. Un coup de cœur compte
          <strong className="font-extrabold text-white"> pendant sept jours</strong>, puis
          s&apos;efface : une pièce doit mériter sa place chaque semaine. Rien ne s&apos;achète
          pour y figurer.
        </p>
      </header>

      {classement.length === 0 ? (
        <div className="glass rise rise-1 p-8 text-center">
          <p className="m-0 text-[15px] leading-relaxed text-white/85">
            Personne n&apos;a encore donné de coup de cœur.{" "}
            <Link href="/marques" className="font-bold text-white underline underline-offset-2">
              Parcours les marques
            </Link>{" "}
            et lance le mouvement.
          </p>
        </div>
      ) : (
        <div className="rise rise-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {classement.map(({ product, likes }, i) => (
            <div key={product.id} className="relative h-full">
              {/* Les trois premières places méritent d'être vues de loin. */}
              {i < 3 && (
                <span className="absolute -left-1 -top-1 z-20 grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.4)]">
                  {i + 1}
                </span>
              )}
              <ProductCard
                product={product}
                showBrand
                likes={{ count: likes, liked: myLikes.has(product.id) }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
