"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { importCatalogueSelection } from "@/app/espace-marque/actions";
import { formatPrice } from "@/lib/types";
import { FIELD, Label } from "./fields";
import { cleLien, SOURCE_LABEL, type CatalogueItem, type Source } from "@/lib/catalogue-commun";

/**
 * Un gros catalogue affiché d'un bloc fait tousser le téléphone : des
 * centaines d'images demandées en même temps, et l'écran qui se fige.
 * On en montre une poignée, le reste à la demande.
 */
const PAR_PAGE = 18;

type Result = { ok: true; source: Source; items: CatalogueItem[] } | { ok: false; error: string } | null;

function SubmitCount({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="card-light px-7 py-3.5 disabled:opacity-50"
    >
      <span className="relative z-3 text-[14px] font-extrabold">
        {pending
          ? "Import en cours…"
          : count === 0
            ? "Sélectionne des pièces"
            : `Importer ${count} pièce${count > 1 ? "s" : ""}`}
      </span>
    </button>
  );
}

export default function CatalogueImport({
  slug,
  defaultShopUrl,
  result,
  alreadyImported,
}: {
  slug: string;
  defaultShopUrl: string;
  result: Result;
  alreadyImported: string[];
}) {
  const router = useRouter();
  const [analyse, lancerAnalyse] = useTransition();
  const [shopUrl, setShopUrl] = useState(defaultShopUrl);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [visibles, setVisibles] = useState(PAR_PAGE);

  const known = new Set(alreadyImported);

  /** Déjà chez la marque, que ce soit par identifiant ou par adresse. */
  function connue(item: CatalogueItem): boolean {
    return known.has(item.source_id) || known.has(cleLien(item.shop_url));
  }

  function toggle(id: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ---- adresse de la boutique ---- */}
      <div className="glass p-4 sm:p-7">
        <Label htmlFor="boutique" hint="shoparyes.fr, ou le lien direct d'une pièce. Les deux fonctionnent.">
          Adresse de ta boutique ou d&apos;une pièce
        </Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="boutique"
            className={FIELD}
            value={shopUrl}
            onChange={(e) => setShopUrl(e.target.value)}
            placeholder="https://tamarque.fr"
          />
          <button
            type="button"
            disabled={analyse || !shopUrl.trim()}
            onClick={() =>
              lancerAnalyse(() =>
                router.push(`/espace-marque/${slug}/import?boutique=${encodeURIComponent(shopUrl)}`)
              )
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[13px] bg-white px-6 py-3 text-[13.5px] font-extrabold text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.42)] active:scale-[.97] disabled:opacity-55"
          >
            {analyse ? (
              <>
                {/* Un anneau qui tourne : l'analyse peut prendre
                    plusieurs secondes quand on parcourt un plan de
                    site, et un bouton inerte laisserait croire que le
                    clic n'a pas pris. */}
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(23,10,51,0.25)] border-t-[var(--color-ink)]" />
                Analyse en cours…
              </>
            ) : (
              "Analyser"
            )}
          </button>
        </div>
      </div>

      {/* ---- analyse en cours ---- */}
      {analyse && (
        <div className="glass p-4 sm:p-7">
          <p className="m-0 mb-1 text-[14px] font-extrabold text-white">
            On lit {shopUrl.replace(/^https?:\/\//, "")}
          </p>
          <p className="m-0 mb-5 text-[13px] leading-relaxed text-white/65">
            On essaie Shopify, WooCommerce et Big Cartel, puis les données publiées
            pour Google, et enfin le plan du site. Cette dernière méthode va chercher
            les pages une par une, donc compte une dizaine de secondes.
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="skeleton aspect-square w-full" style={{ animationDelay: `${i * 110}ms` }} />
                <div className="skeleton h-3 w-3/4" style={{ animationDelay: `${i * 110 + 60}ms` }} />
                <div className="skeleton h-3 w-1/3" style={{ animationDelay: `${i * 110 + 120}ms` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- resultat ---- */}
      {!analyse && result && !result.ok && (
        <div className="glass p-6">
          <p className="m-0 text-[14.5px] leading-relaxed text-white/88">{result.error}</p>
        </div>
      )}

      {!analyse && result?.ok && result.items.length === 0 && (
        <div className="glass p-6">
          <p className="m-0 text-[14.5px] text-white/88">
            La boutique répond, mais son catalogue est vide.
          </p>
        </div>
      )}

      {!analyse && result?.ok && result.items.length > 0 && (
        <form
          action={async (formData: FormData) => {
            setError(null);
            const res = await importCatalogueSelection(formData);
            if (res && !res.ok) setError(res.error ?? "L'import a échoué.");
          }}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="shop_url" value={shopUrl} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
              {result.items.length} pièce{result.items.length > 1 ? "s" : ""} trouvée
              {result.items.length > 1 ? "s" : ""}
              <span className="ml-2 font-semibold normal-case tracking-normal text-white/45">
                via {SOURCE_LABEL[result.source]}
              </span>
            </p>
            <button
              type="button"
              onClick={() =>
                setChosen(
                  chosen.size === result.items.length
                    ? new Set()
                    : new Set(result.items.map((i) => i.source_id))
                )
              }
              className="rounded-full border border-white/35 px-4 py-1.5 text-[11.5px] font-bold text-white/85 transition hover:bg-white/12"
            >
              {chosen.size === result.items.length ? "Tout décocher" : "Tout cocher"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {result.items.slice(0, visibles).map((item, i) => {
              const selected = chosen.has(item.source_id);
              return (
                <label
                  key={item.source_id}
                  /* Une arrivée décalée : la grille se remplit au lieu
                     d'apparaître d'un bloc, ce qui donnait l'impression
                     que la page avait planté. */
                  style={{ animationDelay: `${Math.min((i % PAR_PAGE) * 35, 600)}ms` }}
                  className={`card-light arrive cursor-pointer overflow-hidden transition ${
                    selected ? "ring-3 ring-white" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    name="chosen"
                    value={item.source_id}
                    checked={selected}
                    onChange={() => toggle(item.source_id)}
                    className="sr-only"
                  />
                  <div className="relative z-3">
                    <div className="visuel relative aspect-square w-full overflow-hidden">
                      {item.images[0] && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.images[0]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {connue(item) && (
                        <span className="absolute left-2 top-2 rounded-full bg-[var(--color-ink)] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-white">
                          Déjà importée
                        </span>
                      )}
                      {selected && (
                        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-[14px] font-black text-[var(--color-ink)]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="m-0 truncate text-[12.5px] font-extrabold text-[var(--color-ink)]">
                        {item.name}
                      </p>
                      <p className="m-0 mt-0.5 text-[11.5px] font-bold text-[#6a5a92]">
                        {formatPrice(item.price_cents, item.currency) ?? "Prix variable"}
                        {!item.available && " · épuisée"}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {visibles < result.items.length && (
            <button
              type="button"
              onClick={() => setVisibles((n) => n + PAR_PAGE)}
              className="self-center rounded-full border border-white/35 px-6 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:bg-white/12 active:scale-[.97]"
            >
              Afficher {Math.min(PAR_PAGE, result.items.length - visibles)} pièces de plus
              <span className="ml-2 font-semibold text-white/50">
                {visibles} / {result.items.length}
              </span>
            </button>
          )}

          {error && (
            <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white">{error}</p>
          )}

          <p className="m-0 text-[13px] leading-relaxed text-white/62">
            Réimporter une pièce déjà présente la met à jour sans la dupliquer, et sans
            toucher au rayon ni à l&apos;état que tu lui as donnés. Les nouvelles pièces
            arrivent en brouillon : tu les passes en « publiée » quand elles te
            conviennent.
          </p>

          <SubmitCount count={chosen.size} />
        </form>
      )}
    </div>
  );
}
