import { createClient } from "./supabase/server";
import { DEMO_BRANDS, DEMO_POSTS, DEMO_PRODUCTS } from "./demo-data";
import type { Brand, Post, Product } from "./types";

/**
 * Chaque fonction interroge Supabase et retombe sur les donnees de
 * demonstration si la base n'est pas configuree. Le site ne tombe
 * donc jamais en panne blanche pendant que tu travailles le design.
 */

const BRAND_REF = "brand:brands(id,slug,name)";

/**
 * Une requete qui echoue ne doit pas se transformer en "il n'y a rien".
 * On retombe sur une liste vide pour ne pas casser la page, mais on
 * ecrit la raison dans la console du serveur.
 */
function report(where: string, error: { message: string } | null) {
  if (error) console.error(`[newave] ${where} : ${error.message}`);
}

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

  report("annuaire des marques", error);
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

/**
 * La fiche d'une marque non publiée, pour son aperçu.
 *
 * Aucune vérification de droits ici, et c'est volontaire : la requête
 * ne filtre pas sur le statut, donc ce sont les règles RLS qui
 * tranchent. Un visiteur reçoit null, un gérant reçoit sa marque, un
 * admin reçoit tout. La sécurité est en base, pas dans ce fichier.
 */
export async function getBrandBrouillon(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

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

  report("pièces de la marque", error);
  if (error || !data) return [];
  return data as Product[];
}

/**
 * Toutes les pieces, marques confondues.
 * Plus utilisee depuis la suppression de la page /pieces : gardee pour
 * le jour ou tu voudras une vitrine globale ou la marketplace.
 */
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

/** Une piece precise, par son adresse au sein d'une marque. */
export async function getProduct(
  brandSlug: string,
  productSlug: string
): Promise<{ product: Product; brand: Brand } | null> {
  const brand = await getBrand(brandSlug);
  if (!brand) return null;

  const supabase = await createClient();
  if (!supabase) {
    const demo = DEMO_PRODUCTS.find(
      (p) => p.brand_id === brand.id && p.slug === productSlug
    );
    return demo ? { product: demo, brand } : null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brand.id)
    .eq("slug", productSlug)
    .eq("status", "published")
    .maybeSingle();

  report("fiche de la pièce", error);
  if (!data) return null;
  return { product: data as Product, brand };
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
  report("liste des posts", error);
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

  report("posts de la marque", error);
  if (error || !data) return [];
  return data as unknown as Post[];
}
