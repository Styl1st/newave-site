"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COLONNES_MESSAGE,
  EVENEMENT_LUS,
  versConversation,
  versMessage,
  type ConversationResumee,
  type LigneConversation,
  type LigneMessage,
  type Message,
} from "@/lib/messages";
import Portal from "@/components/Portal";
import Boite, { type Onglet } from "./Boite";
import Conversation from "./Conversation";

/**
 * La messagerie : la boîte à gauche, la conversation à droite (2a).
 * Au doigt, la boîte seule (2c), et la conversation par-dessus, en
 * plein écran (2d) ; le geste Retour du téléphone y ramène.
 *
 * LE TEMPS RÉEL. Un seul abonnement pour toute la page, sur les
 * nouveaux messages : la base (règles de la migration 38) ne nous
 * envoie que ceux de NOS conversations. Un message arrive :
 *   - il s'ajoute au fil s'il est déjà chargé ;
 *   - sa conversation remonte en tête de la boîte ;
 *   - si c'est la conversation ouverte et que l'onglet est visible, elle
 *     est marquée lue tout de suite ; sinon elle passe en non lue.
 * Et au retour sur l'onglet, la boîte se relit : c'est le filet si la
 * connexion temps réel a sauté pendant que l'ordinateur dormait.
 */
export default function Messagerie({
  conversationsInitiales,
  selectionInitiale,
  messagesInitiaux,
  moiId,
}: {
  conversationsInitiales: ConversationResumee[];
  selectionInitiale: string | null;
  messagesInitiaux: Message[];
  moiId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState(conversationsInitiales);
  const [selection, setSelection] = useState<string | null>(selectionInitiale);
  const [messages, setMessages] = useState<Record<string, Message[]>>(
    selectionInitiale ? { [selectionInitiale]: messagesInitiaux } : {}
  );
  const [onglet, setOnglet] = useState<Onglet>("toutes");

  /*
   * AU DOIGT, LA CONVERSATION EST POSÉE SUR LA PAGE, PAS DANS LA PAGE.
   *
   * Rendue à sa place, elle restait prise sous la barre du haut et sous
   * le pied de page : un de ses ancêtres (l'animation d'entrée des
   * pages) crée son propre plan d'empilement, et aucun `z-index` ne
   * l'en sort. On la rend donc dans un portail, directement dans
   * <body>, par-dessus tout.
   */
  const [auDoigt, setAuDoigt] = useState(false);
  useEffect(() => {
    const petit = window.matchMedia("(max-width: 767px)");
    const mesurer = () => setAuDoigt(petit.matches);
    mesurer();
    petit.addEventListener("change", mesurer);
    return () => petit.removeEventListener("change", mesurer);
  }, []);

  /* Les valeurs du moment, pour le rappel du temps réel qui, lui, est
     posé une fois pour toutes. */
  const selectionActuelle = useRef(selection);
  const conversationsActuelles = useRef(conversations);
  useEffect(() => {
    selectionActuelle.current = selection;
    conversationsActuelles.current = conversations;
  }, [selection, conversations]);

  /* ---------------- l'adresse ---------------- */

  const choisir = useCallback((id: string) => {
    setSelection(id);
    window.history.pushState(null, "", `/messages?c=${id}`);
  }, []);

  const retour = useCallback(() => {
    setSelection(null);
    window.history.pushState(null, "", "/messages");
  }, []);

  useEffect(() => {
    const surRetour = () => setSelection(new URLSearchParams(window.location.search).get("c"));
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, []);

  /* En grand, une conversation est toujours ouverte : la première, à
     défaut d'une autre. Au doigt, on commence par la boîte. */
  useEffect(() => {
    if (selection || conversations.length === 0) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSelection(conversations[0].id);
      window.history.replaceState(null, "", `/messages?c=${conversations[0].id}`);
    }
  }, [selection, conversations]);

  /* Au doigt, la conversation couvre l'écran : la page dessous ne défile plus. */
  useEffect(() => {
    if (!selection || !auDoigt) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, [selection, auDoigt]);

  /* ---------------- lire ---------------- */

  const relireLaBoite = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("mes_conversations");
    if (!error && data) setConversations((data as LigneConversation[]).map(versConversation));
  }, [supabase]);

  useEffect(() => {
    if (!selection || messages[selection] || !supabase) return;
    let vivant = true;
    supabase
      .from("messages")
      .select(COLONNES_MESSAGE)
      .eq("conversation_id", selection)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!vivant) return;
        const liste = ((data as unknown as LigneMessage[] | null) ?? []).map(versMessage).reverse();
        setMessages((m) => ({ ...m, [selection]: liste }));
      });
    return () => {
      vivant = false;
    };
  }, [selection, messages, supabase]);

  const marquerLue = useCallback(
    async (id: string) => {
      setConversations((l) => l.map((c) => (c.id === id ? { ...c, nonLu: false } : c)));
      if (!supabase) return;
      await supabase
        .from("conversation_lus")
        .upsert(
          { conversation_id: id, user_id: moiId, lu_at: new Date().toISOString() },
          { onConflict: "conversation_id,user_id" }
        );
      // La pastille du haut se relit.
      window.dispatchEvent(new Event(EVENEMENT_LUS));
    },
    [supabase, moiId]
  );

  useEffect(() => {
    if (selection) void marquerLue(selection);
  }, [selection, marquerLue]);

  /* ---------------- recevoir ---------------- */

  const recevoir = useCallback(
    (m: Message) => {
      setMessages((tout) => {
        const deja = tout[m.conversationId];
        if (!deja || deja.some((x) => x.id === m.id)) return tout;
        return { ...tout, [m.conversationId]: [...deja, m] };
      });

      const ouverte = selectionActuelle.current === m.conversationId && document.visibilityState === "visible";
      const connue = conversationsActuelles.current.some((x) => x.id === m.conversationId);
      setConversations((liste) => {
        const c = liste.find((x) => x.id === m.conversationId);
        if (!c) return liste;
        const maj: ConversationResumee = {
          ...c,
          dernier: { texte: m.texte.slice(0, 160), auteurId: m.auteurId, pieceNom: m.pieceJointeNom, at: m.createdAt },
          nonLu: m.auteurId !== moiId && !ouverte,
        };
        return [maj, ...liste.filter((x) => x.id !== m.conversationId)];
      });

      // Une conversation qu'on ne connaissait pas encore : quelqu'un vient
      // de répondre à une de nos annonces. On relit la boîte.
      if (!connue) void relireLaBoite();
      else if (ouverte && m.auteurId !== moiId) void marquerLue(m.conversationId);
      else window.dispatchEvent(new Event(EVENEMENT_LUS));
    },
    [moiId, relireLaBoite, marquerLue]
  );

  const recevoirActuel = useRef(recevoir);
  useEffect(() => {
    recevoirActuel.current = recevoir;
  }, [recevoir]);

  useEffect(() => {
    if (!supabase) return;
    const canal = supabase
      .channel(`messagerie-${moiId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (charge) => {
        recevoirActuel.current(versMessage(charge.new as LigneMessage));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, moiId]);

  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState === "visible") void relireLaBoite();
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => document.removeEventListener("visibilitychange", auRetour);
  }, [relireLaBoite]);

  /* ---------------- le dessin ---------------- */

  const ouverte = conversations.find((c) => c.id === selection) ?? null;

  const conversation = ouverte ? (
    <Conversation
      conversation={ouverte}
      messages={messages[ouverte.id] ?? null}
      moiId={moiId}
      onEnvoye={recevoir}
      onRetour={retour}
      onBlocage={(jeBloque) => {
        setConversations((l) =>
          l.map((c) => (c.id === ouverte.id ? { ...c, jeBloque, bloquee: jeBloque || c.bloquee } : c))
        );
        void relireLaBoite();
      }}
    />
  ) : null;

  return (
    <div className="panneau-messagerie flex md:h-[calc(100dvh-150px)] md:min-h-[520px] md:overflow-hidden">
      <aside className="w-full md:w-[340px] md:shrink-0 md:border-r md:border-white/15">
        <Boite
          conversations={conversations}
          selection={selection}
          onglet={onglet}
          onOnglet={setOnglet}
          onChoisir={choisir}
          moiId={moiId}
        />
      </aside>

      <section
        className={`hidden min-w-0 flex-1 md:flex ${ouverte ? "md:flex-col" : "md:items-center md:justify-center"}`}
      >
        {ouverte && !auDoigt ? (
          conversation
        ) : (
          <p className="m-0 px-6 text-center text-[14px] font-semibold text-white/70">
            {conversations.length > 0 ? "Choisis une conversation." : "Tes conversations privées s'afficheront ici."}
          </p>
        )}
      </section>

      {ouverte && auDoigt && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--surface-sombre)]">{conversation}</div>
        </Portal>
      )}
    </div>
  );
}
