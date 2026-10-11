"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { decorPourChemin } from "@/lib/decor";

/**
 * Tient `data-decor-page` à jour pendant la navigation.
 *
 * Le serveur l'écrit sur <html> au premier affichage (voir layout),
 * mais la mise en page racine ne se redessine pas quand on passe d'une
 * page à l'autre : sans ce relais, les blobs resteraient en grand en
 * quittant l'accueil, ou petits en y revenant.
 */
export default function DecorDePage() {
  const chemin = usePathname();

  useEffect(() => {
    document.documentElement.dataset.decorPage = decorPourChemin(chemin);
  }, [chemin]);

  return null;
}
