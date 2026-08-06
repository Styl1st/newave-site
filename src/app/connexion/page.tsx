import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi pour retrouver tes marques favorites.",
};

type Props = { searchParams: Promise<{ suite?: string }> };

export default async function ConnexionPage({ searchParams }: Props) {
  const { suite } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-[var(--pad)] py-16">
      <header className="rise mb-8 text-center">
        <p className="eyebrow m-0">Ton compte</p>
        <h1 className="m-0 mt-2 text-[clamp(26px,6.4vw,36px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Connexion
        </h1>
        <p className="m-0 mt-4 text-[14.5px] leading-relaxed text-white/82">
          Un compte sert à garder tes marques favorites. C&apos;est tout — on n&apos;envoie
          rien sans que tu le demandes.
        </p>
      </header>

      <div className="rise rise-1">
        <AuthForm suite={suite ?? "/"} />
      </div>
    </div>
  );
}
