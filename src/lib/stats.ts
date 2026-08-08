import { createClient } from "./supabase/server";

export type Jour = { date: string; vues: number };
export type Ligne = { label: string; valeur: number; lien?: string };

export type Stats = {
  jours: Jour[];
  vues7: number;
  vues30: number;
  vuesVeille: number;
  evolution: number | null;
  pages: Ligne[];
  sources: Ligne[];
  clics30: number;
  clicsParMarque: Ligne[];
  favorisParMarque: Ligne[];
  comptes30: number;
};

const JOURS = 30;

/** "2026-08-08" en heure locale, pour grouper sans décalage de fuseau. */
function cle(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function compter<T>(rows: T[], champ: (r: T) => string | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = champ(r);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function top(m: Map<string, number>, n: number): Ligne[] {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, valeur]) => ({ label, valeur }));
}

/**
 * Statistiques du tableau de bord.
 *
 * Tout est calculé en mémoire à partir de 30 jours de lignes : à
 * l'échelle d'un média qui démarre, c'est instantané et ça évite
 * d'installer des vues SQL qu'il faudrait maintenir. À revoir le jour
 * où tu comptes tes visites en dizaines de milliers.
 */
export async function getStats(): Promise<Stats | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - (JOURS - 1));
  depuis.setHours(0, 0, 0, 0);
  const depuisISO = depuis.toISOString();

  const [vuesRes, clicsRes, favorisRes, comptesRes, marquesRes] = await Promise.all([
    supabase.from("page_views").select("path, source, created_at").gte("created_at", depuisISO),
    supabase.from("outbound_clicks").select("brand_id, created_at").gte("created_at", depuisISO),
    supabase.from("favorites").select("brand_id"),
    supabase.from("profiles").select("id").gte("created_at", depuisISO),
    supabase.from("brands").select("id, name"),
  ]);

  const vues = (vuesRes.data ?? []) as { path: string; source: string | null; created_at: string }[];
  const clics = (clicsRes.data ?? []) as { brand_id: string | null; created_at: string }[];
  const favoris = (favorisRes.data ?? []) as { brand_id: string }[];
  const marques = new Map(
    ((marquesRes.data ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name])
  );

  // Une entrée par jour, même à zéro : sans ça le graphique mentirait
  // en resserrant les jours creux.
  const parJour = new Map<string, number>();
  for (let i = 0; i < JOURS; i++) {
    const d = new Date(depuis);
    d.setDate(depuis.getDate() + i);
    parJour.set(cle(d), 0);
  }
  for (const v of vues) {
    const k = cle(new Date(v.created_at));
    if (parJour.has(k)) parJour.set(k, (parJour.get(k) ?? 0) + 1);
  }
  const jours: Jour[] = [...parJour.entries()].map(([date, vues]) => ({ date, vues }));

  const sept = jours.slice(-7).reduce((n, j) => n + j.vues, 0);
  const septPrecedents = jours.slice(-14, -7).reduce((n, j) => n + j.vues, 0);

  return {
    jours,
    vues7: sept,
    vues30: vues.length,
    vuesVeille: jours[jours.length - 2]?.vues ?? 0,
    evolution: septPrecedents > 0 ? Math.round(((sept - septPrecedents) / septPrecedents) * 100) : null,
    pages: top(compter(vues, (v) => v.path), 6),
    sources: top(compter(vues, (v) => v.source), 5),
    clics30: clics.length,
    clicsParMarque: top(
      compter(clics, (c) => (c.brand_id ? (marques.get(c.brand_id) ?? null) : null)),
      5
    ),
    favorisParMarque: top(
      compter(favoris, (f) => marques.get(f.brand_id) ?? null),
      5
    ),
    comptes30: (comptesRes.data ?? []).length,
  };
}
