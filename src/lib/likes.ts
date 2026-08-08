"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import type { Product } from "./types";

/** Nombre de likes par pièce, pour une liste d'identifiants. */
export async function getLikeCounts(productIds: string[]): Promise<Map<string, number>> {
  const vide = new Map<string, number>();
  if (productIds.length === 0) return vide;

  const supabase = await createClient();
  if (!supabase) return vide;

  const { data } = await supabase
    .from("product_like_counts")
    .select("product_id, likes")
    .in("product_id", productIds);

  return new Map(
    ((data ?? []) as { product_id: string; likes: number }[]).map((r) => [r.product_id, r.likes])
  );
}

/** Les coups de cœur ne comptent que sept jours. */
const DUREE_JOURS = 7;

function depuis(): string {
  const d = new Date();
  d.setDate(d.getDate() - DUREE_JOURS);
  return d.toISOString();
}

/** Les pièces aimées RÉCEMMENT par la personne connectée. */
export async function getMyLikes(productIds: string[]): Promise<Set<string>> {
  const vide = new Set<string>();
  if (productIds.length === 0) return vide;

  const supabase = await createClient();
  if (!supabase) return vide;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vide;

  const { data } = await supabase
    .from("product_likes")
    .select("product_id")
    .eq("user_id", user.id)
    .gt("created_at", depuis())
    .in("product_id", productIds);

  return new Set(((data ?? []) as { product_id: string }[]).map((r) => r.product_id));
}

export async function toggleLike(
  productId: string
): Promise<{ ok: boolean; liked: boolean; reason?: "non-connecte" | "erreur" }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, liked: false, reason: "erreur" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, liked: false, reason: "non-connecte" };

  const { data: existing } = await supabase
    .from("product_likes")
    .select("product_id, created_at")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  const ligne = existing as { created_at: string } | null;
  const encoreValide = ligne ? new Date(ligne.created_at).toISOString() > depuis() : false;

  // Une ligne expirée n'est pas un like : on la réactive plutôt que
  // de tenter une insertion que la clé primaire refuserait.
  if (ligne && !encoreValide) {
    const { error } = await supabase
      .from("product_likes")
      .update({ created_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) return { ok: false, liked: false, reason: "erreur" };
    revalidatePath("/populaires");
    return { ok: true, liked: true };
  }

  if (ligne) {
    const { error } = await supabase
      .from("product_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) return { ok: false, liked: true, reason: "erreur" };
    revalidatePath("/populaires");
    return { ok: true, liked: false };
  }

  const { error } = await supabase
    .from("product_likes")
    .insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, liked: false, reason: "erreur" };
  revalidatePath("/populaires");
  return { ok: true, liked: true };
}

/** Le classement des pièces les plus aimées. */
export async function getMostLiked(limite = 24): Promise<{ product: Product; likes: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: counts } = await supabase
    .from("product_like_counts")
    .select("product_id, likes")
    .order("likes", { ascending: false })
    .limit(limite);

  const rows = (counts ?? []) as { product_id: string; likes: number }[];
  if (rows.length === 0) return [];

  const { data: produits } = await supabase
    .from("products")
    .select("*, brand:brands(id,slug,name)")
    .in("id", rows.map((r) => r.product_id))
    .eq("status", "published");

  const parId = new Map(
    ((produits ?? []) as unknown as Product[]).map((p) => [p.id, p])
  );

  // On garde l'ordre du classement, pas celui de la seconde requête.
  return rows
    .map((r) => ({ product: parId.get(r.product_id), likes: r.likes }))
    .filter((x): x is { product: Product; likes: number } => Boolean(x.product));
}
