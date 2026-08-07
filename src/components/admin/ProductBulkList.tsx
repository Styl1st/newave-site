"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkProductAction } from "@/app/espace-marque/actions";
import { formatPrice, type Product } from "@/lib/types";
import { StatusPill } from "./ListRow";

/**
 * Liste des pièces avec sélection multiple.
 * Sert à publier une fournée entière après un import, sans ouvrir
 * chaque pièce une par une.
 */
export default function ProductBulkList({
  slug,
  products,
}: {
  slug: string;
  products: Product[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const drafts = useMemo(() => products.filter((p) => p.status === "draft"), [products]);
  const allSelected = selected.size === products.length && products.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(intent: "publish" | "draft" | "delete") {
    if (intent === "delete") {
      const ok = window.confirm(
        `Supprimer définitivement ${selected.size} pièce${selected.size > 1 ? "s" : ""} ? C'est irréversible.`
      );
      if (!ok) return;
    }

    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("intent", intent);
    selected.forEach((id) => formData.append("ids", id));

    startTransition(async () => {
      const res = await bulkProductAction(formData);
      if (!res.ok) {
        setNote(res.error ?? "L'action a échoué.");
        return;
      }
      setNote(null);
      setSelected(new Set());
      router.refresh();
    });
  }

  const barBtn =
    "rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.07em] transition disabled:opacity-50";

  return (
    <>
      {/* ---- barre de sélection ---- */}
      <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))
            }
            className="rounded-full border border-white/35 px-4 py-2 text-[12px] font-bold text-white/85 transition hover:bg-white/12"
          >
            {allSelected ? "Tout décocher" : "Tout cocher"}
          </button>

          {drafts.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set(drafts.map((p) => p.id)))}
              className="rounded-full border border-white/35 px-4 py-2 text-[12px] font-bold text-white/85 transition hover:bg-white/12"
            >
              Les {drafts.length} brouillons
            </button>
          )}

          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selected.size === 0 || pending}
            onClick={() => run("publish")}
            className={`${barBtn} bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] hover:shadow-[0_8px_20px_rgba(35,12,85,0.4)]`}
          >
            {pending ? "…" : "Publier"}
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || pending}
            onClick={() => run("draft")}
            className={`${barBtn} border border-white/35 text-white hover:bg-white/12`}
          >
            Brouillon
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || pending}
            onClick={() => run("delete")}
            className={`${barBtn} border border-white/25 text-white/70 hover:border-white/50 hover:text-white`}
          >
            Supprimer
          </button>
        </div>
      </div>

      {note && (
        <p className="glass m-0 mb-5 px-5 py-3 text-[13.5px] text-white">{note}</p>
      )}

      {/* ---- lignes ---- */}
      <div className="flex flex-col gap-3">
        {products.map((p) => {
          const checked = selected.has(p.id);
          const subtitle = [
            formatPrice(p.price_cents, p.currency),
            p.available ? null : "Épuisé",
            p.categories.join(", ") || null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={p.id}
              className={`card-light flex items-center gap-3 p-4 transition ${
                checked ? "ring-3 ring-white" : ""
              }`}
            >
              <div className="relative z-3 flex w-full items-center gap-4">
                <label className="flex shrink-0 cursor-pointer items-center p-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    aria-label={`Sélectionner ${p.name}`}
                    className="h-5 w-5 rounded-md accent-[#7b52e8]"
                  />
                </label>

                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#e6dcfb]">
                  {(p.images?.[0] ?? p.image_url) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.images?.[0] ?? p.image_url ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <Link
                  href={`/espace-marque/${slug}/pieces/${p.id}`}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">
                    {p.name}
                  </span>
                  {subtitle && (
                    <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#6a5a92]">
                      {subtitle}
                    </span>
                  )}
                </Link>

                <StatusPill status={p.status} />

                <Link
                  href={`/espace-marque/${slug}/pieces/${p.id}`}
                  aria-label={`Modifier ${p.name}`}
                  className="text-[18px] font-black text-[#3a2470]"
                >
                  →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
