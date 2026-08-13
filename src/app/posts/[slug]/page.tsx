import type { Metadata } from "next";
import TexteRiche from "@/components/TexteRiche";
import Link from "next/link";
import { notFound } from "next/navigation";
import Carousel from "@/components/Carousel";
import { getPost } from "@/lib/queries";
import BackLink from "@/components/BackLink";

type Props = { params: Promise<{ slug: string }> };

/**
 * Rendue a la demande : un post publie depuis /admin doit apparaitre
 * tout de suite, sans attendre un redeploiement.
 */
export const dynamic = "force-dynamic";

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
      images: post.images?.[0] ?? post.image_url ?? undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const images = post.images?.length ? post.images : post.image_url ? [post.image_url] : [];

  return (
    <article className="mx-auto w-full max-w-3xl px-[var(--pad)] py-7 sm:py-11">
      <BackLink href="/posts">Tous les posts</BackLink>

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
        <h1 className="m-0 mt-3 text-[clamp(22px,5.1vw,34px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
          {post.title}
        </h1>
      </header>

      {/* La vidéo passe avant les images : c'est elle qu'on est venu
          voir, et elle se lit ici plutôt que sur Instagram. */}
      {post.video_url && (
        <div className="card-light rise rise-1 mt-8 overflow-hidden">
          <div className="relative z-3">
            <video
              src={post.video_url}
              poster={post.video_poster ?? post.images?.[0] ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="block w-full"
            />
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="card-light rise rise-1 mt-6 overflow-hidden">
          <div className="relative z-3">
            <Carousel images={images} alt={post.image_alt || post.title} />
          </div>
        </div>
      )}

      {post.caption && (
        <div className="glass rise rise-2 mt-6 p-4 sm:p-7">
          <p className="m-0 text-[16px] leading-[1.7] text-white/92">
            <TexteRiche texte={post.caption} />
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
            className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-6 py-3.5 text-center text-[13.5px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            Voir sur Instagram
          </a>
        )}
        {post.tiktok_url && (
          <a
            href={post.tiktok_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-6 py-3.5 text-center text-[13.5px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
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
