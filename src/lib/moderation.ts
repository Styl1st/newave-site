"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { requireAdmin } from "./auth";
import {
  estUneCible,
  motifValide,
  type ASignaler,
  type CibleSignalement,
  type Signalement,
} from "./signalement";

/**
 * Signalement et modération.
 *
 * Deux gestes, et deux mains différentes.
 *
 * N'importe qui, une fois connecté, peut SIGNALER un avis, une pièce
 * ou une marque. Ce n'est pas un vote et ça ne retire rien : ça met la
 * chose dans une pile que l'administration regarde. C'est important de
 * le dire clairement dans l'interface, sinon on croit avoir supprimé
 * quelque chose, on ne le voit pas disparaître, et on recommence.
 *
 * L'administration TRANCHE : elle retire, ou elle classe sans suite.
 * Dans les deux cas la pile se vide, et c'est cette seconde porte qui
 * compte le plus — beaucoup de signalements traduisent un désaccord et
 * non un abus. Sans elle, la seule façon de vider la pile serait
 * d'effacer des contenus légitimes.
 *
 * Les droits ne sont pas décidés ici mais dans la base, par les règles
 * de la migration 19. Ce fichier transmet des demandes.
 */

const COLONNE: Record<CibleSignalement, "review_id" | "product_id" | "brand_id"> = {
  avis: "review_id",
  piece: "product_id",
  marque: "brand_id",
};

/* ---------------- côté visiteur ---------------- */

