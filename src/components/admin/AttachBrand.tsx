"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attachUserToBrand, detachUserFromBrand } from "@/app/admin/actions";
import { IconCheck, IconCross, IconPlus } from "@/components/Icons";
import { FIELD, Label } from "./fields";

type Option = { id: string; name: string; slug: string; status: string; visuel: string | null };

/**
 * Rattacher un compte à une marque, en la cherchant par son nom.
 *
 * La recherche se fait dans le navigateur : quelques dizaines de
 * marques tiennent en mémoire, et le résultat s'affiche à la frappe.
 * Le jour où l'annuaire en compte des milliers, il faudra passer par
 * une requête — pas avant.
 */
export default function AttachBrand({
  userId,
  disponibles,
  rattachees,
}: {
  userId: string;
  /** Marques auxquelles ce compte n'est pas encore rattaché. */
  disponibles: Option[];
  /** Marques déjà gérées, pour pouvoir retirer l'accès. */
  rattachees: Option[];
}) {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const resultats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return disponibles.slice(0, 6);
    return disponibles.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8);
  }, [disponibles, query]);

  function agir(brandId: string, sens: "attacher" | "detacher") {
    const formData = new FormData();
    formData.set("user_id", userId);
    formData.set("brand_id", brandId);

    startTransition(async () => {
      const res =
        sens === "attacher"
          ? await attachUserToBrand(formData)
          : await detachUserFromBrand(formData);

      setNote(
        res.ok
          ? { ok: true, text: res.message ?? "C'est fait." }
          : { ok: false, text: res.error ?? "L'opération a échoué." }
      );
      if (res.ok) setQuery("");
      router.refresh();
    });
  }

  return (
    <section className="glass mt-6 p-6 sm:p-8">
      <h2 className="m-0 text-[17px] font-extrabold text-white">Rattacher une marque</h2>
      <p className="m-0 mt-2 mb-5 text-[13.5px] leading-relaxed text-white/72">
        Ce compte pourra modifier la présentation et les pièces des marques rattachées.
        Il ne pourra ni les publier, ni les mettre à la une.
      </p>

      {/* ---- déjà rattachées ---- */}
      {rattachees.length > 0 && (
        <div className="mb-6">
          <p className="eyebrow m-0 mb-2.5">Accès en cours</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rattachees.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[13px] bg-white/10 px-4 py-2.5"
              >
                <span className="min-w-0 truncate text-[13.5px] font-bold text-white">
                  {b.name}
                  <span className="ml-2 text-[11.5px] font-semibold text-white/50">
                    {b.status === "published" ? "en ligne" : "brouillon"}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => agir(b.id, "detacher")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/8 px-3.5 py-1.5 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/20 hover:text-white disabled:opacity-40"
                >
                  <IconCross className="h-3.5 w-3.5" /> Retirer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- recherche ---- */}
      <Label htmlFor="recherche-marque" hint="Tape les premières lettres du nom.">
        Chercher une marque
      </Label>
      <input
        id="recherche-marque"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Engineered By Aryes…"
        className={FIELD}
      />

      {disponibles.length === 0 ? (
        <p className="m-0 mt-4 text-[13.5px] text-white/60">
          Ce compte est déjà rattaché à toutes les marques du site.
        </p>
      ) : (
        <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
          {resultats.length === 0 ? (
            <li className="text-[13.5px] text-white/60">Aucune marque ne correspond.</li>
          ) : (
            resultats.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => agir(b.id, "attacher")}
                  className="flex w-full items-center gap-3 rounded-[13px] bg-white/8 px-3 py-2.5 text-left transition hover:bg-white/18 disabled:opacity-40"
                >
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-[9px] bg-white/12">
                    {b.visuel && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={b.visuel} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-white">
                      {b.name}
                    </span>
                    <span className="block text-[11.5px] font-semibold text-white/50">
                      {b.status === "published" ? "en ligne" : "brouillon"}
                    </span>
                  </span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[var(--color-ink)]">
                    <IconPlus className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {!query && disponibles.length > 6 && (
        <p className="m-0 mt-3 text-[12px] text-white/45">
          {disponibles.length} marques disponibles — tape pour filtrer.
        </p>
      )}

      {note && (
        <p
          className={`m-0 mt-4 rounded-[13px] px-4 py-3 text-[13px] ${
            note.ok ? "bg-white/8 text-white/85" : "bg-white/14 text-white"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {note.ok && <IconCheck className="h-3.5 w-3.5" />}
            {note.text}
          </span>
        </p>
      )}
    </section>
  );
}
