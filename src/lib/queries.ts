import { createClient } from "./supabase/server";
import { DEMO_ARTICLES, DEMO_BRANDS } from "./demo-data";
import type { Article, Brand } from "./types";

/**
 * Chaque fonction interroge Supabase et retombe sur les donnees de
 * demonstration si la base n'est pas configuree ou renvoie une erreur.
 * Le site ne tombe donc jamais en panne blanche.
 */

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

export async function getArticles(limit?: number): Promise<Article[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_ARTICLES.slice(0, limit);

  let q = supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error || !data) return DEMO_ARTICLES.slice(0, limit);
  return data as Article[];
}

export async function getArticle(slug: string): Promise<Article | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_ARTICLES.find((a) => a.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return DEMO_ARTICLES.find((a) => a.slug === slug) ?? null;
  return (data as Article) ?? null;
}
