"use client";

import { useEffect, useState } from "react";
import { libelleRaccourci, toucheCommande, type ToucheCommande } from "@/lib/raccourci";

/**
 * L'étiquette du raccourci de recherche : « ⌘ K » sur Mac et iPad,
 * « Ctrl K » ailleurs.
 *
 * Le serveur ne sait pas sur quelle machine on lit, il écrit donc
 * « Ctrl K », et le navigateur corrige au montage si besoin. Les
 * badges sont absolus ou en fin de ligne : le changement ne décale
 * rien. `colle` sert dans une phrase (« ⌘K pour chercher »).
 */
export default function Raccourci({ colle = false }: { colle?: boolean }) {
  const [touche, setTouche] = useState<ToucheCommande>("Ctrl");

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    setTouche(
      toucheCommande({
        userAgentDataPlatform: nav.userAgentData?.platform,
        platform: nav.platform,
        userAgent: nav.userAgent,
      })
    );
  }, []);

  return <>{libelleRaccourci(touche, { colle })}</>;
}
