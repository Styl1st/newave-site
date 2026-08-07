"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Toutes les ecritures de l'administration passent par ici.
 * requireAdmin() protege l'interface ; les regles RLS de schema.sql
 * protegent la base. Les deux, pas l'une ou l'autre.
 */

type Result = { ok: boolean; error?: string };

/**
 * Relit toutes les cases cochees portant le meme nom.
 * getAll() renvoie un tableau vide si rien n'est coche, ce qui est
 * exactement ce qu'on veut stocker.
 */
function toArray(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function toText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function toNullable(value: FormDataEntryValue | null): string | null {
  const s = toText(value);
  return s === "" ? null : s;
}

/** "Écrans Larges !" -> "ecrans-larges" */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ============================ POSTS ============================ */

export async function savePost(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toNullable(formData.get("id"));
  const title = toText(formData.get("title"));
  if (!title) return { ok: false, error: "Le titre est obligatoire." };

  const status = toText(formData.get("status")) === "published" ? "published" : "draft";

  const payload = {
    slug: toText(formData.get("slug")) || slugify(title),
    title,
    caption: toText(formData.get("caption")),
    image_url: toNullable(formData.get("image_url")),
    image_alt: toText(formData.get("image_alt")),
    keywords: toArray(formData, "keywords"),
    brand_id: toNullable(formData.get("brand_id")),
    instagram_url: toNullable(formData.get("instagram_url")),
    tiktok_url: toNullable(formData.get("tiktok_url")),
    status,
    // On date la publication au moment où elle bascule, pas à la création.
    published_at:
      status === "published" ? toNullable(formData.get("published_at")) ?? new Date().toISOString() : null,
  };

  const { error } = id
    ? await supabase.from("posts").update(payload).eq("id", id)
    : await supabase.from("posts").insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/posts");
  revalidatePath("/posts");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("posts").delete().eq("id", toText(formData.get("id")));
  revalidatePath("/admin/posts");
  revalidatePath("/posts");
  redirect("/admin/posts");
}

/* ============================ MARQUES ============================ */

export async function saveBrand(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toNullable(formData.get("id"));
  const name = toText(formData.get("name"));
  if (!name) return { ok: false, error: "Le nom est obligatoire." };

  const status = toText(formData.get("status")) === "published" ? "published" : "draft";
  const year = toText(formData.get("founded_year"));

  const payload = {
    slug: toText(formData.get("slug")) || slugify(name),
    name,
    tagline: toText(formData.get("tagline")),
    description: toText(formData.get("description")),
    country: toText(formData.get("country")) || "France",
    city: toNullable(formData.get("city")),
    founded_year: year ? Number(year) : null,
    categories: toArray(formData, "categories"),
    price_tier: toText(formData.get("price_tier")) || "intermediaire",
    website_url: toNullable(formData.get("website_url")),
    shop_url: toNullable(formData.get("shop_url")),
    instagram: toNullable(formData.get("instagram")),
    logo_url: toNullable(formData.get("logo_url")),
    cover_url: toNullable(formData.get("cover_url")),
    featured: formData.get("featured") === "on",
    status,
    published_at:
      status === "published" ? toNullable(formData.get("published_at")) ?? new Date().toISOString() : null,
  };

  const { error } = id
    ? await supabase.from("brands").update(payload).eq("id", id)
    : await supabase.from("brands").insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/marques");
  revalidatePath("/marques");
  revalidatePath("/");
  redirect("/admin/marques");
}

export async function deleteBrand(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("brands").delete().eq("id", toText(formData.get("id")));
  revalidatePath("/admin/marques");
  revalidatePath("/marques");
  redirect("/admin/marques");
}

/* ========================= CANDIDATURES ========================= */

export async function setApplicationStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("applications")
    .update({ status: toText(formData.get("status")) })
    .eq("id", toText(formData.get("id")));
  revalidatePath("/admin/candidatures");
}

/* ========================= GERANTS DE MARQUE ========================= */

/**
 * Rattache un compte existant a une marque.
 *
 * La personne doit s'etre inscrite au prealable : on ne cree pas de
 * compte a sa place, sinon on choisirait son mot de passe. On la
 * retrouve par son adresse email.
 */
export async function addBrandManager(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const brandId = toText(formData.get("brand_id"));
  const email = toText(formData.get("email")).toLowerCase();
  if (!brandId || !email) return { ok: false, error: "Adresse manquante." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error:
        "Aucun compte avec cette adresse. Demande à la marque de créer son compte sur /connexion, puis reviens ici.",
    };
  }

  const { error } = await supabase
    .from("brand_managers")
    .upsert({ brand_id: brandId, user_id: (profile as { id: string }).id });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/marques/${brandId}`);
  return { ok: true };
}

export async function removeBrandManager(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;

  const brandId = toText(formData.get("brand_id"));
  await supabase
    .from("brand_managers")
    .delete()
    .eq("brand_id", brandId)
    .eq("user_id", toText(formData.get("id")));

  revalidatePath(`/admin/marques/${brandId}`);
}
