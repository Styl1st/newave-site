import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Le profil de la personne connectee, ou null si personne ne l'est. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
}

/**
 * A appeler en haut de chaque page d'administration.
 * Renvoie le profil admin, ou redirige.
 *
 * C'est une commodite, pas la securite : ce qui protege vraiment les
 * donnees, ce sont les regles RLS de schema.sql. Meme si quelqu'un
 * contournait cette page, la base refuserait l'ecriture.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?suite=/admin");
  if (profile.role !== "admin") redirect("/");
  return profile;
}

export async function requireUser(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?suite=/favoris");
  return profile;
}
