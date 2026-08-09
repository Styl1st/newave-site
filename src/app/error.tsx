"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Filet de securite : si une page casse, le visiteur voit ceci plutot
 * que l'ecran d'erreur brut de Next.js.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[newave] erreur non rattrapée :", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-[var(--pad)] py-24 text-center">
      <p className="eyebrow m-0">Incident</p>
      <h1 className="m-0 mt-3 text-[clamp(22px,5.1vw,33px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
        Quelque chose a lâché
      </h1>
      <p className="m-0 mt-4 text-[15px] leading-relaxed text-white/82">
        Ce n&apos;est pas de ton fait. Réessaie dans un instant. Et si ça persiste,
        écris-nous, on ira voir.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="card-light px-6 py-3.5">
          <span className="relative z-3 text-[14px] font-extrabold">Réessayer</span>
        </button>
        <Link
          href="/"
          className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-6 py-3.5 text-[14px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
        >
          Retour à l&apos;accueil
        </Link>
      </div>

      {error.digest && (
        <p className="m-0 mt-8 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Référence {error.digest}
        </p>
      )}
    </div>
  );
}
