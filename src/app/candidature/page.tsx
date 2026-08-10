import type { Metadata } from "next";
import ParcoursCandidature from "@/components/ParcoursCandidature";

export const metadata: Metadata = {
  title: "Proposer sa marque",
  description:
    "Tu crées une marque indépendante ? Propose ton dossier à NEWAVE SPHERE. Gratuit, lu par un humain, et un site internet n'est pas nécessaire.",
};

/** Lire le site d'une marque peut demander plusieurs secondes. */
export const maxDuration = 60;

export default function CandidaturePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-9">
        <p className="eyebrow m-0">Candidature</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Proposer sa marque
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          C&apos;est gratuit, et il n&apos;y a pas de commission à l&apos;entrée. On
          regarde le travail, pas le nombre d&apos;abonnés. Pas besoin d&apos;avoir un
          site : beaucoup de créateurs commencent sans, et ça n&apos;enlève rien à leurs
          pièces.
        </p>
      </header>

      <div className="rise rise-1">
        <ParcoursCandidature />
      </div>
    </div>
  );
}
