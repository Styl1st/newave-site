import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post introuvable" };
  return {
    title: post.title,
    description: post.caption.slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.caption.slice(0, 160),
      images: post.image_url ? [post.image_url] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-[var(--pad)] py-12">
      <Link
        href="/posts"
        className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:text-white"
      >
        ← Tous les posts
      </Link>

      <header className="rise mt-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {post.brand && (
            <Link href={`/marques/${post.brand.slug}`} className="eyebrow m-0 hover:text-white">
              {post.brand.name}
            </Link>
          )}
          {post.published_at && (
            <p className="eyebrow m-0">
              {new Date(post.published_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <h1 className="m-0 mt-3 text-[clamp(26px,6.4vw,40px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
          {post.title}
        </h1>
      </header>

      {post.image_url && (
        <div className="card-light rise rise-1 mt-8 overflow-hidden">
          <div className="relative z-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt={post.image_alt || post.title}
              className="block w-full"
            />
          </div>
        </div>
      )}

      {post.caption && (
        <div className="glass rise rise-2 mt-6 p-6 sm:p-8">
          <p className="m-0 whitespace-pre-line text-[16px] leading-[1.7] text-white/92">
            {post.caption}
          </p>
        </div>
      )}

      {post.keywords.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {post.keywords.map((k) => (
            <span
              key={k}
              className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85"
            >
              {k}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {post.instagram_url && (
          <a
            href={post.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius)] border border-white/40 px-6 py-3.5 text-center text-[13.5px] font-extrabold text-white transition hover:bg-white/12"
          >
            Voir sur Instagram
          </a>
        )}
        {post.tiktok_url && (
          <a
            href={post.tiktok_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius)] border border-white/40 px-6 py-3.5 text-center text-[13.5px] font-extrabold text-white transition hover:bg-white/12"
          >
            Voir sur TikTok
          </a>
        )}
        {post.brand && (
          <Link href={`/marques/${post.brand.slug}`} className="card-light px-6 py-3.5 text-center">
            <span className="relative z-3 text-[13.5px] font-extrabold">
              La fiche de {post.brand.name}
            </span>
          </Link>
        )}
      </div>
    </article>
  );
}
