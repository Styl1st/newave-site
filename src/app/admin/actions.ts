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

type Result = { ok: boolean; error?: string; message?: string };

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

  const images = toArray(formData, "images");

  const payload = {
    slug: toText(formData.get("slug")) || slugify(title),
    title,
    caption: toText(formData.get("caption")),
    image_url: images[0] ?? toNullable(formData.get("image_url")),
    images,
    video_url: toNullable(formData.get("video_url")),
    video_poster: toNullable(formData.get("video_poster")),
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

/**
 * Accepte une candidature en un geste.
 *
 * Trois choses d'un coup, parce que les faire separement c'est trois
 * occasions d'en oublier une :
 *   1. creer la fiche marque, en brouillon, pre-remplie avec le dossier
 *   2. rattacher le compte du candidat comme gerant, s'il en a un
 *   3. passer la candidature en "acceptee"
 *
 * La marque reste en brouillon : accepter un dossier n'est pas la
 * publier. Tu gardes la main sur ce qui parait.
 */
export async function acceptApplication(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toText(formData.get("id"));

  const { data: appRow } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const application = appRow as {
    id: string;
    brand_name: string;
    email: string;
    instagram: string | null;
    website: string | null;
    pitch: string;
    user_id: string | null;
    brand_id: string | null;
    relationship: "proprietaire" | "decouvreur";
  } | null;

  if (!application) return { ok: false, error: "Candidature introuvable." };

  let brandId = application.brand_id;

  if (!brandId) {
    // Le slug doit etre unique : on suffixe plutot que d'echouer.
    let slug = slugify(application.brand_name);
    const { data: clash } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: created, error: createError } = await supabase
      .from("brands")
      .insert({
        slug,
        name: application.brand_name,
        description: application.pitch,
        instagram: application.instagram?.replace(/^@/, "") ?? null,
        shop_url: application.website,
        status: "draft",
      })
      .select("id")
      .single();

    if (createError) return { ok: false, error: createError.message };
    brandId = (created as { id: string }).id;
  }

  // On ne donne les cles de la fiche qu'a quelqu'un qui dirige la
  // marque. Une recommandation ne confere aucun droit sur le travail
  // d'autrui, meme faite de bonne foi.
  const estProprietaire = application.relationship === "proprietaire";
  if (estProprietaire && application.user_id) {
    await supabase
      .from("brand_managers")
      .upsert({ brand_id: brandId, user_id: application.user_id });

    // Le role suit le rattachement, sans jamais retrograder un admin
    // qui candidaterait pour sa propre marque.
    await supabase
      .from("profiles")
      .update({ role: "createur" })
      .eq("id", application.user_id)
      .eq("role", "membre");
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "acceptee", brand_id: brandId })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/candidatures");
  revalidatePath("/admin/marques");
  let message: string;
  if (!estProprietaire) {
    message =
      "Marque créée en brouillon. Aucun droit accordé : il s'agissait d'une recommandation, pas de la marque du candidat.";
  } else if (application.user_id) {
    message = "Marque créée en brouillon. Le candidat passe créateur et en devient gérant.";
  } else {
    message =
      "Marque créée en brouillon. Le candidat n'avait pas de compte : rattache-le depuis sa fiche quand il en aura un.";
  }

  return { ok: true, message };
}

/** Efface une candidature. Sans retour possible. */
export async function deleteApplication(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("applications").delete().eq("id", toText(formData.get("id")));
  revalidatePath("/admin/candidatures");
}

/* ========================= COMPTES ========================= */

/**
 * Change le role d'un compte.
 *
 * Deux verrous en plus de requireAdmin() : on ne peut pas se
 * retrograder soi-meme, ce qui fermerait la porte de l'administration
 * a clé de l'interieur, et le declencheur en base refuse tout
 * changement de role venant d'un non-admin.
 */
export async function updateUserRole(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const userId = toText(formData.get("user_id"));
  const role = toText(formData.get("role"));

  if (role !== "membre" && role !== "createur" && role !== "admin") {
    return { ok: false, error: "Rôle inconnu." };
  }
  if (userId === me.id && role !== "admin") {
    return {
      ok: false,
      error: "Tu ne peux pas retirer ton propre rôle d'administrateur — plus personne ne pourrait entrer.",
    };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${userId}`);
  return { ok: true, message: "Rôle mis à jour." };
}

/**
 * Supprime definitivement un compte.
 *
 * Passe par la fonction delete_user_account de la base : la table
 * auth.users est inaccessible depuis la cle publique, et c'est cette
 * fonction qui verifie les droits, refuse l'auto-suppression et
 * protege les autres administrateurs.
 *
 * Le profil, les favoris, les coups de cœur et les rattachements
 * partent avec. Les marques restent : elles appartiennent au site.
 */
export async function deleteUserAccount(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const userId = toText(formData.get("user_id"));
  if (!userId) return { ok: false, error: "Compte introuvable." };

  const { error } = await supabase.rpc("delete_user_account", { target: userId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: "Compte supprimé." };
}
