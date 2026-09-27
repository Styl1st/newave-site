"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  BIO_MAX,
  COMMENTAIRE_MAX,
  handleNettoye,
  handleValide,
  HANDLES_RESERVES,
  IMAGES_MAX,
  lienAnnonce,
  lireDates,
  REMUNERATIONS,
  rubrique as laRubrique,
  estUneRubrique,
  TEXTE_MAX,
  TITRE_MAX,
  villeNormalisee,
  type Details,
  type RubriqueCle,
} from "@/lib/forum";

/**
 * Les gestes du forum : publier, voter, commenter, clôturer, retirer,
 * choisir son pseudo.
 *
 * CES ACTIONS TRANSMETTENT, ELLES NE DÉCIDENT PAS. Qui peut voter, pour
 * quoi, au nom de quelle marque : c'est la migration 37 qui le dit, par
 * ses règles RLS et ses déclencheurs. Ce qu'on vérifie ici ne sert qu'à
 * répondre une phrase claire AVANT que la base refuse, pas à la
 * remplacer.
 */

type Raison = "non-connecte" | "pseudo" | "migration";
type Resultat = { ok: boolean; error?: string; raison?: Raison };

async function session() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user } as const;
}

/**
 * Une erreur de la base, dite en français.
 *
 * `P0001` : les messages levés par nos déclencheurs (plafond de
 * publication, photo hors dossier). Ils sont déjà écrits pour être lus.
 * `42703` / `42883` / `PGRST202` : une colonne ou une fonction manque,
 * c'est la migration 37 qui n'est pas passée.
 */
function traduire(error: { code?: string; message: string }, parDefaut: string): Resultat {
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42703" || error.code === "42883" || error.code === "42P01" || error.code === "PGRST202") {
    return { ok: false, raison: "migration", error: "Le forum n'est pas encore ouvert sur cette base." };
  }
  if (error.code === "42501") return { ok: false, error: parDefaut };
  return { ok: false, error: parDefaut };
}

/* ------------------------------------------------------------------
   Le pseudo
   ------------------------------------------------------------------ */

const REGLE_PSEUDO = "3 à 24 caractères : lettres minuscules, chiffres, point ou tiret bas.";

export async function verifierPseudo(brut: string): Promise<{ libre: boolean; message?: string }> {
  const h = handleNettoye(brut);
  if (HANDLES_RESERVES.includes(h)) return { libre: false, message: "Ce pseudo est réservé." };
  if (!handleValide(h)) return { libre: false, message: REGLE_PSEUDO };

  const { supabase, user } = await session();
  if (!supabase || !user) return { libre: false, message: "Connecte-toi d'abord." };

  const { data, error } = await supabase.rpc("handle_disponible", { h });
  if (error) return { libre: false, message: "Vérification impossible pour l'instant." };
  return data ? { libre: true } : { libre: false, message: "Ce pseudo est déjà pris." };
}

export async function choisirPseudo(input: {
  handle: string;
  nom?: string;
}): Promise<Resultat & { handle?: string }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte", error: "Connecte-toi d'abord." };

  const handle = handleNettoye(input.handle);
  if (!handleValide(handle)) return { ok: false, error: REGLE_PSEUDO };

  const modifs: Record<string, string> = { handle };
  const nom = (input.nom ?? "").trim().slice(0, 60);
  if (nom) modifs.display_name = nom;

  const { error } = await supabase.from("profiles").update(modifs).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ce pseudo est déjà pris." };
    if (error.code === "23514") return { ok: false, error: "Ce pseudo n'est pas permis." };
    return traduire(error, "Le pseudo n'a pas été enregistré.");
  }

  revalidatePath("/forum", "layout");
  revalidatePath("/compte");
  return { ok: true, handle };
}

/** Le profil public, depuis « Mon compte » : pseudo, ville, bio. */
export async function enregistrerProfilForum(input: {
  handle: string;
  ville: string;
  bio: string;
}): Promise<Resultat & { message?: string }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte", error: "Connecte-toi d'abord." };

  const handle = handleNettoye(input.handle);
  if (handle && !handleValide(handle)) return { ok: false, error: REGLE_PSEUDO };

  const { error } = await supabase
    .from("profiles")
    .update({
      handle: handle || null,
      ville: villeNormalisee(input.ville),
      bio: input.bio.trim().slice(0, BIO_MAX) || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ce pseudo est déjà pris." };
    if (error.code === "23514") return { ok: false, error: "Ce pseudo n'est pas permis." };
    return traduire(error, "Le profil n'a pas été enregistré.");
  }

  revalidatePath("/compte");
  revalidatePath("/forum", "layout");
  return { ok: true, message: "Profil du forum enregistré." };
}

/* ------------------------------------------------------------------
   Publier
   ------------------------------------------------------------------ */

export type NouvelleAnnonce = {
  rubrique: string;
  titre: string;
  texte: string;
  ville: string;
  images: string[];
  details: Details;
  /** La marque au nom de laquelle on publie, ou null pour soi. */
  marqueId: string | null;
};

/** Ne garde que les détails de la rubrique, nettoyés et bornés. */
function detailsPropres(cle: RubriqueCle, brut: Details): Details {
  const propres: Details = {};
  for (const champ of laRubrique(cle).details) {
    const v = (brut[champ.cle] ?? "").toString().trim().slice(0, 120);
    if (!v) continue;
    if (champ.type === "remuneration" && !REMUNERATIONS.some((r) => r.cle === v)) continue;
    // Une date vient du calendrier, en intervalle ISO : rien d'autre ne passe.
    if (champ.type === "dates" && !lireDates(v)) continue;
    propres[champ.cle] = v;
  }
  return propres;
}

