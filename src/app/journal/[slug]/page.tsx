import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article introuvable" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { title: article.title, description: article.excerpt, type: "article" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto w-full max-w-2xl px-[var(--pad)] py-12">
      <Link href="/journal" className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:text-white">
        ← Le journal
      </Link>

      <header className="rise mt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="eyebrow m-0">{article.reading_minutes} min de lecture</p>
          {article.published_at && (
            <p className="eyebrow m-0">
              {new Date(article.published_at).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
        </div>
        <h1 className="m-0 mt-3 text-[clamp(26px,6.4vw,40px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
          {article.title}
        </h1>
        <p className="m-0 mt-4 text-[clamp(15px,4vw,18px)] leading-relaxed text-white/86">
          {article.excerpt}
        </p>
      </header>

      <div className="glass rise rise-1 mt-8 p-6 sm:p-8">
        {article.body ? (
          <div className="whitespace-pre-line text-[16px] leading-[1.75] text-white/92">
            {article.body}
          </div>
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-white/70">
            Le corps de cet article se remplit depuis Supabase, colonne <code>body</code>.
          </p>
        )}
      </div>

      {article.brand_slug && (
        <Link href={`/marques/${article.brand_slug}`} className="card-light mt-6 flex items-center justify-between gap-4 px-6 py-5">
          <span className="relative z-3">
            <span className="block text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#6a5a92]">
              La marque de cet article
            </span>
            <span className="mt-1 block text-[15px] font-extrabold">Voir sa fiche</span>
          </span>
          <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
        </Link>
      )}
    </article>
  );
}
