"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { IconArrow } from "./Icons";
import type { Post } from "@/lib/types";

/**
 * Mosaïque de posts, façon mur de magazine.
 *
 * Des colonnes CSS plutôt qu'une grille : chaque visuel garde ses
 * proportions d'origine, donc les cartes n'ont pas la même hauteur et
 * les lignes ne s'alignent jamais. C'est ce décalage qui fait le rendu
 * « pas rangé » — il vient des images elles-mêmes, pas d'un désordre
 * simulé qui se répéterait à l'identique.
 */
export default function PostMosaic({ posts }: { posts: Post[] }) {
  const [keyword, setKeyword] = useState<string | null>(null);

  const keywords = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.keywords))).sort(),
    [posts]
  );

  const results = useMemo(
    () => (keyword ? posts.filter((p) => p.keywords.includes(keyword)) : posts),
    [posts, keyword]
  );

  const chip =
    "rounded-full px-3.5 py-2 text-[11.5px] font-bold uppercase tracking-[0.07em] transition active:scale-[.97]";
  const off = "bg-white/12 text-white/80 hover:bg-white/22 hover:text-white";
  const on = "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]";

  return (
    <>
      {keywords.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button onClick={() => setKeyword(null)} className={`${chip} ${keyword === null ? on : off}`}>
            Tout
          </button>
          {keywords.map((k) => (
            <button key={k} onClick={() => setKeyword(k)} className={`${chip} ${keyword === k ? on : off}`}>
              {k}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Aucun post pour ce mot-clé.</p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {results.map((post, i) => (
            <MosaicCard key={post.id} post={post} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

function MosaicCard({ post, index }: { post: Post; index: number }) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  const cover = post.video_poster ?? post.images?.[0] ?? post.image_url;
  const extra = Math.max((post.images?.length ?? 0) - 1, 0);

  // Un léger décalage vertical, une carte sur trois. Assez pour casser
  // l'alignement, trop discret pour ressembler à un bug.
  const offset = index % 3 === 1 ? "lg:mt-6" : index % 3 === 2 ? "lg:mt-3" : "";

  function play() {
    setPlaying(true);
    // Le rendu se fait avant que la ref existe : on attend une frame.
    requestAnimationFrame(() => video.current?.play());
  }

  return (
    <article className={`card-light break-inside-avoid overflow-hidden ${offset}`}>
      <div className="relative z-3">
        <div className="relative w-full overflow-hidden bg-[#e6dcfb]">
          {post.video_url && playing ? (
            <video
              ref={video}
              src={post.video_url}
              poster={cover ?? undefined}
              controls
              playsInline
              className="block w-full"
            />
          ) : (
            <Link href={`/posts/${post.slug}`} className="group block">
              {cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cover}
                  alt={post.image_alt || post.title}
                  loading="lazy"
                  className="block w-full transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex aspect-4/5 w-full items-center justify-center">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7bab]">
                    Visuel à venir
                  </span>
                </div>
              )}

              {extra > 0 && !post.video_url && (
                <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10.5px] font-black text-white backdrop-blur-sm">
                  +{extra}
                </span>
              )}
            </Link>
          )}

          {/* La lecture se fait sur place : personne n'est renvoyé
              vers Instagram pour regarder une vidéo qu'on héberge. */}
          {post.video_url && !playing && (
            <button
              type="button"
              onClick={play}
              aria-label={`Lire la vidéo : ${post.title}`}
              className="absolute inset-0 grid place-items-center bg-black/15 transition hover:bg-black/25"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/92 shadow-[0_8px_24px_rgba(20,8,50,0.4)] transition hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-[var(--color-ink)]" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <div className="p-5">
          {post.brand && (
            <Link
              href={`/marques/${post.brand.slug}`}
              className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92] transition hover:text-[var(--color-ink)]"
            >
              {post.brand.name}
            </Link>
          )}

          <Link href={`/posts/${post.slug}`}>
            <h3 className="m-0 mt-1.5 text-[15.5px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-ink)]">
              {post.title}
            </h3>
          </Link>

          {post.caption && (
            <p className="m-0 mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-[#4a3a78]">
              {post.caption}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {post.keywords.slice(0, 2).map((k) => (
              <span
                key={k}
                className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#4a3a78]"
              >
                {k}
              </span>
            ))}
            <Link
              href={`/posts/${post.slug}`}
              aria-label={`Lire ${post.title}`}
              className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-[rgba(23,10,51,0.07)] text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.15)]"
            >
              <IconArrow className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
