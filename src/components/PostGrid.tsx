"use client";

import { useMemo, useState } from "react";
import PostCard from "./PostCard";
import type { Post } from "@/lib/types";

/** Grille de posts avec filtre par mot-clé. */
export default function PostGrid({ posts }: { posts: Post[] }) {
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
    "rounded-full px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.07em] transition";
  const off = "bg-white/12 text-white/80 hover:bg-white/20 hover:text-white";
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </>
  );
}
