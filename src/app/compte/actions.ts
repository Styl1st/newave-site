"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type Result = { ok: boolean; error?: string; message?: string };

/** Change le nom affiche. L'email et le role ne se modifient pas ici. */
export async function updateDisplayName(formData: FormData): Promise<Result> {
  const profile = await requireUser();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) return { ok: false, error: "Le nom ne peut pas être vide." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", profile.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/compte");
  return { ok: true, message: "Nom mis à jour." };
}
