import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ReinitialisationPage() {
  return (
    <div className="mx-auto w-full max-w-md px-[var(--pad)] py-16">
      <header className="rise mb-8 text-center">
        <p className="eyebrow m-0">Ton compte</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,32px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Nouveau mot de passe
        </h1>
      </header>

      <div className="rise rise-1">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
