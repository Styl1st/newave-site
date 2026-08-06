import Link from "next/link";
import type { Post } from "@/lib/types";

export default function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/posts/${post.slug}`} className="card-light group block overflow-hidden">
      <div className="relative z-3">
        {/* Format 4:5, celui d'Instagram : tes visuels tombent juste. */}
        <div className="relative aspect-4/5 w-full overflow-hidden bg-[#e6dcfb]">
          {post.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={post.image_url}
              alt={post.image_alt || post.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7bab]">
                Visuel à venir
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          {post.brand && (
            <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92]">
              {post.brand.name}
            </p>
          )}
          <h3 className="m-0 mt-1.5 text-[15.5px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-ink)]">
            {post.title}
          </h3>
          {post.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#4a3a78]"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
