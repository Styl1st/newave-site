import Link from "next/link";
import type { Brand } from "@/lib/types";
import { PRICE_TIER_LABEL } from "@/lib/types";

export default function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link href={`/marques/${brand.slug}`} className="card-light group block p-5 sm:p-6">
      <div className="relative z-3 flex h-full flex-col">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--color-ink)]">
              {brand.name}
            </h3>
            <p className="m-0 mt-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              {[brand.city, brand.country].filter(Boolean).join(" · ")}
            </p>
          </div>
          {brand.featured && <span className="badge shrink-0">À la une</span>}
        </div>

        <p className="m-0 flex-1 text-[14px] leading-relaxed text-[#3a2c5e]">{brand.tagline}</p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {brand.categories.slice(0, 3).map((c) => (
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
    </Link>
  );
}
