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

/** Une marque, plus les deux chiffres qu'on ne lit pas sur sa fiche. */
export type BrandAdmin = Brand & { pieces: number; gerants: number };

/**
 * L'annuaire de l'administration, avec de quoi le filtrer.
 *
 * Le nombre de pièces et celui des gérants ne sont pas des colonnes de
 * la table : ce sont eux qui permettent de retrouver les fiches
 * vides, ou celles que personne n'a encore réclamées. On les compte
 * ici, en deux requêtes pour tout le monde, plutôt qu'une par marque.
 */
export async function adminGetBrandsDetaillees(): Promise<BrandAdmin[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const [{ data: marques }, { data: pieces }, { data: gerants }] = await Promise.all([
    supabase.from("brands").select("*").order("name"),
    supabase.from("products").select("brand_id"),
    supabase.from("brand_managers").select("brand_id"),
  ]);

  const compter = (lignes: { brand_id: string }[] | null) => {
    const total = new Map<string, number>();
    for (const l of lignes ?? []) total.set(l.brand_id, (total.get(l.brand_id) ?? 0) + 1);
    return total;
  };

  const parPieces = compter(pieces as { brand_id: string }[] | null);
  const parGerants = compter(gerants as { brand_id: string }[] | null);

  return ((marques as Brand[]) ?? []).map((b) => ({
    ...b,
    pieces: parPieces.get(b.id) ?? 0,
    gerants: parGerants.get(b.id) ?? 0,
  }));
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
