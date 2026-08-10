"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import type { Brand, Product } from "./types";

/**
 * Les avis : une note et, si on veut, quelques phrases.
 *
 * À distinguer soigneusement des deux autres gestes du site.
 *
 *   Le coup de cœur, sur une pièce, dit « celle-ci me plaît ». Il part
 *   en un clic et ne demande rien.
 *
 *   Le favori, sur une marque, dit « je veux la suivre ». C'est un
 *   signet, pas un jugement.
 *
 *   L'avis, lui, engage : on met une note, on explique. C'est le seul
 *   des trois qui prétend dire si c'est BIEN.
 *
 * Les trois ne se mélangent jamais dans un classement. Une pièce très
 * aimée et une pièce très bien notée ne racontent pas la même chose.
 *
 * LA NOTE EST EN DEMI-ÉTOILES, de 1 à 10.
 * Un entier se compare et se moyenne sans mauvaise surprise, un nombre
 * à virgule non. La division par deux appartient à l'affichage, et
 * seulement à lui.
 */

export type Avis = {
  id: string;
  user_id: string;
  auteur: string;
  /** De 1 à 10, soit de 0,5 à 5 étoiles. */
  note: number;
  commentaire: string;
  created_at: string;
  updated_at: string;
};

export type Note = { moyenne: number; avis: number };

type Cible = { brand_id: string } | { product_id: string };

function colonne(cible: Cible): "brand_id" | "product_id" {
  return "brand_id" in cible ? "brand_id" : "product_id";
}
function valeur(cible: Cible): string {
  return "brand_id" in cible ? cible.brand_id : cible.product_id;
}

/* ---------------- lecture ---------------- */

export async function getAvis(cible: Cible): Promise<Avis[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("avis_publics")
    .select("id, user_id, auteur, note, commentaire, created_at, updated_at")
    .eq(colonne(cible), valeur(cible))
    .order("created_at", { ascending: false })
    .limit(100);

  return (data as Avis[] | null) ?? [];
}

/** Mon propre avis sur cette cible, s'il existe. */
export async function getMonAvis(cible: Cible): Promise<Avis | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("avis_publics")
    .select("id, user_id, auteur, note, commentaire, created_at, updated_at")
    .eq(colonne(cible), valeur(cible))
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as Avis | null) ?? null;
}

/** Les moyennes d'une liste de pièces, en une requête. */
export async function getNotesPieces(productIds: string[]): Promise<Map<string, Note>> {
  const vide = new Map<string, Note>();
  if (productIds.length === 0) return vide;

  const supabase = await createClient();
  if (!supabase) return vide;

  const { data } = await supabase
    .from("product_ratings")
    .select("product_id, note_moyenne, avis")
    .in("product_id", productIds);

  return new Map(
    ((data ?? []) as { product_id: string; note_moyenne: number; avis: number }[]).map((r) => [
      r.product_id,
      { moyenne: r.note_moyenne, avis: r.avis },
    ])
  );
}

export async function getNotesMarques(brandIds: string[]): Promise<Map<string, Note>> {
  const vide = new Map<string, Note>();
  if (brandIds.length === 0) return vide;

  const supabase = await createClient();
  if (!supabase) return vide;

  const { data } = await supabase
    .from("brand_ratings")
    .select("brand_id, note_moyenne, avis")
    .in("brand_id", brandIds);

  return new Map(
    ((data ?? []) as { brand_id: string; note_moyenne: number; avis: number }[]).map((r) => [
      r.brand_id,
      { moyenne: r.note_moyenne, avis: r.avis },
    ])
  );
}

/* ---------------- classements ---------------- */

/**
 * Il faut au moins ce nombre d'avis pour figurer au classement.
 *
 * Sans ce seuil, une pièce notée cinq étoiles par une seule personne
 * dépasserait une pièce notée quatre et demie par quarante. Ce n'est
 * pas un classement, c'est un tirage au sort.
 */
const AVIS_MINIMUM = 3;

export async function getMieuxNoteesPieces(
  limite = 60
): Promise<{ product: Product; note: Note }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: notes } = await supabase
    .from("product_ratings")
    .select("product_id, note_moyenne, avis")
    .gte("avis", AVIS_MINIMUM)
    .order("note_moyenne", { ascending: false })
    .order("avis", { ascending: false })
    .limit(limite);

  const rows = (notes ?? []) as { product_id: string; note_moyenne: number; avis: number }[];
  if (rows.length === 0) return [];

  const { data: produits } = await supabase
    .from("products")
    .select("*, brand:brands(id,slug,name)")
    .in("id", rows.map((r) => r.product_id))
    .eq("status", "published");

  const parId = new Map(((produits ?? []) as unknown as Product[]).map((p) => [p.id, p]));

  return rows
    .map((r) => ({
      product: parId.get(r.product_id),
      note: { moyenne: r.note_moyenne, avis: r.avis },
    }))
    .filter((x): x is { product: Product; note: Note } => Boolean(x.product));
}

