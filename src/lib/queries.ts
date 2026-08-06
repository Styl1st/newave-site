import { createClient } from "./supabase/server";
import { DEMO_BRANDS, DEMO_POSTS, DEMO_PRODUCTS } from "./demo-data";
import type { Brand, Post, Product } from "./types";

/**
 * Chaque fonction interroge Supabase et retombe sur les donnees de
 * demonstration si la base n'est pas configuree. Le site ne tombe
 * donc jamais en panne blanche pendant que tu travailles le design.
 */

const BRAND_REF = "brand:brands(id,slug,name)";

/* ---------------- marques ---------------- */

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_BRANDS;

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });

  if (error || !data) return DEMO_BRANDS;
  return data as Brand[];
}

export async function getBrand(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_BRANDS.find((b) => b.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return DEMO_BRANDS.find((b) => b.slug === slug) ?? null;
  return (data as Brand) ?? null;
}

/* ---------------- pieces ---------------- */

export async function getProductsByBrand(brandId: string): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_PRODUCTS.filter((p) => p.brand_id === brandId);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .eq("status", "published")
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data as Product[];
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_PRODUCTS;

  const { data, error } = await supabase
    .from("products")
    .select(`*, ${BRAND_REF}`)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return DEMO_PRODUCTS;
  return data as unknown as Product[];
}

/* ---------------- posts ---------------- */

export async function getPosts(limit?: number): Promise<Post[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.slice(0, limit);

  let q = supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error || !data) return DEMO_POSTS.slice(0, limit);
  return data as unknown as Post[];
}

export async function getPost(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return DEMO_POSTS.find((p) => p.slug === slug) ?? null;
  return (data as unknown as Post) ?? null;
}

export async function getPostsByBrand(brandId: string): Promise<Post[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_POSTS.filter((p) => p.brand_id === brandId);

  const { data, error } = await supabase
    .from("posts")
    .select(`*, ${BRAND_REF}`)
    .eq("brand_id", brandId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Post[];
}
