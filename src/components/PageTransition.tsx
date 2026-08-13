"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Deux choses qui donnent au site l'air d'être vivant :
 * une barre de progression pendant la navigation, et un fondu à
 * l'arrivée de chaque page.
 *
 * Next.js ne signale pas le départ d'une navigation. On l'attrape donc
 * au clic sur un lien interne, en phase de capture pour passer avant
 * le routeur, et on referme la barre quand l'adresse a changé.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [largeur, setLargeur] = useState(0);
  const [actif, setActif] = useState(false);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  function arreter() {
    if (minuteur.current) clearInterval(minuteur.current);
    minuteur.current = null;
  }

  useEffect(() => {
    function auClic(e: MouseEvent) {
      // Ni clic droit, ni nouvel onglet, ni téléchargement.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;

      const lien = (e.target as HTMLElement)?.closest?.("a");
      if (!lien) return;

      const href = lien.getAttribute("href");
      if (!href || !href.startsWith("/") || lien.target === "_blank") return;
      if (href === pathname) return;

      setActif(true);
      setLargeur(12);
      arreter();
      // On avance sans jamais atteindre la fin : la barre ne doit pas
      // promettre une arrivée qu'elle ne contrôle pas.
      minuteur.current = setInterval(() => {
        setLargeur((l) => (l >= 88 ? l : l + (88 - l) * 0.12));
      }, 160);
    }

    document.addEventListener("click", auClic, true);
    return () => {
      document.removeEventListener("click", auClic, true);
      arreter();
    };
  }, [pathname]);

  /*
   * La barre du haut et le pied de page entrent avec le contenu.
   *
   * Ils sont hors de ce composant — la barre doit rester enfant direct
   * de <body> pour rester collante — donc rien ne les remonte à la
   * navigation et leur fondu ne repartait pas tout seul. On bascule
   * l'attribut d'une valeur à l'autre : c'est le changement de nom
   * d'animation qui la relance côté CSS.
   *
   * Le premier passage est ignoré : le serveur a déjà écrit « a » sur
   * <html>, et le rejouer ici ferait clignoter la barre au chargement.
   */
  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    const racine = document.documentElement;
    racine.dataset.entree = racine.dataset.entree === "a" ? "b" : "a";
  }, [pathname]);

  // L'adresse a changé : la page est là.
  useEffect(() => {
    arreter();
    setLargeur(100);
    const t = setTimeout(() => {
      setActif(false);
      setLargeur(0);
    }, 320);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <>
      <div
        className="progress"
        style={{ width: `${largeur}%`, opacity: actif ? 1 : 0 }}
        aria-hidden="true"
      />
      {/* La clé force un remontage à chaque page : c'est ce qui relance
          l'animation d'entrée. */}
      <div key={pathname} className="page-in flex flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
