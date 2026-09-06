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

/**
 * S'en aller pour de bon.
 *
 * TOUT LE TRAVAIL EST EN BASE, ET C'EST VOULU. Cette action ne supprime
 * rien elle-même : elle appelle `supprimer_mon_compte`, qui efface la
 * ligne `auth.users` de l'appelant et laisse le schéma faire le reste en
 * cascade (voir migration-30). Écrire ici la liste des tables à vider
 * aurait été une deuxième définition de ce qu'est un compte — et celle
 * qu'on oublie de mettre à jour le jour où une table s'ajoute.
 *
 * La fonction ne prend aucun argument : il n'y a donc pas d'identifiant
 * à passer, pas de vérification à faire ici, et rien à falsifier depuis
 * le navigateur.
 *
 * LA DÉCONNEXION EST TENTÉE, PAS EXIGÉE. Le compte n'existe plus quand
 * on y arrive : `signOut` peut très bien échouer parce qu'il ne trouve
 * plus à qui parler. Ce n'est pas une erreur à remonter — le but est
 * d'effacer le cookie de session, et la page qui suit repart de zéro de
 * toute façon.
 */
export async function supprimerMonCompte(): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const { error } = await supabase.rpc("supprimer_mon_compte");
  if (error) return { ok: false, error: error.message };

  try {
    await supabase.auth.signOut();
  } catch {
    // le compte est déjà parti : il n'y a plus de session à fermer
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
