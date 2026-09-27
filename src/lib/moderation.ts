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

const COLONNE: Record<
  CibleSignalement,
  "review_id" | "product_id" | "brand_id" | "annonce_id" | "commentaire_id" | "conversation_id"
> = {
  avis: "review_id",
  piece: "product_id",
  marque: "brand_id",
  annonce: "annonce_id",
  commentaire: "commentaire_id",
  conversation: "conversation_id",
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
 * Retire une annonce ou un commentaire du forum, quel qu'en soit
 * l'auteur. Ses signalements partent avec lui (clé étrangère en
 * cascade), comme pour un avis.
 */
export async function retirerDuForum(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const cible = String(formData.get("cible") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || (cible !== "annonce" && cible !== "commentaire")) {
    return { ok: false, error: "Cible introuvable." };
  }

  const { error } = await supabase
    .from(cible === "annonce" ? "forum_annonces" : "forum_commentaires")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/signalements");
  revalidatePath("/forum");
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
 * Tout ce qui attend d'être regardé, toutes natures confondues.
 *
 * Les noms et les adresses sont résolus par lot plutôt qu'une requête
 * par ligne : une pile de trente signalements en déclencherait
 * soixante, et la page d'administration serait la plus lente du site.
 */
export async function getSignalements(): Promise<ASignaler[]> {
  await requireAdmin();

  const supabase = await createClient();
  if (!supabase) return [];

  /*
   * LES COLONNES DU FORUM D'ABORD, LES ANCIENNES SI ELLES MANQUENT.
   *
   * `annonce_id` et `commentaire_id` arrivent avec la migration 37. Tant
   * qu'elle n'est pas passée, les demander ferait échouer toute la
   * lecture, et la pile paraîtrait vide alors qu'elle attend des
   * signalements d'avis. On retombe donc sur la lecture d'avant.
   */
  const lire = (colonnes: string) =>
    supabase
      .from("signalements")
      .select(colonnes)
      .is("traite_at", null)
      .order("created_at", { ascending: false })
      .limit(300);

  // Du plus complet au plus ancien : migration 38, puis 37, puis avant.
  let { data, error } = await lire(
    "id, review_id, product_id, brand_id, annonce_id, commentaire_id, conversation_id, motif, detail, created_at"
  );
  if (error) {
    ({ data, error } = await lire(
      "id, review_id, product_id, brand_id, annonce_id, commentaire_id, motif, detail, created_at"
    ));
  }
  if (error) {
    ({ data, error } = await lire("id, review_id, product_id, brand_id, motif, detail, created_at"));
  }

  type Ligne = {
    id: string;
    review_id: string | null;
    product_id: string | null;
    brand_id: string | null;
    annonce_id?: string | null;
    commentaire_id?: string | null;
    conversation_id?: string | null;
    motif: string;
    detail: string | null;
    created_at: string;
  };
  const lignes = (data as unknown as Ligne[] | null) ?? [];
  if (lignes.length === 0) return [];

  /* ---- on regroupe par cible ---- */
  const groupes = new Map<
    string,
    { cible: CibleSignalement; cibleId: string; id: string; signalements: Signalement[] }
  >();

  for (const l of lignes) {
    const cible: CibleSignalement = l.review_id
      ? "avis"
      : l.product_id
        ? "piece"
        : l.annonce_id
          ? "annonce"
          : l.commentaire_id
            ? "commentaire"
            : l.conversation_id
              ? "conversation"
              : "marque";
    const cibleId =
      l.review_id ??
      l.product_id ??
      l.annonce_id ??
      l.commentaire_id ??
      l.conversation_id ??
      l.brand_id ??
      "";
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

  /* ---- le forum : annonces et commentaires ---- */
  const commentaires = new Map<string, { texte: string; annonce_id: string; auteur: string | null }>();
  const idsCommentaires = parNature("commentaire");
  if (idsCommentaires.length > 0) {
    const { data: d } = await supabase
      .from("forum_commentaires")
      .select("id, texte, annonce_id, auteur_id")
      .in("id", idsCommentaires);
    const lignesC = (d as { id: string; texte: string; annonce_id: string; auteur_id: string }[] | null) ?? [];
    const { data: m } = lignesC.length
      ? await supabase.from("forum_membres").select("id, handle").in("id", lignesC.map((c) => c.auteur_id))
      : { data: [] };
    const pseudos = new Map(((m as { id: string; handle: string }[] | null) ?? []).map((x) => [x.id, x.handle]));
    for (const c of lignesC) {
      commentaires.set(c.id, { texte: c.texte, annonce_id: c.annonce_id, auteur: pseudos.get(c.auteur_id) ?? null });
    }
  }

  const annonces = new Map<string, { titre: string; texte: string; masque: boolean }>();
  const idsAnnonces = parNature("annonce");
  if (idsAnnonces.length > 0) {
    const { data: d } = await supabase
      .from("forum_annonces")
      .select("id, titre, texte, masque")
      .in("id", idsAnnonces);
    for (const a of (d as { id: string; titre: string; texte: string; masque: boolean }[] | null) ?? []) {
      annonces.set(a.id, { titre: a.titre, texte: a.texte, masque: a.masque });
    }
  }

  /*
   * ---- les conversations ----
   *
   * Les derniers messages, pour juger sur pièce. L'administration ne
   * peut les lire QUE parce que la conversation est signalée et pas
   * encore traitée (règle `conversation_signalee`, migration 38) : une
   * fois classée, elle redevient privée.
   */
  const conversations = new Map<string, { participants: string; extrait: string }>();
  const idsConversations = parNature("conversation");
  if (idsConversations.length > 0) {
    const { data: cs } = await supabase
      .from("conversations")
      .select("id, a_id, b_id")
      .in("id", idsConversations);
    const lignesCs = (cs as { id: string; a_id: string; b_id: string }[] | null) ?? [];
    const personnes = Array.from(new Set(lignesCs.flatMap((c) => [c.a_id, c.b_id])));
    const { data: ms } = personnes.length
      ? await supabase.from("forum_membres").select("id, handle").in("id", personnes)
      : { data: [] };
    const pseudo = new Map(((ms as { id: string; handle: string }[] | null) ?? []).map((m) => [m.id, `@${m.handle}`]));

    for (const c of lignesCs) {
      const { data: derniers } = await supabase
        .from("messages")
        .select("auteur_id, texte, piece_jointe_nom, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(6);
      const lignes = ((derniers as { auteur_id: string; texte: string; piece_jointe_nom: string | null }[] | null) ?? [])
        .reverse()
        .map((m) => `${pseudo.get(m.auteur_id) ?? "Membre"} : ${m.texte || `[pièce jointe : ${m.piece_jointe_nom ?? "fichier"}]`}`);
      conversations.set(c.id, {
        participants: `${pseudo.get(c.a_id) ?? "Membre"} et ${pseudo.get(c.b_id) ?? "Membre"}`,
        extrait: lignes.join("\n"),
      });
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

      if (g.cible === "annonce") {
        const a = annonces.get(g.cibleId);
        return {
          id: g.id,
          cible: "annonce",
          cibleId: g.cibleId,
          titre: a ? a.titre : "Annonce supprimée",
          extrait: a ? `${a.masque ? "Masquée en attendant ta décision. " : ""}${a.texte.slice(0, 280)}` : "",
          href: a ? `/forum/${g.cibleId}` : null,
          signalements: g.signalements,
        };
      }

      if (g.cible === "conversation") {
        const c = conversations.get(g.cibleId);
        return {
          id: g.id,
          cible: "conversation",
          cibleId: g.cibleId,
          titre: c ? `Conversation entre ${c.participants}` : "Conversation supprimée",
          extrait: c?.extrait ?? "",
          // Pas de page pour la lire : c'est l'extrait ci-dessus qui sert.
          href: null,
          signalements: g.signalements,
        };
      }

      if (g.cible === "commentaire") {
        const c = commentaires.get(g.cibleId);
        return {
          id: g.id,
          cible: "commentaire",
          cibleId: g.cibleId,
          titre: c ? `Commentaire de ${c.auteur ? `@${c.auteur}` : "un membre"}` : "Commentaire supprimé",
          extrait: c?.texte ?? "",
          href: c ? `/forum/${c.annonce_id}` : null,
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
