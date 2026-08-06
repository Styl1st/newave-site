import { createClient } from "./supabase/server";
import type { Application, Brand, Post, Product } from "./types";

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

export async function adminGetProducts(): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(`*, ${BRAND_REF}`)
    .order("created_at", { ascending: false });
  return (data as unknown as Product[]) ?? [];
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return (data as Product) ?? null;
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
  const [posts, brands, products, applications] = await Promise.all([
    adminGetPosts(),
    adminGetBrands(),
    adminGetProducts(),
    adminGetApplications(),
  ]);
  return {
    posts: posts.length,
    postsDraft: posts.filter((p) => p.status === "draft").length,
    brands: brands.length,
    brandsDraft: brands.filter((b) => b.status === "draft").length,
    products: products.length,
    applications: applications.length,
    applicationsNew: applications.filter((a) => a.status === "nouvelle").length,
  };
}
