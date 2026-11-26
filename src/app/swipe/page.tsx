import type { Metadata } from "next";
import Swipe from "@/components/swipe/Swipe";

export const metadata: Metadata = {
  title: "Coup de foudre",
  description:
    "Les pièces des marques indépendantes, une à la fois. Garde ce qui te parle : la suite s'adapte, et te propose aussi d'autres idées.",
};

export default function SwipePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-6 sm:py-10">
      <header className="sw-entete">
        <p className="eyebrow rise m-0">Le swipe</p>
        <h1 className="pj-titre sw-titre rise rise-1 m-0 mt-3">
          Coup de <span className="ap-plein">foudre</span>
        </h1>
        <p className="rise rise-2 m-0 mt-4 max-w-xl text-[15px] leading-relaxed text-white/85">
          Une pièce à la fois. Garde ce qui te parle : la suite s&apos;adapte à tes goûts, et
          glisse de temps en temps autre chose pour te donner des idées.
        </p>
      </header>

      <div className="rise rise-3 mt-8 sm:mt-10">
        <Swipe />
      </div>
    </div>
  );
}
