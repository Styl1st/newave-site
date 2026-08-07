import { createClient } from "./supabase/server";
import type { Application, Brand, Post, Profile } from "./types";

/**
 * Lectures cote administration : contrairement a queries.ts, on renvoie
 * AUSSI les brouillons. Pas de repli sur les donnees de demonstration :
 * si la base n'est pas la, l'admin doit le savoir plutot que d'editer
 * dans le vide.
 */

const BRAND_REF = "brand:brands(id,slug,name)";

export async function adminGetPosts(): Promise<Post[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .order("created_at", { ascending: false });
  return (data as unknown as Post[]) ?? [];
}

export async function adminGetPost(id: string): Promise<Post | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  return (data as Post) ?? null;
}

export async function adminGetBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("brands").select("*").order("name");
  return (data as Brand[]) ?? [];
}

export async function adminGetBrand(id: string): Promise<Brand | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
  return (data as Brand) ?? null;
}

export async function adminGetApplications(): Promise<Application[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Application[]) ?? [];
}

export async function adminCounts() {
  const [posts, brands, applications] = await Promise.all([
    adminGetPosts(),
    adminGetBrands(),
    adminGetApplications(),
  ]);
  return {
    posts: posts.length,
    postsDraft: posts.filter((p) => p.status === "draft").length,
    brands: brands.length,
    brandsDraft: brands.filter((b) => b.status === "draft").length,
    applications: applications.length,
    applicationsNew: applications.filter((a) => a.status === "nouvelle").length,
  };
}

/** Les comptes rattaches a une marque. */
export async function adminGetBrandManagers(brandId: string): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("brand_managers")
    .select("profile:profiles(id, email, display_name, role)")
    .eq("brand_id", brandId);
  return (data ?? [])
    .map((row) => (row as unknown as { profile: Profile | null }).profile)
    .filter((p): p is Profile => Boolean(p));
}
