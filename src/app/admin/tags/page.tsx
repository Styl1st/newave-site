import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import ReclassementTags from "@/components/admin/ReclassementTags";
import { poserUneRegle, retirerUneRegle } from "@/app/admin/tags-actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cleDeLibelle, estUneFamille, rangDuTag, TAGS_CONNUS } from "@/lib/tags";
import { PRODUCT_CATEGORIES } from "@/lib/taxonomy";

export const metadata: Metadata = { title: "Tags" };

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type LigneLocale = { libelle: string; brand_slug: string; brand_name: string; total: number };

type Regle = {
  cle: string;
  decision: "global" | "masque";
  tag: string | null;
  famille: string | null;
  libelles: string[];
  marques: string[];
};

type Groupe = {
  cle: string;
  libelles: Set<string>;
  pieces: number;
  marques: Map<string, { nom: string; total: number }>;
};

/** Au-delà, la page s'allonge sans qu'on la lise : les plus partagés d'abord. */
const A_TRIER_MAX = 120;

/**
 * LES TAGS : CE QUE LE LEXIQUE RANGE, ET CE QU'IL LAISSE À TRIER.
 *
 * Le lexique (`src/lib/tags.ts`) traduit les collections des boutiques
 * dans un vocabulaire commun. Ce qu'il ne reconnaît pas devient un tag
 * local, visible sur la page de sa marque seulement. Cette page les
 * liste, du plus partagé au plus isolé : un libellé que six marques
 * emploient mérite sans doute d'être un vrai tag, un nom de drop porté
 * par une seule reste très bien où il est.
 */
