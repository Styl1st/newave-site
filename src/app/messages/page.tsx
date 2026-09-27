import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Messagerie from "@/components/messages/Messagerie";
import OngletsForum from "@/components/forum/OngletsForum";
import { getProfile } from "@/lib/auth";
import { lireMessages, mesConversations } from "@/lib/messages-queries";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const profile = await getProfile();
  if (!profile) redirect("/connexion?suite=/messages");

  const { c } = await searchParams;
  const conversations = await mesConversations();

  if (conversations === null) {
    /* La migration 38 n'est pas passée, ou la base n'a pas répondu : on
       le dit, plutôt que de montrer une boîte vide qui laisserait croire
       que personne n'a jamais écrit. */
    return (
      <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
        <h1 className="m-0 text-[clamp(28px,6vw,38px)] font-extrabold tracking-[-0.035em] text-white">Messages</h1>
        <p className="glass m-0 mt-5 px-5 py-6 text-[15px] leading-relaxed text-white/90">
          La messagerie ne s&apos;est pas chargée. Réessaie dans un instant, ou retourne au{" "}
          <Link href="/forum" className="font-bold text-white underline underline-offset-2">
            forum
          </Link>
          .
        </p>
      </div>
    );
  }

  /* On n'ouvre que ce qu'on sait afficher : une conversation de la
     boîte. Un identifiant de travers dans l'adresse ouvre la boîte. */
  const selection = c && UUID.test(c) && conversations.some((x) => x.id === c) ? c : null;
  const messages = selection ? await lireMessages(selection) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] pb-24 pt-5 md:py-7">
      <Messagerie
        conversationsInitiales={conversations}
        selectionInitiale={selection}
        messagesInitiaux={messages}
        moiId={profile.id}
      />
      <OngletsForum actif="messages" connecte />
    </div>
  );
}
