"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lireUnLotDeCouleurs, type BilanCouleurs } from "@/lib/couleurs-lot";

/**
 * Un passage de lecture des couleurs, lancé depuis l'admin.
 *
 * Quarante secondes au plus : la page qui l'appelle a droit à soixante
 * (`maxDuration`), et le bouton enchaîne les passages tant qu'il en
 * reste. Il écrit avec la session de l'administrateur, comme le reste de
 * l'admin : `poser_les_couleurs` le vérifie de son côté.
 */
export async function lireLesCouleurs(): Promise<BilanCouleurs> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, erreur: "Supabase n'est pas configuré.", lues: 0, parLeNom: 0, parLaPhoto: 0, sansReponse: 0, restantes: null };
  }

  const bilan = await lireUnLotDeCouleurs(supabase, 40_000);
  // Les comptes du filtre se recalculent en base toutes les dix minutes ;
  // la vitrine, elle, peut relire tout de suite.
  if (bilan.lues > 0) revalidateTag("pieces");
  return bilan;
}
