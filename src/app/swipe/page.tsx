import type { Metadata } from "next";
import Swipe from "@/components/swipe/Swipe";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Coup de foudre",
  description:
    "Les pièces des marques indépendantes, une à la fois. Garde ce qui te parle : la suite s'adapte, et te propose aussi d'autres idées.",
};

/**
 * Le swipe, en colonne : l'en-tête au-dessus, la carte au centre, les
 * gestes dessous. Rien sur les côtés, sur ordinateur comme au doigt.
 */
export default async function SwipePage() {
  const profil = await getProfile();

  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--pad)] py-4 sm:py-7">
      <header className="sw-entete">
        <p className="eyebrow rise m-0">Le swipe</p>
        <h1 className="pj-titre sw-titre rise rise-1 m-0 mt-2">
          Coup de <span className="ap-plein">foudre</span>
        </h1>
        <p className="rise rise-2 m-0 mt-3 text-[14.5px] leading-relaxed text-white/85">
          Une pièce à la fois. Garde ce qui te parle, la suite s&apos;adapte.
        </p>
      </header>

      <div className="rise rise-3 mt-5 sm:mt-6">
        <Swipe connecte={profil !== null} />
      </div>
    </div>
  );
}
