"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import type { Brand } from "./types";

/**
 * Le classement des marques les plus suivies, depuis toujours.
 *
 * On passe par une fonction en base plutôt que par une lecture
 * directe : la table des favoris n'est lisible que par son
 * propriétaire, et c'est très bien ainsi. La fonction ne rend que des
 * totaux, jamais qui a mis quoi en favori.
 */
export async function getMostFavorited(
  limite = 60
): Promise<{ brand: Brand; favoris: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: totaux } = await supabase.rpc("brand_favorite_counts");
  const rows = ((totaux ?? []) as { brand_id: string; favoris: number }[]).slice(0, limite);
  if (rows.length === 0) return [];

  const { data: marques } = await supabase
    .from("brands")
    .select("*")
    .in("id", rows.map((r) => r.brand_id))
    .eq("status", "published");

  const parId = new Map(((marques ?? []) as Brand[]).map((b) => [b.id, b]));

  // On garde l'ordre du classement, pas celui de la seconde requête.
  return rows
    .map((r) => ({ brand: parId.get(r.brand_id), favoris: r.favoris }))
    .filter((x): x is { brand: Brand; favoris: number } => Boolean(x.brand));
}

/**
 * Lesquelles de ces marques la personne connectée suit-elle ?
 *
 * Une seule requête pour toute une grille. Appeler isFavorite() sur
 * chaque carte en ferait une par marque, et l'annuaire en compte
 * plusieurs dizaines.
 */
export async function getMyFavorites(brandIds: string[]): Promise<Set<string>> {
  const vide = new Set<string>();
  if (brandIds.length === 0) return vide;

  const supabase = await createClient();
  if (!supabase) return vide;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vide;

  const { data } = await supabase
    .from("favorites")
    .select("brand_id")
    .eq("user_id", user.id)
    .in("brand_id", brandIds);

  return new Set(((data ?? []) as { brand_id: string }[]).map((f) => f.brand_id));
}

/** Cette marque est-elle dans les favoris de la personne connectée ? */
export async function isFavorite(brandId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("brand_id")
    .eq("user_id", user.id)
    .eq("brand_id", brandId)
    .maybeSingle();

  return Boolean(data);
}

/** Ajoute ou retire la marque des favoris. Renvoie le nouvel etat. */
export async function toggleFavorite(
  brandId: string
): Promise<{ ok: boolean; favorited: boolean; reason?: "non-connecte" | "erreur" }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, favorited: false, reason: "erreur" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, favorited: false, reason: "non-connecte" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("brand_id")
    .eq("user_id", user.id)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("brand_id", brandId);
    if (error) return { ok: false, favorited: true, reason: "erreur" };
    revalidatePath("/favoris");
    return { ok: true, favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, brand_id: brandId });
  if (error) return { ok: false, favorited: false, reason: "erreur" };
  revalidatePath("/favoris");
  return { ok: true, favorited: true };
}

/** Les marques mises en favori par la personne connectee. */
export async function getFavoriteBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("favorites")
    .select("brand:brands(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data
    .map((row) => (row as unknown as { brand: Brand | null }).brand)
    .filter((b): b is Brand => Boolean(b));
}
