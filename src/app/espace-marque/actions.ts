"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireManagedBrand } from "@/lib/brand-space";
import { fetchShopifyCatalogue } from "@/lib/shopify";

/**
 * Ecritures de l'espace marque.
 *
 * Chaque action revalide les droits par requireManagedBrand(), et la
 * base applique par-dessus ses propres regles : un gerant ne peut ni
 * publier sa fiche, ni se mettre a la une, ni toucher a une autre marque.
 */

type Result = { ok: boolean; error?: string };

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}
function nullable(formData: FormData, name: string): string | null {
  const v = text(formData, name);
  return v === "" ? null : v;
}
/** "La chemise « Cobalt »" -> "la-chemise-cobalt" */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function list(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((v) => String(v).trim()).filter(Boolean);
}

/* ---------------- presentation de la marque ---------------- */

export async function saveBrandPresentation(formData: FormData): Promise<Result> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const year = text(formData, "founded_year");
  const covers = list(formData, "cover_url");
  const logos = list(formData, "logo_url");

  const { error } = await supabase
    .from("brands")
    .update({
      tagline: text(formData, "tagline"),
      description: text(formData, "description"),
      country: text(formData, "country") || "France",
      city: nullable(formData, "city"),
      founded_year: year ? Number(year) : null,
      categories: list(formData, "categories"),
      price_tier: text(formData, "price_tier") || "intermediaire",
      website_url: nullable(formData, "website_url"),
      shop_url: nullable(formData, "shop_url"),
      instagram: nullable(formData, "instagram"),
      logo_url: logos[0] ?? null,
      cover_url: covers[0] ?? null,
    })
    .eq("id", brand.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/espace-marque/${slug}`);
  revalidatePath(`/marques/${slug}`);
  revalidatePath("/marques");
  return { ok: true };
}

/* ---------------- pieces ---------------- */

export async function saveBrandProduct(formData: FormData): Promise<Result> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = nullable(formData, "id");
  const name = text(formData, "name");
  const shopUrl = text(formData, "shop_url");
  if (!name) return { ok: false, error: "Le nom de la pièce est obligatoire." };
  if (!shopUrl) return { ok: false, error: "Le lien vers la boutique est obligatoire." };

  // L'utilisateur saisit des euros, la base stocke des centimes :
  // les nombres a virgule s'arrondissent mal, pas les entiers.
  const euros = text(formData, "price_euros").replace(",", ".");
  const cents = euros ? Math.round(Number(euros) * 100) : null;
  if (cents !== null && Number.isNaN(cents)) {
    return { ok: false, error: "Le prix n'est pas un nombre valide." };
  }

  const wasEuros = text(formData, "compare_at_euros").replace(",", ".");
  const wasCents = wasEuros ? Math.round(Number(wasEuros) * 100) : null;
  if (wasCents !== null && Number.isNaN(wasCents)) {
    return { ok: false, error: "Le prix barré n'est pas un nombre valide." };
  }

  // "XS, S, M, L" -> une taille disponible par etiquette.
  // Les indisponibilites fines viennent de l'import, pas de la saisie.
  const sizes = text(formData, "sizes")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ label, available: true }));

  const images = list(formData, "images");

  // Deux pieces d'une meme marque ne peuvent pas partager une adresse :
  // on suffixe plutot que de renvoyer une erreur incomprehensible.
  let slugValue = text(formData, "piece_slug") || slugify(name);
  {
    const { data: clash } = await supabase
      .from("products")
      .select("id")
      .eq("brand_id", brand.id)
      .eq("slug", slugValue)
      .maybeSingle();
    if (clash && (clash as { id: string }).id !== id) {
      slugValue = `${slugValue}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  const payload = {
    brand_id: brand.id,
    slug: slugValue,
    sizes,
    size_label: text(formData, "size_label") || "Taille",
    compare_at_cents: wasCents,
    name,
    description: text(formData, "description"),
    price_cents: cents,
    currency: text(formData, "currency") || "EUR",
    images,
    image_url: images[0] ?? null,
    shop_url: shopUrl,
    categories: list(formData, "categories"),
    featured: formData.get("featured") === "on",
    available: formData.get("available") === "on",
    status: text(formData, "status") === "draft" ? "draft" : "published",
    position: Number(text(formData, "position") || 0),
  };

  const { error } = id
    ? await supabase.from("products").update(payload).eq("id", id).eq("brand_id", brand.id)
    : await supabase.from("products").insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  redirect(`/espace-marque/${slug}/pieces`);
}

export async function deleteBrandProduct(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return;

  await supabase
    .from("products")
    .delete()
    .eq("id", text(formData, "id"))
    .eq("brand_id", brand.id);

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  redirect(`/espace-marque/${slug}/pieces`);
}

/* ---------------- actions groupees ---------------- */

/**
 * Publier, remettre en brouillon ou supprimer plusieurs pieces d'un coup.
 *
 * Le filtre .eq("brand_id") en plus du .in("id") n'est pas redondant :
 * il garantit qu'un identifiant glisse dans le formulaire ne peut pas
 * toucher la piece d'une autre marque, meme avant que RLS s'en mele.
 */
export async function bulkProductAction(formData: FormData): Promise<Result> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const ids = list(formData, "ids");
  const intent = text(formData, "intent");
  if (ids.length === 0) return { ok: false, error: "Aucune pièce sélectionnée." };

  let error = null;

  if (intent === "publish") {
    ({ error } = await supabase
      .from("products")
      .update({ status: "published" })
      .in("id", ids)
      .eq("brand_id", brand.id));
  } else if (intent === "draft") {
    ({ error } = await supabase
      .from("products")
      .update({ status: "draft" })
      .in("id", ids)
      .eq("brand_id", brand.id));
  } else if (intent === "delete") {
    ({ error } = await supabase
      .from("products")
      .delete()
      .in("id", ids)
      .eq("brand_id", brand.id));
  } else {
    return { ok: false, error: "Action inconnue." };
  }

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  return { ok: true };
}

/* ---------------- import Shopify ---------------- */

export async function importShopifySelection(formData: FormData): Promise<Result> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const shopUrl = text(formData, "shop_url");
  const chosen = new Set(list(formData, "chosen"));
  if (chosen.size === 0) return { ok: false, error: "Aucune pièce sélectionnée." };

  const result = await fetchShopifyCatalogue(shopUrl);
  if (!result.ok) return { ok: false, error: result.error };

  // On relit le catalogue plutot que de faire confiance au formulaire :
  // sinon n'importe qui pourrait envoyer les prix et images de son choix.
  const rows = result.items
    .filter((item) => chosen.has(item.source_id))
    .map((item, index) => ({
      brand_id: brand.id,
      source_id: item.source_id,
      // Le "handle" Shopify est deja unique dans la boutique : il fait
      // une adresse propre sans risque de collision.
      slug: item.slug || slugify(item.name),
      name: item.name,
      description: item.description,
      price_cents: item.price_cents,
      compare_at_cents: item.compare_at_cents,
      currency: item.currency,
      sizes: item.sizes,
      size_label: item.size_label,
      images: item.images,
      image_url: item.images[0] ?? null,
      shop_url: item.shop_url,
      available: item.available,
      categories: [] as string[],
      status: "draft" as const,
      position: index,
    }));

  if (rows.length === 0) return { ok: false, error: "Ces pièces n'existent plus dans le catalogue." };

  // Reimporter met a jour au lieu de dupliquer, grace a l'index unique
  // sur (brand_id, source_id).
  const { error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "brand_id,source_id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  redirect(`/espace-marque/${slug}/pieces`);
}
