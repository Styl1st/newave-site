import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Journal",
  description: "Portraits de marques, coulisses d'ateliers et regards sur la mode indépendante.",
};

export default async function JournalPage() {
  const articles = await getArticles();

  return (
    <div className="mx-auto w-full max-w-4xl px-[var(--pad)] py-12">
      <header className="rise mb-10">
        <p className="eyebrow m-0">Le journal</p>
        <h1 className="m-0 mt-2 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Articles
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Portraits, coulisses d&apos;ateliers, et ce qu&apos;on apprend en discutant
          avec ceux qui fabriquent.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {articles.map((a, i) => (
          <Link
            key={a.id}
            href={`/journal/${a.slug}`}
            className={`glass rise rise-${Math.min(i + 1, 4)} block p-6 transition hover:border-white/50 sm:p-8`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="eyebrow m-0">{a.reading_minutes} min de lecture</p>
              {a.published_at && (
                <p className="eyebrow m-0">
                  {new Date(a.published_at).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              )}
            </div>
            <h2 className="m-0 mt-3 text-[clamp(18px,4.4vw,23px)] font-extrabold leading-snug tracking-[-0.02em] text-white">
              {a.title}
            </h2>
            <p className="m-0 mt-2 text-[15px] leading-relaxed text-white/80">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
