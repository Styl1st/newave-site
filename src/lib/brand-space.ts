import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getProfile } from "./auth";
import type { Brand, Product, Profile } from "./types";

/**
 * Les marques que la personne connectee peut gerer.
 * Un admin les gere toutes ; un gerant, seulement les siennes.
 */
export async function getManagedBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const profile = await getProfile();
  if (!profile) return [];

  if (profile.role === "admin") {
    const { data } = await supabase.from("brands").select("*").order("name");
    return (data as Brand[]) ?? [];
  }

  const { data } = await supabase
    .from("brand_managers")
    .select("brand:brands(*)")
    .eq("user_id", profile.id);

  return (data ?? [])
    .map((row) => (row as unknown as { brand: Brand | null }).brand)
    .filter((b): b is Brand => Boolean(b));
}

/**
 * Les marques dont la personne est réellement gérante.
 *
 * Différent de getManagedBrands(), qui renvoie tout l'annuaire à un
 * administrateur : c'est ce qu'il faut pour l'espace de travail, ce
 * n'est pas ce qu'il faut pour un bouton « ma marque » dans la barre
 * du haut. Un administrateur qui dirige aussi une marque doit y
 * retrouver la sienne, pas les soixante-dix autres.
 */
export async function getMesMarques(): Promise<Pick<Brand, "id" | "slug" | "name">[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const profile = await getProfile();
  if (!profile) return [];

  const { data } = await supabase
    .from("brand_managers")
    .select("brand:brands(id,slug,name)")
    .eq("user_id", profile.id);

  return (data ?? [])
    .map((row) => (row as unknown as { brand: Pick<Brand, "id" | "slug" | "name"> | null }).brand)
    .filter((b): b is Pick<Brand, "id" | "slug" | "name"> => Boolean(b));
}

/**
 * Charge une marque en verifiant que la personne a le droit d'y toucher.
 * Redirige plutot que de renvoyer null : ces pages n'ont aucun sens sans droits.
 *
 * C'est un confort d'interface, pas la securite : ce sont les regles RLS
 * de migration-02.sql qui empechent reellement l'ecriture.
 */
export async function requireManagedBrand(
  slug: string
): Promise<{ brand: Brand; profile: Profile; isAdmin: boolean }> {
  const profile = await getProfile();
  if (!profile) redirect(`/connexion?suite=/espace-marque/${slug}`);

  const supabase = await createClient();
  if (!supabase) redirect("/");

  const { data } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
  const brand = data as Brand | null;
  if (!brand) redirect("/espace-marque");

  if (profile.role === "admin") return { brand, profile, isAdmin: true };

  const { data: link } = await supabase
    .from("brand_managers")
    .select("brand_id")
    .eq("brand_id", brand.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!link) redirect("/espace-marque");
  return { brand, profile, isAdmin: false };
}

/** Les pieces d'une marque, brouillons compris. */
export async function getBrandProducts(brandId: string): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("brand_id", brandId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as Product[]) ?? [];
}

export async function getBrandProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return (data as Product) ?? null;
}

/**
 * Etat du catalogue d'une marque, du point de vue de la personne qui
 * regarde. Renvoie null si elle n'a pas les droits : le bandeau qui
 * s'appuie dessus ne doit jamais apparaitre pour un visiteur.
 *
 * Sert a repondre tout de suite a "pourquoi ma page est vide ?" sans
 * avoir a ouvrir la base.
 */
export async function getCatalogueInsight(brandId: string): Promise<{
  total: number;
  published: number;
  drafts: number;
  /**
   * Celui qui regarde GÈRE cette marque, ou l'administre seulement.
   *
   * Les deux voient la même barre et les mêmes chiffres — un admin a
   * besoin d'agir sur n'importe quelle fiche. Mais ils ne s'adressent
   * pas de la même façon : « ton espace » et « modifier ma fiche » sont
   * faux devant une marque qu'on administre sans la tenir, et ce genre
   * de petit mensonge se remarque tout de suite.
   */
  gerant: boolean;
} | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  /*
   * On cherche le lien de gestion DANS TOUS LES CAS, admin compris.
   *
   * Il servait uniquement de laissez-passer, et l'on s'en dispensait
   * donc pour un administrateur. Mais il répond aussi à une autre
   * question — « est-ce SA marque ? » — et c'est elle qui décide des
   * mots employés plus haut. Un admin peut très bien gérer une marque
   * en propre : le rôle ne dit rien de l'appartenance.
   */
  const { data: link } = await supabase
    .from("brand_managers")
    .select("brand_id")
    .eq("brand_id", brandId)
    .eq("user_id", profile.id)
    .maybeSingle();

  const gerant = Boolean(link);
  if (!gerant && profile.role !== "admin") return null;

  // Sans filtre de statut : c'est justement l'ecart entre les deux
  // chiffres qui explique une page vide.
  const { data } = await supabase.from("products").select("status").eq("brand_id", brandId);
  const rows = (data as { status: string }[]) ?? [];

  return {
    total: rows.length,
    published: rows.filter((r) => r.status === "published").length,
    drafts: rows.filter((r) => r.status === "draft").length,
    gerant,
  };
}
