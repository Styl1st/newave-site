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
  const [posts, brands, applications, profiles] = await Promise.all([
    adminGetPosts(),
    adminGetBrands(),
    adminGetApplications(),
    adminGetProfiles(),
  ]);
  return {
    posts: posts.length,
    postsDraft: posts.filter((p) => p.status === "draft").length,
    brands: brands.length,
    brandsDraft: brands.filter((b) => b.status === "draft").length,
    applications: applications.length,
    applicationsNew: applications.filter((a) => a.status === "nouvelle").length,
    users: profiles.length,
    admins: profiles.filter((p) => p.role === "admin").length,
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

/* ---------------- comptes ---------------- */

export async function adminGetProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .order("created_at", { ascending: false });
  return (data as Profile[]) ?? [];
}

export async function adminGetProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

/** Les marques qu'un compte gere, avec le compte de leurs pieces. */
export async function adminGetUserBrands(
  userId: string
): Promise<{ brand: Brand; pieces: number }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("brand_managers")
    .select("brand:brands(*)")
    .eq("user_id", userId);

  const brands = (data ?? [])
    .map((row) => (row as unknown as { brand: Brand | null }).brand)
    .filter((b): b is Brand => Boolean(b));

  return Promise.all(
    brands.map(async (brand) => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brand.id);
      return { brand, pieces: count ?? 0 };
    })
  );
}

/** Les candidatures deposees par un compte. */
export async function adminGetUserApplications(userId: string): Promise<Application[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as Application[]) ?? [];
}
