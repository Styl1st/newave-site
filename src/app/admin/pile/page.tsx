import type { Metadata } from "next";
import LaPile from "@/components/admin/LaPile";
import { adminGetApplications } from "@/lib/admin-queries";
import { getSignalements } from "@/lib/moderation";

export const metadata: Metadata = { title: "La pile" };
export const dynamic = "force-dynamic";

/**
 * Tout ce qui attend une décision, sur un seul écran.
 *
 * La page ne fait que les deux lectures : le rendu vit dans `LaPile`,
 * comme `ListeSignalements` pour la modération. C'est ce qui permet de
 * regarder l'écran sans base de données derrière.
 */
export default async function PilePage() {
  const [candidatures, signalements] = await Promise.all([
    adminGetApplications(),
    getSignalements(),
  ]);

  return <LaPile candidatures={candidatures} signalements={signalements} />;
}