export default async function TagsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const lignes: LigneLocale[] = [];
  let migrationManquante = !supabase;
  let totalPieces = 0;
  let regles: Regle[] = [];
  let usage: { rayon: string | null; tag: string; total: number }[] = [];

  if (supabase) {
    for (let de = 0; de < 50_000; de += 1000) {
      const { data, error } = await supabase.rpc("tags_locaux_du_site").range(de, de + 999);
      if (error) {
        migrationManquante = true;
        break;
      }
      const lot = (data as LigneLocale[] | null) ?? [];
      lignes.push(...lot);
      if (lot.length < 1000) break;
    }

    const [{ count }, { data: r }, { data: u }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("tags_regles").select("cle, decision, tag, famille, libelles, marques").order("updated_at", { ascending: false }),
      supabase.rpc("compter_les_tags", { p_taxonomie: [...PRODUCT_CATEGORIES] }),
    ]);
    totalPieces = count ?? 0;
    regles = (r as Regle[] | null) ?? [];
    usage = (u as typeof usage | null) ?? [];
  }

  /* « Capsule Nuit » et « CAPSULE NUIT » sont la même collection écrite
     par deux marques : on les regroupe sous la clé qui sert aux règles. */
  const groupes = new Map<string, Groupe>();
  for (const l of lignes) {
    const cle = cleDeLibelle(l.libelle);
    if (!cle) continue;
    const g = groupes.get(cle) ?? { cle, libelles: new Set(), pieces: 0, marques: new Map() };
    g.libelles.add(l.libelle);
    g.pieces += l.total;
    const m = g.marques.get(l.brand_slug) ?? { nom: l.brand_name, total: 0 };
    m.total += l.total;
    g.marques.set(l.brand_slug, m);
    groupes.set(cle, g);
  }
  const aTrier = [...groupes.values()].sort(
    (a, b) => b.marques.size - a.marques.size || b.pieces - a.pieces || a.cle.localeCompare(b.cle)
  );

  /* Les tags créés depuis cette page, pour pouvoir y ranger d'autres
     collections ensuite. */
  const crees = [
    ...new Set(
      regles
        .filter((r) => r.decision === "global" && r.tag && !estUneFamille(r.tag))
        .map((r) => r.tag as string)
        .filter((t) => rangDuTag(t) === TAGS_CONNUS.length)
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  /* L'usage, par rayon, pour voir d'un coup d'œil ce que le site sait
     déjà ranger. */
  const parRayon = new Map<string, { tag: string; total: number }[]>();
  for (const l of usage) {
    const rayon = l.rayon ?? "Sans rayon";
    const liste = parRayon.get(rayon) ?? [];
    liste.push({ tag: l.tag, total: l.total });
    parRayon.set(rayon, liste);
  }
  const rayonsEnUsage = [...PRODUCT_CATEGORIES, "Sans rayon"].filter((r) => parRayon.has(r));

  const champ = "champ champ-petit min-h-[38px] text-[12.5px]";
  const bouton =
    "rounded-full px-4 py-2 text-[12px] font-extrabold transition active:scale-[.97]";

  return (
    <>
      <header className="mb-5 sm:mb-7">
        <BackLink href="/admin/catalogues">Catalogues</BackLink>
        <p className="eyebrow m-0 mt-3">Entretien</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Tags
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Chaque pièce a un rayon (Hauts, Vestes…) et un type (Hoodies, Bombers…), lus sur
          le site de sa marque : son type de produit, ses collections, puis le nom de la
          pièce. Les collections que le lexique ne sait pas ranger restent des tags propres
          à la marque, visibles sur sa page seulement. C&apos;est ici qu&apos;on les trie.
        </p>
      </header>

      {migrationManquante ? (
        <p className="glass m-0 p-4 text-[13.5px] leading-relaxed text-white">
          La base n&apos;a pas encore les tags. Passe <code>supabase/migration-34.sql</code> dans
          le SQL Editor de Supabase, puis reviens ici pour lancer le reclassement.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <ReclassementTags total={totalPieces} />

          {/* ---------- ce qui reste à trier ---------- */}
          <section className="glass p-4 sm:p-5">
            <h2 className="m-0 text-[15.5px] font-extrabold text-white">
              Collections propres aux marques
              <span className="ml-2 text-[12px] font-bold text-white/50">{aTrier.length}</span>
            </h2>
            <p className="m-0 mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/65">
              <strong className="text-white">Rendre global</strong> range ces pièces dans un
              rayon ou un type du site, pour toutes les marques qui emploient ce mot, y compris
              celles qui l&apos;adopteront plus tard. <strong className="text-white">Masquer</strong>{" "}
              le retire des pages de marque. Rien n&apos;est définitif : une règle se retire en
              bas de page.
            </p>

            {aTrier.length === 0 ? (
              <p className="m-0 mt-4 text-[13px] text-white/60">
                Rien à trier. Si le catalogue n&apos;a pas encore été relu depuis la migration,
                les collections des boutiques n&apos;apparaîtront qu&apos;après une lecture
                (tâche quotidienne, ou « Relire toutes les boutiques »).
              </p>
            ) : (
              <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
                {aTrier.slice(0, A_TRIER_MAX).map((g) => {
                  const marques = [...g.marques.entries()].sort((a, b) => b[1].total - a[1].total);
                  return (
                    <li
                      key={g.cle}
                      className="rounded-[13px] border border-white/15 bg-white/5 p-3"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="text-[14px] font-extrabold text-white">
                          {[...g.libelles][0]}
                        </span>
                        <span className="text-[12px] font-bold text-white/55">
                          {g.pieces} pièce{g.pieces > 1 ? "s" : ""} · {g.marques.size} marque
                          {g.marques.size > 1 ? "s" : ""}
                        </span>
                        <span className="min-w-0 text-[12px] text-white/55">
                          {marques
                            .slice(0, 6)
                            .map(([, m]) => m.nom)
                            .join(", ")}
                          {marques.length > 6 && "…"}
                        </span>
                      </div>

                      <form action={poserUneRegle} className="mt-2.5 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="cle" value={g.cle} />
                        <input type="hidden" name="libelles" value={JSON.stringify([...g.libelles])} />
                        <input type="hidden" name="marques" value={JSON.stringify(marques.map(([slug]) => slug))} />

                        <select name="cible" defaultValue="" aria-label="Ranger dans" className={`${champ} max-w-[220px]`}>
                          <option value="" disabled>
                            Ranger dans…
                          </option>
                          <optgroup label="Rayons">
                            {PRODUCT_CATEGORIES.map((f) => (
                              <option key={f} value={`famille:${f}`}>
                                {f}
                              </option>
                            ))}
                          </optgroup>
                          {[...PRODUCT_CATEGORIES, null].map((f) => {
                            const siens = TAGS_CONNUS.filter((t) => t.famille === f);
                            if (siens.length === 0) return null;
                            return (
                              <optgroup key={f ?? "sans"} label={f ? `Types · ${f}` : "Types sans rayon"}>
                                {siens.map((t) => (
                                  <option key={t.tag} value={`tag:${t.tag}`}>
                                    {t.tag}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                          {crees.length > 0 && (
                            <optgroup label="Types créés ici">
                              {crees.map((t) => (
                                <option key={t} value={`tag:${t}`}>
                                  {t}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="nouveau">Nouveau type…</option>
                        </select>

                        <input
                          name="nouveau"
                          placeholder="Nouveau type"
                          aria-label="Nom du nouveau type"
                          defaultValue={[...g.libelles][0]}
                          className={`${champ} w-[150px]`}
                        />
                        <select name="famille" defaultValue="" aria-label="Rayon du nouveau type" className={`${champ} w-[130px]`}>
                          <option value="">Sans rayon</option>
                          {PRODUCT_CATEGORIES.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          name="decision"
                          value="global"
                          className={`${bouton} bg-white text-[var(--color-ink)]`}
                        >
                          Rendre global
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="masque"
                          className={`${bouton} border border-white/35 text-white/85 hover:bg-white/12`}
                        >
                          Masquer
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
            {aTrier.length > A_TRIER_MAX && (
              <p className="m-0 mt-3 text-[12px] text-white/50">
                Et {aTrier.length - A_TRIER_MAX} autres, portés par une seule marque et peu de
                pièces : ils reviendront ici à mesure que les premiers seront triés.
              </p>
            )}
          </section>

          {/* ---------- les règles posées ---------- */}
          <section className="glass p-4 sm:p-5">
            <h2 className="m-0 text-[15.5px] font-extrabold text-white">
              Règles posées
              <span className="ml-2 text-[12px] font-bold text-white/50">{regles.length}</span>
            </h2>
            {regles.length === 0 ? (
              <p className="m-0 mt-2 text-[13px] text-white/60">Aucune pour l&apos;instant.</p>
            ) : (
              <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
                {regles.map((r) => (
                  <li
                    key={r.cle}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] border border-white/12 px-3 py-2"
                  >
                    <span className="text-[13px] text-white/85">
                      <strong className="text-white">{r.libelles[0] ?? r.cle}</strong>
                      {" → "}
                      {r.decision === "masque" ? (
                        <em className="not-italic text-white/55">masqué</em>
                      ) : (
                        <>
                          {r.tag}
                          {r.famille && !estUneFamille(r.tag) && (
                            <span className="text-white/55"> ({r.famille})</span>
                          )}
                        </>
                      )}
                      <span className="ml-2 text-[11.5px] text-white/45">
                        {r.marques.length} marque{r.marques.length > 1 ? "s" : ""}
                      </span>
                    </span>
                    <form action={retirerUneRegle}>
                      <input type="hidden" name="cle" value={r.cle} />
                      <button
                        type="submit"
                        className="text-[12px] font-bold text-white/70 underline underline-offset-2 hover:text-white"
                      >
                        Retirer
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- ce que le site sait déjà ranger ---------- */}
          <section className="glass p-4 sm:p-5">
            <h2 className="m-0 text-[15.5px] font-extrabold text-white">Types en usage</h2>
            <p className="m-0 mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/65">
              Sur les pièces publiées et en vente. Un type n&apos;apparaît que s&apos;il a des
              pièces : c&apos;est ce qui garantit qu&apos;aucun filtre du site ne mène à une
              liste vide.
            </p>
            {rayonsEnUsage.length === 0 ? (
              <p className="m-0 mt-3 text-[13px] text-white/60">
                Aucun type posé pour l&apos;instant : lance le reclassement ci-dessus.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {rayonsEnUsage.map((rayon) => (
                  <div key={rayon}>
                    <p className="eyebrow m-0 mb-1.5">{rayon}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(parRayon.get(rayon) ?? [])
                        .sort((a, b) => b.total - a.total)
                        .map((t) => (
                          <span
                            key={t.tag}
                            className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white/85"
                          >
                            {t.tag}{" "}
                            <span className="opacity-55 tabular-nums">
                              {t.total.toLocaleString("fr-FR")}
                            </span>
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
