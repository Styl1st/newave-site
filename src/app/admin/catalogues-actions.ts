"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  deduireLePaysDetaille,
  fetchCatalogue,
  fetchVisuels,
  normalizeShopUrl,
} from "@/lib/catalogue";
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

type Fiche = {
  id: string;
  name: string;
  slug: string;
  shop_url: string | null;
  website_url: string | null;
  country: string | null;
  cover_url: string | null;
  cover_video_url: string | null;
};

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
   * dépasserait la taille raisonnable d'une requête.
   *
   * Cela suppose un ordre STABLE d'un appel à l'autre, et c'est là
   * qu'était le bug : le tri se faisait sur `created_at` seul. Or les
   * marques ont été insérées en lot, et `now()` renvoie l'heure de la
   * TRANSACTION, pas celle de la ligne : des dizaines de fiches
   * partagent donc la même date à la microseconde près. Postgres ne
   * promet aucun ordre entre des lignes ex æquo, et il n'a aucune
   * raison de rendre le même deux fois de suite.
   *
   * Conséquence directe : la fenêtre 0-2 et la fenêtre 3-5 pouvaient
   * se recouvrir. Certaines marques étaient relues deux fois — d'où
   * les doublons dans la liste — et d'autres n'étaient jamais lues du
   * tout, ce qui est nettement plus grave puisque ça ne se voit pas.
   *
   * Le second critère règle la question : `id` est unique, l'ordre
   * total est donc entièrement déterminé.
   */
  const depuis = Math.max(0, Number(formData.get("depuis") ?? 0) || 0);

  /*
   * Corriger aussi le pays, sur demande expresse.
   *
   * Ce n'est pas coché par défaut, et c'est délibéré : écraser une
   * valeur déjà saisie est le genre d'action qu'on ne veut pas
   * découvrir après coup. Quand la case est cochée, on ne remplace que
   * sur un indice SOLIDE — ce que le site déclare, ou l'extension de
   * son domaine. La monnaie sert à remplir un champ vide, jamais à
   * contredire une saisie.
   */
  const corrigerPays = formData.get("pays") === "1";

  /*
   * Compléter les visuels manquants.
   *
   * On ne REMPLACE jamais : une couverture choisie à la main vaut
   * toujours mieux que ce qu'on devine. On ne remplit que les cases
   * vides — et c'est là tout l'intérêt, parce que ce sont justement
   * celles qu'on n'a pas envie d'aller chercher une par une.
   *
   * Une seule requête par marque : `fetchVisuels` ne lit que la page
   * d'accueil, contrairement au pré-remplissage complet qui parcourt
   * aussi le catalogue.
   */
  const completerVisuels = formData.get("visuels") === "1";

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
    .select("id, name, slug, shop_url, website_url, country, cover_url, cover_video_url", {
      count: "exact",
    })
    .or("shop_url.not.is.null,website_url.not.is.null")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
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

    // Une boutique fermée pour un drop n'est pas une lecture ratée :
    // on le note sur la fiche pour pouvoir le dire aux visiteurs.
    const verrouillee = !lecture.ok && Boolean(lecture.verrouillee);

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

    // Les visuels manquants, si on l'a demandé.
    if (completerVisuels && (!marque.cover_url || !marque.cover_video_url)) {
      const base = normalizeShopUrl(adresse);
      const trouves = base ? await fetchVisuels(base) : null;

      if (trouves) {
        const maj: Record<string, string> = {};
        if (!marque.cover_url && trouves.image) maj.cover_url = trouves.image;
        if (!marque.cover_video_url && trouves.video) maj.cover_video_url = trouves.video;

        if (Object.keys(maj).length > 0) {
          await supabase.from("brands").update(maj).eq("id", marque.id);
          note += ` Visuel${Object.keys(maj).length > 1 ? "s" : ""} récupéré${
            Object.keys(maj).length > 1 ? "s" : ""
          } : ${Object.keys(maj).includes("cover_url") ? "couverture" : ""}${
            Object.keys(maj).length > 1 ? " et " : ""
          }${Object.keys(maj).includes("cover_video_url") ? "animation" : ""}.`;
        }
      }
    }

    // Le pays, si on l'a demandé.
    if (corrigerPays) {
      const base = normalizeShopUrl(adresse);
      const trouve = base ? await deduireLePaysDetaille(base) : null;
      const actuel = (marque.country ?? "").trim();

      const solide = trouve && (trouve.indice === "declare" || trouve.indice === "domaine");
      const aRemplir = !actuel && trouve;

      if (trouve && (solide || aRemplir) && trouve.pays !== actuel) {
        await supabase.from("brands").update({ country: trouve.pays }).eq("id", marque.id);
        note += actuel
          ? ` Pays corrigé : ${actuel} → ${trouve.pays}.`
          : ` Pays renseigné : ${trouve.pays}.`;
      }
    }

    // On date le passage, réussi ou non, pour que la tâche quotidienne
    // reprenne la file là où celle-ci l'a laissée. L'échec est ignoré :
    // ces colonnes viennent d'une migration, et leur absence ne doit
    // pas faire échouer une mise à jour qui, elle, a fonctionné.
    await supabase
      .from("brands")
      .update({
        catalogue_sync_at: new Date().toISOString(),
        catalogue_sync_note: note,
        catalogue_verrouille: verrouillee,
      })
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