export async function signaler(
  formData: FormData
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Il faut être connecté pour signaler." };

  const cible = String(formData.get("cible") ?? "");
  const cibleId = String(formData.get("cibleId") ?? "");
  const motif = String(formData.get("motif") ?? "");
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 600);
  const chemin = String(formData.get("chemin") ?? "/");

  if (!estUneCible(cible)) return { ok: false, error: "Cible inconnue." };
  if (!cibleId) return { ok: false, error: "Cible introuvable." };
  if (!motifValide(cible, motif)) return { ok: false, error: "Choisis un motif." };

  const { error } = await supabase.from("signalements").insert({
    user_id: user.id,
    [COLONNE[cible]]: cibleId,
    motif,
    detail: detail || null,
  });

  if (error) {
    /*
     * 23505, la contrainte d'unicité.
     *
     * Ce n'est pas un échec du point de vue de la personne : son
     * signalement est bien enregistré, simplement il l'était déjà. Lui
     * montrer une erreur rouge la pousserait à recommencer, ou à
     * penser que le site ne marche pas.
     */
    if (error.code === "23505") {
      return { ok: true, message: "Tu l'as déjà signalé. On s'en occupe." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(chemin);
  return { ok: true, message: "Merci. Un administrateur va le regarder." };
}

/**
 * Parmi ces cibles, celles que la personne connectée a déjà signalées.
 *
 * Sans cette lecture, le bouton proposerait de signaler une deuxième
 * fois : la base refuserait, et il faudrait expliquer un échec qui n'en
 * est pas un.
 *
 * On renvoie un tableau et non un ensemble : ce fichier est un module
 * serveur, et tout ce qui en sort doit pouvoir traverser la frontière
 * du navigateur.
 */
export async function mesSignalements(
  cible: CibleSignalement,
  ids: string[]
): Promise<string[]> {
  if (ids.length === 0) return [];

  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const colonne = COLONNE[cible];
  const { data } = await supabase
    .from("signalements")
    .select(colonne)
    .eq("user_id", user.id)
    .in(colonne, ids);

  return ((data as Record<string, string>[] | null) ?? [])
    .map((l) => l[colonne])
    .filter(Boolean);
}

/* ---------------- côté administration ---------------- */

/** Retire un avis, quel qu'en soit l'auteur. */
export async function retirerAvis(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Avis introuvable." };

  // Les signalements qui le visaient partent avec lui : la clé
  // étrangère est en `on delete cascade`, il n'y a rien à nettoyer.
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  const chemin = String(formData.get("chemin") ?? "");
  if (chemin) revalidatePath(chemin);
  revalidatePath("/admin/signalements");
  revalidatePath("/populaires");
  return { ok: true };
}

/**
 * Classe les signalements d'une cible sans rien supprimer.
 *
 * C'est la réponse à un signalement qui n'était pas fondé, et c'est la
 * plus fréquente.
 */
export async function classerSignalements(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const cible = String(formData.get("cible") ?? "");
  const cibleId = String(formData.get("cibleId") ?? "");
  if (!estUneCible(cible) || !cibleId) return { ok: false, error: "Cible introuvable." };

  const { error } = await supabase
    .from("signalements")
    .update({ traite_at: new Date().toISOString() })
    .eq(COLONNE[cible], cibleId)
    .is("traite_at", null);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/signalements");
  return { ok: true };
}

/**
 * Tout ce qui attend d'être regardé, les trois natures confondues.
 *
 * Les noms et les adresses sont résolus par lot plutôt qu'une requête
 * par ligne : une pile de trente signalements en déclencherait
 * soixante, et la page d'administration serait la plus lente du site.
 */
export async function getSignalements(): Promise<ASignaler[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("signalements")
    .select("id, review_id, product_id, brand_id, motif, detail, created_at")
    .is("traite_at", null)
    .order("created_at", { ascending: false })
    .limit(300);

  type Ligne = {
    id: string;
    review_id: string | null;
    product_id: string | null;
    brand_id: string | null;
    motif: string;
    detail: string | null;
    created_at: string;
  };
  const lignes = (data as Ligne[] | null) ?? [];
  if (lignes.length === 0) return [];

  /* ---- on regroupe par cible ---- */
  const groupes = new Map<
    string,
    { cible: CibleSignalement; cibleId: string; id: string; signalements: Signalement[] }
  >();

  for (const l of lignes) {
    const cible: CibleSignalement = l.review_id ? "avis" : l.product_id ? "piece" : "marque";
    const cibleId = l.review_id ?? l.product_id ?? l.brand_id ?? "";
    if (!cibleId) continue;

    const cle = `${cible}:${cibleId}`;
    const groupe = groupes.get(cle) ?? { cible, cibleId, id: l.id, signalements: [] };
    groupe.signalements.push({ motif: l.motif, detail: l.detail, created_at: l.created_at });
    groupes.set(cle, groupe);
  }

  const parNature = (c: CibleSignalement) =>
    Array.from(groupes.values()).filter((g) => g.cible === c).map((g) => g.cibleId);

  /* ---- les avis ---- */
  const avis = new Map<string, { auteur: string; commentaire: string; brand_id: string | null; product_id: string | null }>();
  const idsAvis = parNature("avis");
  if (idsAvis.length > 0) {
    const { data: d } = await supabase
      .from("avis_publics")
      .select("id, auteur, commentaire, brand_id, product_id")
      .in("id", idsAvis);
    for (const a of (d as { id: string; auteur: string; commentaire: string | null; brand_id: string | null; product_id: string | null }[] | null) ?? []) {
      avis.set(a.id, {
        auteur: a.auteur,
        commentaire: a.commentaire ?? "",
        brand_id: a.brand_id,
        product_id: a.product_id,
      });
    }
  }

  /* ---- les pièces, y compris celles visées par un avis ---- */
  const idsPieces = Array.from(
    new Set([
      ...parNature("piece"),
      ...Array.from(avis.values()).map((a) => a.product_id).filter((v): v is string => Boolean(v)),
    ])
  );
  const pieces = new Map<string, { nom: string; slug: string | null; brand_id: string }>();
  if (idsPieces.length > 0) {
    const { data: d } = await supabase
      .from("products")
      .select("id, name, slug, brand_id")
      .in("id", idsPieces);
    for (const p of (d as { id: string; name: string; slug: string | null; brand_id: string }[] | null) ?? []) {
      pieces.set(p.id, { nom: p.name, slug: p.slug, brand_id: p.brand_id });
    }
  }

  /* ---- les marques, y compris celles des pièces ---- */
  const idsMarques = Array.from(
    new Set([
      ...parNature("marque"),
      ...Array.from(pieces.values()).map((p) => p.brand_id),
      ...Array.from(avis.values()).map((a) => a.brand_id).filter((v): v is string => Boolean(v)),
    ])
  );
  const marques = new Map<string, { nom: string; slug: string }>();
  if (idsMarques.length > 0) {
    const { data: d } = await supabase.from("brands").select("id, name, slug").in("id", idsMarques);
    for (const b of (d as { id: string; name: string; slug: string }[] | null) ?? []) {
      marques.set(b.id, { nom: b.name, slug: b.slug });
    }
  }

  const lienPiece = (id: string) => {
    const p = pieces.get(id);
    const m = p ? marques.get(p.brand_id) : undefined;
    return p && m && p.slug ? `/marques/${m.slug}/${p.slug}` : m ? `/marques/${m.slug}` : null;
  };

  return Array.from(groupes.values())
    .map((g): ASignaler => {
      if (g.cible === "avis") {
        const a = avis.get(g.cibleId);
        const href = a?.product_id
          ? lienPiece(a.product_id)
          : a?.brand_id
            ? `/marques/${marques.get(a.brand_id)?.slug ?? ""}`
            : null;
        return {
          id: g.id,
          cible: "avis",
          cibleId: g.cibleId,
          titre: a ? `Avis de ${a.auteur}` : "Avis supprimé",
          extrait: a?.commentaire || "Une note, sans commentaire.",
          href,
          signalements: g.signalements,
        };
      }

      if (g.cible === "piece") {
        const p = pieces.get(g.cibleId);
        const m = p ? marques.get(p.brand_id) : undefined;
        return {
          id: g.id,
          cible: "piece",
          cibleId: g.cibleId,
          titre: p ? p.nom : "Pièce supprimée",
          extrait: m ? `Chez ${m.nom}` : "",
          href: lienPiece(g.cibleId),
          signalements: g.signalements,
        };
      }

      const m = marques.get(g.cibleId);
      return {
        id: g.id,
        cible: "marque",
        cibleId: g.cibleId,
        titre: m ? m.nom : "Marque supprimée",
        extrait: "Fiche de marque",
        href: m ? `/marques/${m.slug}` : null,
        signalements: g.signalements,
      };
    })
    .sort((a, b) => b.signalements.length - a.signalements.length);
}
