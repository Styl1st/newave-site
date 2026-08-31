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
 * POSTGREST NE REND JAMAIS PLUS DE MILLE LIGNES, ET IL NE LE DIT PAS.
 *
 * C'est le réglage `max-rows` de Supabase, à mille par défaut. Une
 * requête qui dépasse ce seuil ne renvoie ni erreur ni avertissement :
 * elle renvoie mille lignes, et le reste n'existe pas. Un compteur écrit
 * `rows.length` affiche donc « 1000 » — puis « 1000 » le lendemain, et
 * tous les jours suivants. C'est exactement ce qu'on a vu sur les pages
 * vues, et ça se lit comme un compteur en panne alors que c'est la
 * lecture qui est plafonnée.
 *
 * Pire que le total figé : les mille lignes rendues ne sont pas les plus
 * récentes. Sans `order`, PostgREST sert l'ordre physique de la table,
 * donc les plus ANCIENNES. Le graphique des trente jours perdait ses
 * derniers jours et les affichait à zéro.
 *
 * DEUX REMÈDES, ET ILS NE SE REMPLACENT PAS.
 *
 * Pour un TOTAL, on ne rapatrie rien : `count: "exact"` fait compter
 * Postgres et ne rend aucune ligne. C'est juste, c'est instantané, et
 * aucun plafond ne s'y applique.
 *
 * Pour un DÉCOUPAGE — par jour, par page, par source — il faut les
 * lignes. On les demande alors par tranches, dans un ordre stable : sans
 * `order`, deux tranches successives peuvent se recouvrir ou sauter des
 * lignes, puisque rien ne garantit que la base les rende deux fois dans
 * le même ordre.
 */
const TRANCHE = 1000;

/**
 * Au-delà, on arrête de rapatrier.
 *
 * Vingt tranches, c'est vingt allers-retours à la base pour peindre un
 * graphique : à ce stade, ce n'est plus un plafond qu'il faut relever,
 * c'est le calcul qu'il faut descendre dans Postgres (un `group by`
 * dans une fonction SQL). Les TOTAUX, eux, resteront exacts quoi qu'il
 * arrive puisqu'ils ne passent pas par ici.
 */
const PLAFOND = 20 * TRANCHE;

export async function parTranches<T>(
  requete: (de: number, a: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  const tout: T[] = [];

  for (let de = 0; de < PLAFOND; de += TRANCHE) {
    const { data } = await requete(de, de + TRANCHE - 1);
    if (!data?.length) break;
    tout.push(...data);
    // Une tranche incomplète, c'est la dernière.
    if (data.length < TRANCHE) break;
  }

  return tout;
}

/**
 * Statistiques du tableau de bord.
 *
 * Les TOTAUX sont comptés par Postgres. Les DÉCOUPAGES — par jour, par
 * page, par source — se calculent en mémoire à partir des lignes des
 * trente derniers jours, rapatriées par tranches : à l'échelle d'un
 * média qui démarre, c'est instantané et ça évite d'installer des vues
 * SQL qu'il faudrait maintenir.
 *
 * Le jour où tu passeras vingt mille vues par mois, ce sont les
 * découpages qu'il faudra descendre dans Postgres (`group by` dans une
 * fonction SQL). Les totaux, eux, n'auront pas à changer.
 */
export async function getStats(): Promise<Stats | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - (JOURS - 1));
  depuis.setHours(0, 0, 0, 0);
  const depuisISO = depuis.toISOString();

  type LigneVue = { path: string; source: string | null; created_at: string };
  type LigneClic = { brand_id: string | null; created_at: string };

  const [vuesTotal, clicsTotal, comptesTotal, vues, clics, favoris, marquesLues] =
    await Promise.all([
      /* Les totaux sont comptés par Postgres : aucun plafond, et rien ne
         descend sur le réseau. Voir `parTranches`. */
      supabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("created_at", depuisISO),
      supabase
        .from("outbound_clicks")
        .select("*", { count: "exact", head: true })
        .gte("created_at", depuisISO),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", depuisISO),

      /* Les lignes, pour les découpages. Ordonnées, sinon deux tranches
         successives peuvent se recouvrir. */
      parTranches<LigneVue>((de, a) =>
        supabase
          .from("page_views")
          .select("path, source, created_at")
          .gte("created_at", depuisISO)
          .order("created_at", { ascending: true })
          .range(de, a)
      ),
      parTranches<LigneClic>((de, a) =>
        supabase
          .from("outbound_clicks")
          .select("brand_id, created_at")
          .gte("created_at", depuisISO)
          .order("created_at", { ascending: true })
          .range(de, a)
      ),
      parTranches<{ brand_id: string }>((de, a) =>
        supabase.from("favorites").select("brand_id").order("brand_id").range(de, a)
      ),
      parTranches<{ id: string; name: string }>((de, a) =>
        supabase.from("brands").select("id, name").order("id").range(de, a)
      ),
    ]);

  const marques = new Map(marquesLues.map((b) => [b.id, b.name]));

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
    // Le compte de Postgres, pas la longueur de ce qu'on a rapatrié :
    // c'est toute la différence entre un chiffre juste et un « 1000 »
    // qui ne bouge plus.
    vues30: vuesTotal.count ?? vues.length,
    vuesVeille: jours[jours.length - 2]?.vues ?? 0,
    evolution: septPrecedents > 0 ? Math.round(((sept - septPrecedents) / septPrecedents) * 100) : null,
    pages: top(compter(vues, (v) => v.path), 6),
    sources: top(compter(vues, (v) => v.source), 5),
    clics30: clicsTotal.count ?? clics.length,
    clicsParMarque: top(
      compter(clics, (c) => (c.brand_id ? (marques.get(c.brand_id) ?? null) : null)),
      5
    ),
    favorisParMarque: top(
      compter(favoris, (f) => marques.get(f.brand_id) ?? null),
      5
    ),
    comptes30: comptesTotal.count ?? 0,
  };
}
