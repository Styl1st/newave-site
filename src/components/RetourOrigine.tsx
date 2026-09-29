"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBack } from "@/components/Icons";
import { libellePage, lirePageDOrigine, marquerLeRetour } from "@/lib/page-d-origine";

/**
 * Le retour vers la page d'où l'on est venu à cette marque.
 *
 * L'annuaire, les pièces, la liste des marques de l'administration, les
 * candidatures… c'est là qu'on revient, filtres compris et à la même
 * hauteur, même après être passé par la fiche, les pièces et l'éditeur
 * de la marque. La page est notée par `MemoireNavigation` ; à défaut
 * (onglet neuf, lien ouvert directement), on prend `repli`.
 *
 * Un lien et non `history.back()` : on peut être passé par trois pages
 * de la marque depuis, et la page d'arrivée est redemandée au serveur,
 * donc à jour (une marque qu'on vient de publier y apparaît publiée).
 */
export default function RetourOrigine({
  repli,
  variante = "pastille",
}: {
  /** Où aller quand on ne sait pas d'où l'on vient. */
  repli: { href: string; label: string };
  /** `entete` : dans l'en-tête de l'éditeur, le libellé se replie au doigt. */
  variante?: "pastille" | "entete";
}) {
  const [cible, setCible] = useState(repli);

  // Après le montage : le serveur ne connaît pas la mémoire de l'onglet.
  useEffect(() => {
    const notee = lirePageDOrigine();
    if (notee) setCible({ href: notee.url, label: libellePage(notee.url) });
  }, []);

  return (
    <Link
      href={cible.href}
      onClick={marquerLeRetour}
      aria-label={`Retour : ${cible.label}`}
      className={
        variante === "entete"
          ? "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-white/30 bg-white/8 px-3.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97] sm:min-h-0 sm:py-2"
          : "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/8 py-2.5 pl-3.5 pr-4.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97]"
      }
    >
      <IconBack />
      <span className={variante === "entete" ? "hidden truncate sm:inline" : "truncate"}>
        {cible.label}
      </span>
    </Link>
  );
}
