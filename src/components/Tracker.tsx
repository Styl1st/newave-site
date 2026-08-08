"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Compte une page vue à chaque navigation.
 *
 * Envoi en arrière-plan, sans bloquer l'affichage, et sans rien écrire
 * dans le navigateur : ni cookie, ni stockage local. Deux visites de la
 * même personne sont indistinguables de deux visiteurs différents —
 * c'est le prix d'une mesure qui ne suit personne, et il est juste.
 */
export default function Tracker() {
  const pathname = usePathname();
  const dernier = useRef<string | null>(null);

  useEffect(() => {
    // React monte deux fois en développement : sans ce garde-fou,
    // chaque page compterait double dans tes statistiques.
    if (dernier.current === pathname) return;
    dernier.current = pathname;

    const payload = JSON.stringify({ path: pathname, source: document.referrer });

    // sendBeacon survit à la fermeture de l'onglet, contrairement à fetch.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vue", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/vue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  return null;
}
