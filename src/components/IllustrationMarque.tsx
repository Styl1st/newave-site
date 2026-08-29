"use client";

import { useCallback, useState } from "react";
import VitrineMarque from "./VitrineMarque";

/**
 * Ce qu'on montre d'une marque sur sa carte d'annuaire.
 *
 * L'illustration d'abord, comme une couverture, puis ses pièces qui
 * défilent. Toute la mécanique est dans `VitrineMarque` : le chargement
 * différé, la mesure de l'illustration, le tour de rôle, l'arrêt hors de
 * l'écran.
 *
 * CE COMPOSANT NE FAIT QU'UNE CHOSE : décider quoi afficher quand il n'y
 * a vraiment rien. Ni illustration lisible, ni pièce publiée, et la
 * carte se contente du nom de la marque sur son aplat. C'est rare, mais
 * c'est le seul cas où le défilé ne peut rien.
 *
 * UNE MARQUE SANS ILLUSTRATION PASSE QUAND MÊME PAR ICI. Elle ne le
 * faisait pas : la carte affichait directement son nom, ce qui donnait
 * un aplat vide avec « MINUS TWØ » écrit dessus, et l'impression qu'il
 * manquait quelque chose. Ses pièces, elles, existaient depuis le début.
 *
 * L'illustration animée, elle, ne passe pas par ici : `BrandCard` la
 * traite en amont. Une marque qui s'est donné la peine d'en faire une a
 * déjà dit ce qu'elle voulait montrer.
 */
export default function IllustrationMarque({
  source,
  estUnLogo,
  slug,
  nom,
}: {
  /** L'illustration, quand la marque en a une. Sinon, ses pièces seules. */
  source?: string | null;
  /** Un logo se montre en entier ; une photo peut remplir le cadre. */
  estUnLogo: boolean;
  slug: string;
  nom: string;
}) {
  const [rien, setRien] = useState(false);

  // `useCallback` parce que ce rappel est dans les dépendances d'un
  // effet : une fonction recréée à chaque rendu le relancerait en
  // boucle.
  const signalerLeVide = useCallback(() => setRien(true), []);

  if (rien) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[#a795c9]">
          {nom}
        </span>
      </div>
    );
  }

  return (
    <VitrineMarque
      slug={slug}
      nom={nom}
      couverture={source}
      estUnLogo={estUnLogo}
      onVide={signalerLeVide}
    />
  );
}