export async function getMieuxNoteesMarques(
  limite = 60
): Promise<{ brand: Brand; note: Note }[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: notes } = await supabase
    .from("brand_ratings")
    .select("brand_id, note_moyenne, avis")
    .gte("avis", AVIS_MINIMUM)
    .order("note_moyenne", { ascending: false })
    .order("avis", { ascending: false })
    .limit(limite);

  const rows = (notes ?? []) as { brand_id: string; note_moyenne: number; avis: number }[];
  if (rows.length === 0) return [];

  const { data: marques } = await supabase
    .from("brands")
    .select("*")
    .in("id", rows.map((r) => r.brand_id))
    .eq("status", "published");

  const parId = new Map(((marques ?? []) as Brand[]).map((b) => [b.id, b]));

  return rows
    .map((r) => ({
      brand: parId.get(r.brand_id),
      note: { moyenne: r.note_moyenne, avis: r.avis },
    }))
    .filter((x): x is { brand: Brand; note: Note } => Boolean(x.brand));
}

/** Le nombre d'avis en dessous duquel on ne classe pas. */
export async function avisMinimum(): Promise<number> {
  return AVIS_MINIMUM;
}

/* ---------------- écriture ---------------- */

export type ResultatAvis = {
  ok: boolean;
  error?: string;
  raison?: "non-connecte";
};

export async function enregistrerAvis(formData: FormData): Promise<ResultatAvis> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, raison: "non-connecte" };

  const note = Number(formData.get("note"));
  if (!Number.isInteger(note) || note < 1 || note > 10) {
    return { ok: false, error: "Choisis une note entre une demi-étoile et cinq." };
  }

  const commentaire = String(formData.get("commentaire") ?? "").trim().slice(0, 2000);
  const brandId = String(formData.get("brand_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const chemin = String(formData.get("chemin") ?? "/");

  if (Boolean(brandId) === Boolean(productId)) {
    return { ok: false, error: "Avis mal formé." };
  }

  /*
   * Un avis par personne et par cible : on remplace le sien plutôt que
   * d'en empiler un second. Changer d'avis est normal, en avoir deux
   * en même temps ne l'est pas.
   *
   * On cherche donc le sien, puis on modifie ou on crée. C'était écrit
   * avant avec un « upsert », et ça ne pouvait pas marcher : les deux
   * index uniques de la table sont PARTIELS, chacun assorti d'un
   * « where … is not null », parce qu'un avis porte sur une marque ou
   * sur une pièce mais jamais sur les deux. Or Postgres refuse
   * d'appuyer un ON CONFLICT sur un index partiel tant qu'on ne lui
   * répète pas la même condition, ce que l'interface de Supabase ne
   * permet pas d'écrire. D'où le message incompréhensible reçu à
   * l'envoi : « no unique or exclusion constraint matching the ON
   * CONFLICT specification ».
   *
   * Deux requêtes au lieu d'une, sur un geste qu'on fait une fois par
   * marque. L'index reste en place et continue de garantir l'unicité.
   */
  const cible = brandId ? "brand_id" : "product_id";
  const valeurCible = brandId || productId;

  const { data: existant } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq(cible, valeurCible)
    .maybeSingle();

  const { error } = existant
    ? await supabase
        .from("reviews")
        .update({ note, commentaire })
        .eq("id", (existant as { id: string }).id)
    : await supabase.from("reviews").insert({
        user_id: user.id,
        brand_id: brandId || null,
        product_id: productId || null,
        note,
        commentaire,
      });

  if (error) {
    // Reste le cas où deux envois se croisent : l'index a fait son
    // travail, on rattrape en modifiant celui qui vient d'être créé.
    if (/duplicate key|unique/i.test(error.message)) {
      const { data: doublon } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq(cible, valeurCible)
        .maybeSingle();

      if (doublon) {
        const { error: reprise } = await supabase
          .from("reviews")
          .update({ note, commentaire })
          .eq("id", (doublon as { id: string }).id);
        if (reprise) return { ok: false, error: reprise.message };
        revalidatePath(chemin);
        revalidatePath("/populaires");
        return { ok: true };
      }
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(chemin);
  revalidatePath("/populaires");
  return { ok: true };
}

export async function supprimerAvis(formData: FormData): Promise<ResultatAvis> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = String(formData.get("id") ?? "");
  const chemin = String(formData.get("chemin") ?? "/");

  // Les règles de la base décident qui a le droit : son auteur, ou un
  // administrateur. Ce fichier ne fait que transmettre la demande.
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(chemin);
  revalidatePath("/populaires");
  return { ok: true };
}
