import type { Metadata } from "next";
import ProductGrid from "@/components/ProductGrid";
import { getProducts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Pièces",
  description:
    "Les pièces des marques indépendantes suivies par NEWAVE SPHERE, toutes marques confondues.",
};

export default async function PiecesPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-12">
      <header className="rise mb-9">
        <p className="eyebrow m-0">La sélection</p>
        <h1 className="m-0 mt-2 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Pièces
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Les pièces qu&apos;on a repérées, toutes marques confondues. L&apos;achat se fait
          directement chez la marque — on ne vend rien, on montre.
        </p>
      </header>

      <div className="rise rise-1">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
