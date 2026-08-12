"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { fetchCatalogue } from "@/lib/catalogue";
import { synchroniserCatalogue } from "@/lib/catalogue-sync";
import { rafraichirLesTaux } from "@/lib/devises";

/**
 * Relire toutes les boutiques, à la demande.
 *
 * La tâche de midi fait déjà ce travail, mais six marques par jour :
 * il faut deux semaines pour faire le tour d'un annuaire de quatre-
 * vingts fiches. Trop lent quand on vient de corriger quelque chose
 * qui ne se recalcule qu'à la lecture — le prix converti en euros, ou
 * les tailles dédoublonnées.
 *
 * D'où ce bouton. Même logique que la tâche automatique, mais lancé
 * quand on en a besoin et sans attendre le lendemain.
 */

/** Marques par passage. Vercel coupe une fonction au bout d'une minute. */
const LOT = 3;

export type BilanMarque = {
  brandId: string;
  nom: string;
  note: string;
  ok: boolean;
};

type Fiche = { id: string; name: string; slug: string; shop_url: string | null; website_url: string | null };

export async function rafraichirLesCatalogues(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  /** Renseigné au premier passage seulement. */
  taux?: string;
  resultats: BilanMarque[];
  parcourues: number;
  restantes: number;
}> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase n'est pas configuré.",
      resultats: [],
      parcourues: 0,
      restantes: 0,
    };
  }

  /*
   * On avance par rang plutôt qu'en renvoyant la liste de ce qui a
   * déjà été vu : au bout de quatre-vingts passages, cette liste
   * dépasserait la taille raisonnable d'une requête. L'ordre de
   * création ne bouge pas pendant l'opération, un rang suffit donc.
   */
  const depuis = Math.max(0, Number(formData.get("depuis") ?? 0) || 0);

  /*
   * Les taux de change d'abord, et une seule fois.
   *
   * L'ordre compte : la lecture d'un catalogue calcule au passage
   * l'équivalent en euros de chaque prix. Rafraîchir les taux après
   * coup ne servirait à rien avant la fois suivante.
   */
  let taux: string | undefined;
  if (depuis === 0) {
    const bilan = await rafraichirLesTaux(supabase);
    taux = bilan.ok
      ? `${bilan.devises} devises à jour.`
      : `Taux non rafraîchis (${bilan.erreur}). On garde les précédents.`;
  }

  const { data, count, error } = await supabase
    .from("brands")
    .select("id, name, slug, shop_url, website_url", { count: "exact" })
    .or("shop_url.not.is.null,website_url.not.is.null")
    .order("created_at", { ascending: false })
    .range(depuis, depuis + LOT - 1);

  if (error) {
    return { ok: false, error: error.message, resultats: [], parcourues: 0, restantes: 0 };
  }

  const marques = (data as Fiche[] | null) ?? [];
  const resultats: BilanMarque[] = [];

  for (const marque of marques) {
    const adresse = marque.shop_url ?? marque.website_url;
    if (!adresse) continue;

    const lecture = await fetchCatalogue(adresse);
    let note: string;
    let ok = false;

    if (!lecture.ok) {
      note = lecture.error;
    } else if (lecture.items.length === 0) {
      note = "La boutique répond, mais son catalogue est vide.";
    } else {
      const bilan = await synchroniserCatalogue(supabase, marque.id, lecture.items, {
        statutDesNouvelles: "published",
        marquerLesAbsentes: true,
      });

      if (bilan.erreur) {
        note = bilan.erreur;
      } else {
        ok = true;
        note = `${bilan.majs} pièce${bilan.majs > 1 ? "s" : ""} revue${bilan.majs > 1 ? "s" : ""}`;
        if (bilan.creees > 0) note += `, ${bilan.creees} nouvelle${bilan.creees > 1 ? "s" : ""}`;
        if (bilan.retirees > 0) note += `, ${bilan.retirees} retirée${bilan.retirees > 1 ? "s" : ""}`;
        note += ".";
      }
    }

    // On date le passage, réussi ou non, pour que la tâche quotidienne
    // reprenne la file là où celle-ci l'a laissée. L'échec est ignoré :
    // ces colonnes viennent d'une migration, et leur absence ne doit
    // pas faire échouer une mise à jour qui, elle, a fonctionné.
    await supabase
      .from("brands")
      .update({ catalogue_sync_at: new Date().toISOString(), catalogue_sync_note: note })
      .eq("id", marque.id);

    resultats.push({ brandId: marque.id, nom: marque.name, note, ok });
  }

  revalidatePath("/marques");
  revalidatePath("/admin/marques");

  return {
    ok: true,
    taux,
    resultats,
    parcourues: marques.length,
    restantes: Math.max(0, (count ?? 0) - (depuis + marques.length)),
  };
}