export async function publierAnnonce(
  n: NouvelleAnnonce
): Promise<Resultat & { id?: string; lien?: string }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte", error: "Connecte-toi pour publier." };

  if (!estUneRubrique(n.rubrique)) return { ok: false, error: "Choisis une rubrique." };
  const titre = n.titre.trim();
  if (titre.length < 3) return { ok: false, error: "Le titre est trop court." };
  if (titre.length > TITRE_MAX) return { ok: false, error: `Le titre dépasse ${TITRE_MAX} caractères.` };
  const texte = n.texte.trim();
  if (texte.length > TEXTE_MAX) return { ok: false, error: "La description est trop longue." };

  const { data: moi } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  if (!(moi as { handle: string | null } | null)?.handle) {
    return { ok: false, raison: "pseudo", error: "Choisis d'abord ton pseudo." };
  }

  const { data, error } = await supabase
    .from("forum_annonces")
    .insert({
      auteur_id: user.id,
      marque_id: n.marqueId || null,
      rubrique: n.rubrique,
      titre,
      texte,
      ville: villeNormalisee(n.ville),
      images: n.images.filter((u) => typeof u === "string" && u).slice(0, IMAGES_MAX),
      details: detailsPropres(n.rubrique, n.details),
    })
    .select("id, titre")
    .single();

  if (error || !data) {
    return traduire(
      error ?? { message: "" },
      n.marqueId
        ? "Tu ne peux pas publier au nom de cette marque."
        : "L'annonce n'a pas été publiée. Réessaie dans un instant."
    );
  }

  revalidatePath("/forum");
  const a = data as { id: string; titre: string };
  return { ok: true, id: a.id, lien: lienAnnonce(a) };
}

/* ------------------------------------------------------------------
   Voter
   ------------------------------------------------------------------ */

type Vote = Resultat & { votes?: number; aVote?: boolean };

async function voter(
  table: "forum_votes" | "forum_votes_com",
  colonne: "annonce_id" | "commentaire_id",
  cible: "forum_annonces" | "forum_commentaires",
  id: string,
  pour: boolean
): Promise<Vote> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  if (pour) {
    const { error } = await supabase.from(table).insert({ user_id: user.id, [colonne]: id });
    // 23505 : le vote existait déjà. Pas un échec du point de vue de la
    // personne, qui voulait justement qu'il existe.
    if (error && error.code !== "23505") {
      return traduire(error, "On ne vote pas pour ce qu'on a soi-même publié.");
    }
  } else {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id).eq(colonne, id);
    if (error) return traduire(error, "Le vote n'a pas été retiré.");
  }

  const { data } = await supabase.from(cible).select("votes").eq("id", id).maybeSingle();
  return { ok: true, aVote: pour, votes: (data as { votes: number } | null)?.votes };
}

export async function voterAnnonce(id: string, pour: boolean): Promise<Vote> {
  return voter("forum_votes", "annonce_id", "forum_annonces", id, pour);
}

export async function voterCommentaire(id: string, pour: boolean): Promise<Vote> {
  return voter("forum_votes_com", "commentaire_id", "forum_commentaires", id, pour);
}

/* ------------------------------------------------------------------
   Commenter
   ------------------------------------------------------------------ */

export async function commenter(input: {
  annonceId: string;
  texte: string;
  parentId?: string | null;
}): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte", error: "Connecte-toi pour répondre." };

  const texte = input.texte.trim();
  if (!texte) return { ok: false, error: "Le commentaire est vide." };
  if (texte.length > COMMENTAIRE_MAX) return { ok: false, error: "Le commentaire est trop long." };

  const { data: moi } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  if (!(moi as { handle: string | null } | null)?.handle) {
    return { ok: false, raison: "pseudo", error: "Choisis d'abord ton pseudo." };
  }

  const { error } = await supabase.from("forum_commentaires").insert({
    annonce_id: input.annonceId,
    auteur_id: user.id,
    parent_id: input.parentId || null,
    texte,
  });
  if (error) return traduire(error, "Le commentaire n'est pas parti.");

  revalidatePath("/forum");
  return { ok: true };
}

/* ------------------------------------------------------------------
   Clôturer, retirer
   ------------------------------------------------------------------ */

export async function cloturerAnnonce(id: string, cloturee: boolean): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  // `select` pour savoir si une ligne a bougé : la règle RLS ne lève
  // pas d'erreur sur l'annonce d'un autre, elle ne la touche pas.
  const { data, error } = await supabase
    .from("forum_annonces")
    .update({ cloturee })
    .eq("id", id)
    .select("id");
  if (error) return traduire(error, "L'annonce n'a pas changé.");
  if (!data || data.length === 0) return { ok: false, error: "Seul l'auteur peut clôturer son annonce." };

  revalidatePath("/forum");
  return { ok: true };
}

export async function supprimerAnnonce(id: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  const { data, error } = await supabase.from("forum_annonces").delete().eq("id", id).select("id");
  if (error) return traduire(error, "L'annonce n'a pas été retirée.");
  if (!data || data.length === 0) return { ok: false, error: "Seul l'auteur peut retirer son annonce." };

  revalidatePath("/forum");
  return { ok: true };
}

export async function supprimerCommentaire(id: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  const { data, error } = await supabase.from("forum_commentaires").delete().eq("id", id).select("id");
  if (error) return traduire(error, "Le commentaire n'a pas été retiré.");
  if (!data || data.length === 0) return { ok: false, error: "Seul l'auteur peut retirer son commentaire." };

  revalidatePath("/forum");
  return { ok: true };
}
