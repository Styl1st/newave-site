import type { Metadata } from "next";
import ListeSignalements from "@/components/admin/ListeSignalements";
import { getSignalements } from "@/lib/moderation";

export const metadata: Metadata = { title: "Signalements" };
export const dynamic = "force-dynamic";

export default async function SignalementsPage() {
  const items = await getSignalements();

  return (
    <>
      <header className="mb-6">
        <p className="eyebrow m-0">Modération</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Signalements
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14px] leading-relaxed text-white/70">
          Tout ce que les visiteurs ont remonté : avis, pièces et fiches de marque, du
          plus signalé au moins signalé. Avant de trancher, ouvre la page où la chose
          s&apos;affiche — un commentaire sec sous une pièce précise et le même sous une
          fiche entière ne disent pas la même chose.
        </p>
      </header>

      <ListeSignalements items={items} />
    </>
  );
}
