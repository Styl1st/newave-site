import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accès",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ suite?: string; erreur?: string }> };

export default async function AccesPage({ searchParams }: Props) {
  const { suite, erreur } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-[var(--pad)] py-20">
      <div className="rise text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-white.webp"
          alt="NEWAVE SPHERE"
          className="mx-auto w-[min(60%,220px)] drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)]"
        />
        <p className="tagline mt-6 text-[clamp(10px,2.6vw,12px)] leading-[1.9]">
          Bientôt
        </p>
      </div>

      <form
        action="/api/acces"
        method="post"
        className="glass rise rise-1 mt-8 flex flex-col gap-5 p-4 sm:p-7"
      >
        <input type="hidden" name="suite" value={suite ?? "/"} />

        <div>
          <label htmlFor="password" className="eyebrow mb-2 block">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55"
            placeholder="••••••••"
          />
        </div>

        {erreur && (
          <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white">
            Mot de passe incorrect.
          </p>
        )}

        <button type="submit" className="card-light px-7 py-3.5">
          <span className="relative z-3 text-[14px] font-extrabold">Entrer</span>
        </button>

        <p className="m-0 text-[12.5px] leading-relaxed text-white/60">
          Le site est en cours de construction. Si tu cherches nos liens,
          rendez-vous sur{" "}
          <a
            href="https://newavesphere.fr"
            className="font-bold text-white underline underline-offset-2"
          >
            newavesphere.fr
          </a>
          .
        </p>
      </form>
    </div>
  );
}
