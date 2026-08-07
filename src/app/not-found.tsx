import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-[var(--pad)] py-24 text-center">
      <p className="eyebrow m-0">Erreur 404</p>
      <h1 className="m-0 mt-3 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
        Cette page n&apos;existe pas
      </h1>
      <p className="m-0 mt-4 text-[15px] leading-relaxed text-white/82">
        L&apos;adresse est peut-être erronée, ou la page a été retirée. Ça arrive
        quand une marque nous quitte ou qu&apos;une pièce disparaît d&apos;un catalogue.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/marques" className="card-light px-6 py-3.5">
          <span className="relative z-3 text-[14px] font-extrabold">Voir les marques</span>
        </Link>
        <Link
          href="/"
          className="rounded-[var(--radius)] border border-white/40 px-6 py-3.5 text-[14px] font-extrabold text-white transition hover:bg-white/12"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
