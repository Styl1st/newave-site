"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { estPageConnexion } from "@/lib/page-connexion";

/**
 * La pastille « Connexion » de la barre, au téléphone.
 *
 * Elle s'efface sur la page de connexion : la page entière propose
 * déjà ce geste, et la pastille blanche en haut d'écran faisait un
 * deuxième bouton pour la même chose. Sur ordinateur, « Connexion »
 * est un onglet de la barre (`LienNav`) et reste allumé comme les
 * autres pour dire où l'on est.
 */
export default function BoutonConnexion() {
  const chemin = usePathname();
  if (estPageConnexion(chemin)) return null;

  return (
    <Link
      href="/connexion"
      className="rounded-full bg-white px-3.5 py-2 text-[12px] font-black text-[var(--color-ink)] shadow-[0_3px_12px_rgba(var(--voile),0.3)] active:scale-95"
    >
      Connexion
    </Link>
  );
}
