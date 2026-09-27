"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  COLONNES_MESSAGE,
  MESSAGE_MAX,
  PIECE_JOINTE_MAX,
  versMessage,
  type LigneMessage,
  type Message,
} from "@/lib/messages";

/**
 * Les gestes de la messagerie : ouvrir une conversation, écrire,
 * bloquer.
 *
 * Comme pour le forum, ces actions transmettent. Qui peut lire, écrire
 * ou ouvrir une conversation, c'est la migration 38 qui le décide :
 * participants seulement, pas de blocage, annonce encore ouverte.
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

function traduire(error: { code?: string; message: string }, parDefaut: string): Resultat {
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (["42703", "42883", "42P01", "PGRST202", "PGRST205"].includes(error.code ?? "")) {
    return { ok: false, raison: "migration", error: "La messagerie n'est pas encore ouverte." };
  }
  return { ok: false, error: parDefaut };
}

/**
 * Ouvre la conversation sur une annonce, ou rouvre celle qui existe.
 *
 * Refusée (par la base) sur sa propre annonce, sur une annonce
 * clôturée ou masquée, ou s'il existe un blocage entre les deux.
 */
export async function ouvrirConversation(annonceId: string): Promise<Resultat & { id?: string }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte", error: "Connecte-toi pour répondre." };

  const { data: moi } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  if (!(moi as { handle: string | null } | null)?.handle) {
    return { ok: false, raison: "pseudo", error: "Choisis d'abord ton pseudo." };
  }

  const { data, error } = await supabase.rpc("ouvrir_conversation", { p_annonce: annonceId });
  if (error || !data) {
    return traduire(
      error ?? { message: "" },
      "Impossible d'écrire sur cette annonce : elle est peut-être clôturée."
    );
  }
  return { ok: true, id: data as string };
}

export async function envoyerMessage(input: {
  conversationId: string;
  texte: string;
  pieceJointe?: { chemin: string; nom: string; taille: number } | null;
}): Promise<Resultat & { message?: Message }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  const texte = input.texte.trim().slice(0, MESSAGE_MAX);
  const pj = input.pieceJointe ?? null;
  if (!texte && !pj) return { ok: false, error: "Le message est vide." };
  if (pj && pj.taille > PIECE_JOINTE_MAX) return { ok: false, error: "Pièce jointe trop lourde : 10 Mo au plus." };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      auteur_id: user.id,
      texte,
      piece_jointe: pj?.chemin ?? null,
      piece_jointe_nom: pj ? pj.nom.slice(0, 120) : null,
      piece_jointe_taille: pj?.taille ?? null,
    })
    .select(COLONNES_MESSAGE)
    .single();

  if (error || !data) {
    return traduire(error ?? { message: "" }, "Le message n'est pas parti. Cette conversation est peut-être bloquée.");
  }

  revalidatePath("/messages");
  return { ok: true, message: versMessage(data as unknown as LigneMessage) };
}

/** Ouvrir une conversation la marque comme lue, jusqu'à maintenant. */
export async function marquerLu(conversationId: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  const { error } = await supabase
    .from("conversation_lus")
    .upsert(
      { conversation_id: conversationId, user_id: user.id, lu_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" }
    );
  if (error) return traduire(error, "");
  return { ok: true };
}

/**
 * Bloquer : plus aucun message, dans un sens comme dans l'autre. La
 * personne bloquée n'en est pas prévenue ; elle voit seulement qu'elle
 * ne peut plus écrire.
 */
export async function bloquer(personneId: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };
  if (personneId === user.id) return { ok: false, error: "On ne se bloque pas soi-même." };

  const { error } = await supabase.from("blocages").insert({ user_id: user.id, bloque_id: personneId });
  if (error && error.code !== "23505") return traduire(error, "Le blocage n'a pas été enregistré.");

  revalidatePath("/messages");
  return { ok: true };
}

export async function debloquer(personneId: string): Promise<Resultat> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { ok: false, raison: "non-connecte" };

  const { error } = await supabase.from("blocages").delete().eq("user_id", user.id).eq("bloque_id", personneId);
  if (error) return traduire(error, "Le déblocage n'a pas été enregistré.");

  revalidatePath("/messages");
  return { ok: true };
}
