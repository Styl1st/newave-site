"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireManagedBrand } from "@/lib/brand-space";
import { fetchCatalogue, normalizeShopUrl } from "@/lib/catalogue";
import { synchroniserCatalogue } from "@/lib/catalogue-sync";

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

/** Le rang qui suit la dernière pièce d'une marque. */
async function rangSuivant(brandId: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;

  const { data } = await supabase
    .from("products")
    .select("position")
    .eq("brand_id", brandId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data as { position: number | null } | null)?.position ?? -1) + 1;
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
  };

  /*
   * L'ordre d'affichage ne se saisit plus.
   *
   * Le formulaire demandait un numéro, ce qui n'a de sens que si l'on
   * a toutes ses pièces sous les yeux au même moment. Une pièce
   * modifiée garde donc simplement son rang, et une nouvelle se range
   * à la suite des autres.
   */
  const { error } = id
    ? await supabase.from("products").update(payload).eq("id", id).eq("brand_id", brand.id)
    : await supabase.from("products").insert({ ...payload, position: await rangSuivant(brand.id) });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  redirect(`/espace-marque/${slug}/pieces`);
}

/**
 * Une pièce aimée ne s'efface pas, elle s'archive.
 *
 * Effacer la ligne emporterait avec elle les coups de cœur reçus. Or
 * ces coups de cœur ne nous appartiennent pas : ils disent ce que des
 * gens ont aimé, ils font partie de l'histoire de la marque, et ils
 * continuent de lui donner de la visibilité longtemps après que la
 * pièce a quitté l'étal. On la marque donc comme retirée, et la fiche
 * l'explique.
 *
 * Une pièce que personne n'a jamais aimée, elle, part vraiment : la
 * garder n'apprendrait rien à personne.
 */
export async function deleteBrandProduct(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return;

  const id = text(formData, "id");

  const { count } = await supabase
    .from("product_likes")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", id);

  if ((count ?? 0) > 0) {
    await supabase
      .from("products")
      .update({ retired_at: new Date().toISOString(), available: false })
      .eq("id", id)
      .eq("brand_id", brand.id);
  } else {
    await supabase.from("products").delete().eq("id", id).eq("brand_id", brand.id);
  }

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
    // Même règle qu'à l'unité : ce qui a été aimé s'archive, le reste
    // s'efface. On demande d'abord lesquelles portent des coups de cœur.
    const { data: aimees } = await supabase
      .from("product_likes")
      .select("product_id")
      .in("product_id", ids);

    const aArchiver = new Set(
      ((aimees ?? []) as { product_id: string }[]).map((l) => l.product_id)
    );
    const aEffacer = ids.filter((id) => !aArchiver.has(id));

    if (aArchiver.size > 0) {
      ({ error } = await supabase
        .from("products")
        .update({ retired_at: new Date().toISOString(), available: false })
        .in("id", Array.from(aArchiver))
        .eq("brand_id", brand.id));
    }
    if (!error && aEffacer.length > 0) {
      ({ error } = await supabase
        .from("products")
        .delete()
        .in("id", aEffacer)
        .eq("brand_id", brand.id));
    }
  } else {
    return { ok: false, error: "Action inconnue." };
  }

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  return { ok: true };
}

/* ---------------- import du catalogue ---------------- */

/**
 * Lit une boutique et range tout son catalogue, en un seul geste.
 *
 * La version précédente affichait d'abord la boutique, laissait cocher
 * les pièces, puis relisait TOUTE la boutique une seconde fois au
 * moment de valider. C'est ce qui la faisait échouer une fois sur
 * deux : parcourir un plan de site prend une dizaine de secondes, le
 * faire deux fois frôle la minute au bout de laquelle Vercel coupe. Et
 * dès qu'une boutique répondait mal, la seconde lecture ne renvoyait
 * plus exactement les mêmes pièces : les identifiants cochés ne
 * correspondaient alors à rien, et l'import s'arrêtait sur « ces
 * pièces n'existent plus dans le catalogue ».
 *
 * Une seule lecture, donc, et tout ce qu'elle trouve est importé. Ce
 * n'est pas seulement plus fiable, c'est aussi plus simple : les
 * pièces arrivent en brouillon, invisibles pour le public, et la page
 * « Mes pièces » sait déjà publier ou supprimer en lot. Trier après
 * coup demande moins de gestes que cocher avant.
 */
export async function importerLeCatalogue(formData: FormData): Promise<Result> {
  const slug = text(formData, "slug");
  const { brand } = await requireManagedBrand(slug);

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const adresse = text(formData, "boutique") || brand.shop_url || brand.website_url || "";
  if (!adresse) {
    return { ok: false, error: "Renseigne d'abord l'adresse de ta boutique." };
  }

  const lecture = await fetchCatalogue(adresse);
  if (!lecture.ok) return { ok: false, error: lecture.error };
  if (lecture.items.length === 0) {
    return { ok: false, error: "La boutique répond, mais son catalogue est vide." };
  }

  const bilan = await synchroniserCatalogue(supabase, brand.id, lecture.items, {
    // En brouillon : rien ne s'affiche avant relecture.
    statutDesNouvelles: "draft",
  });
  if (bilan.erreur) return { ok: false, error: bilan.erreur };

  /*
   * L'adresse est retenue, pour ne pas avoir à la recoller.
   *
   * Réduite à son domaine, et c'est important : on accepte le lien
   * direct d'une pièce pour dépanner, mais l'enregistrer tel quel
   * ferait pointer la fiche, et la relecture quotidienne, sur une
   * seule pièce au lieu de la boutique entière.
   */
  const base = normalizeShopUrl(adresse);
  if (base && base !== brand.shop_url) {
    await supabase.from("brands").update({ shop_url: base }).eq("id", brand.id);
  }

  revalidatePath(`/espace-marque/${slug}/pieces`);
  revalidatePath(`/marques/${slug}`);
  redirect(`/espace-marque/${slug}/pieces?nouvelles=${bilan.creees}&majs=${bilan.majs}`);
}
