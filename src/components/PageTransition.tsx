"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Deux choses qui donnent au site l'air d'être vivant :
 * une barre de progression pendant la navigation, et un fondu à
 * l'arrivée de chaque page.
 *
 * Next.js ne signale pas le départ d'une navigation. On l'attrape donc
 * au clic sur un lien interne, en phase de capture pour passer avant
 * le routeur, et on referme la barre quand l'adresse a changé.
 *
 * « L'ADRESSE », C'EST LE CHEMIN ET LA REQUÊTE, et c'est ce qui a été
 * corrigé ici. La barre se fermait sur un changement de `pathname` :
 * elle ne se fermait donc JAMAIS quand on allait de `/marques` à
 * `/marques?q=denim`, deux pages différentes au même chemin. On voyait
 * une barre ramper vers les quatre-vingt-huit pour cent et s'y arrêter,
 * pendant qu'un minuteur continuait de tourner toutes les cent soixante
 * millisecondes jusqu'à ce qu'on quitte la page — une animation morte,
 * et du calcul pour rien.
 *
 * `useSearchParams` aurait dit la requête, mais il fait basculer tout
 * ce qui l'entoure en rendu dynamique tant qu'il n'est pas enveloppé
 * dans un `Suspense` : cher pour une barre de quatre pixels, dans un
 * composant qui enveloppe toutes les pages du site. On lit donc
 * `location` au clic puis à chaque battement du minuteur qui existe
 * déjà : il ne coûte rien de plus.
 */

/**
 * Le filet, en millisecondes.
 *
 * Une navigation qui n'aboutit pas — le réseau qui tombe, un lien qui
 * ne mène nulle part, le routeur qui annule — laissait la barre en
 * suspens pour de bon. Elle rend la main au bout de huit secondes :
 * mieux vaut une barre qui se referme trop tôt qu'une barre qui ment
 * jusqu'à la fin de la visite.
 */
const BUTOIR = 8000;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [largeur, setLargeur] = useState(0);
  const [actif, setActif] = useState(false);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);
  const butoir = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fin = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Le chemin ET la requête : c'est ce qui distingue deux pages. */
  function adresse(): string {
    return window.location.pathname + window.location.search;
  }

  const arreter = useCallback(() => {
    if (minuteur.current) clearInterval(minuteur.current);
    if (butoir.current) clearTimeout(butoir.current);
    minuteur.current = null;
    butoir.current = null;
  }, []);

  const terminer = useCallback(() => {
    arreter();
    setLargeur(100);
    if (fin.current) clearTimeout(fin.current);
    fin.current = setTimeout(() => {
      setActif(false);
      setLargeur(0);
    }, 320);
  }, [arreter]);

  useEffect(() => {
    function auClic(e: MouseEvent) {
      // Ni clic droit, ni nouvel onglet, ni téléchargement.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;

      const lien = (e.target as HTMLElement)?.closest?.("a");
      if (!lien) return;

      const href = lien.getAttribute("href");
      if (!href || !href.startsWith("/") || lien.target === "_blank") return;

      /* Le lien de la page où l'on est déjà, requête comprise : rien ne
         va se charger, donc rien à annoncer. */
      const depart = adresse();
      if (href === depart) return;

      setActif(true);
      setLargeur(12);
      arreter();

      // On avance sans jamais atteindre la fin : la barre ne doit pas
      // promettre une arrivée qu'elle ne contrôle pas.
      minuteur.current = setInterval(() => {
        /* La page est-elle arrivée ? Le routeur n'en dit rien, mais il
           réécrit l'adresse au moment où il la pose. C'est le seul
           signal qui marche aussi quand seule la requête change. */
        if (adresse() !== depart) {
          terminer();
          return;
        }
        setLargeur((l) => (l >= 88 ? l : l + (88 - l) * 0.12));
      }, 160);

      butoir.current = setTimeout(terminer, BUTOIR);
    }

    document.addEventListener("click", auClic, true);
    return () => {
      document.removeEventListener("click", auClic, true);
      arreter();
    };
  }, [arreter, terminer]);

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

  // Le chemin a changé : la page est là, sans attendre le battement
  // suivant du minuteur.
  useEffect(() => {
    terminer();
  }, [pathname, terminer]);

  /* Rien ne doit survivre au démontage, pas même les trois cents
     millisecondes du fondu de sortie. */
  useEffect(() => {
    return () => {
      if (fin.current) clearTimeout(fin.current);
    };
  }, []);

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
