import Link from "next/link";
import type { Brand } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";

export default function BrandCard({ brand }: { brand: Brand }) {
  const visual = brand.cover_url ?? brand.logo_url;

  return (
    <Link href={`/marques/${brand.slug}`} className="card-light group block overflow-hidden">
      <div className="relative z-3 flex h-full flex-col">
        {/* Le visuel donne le ton avant meme le clic. Sans image, on garde
            un aplat plutot qu'un trou : la grille reste alignee. */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]">
          {visual ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={visual}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[#a795c9]">
                {brand.name}
              </span>
            </div>
          )}

          {brand.featured && (
            <span className="badge absolute left-3 top-3">À la une</span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="m-0 truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
            {brand.name}
          </h3>
          <p className="m-0 mt-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
            {[brand.city, brand.country].filter(Boolean).join(" · ")}
          </p>

          <p className="m-0 mt-3 flex-1 text-[14px] leading-relaxed text-[#3a2c5e]">
            {brand.tagline}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {brand.categories.slice(0, 2).map((c) => (
              <span
                key={c}
                className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#4a3a78]"
              >
                {c}
              </span>
            ))}
            <span className="ml-auto text-[11px] font-bold text-[#6a5a92]">
              {PRICE_TIER_LABEL[brand.price_tier]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
