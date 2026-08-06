"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import type { Brand } from "./types";

/** Cette marque est-elle dans les favoris de la personne connectee ? */
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
