import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { phraseConnexion } from "@/lib/phrase-connexion";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connecte-toi pour retrouver les marques que tu suis, tes coups de cœur, le forum et tes messages.",
};

type Props = { searchParams: Promise<{ suite?: string }> };

export default async function ConnexionPage({ searchParams }: Props) {
  const { suite } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-[var(--pad)] py-9 sm:py-14">
      <header className="rise mb-8 text-center">
        <p className="eyebrow m-0">Ton compte</p>
        <h1 className="m-0 mt-2 text-[clamp(22px,5.1vw,31px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Connexion
        </h1>
        <p className="m-0 mt-4 text-[14.5px] leading-relaxed text-white/82">
          {/* La phrase reprend le geste qui a mené ici (publier, écrire,
              garder une marque). Voir `phraseConnexion`. */}
          {phraseConnexion(suite)} On n&apos;envoie rien sans que tu le demandes.
        </p>
      </header>

      <div className="rise rise-1">
        <AuthForm suite={suite ?? "/"} />
      </div>
    </div>
  );
}
