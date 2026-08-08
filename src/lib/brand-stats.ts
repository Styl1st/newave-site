import { createClient } from "./supabase/server";
import type { Jour, Ligne } from "./stats";

export type BrandStats = {
  jours: Jour[];
  vues30: number;
  vues7: number;
  evolution: number | null;
  clics30: number;
  clics7: number;
  tauxSortie: number | null;
  favoris: number;
  likes: number;
  piecesPubliees: number;
  piecesBrouillon: number;
  topPieces: Ligne[];
  topPiecesLikes: Ligne[];
};

const JOURS = 30;

function cle(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Statistiques d'une marque, pour la marque elle-même.
 *
 * On lui montre ce qui l'intéresse vraiment : combien de gens ont vu sa
 * page, combien sont partis vers sa boutique, et quelles pièces
 * attirent. Le taux de sortie est le chiffre qui compte — c'est la
 * mesure de ce qu'on lui apporte.
 */
export async function getBrandStats(brandId: string, slug: string): Promise<BrandStats | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - (JOURS - 1));
  depuis.setHours(0, 0, 0, 0);
  const depuisISO = depuis.toISOString();

  const [piecesRes, vuesRes, clicsRes, favorisRes] = await Promise.all([
    supabase.from("products").select("id, name, slug, status").eq("brand_id", brandId),
    // Toutes les pages de cette marque : sa fiche et celles de ses pièces.
    supabase
      .from("page_views")
      .select("path, created_at")
      .like("path", `/marques/${slug}%`)
      .gte("created_at", depuisISO),
    supabase
      .from("outbound_clicks")
      .select("product_id, created_at")
      .eq("brand_id", brandId)
      .gte("created_at", depuisISO),
    supabase.from("favorites").select("brand_id", { count: "exact", head: true }).eq("brand_id", brandId),
  ]);

  const pieces = (piecesRes.data ?? []) as {
    id: string;
    name: string;
    slug: string | null;
    status: string;
  }[];
  const vues = (vuesRes.data ?? []) as { path: string; created_at: string }[];
  const clics = (clicsRes.data ?? []) as { product_id: string | null; created_at: string }[];

  const likesRes = pieces.length
    ? await supabase
        .from("product_like_counts")
        .select("product_id, likes")
        .in("product_id", pieces.map((p) => p.id))
    : { data: [] };
  const likes = (likesRes.data ?? []) as { product_id: string; likes: number }[];

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
  const septAvant = jours.slice(-14, -7).reduce((n, j) => n + j.vues, 0);

  const recent = (iso: string) => {
    const d = new Date(iso);
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    return d >= limite;
  };

  const nomParId = new Map(pieces.map((p) => [p.id, p.name]));
  const clicsParPiece = new Map<string, number>();
  for (const c of clics) {
    if (!c.product_id) continue;
    const nom = nomParId.get(c.product_id);
    if (!nom) continue;
    clicsParPiece.set(nom, (clicsParPiece.get(nom) ?? 0) + 1);
  }

  const vuesParPiece = new Map<string, number>();
  for (const v of vues) {
    const morceaux = v.path.split("/").filter(Boolean);
    if (morceaux.length < 3) continue;
    const pieceSlug = morceaux[2];
    const piece = pieces.find((p) => p.slug === pieceSlug);
    if (piece) vuesParPiece.set(piece.name, (vuesParPiece.get(piece.name) ?? 0) + 1);
  }

  const top = (m: Map<string, number>): Ligne[] =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, valeur]) => ({ label, valeur }));

  return {
    jours,
    vues30: vues.length,
    vues7: sept,
    evolution: septAvant > 0 ? Math.round(((sept - septAvant) / septAvant) * 100) : null,
    clics30: clics.length,
    clics7: clics.filter((c) => recent(c.created_at)).length,
    tauxSortie: vues.length > 0 ? Math.round((clics.length / vues.length) * 100) : null,
    favoris: favorisRes.count ?? 0,
    likes: likes.reduce((n, l) => n + l.likes, 0),
    piecesPubliees: pieces.filter((p) => p.status === "published").length,
    piecesBrouillon: pieces.filter((p) => p.status === "draft").length,
    topPieces: [...vuesParPiece.entries()].length
      ? top(vuesParPiece)
      : top(clicsParPiece),
    topPiecesLikes: top(
      new Map(
        likes
          .map((l) => [nomParId.get(l.product_id) ?? "", l.likes] as [string, number])
          .filter(([nom]) => nom)
      )
    ),
  };
}
