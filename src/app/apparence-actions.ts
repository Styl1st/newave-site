"use server";

import { createClient } from "@/lib/supabase/server";
import { nettoyerApparence } from "@/lib/apparence";
import type { Preferences } from "@/lib/theme";

/**
 * Range l'apparence sur le profil.
 *
 * Sans compte, on ne fait rien et on le dit : le navigateur garde
 * alors sa copie locale, ce qui suffit tant qu'on reste sur la même
 * machine. C'est le seul cas où l'on ne peut pas faire mieux.
 */
export async function enregistrerApparence(prefs: Preferences): Promise<{ ok: boolean }> {
  const propre = nettoyerApparence(prefs);
  if (!propre) return { ok: false };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // RLS limite déjà l'écriture à sa propre ligne, et le déclencheur
  // protect_profile_role empêche qu'on en profite pour changer de rôle.
  const { error } = await supabase
    .from("profiles")
    .update({ apparence: propre })
    .eq("id", user.id);

  return { ok: !error };
}
