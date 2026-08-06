import type { Metadata } from "next";
import ApplicationForm from "@/components/ApplicationForm";

export const metadata: Metadata = {
  title: "Proposer sa marque",
  description:
    "Tu crées une marque indépendante ? Propose ton dossier à NEWAVE SPHERE. Gratuit, lu par un humain.",
};

export default function CandidaturePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--pad)] py-12">
      <header className="rise mb-9">
        <p className="eyebrow m-0">Candidature</p>
        <h1 className="m-0 mt-2 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Proposer sa marque
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          C&apos;est gratuit, et il n&apos;y a pas de commission à l&apos;entrée. On regarde le
          travail, pas le nombre d&apos;abonnés. Une seule condition : que ce soit vraiment le tien.
        </p>
      </header>

      <div className="rise rise-1">
        <ApplicationForm />
      </div>
    </div>
  );
}
