import { createClient } from "./supabase/server";
import {
  COLONNES_MESSAGE,
  versConversation,
  versMessage,
  type ConversationResumee,
  type LigneConversation,
  type LigneMessage,
  type Message,
} from "./messages";

/**
 * Les lectures de la messagerie, côté serveur.
 *
 * Tout passe par la migration 38 et ses règles : on ne lit que SES
 * conversations. Une lecture ratée (migration absente, base qui ne
 * répond pas) renvoie `null`, pour que l'écran le dise au lieu
 * d'afficher une boîte vide.
 */

export async function mesConversations(): Promise<ConversationResumee[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("mes_conversations");
  if (error) {
    console.error(`[messagerie] boîte : ${error.message}`);
    return null;
  }
  return ((data as LigneConversation[] | null) ?? []).map(versConversation);
}

/** Les deux cents derniers messages d'une conversation, du plus ancien au plus récent. */
export async function lireMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(COLONNES_MESSAGE)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error(`[messagerie] messages : ${error.message}`);
    return [];
  }
  return ((data as unknown as LigneMessage[] | null) ?? []).map(versMessage).reverse();
}

/**
 * La conversation que la personne connectée a déjà sur cette annonce,
 * s'il y en a une : « Répondre en privé » la rouvre au lieu d'en créer
 * une deuxième.
 */
export async function conversationSur(annonceId: string): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("annonce_id", annonceId)
    .or(`a_id.eq.${user.id},b_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}
