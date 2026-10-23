"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cibleDeTraversee } from "@/lib/traversee";

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
 *
 * LE PASSAGE EN PROFONDEUR. Quand on change de page, l'ancienne recule
 * et s'efface pendant que la nouvelle arrive, puis son titre et ses
 * blocs se posent l'un après l'autre (voir « le passage d'une page à
 * l'autre » dans globals.css).
 *
 * Faire reculer l'ancienne page, c'est la difficulté : Next la retire
 * du document dès que la suivante (ou son écran d'attente) est prête,
 * en général dans l'image qui suit le clic. Il n'en reste rien à
 * animer. On passe donc par les transitions de vue du navigateur
 * (`document.startViewTransition`) : il photographie l'écran tel
 * qu'on le voit, on laisse le routeur remplacer la page, et c'est la
 * photographie qui recule. La barre du haut est photographiée à part
 * et ne bouge pas : elle reste le cadre fixe de la visite.
 *
 * Sans ces transitions (anciens navigateurs), avec moins de mouvement
 * demandé, ou pendant l'intro, on laisse faire le lien : la nouvelle
 * page arrive quand même en avant, seule.
 */

/**
 * Le temps qu'on accorde au routeur pour poser la page suivante.
 *
 * Pendant ce temps, le navigateur fige l'écran sur la photographie. La
 * page suivante (ou son écran d'attente) est presque toujours déjà
 * préchargée et arrive en une ou deux images. Si elle tarde — un lien
 * que le routeur n'avait pas vu venir —, on renonce à la transition
 * plutôt que de laisser un écran figé : la page arrivera seule.
 */
const PATIENCE = 220;

/** Le temps qu'on accorde au navigateur pour photographier la page. */
const DELAI_PHOTO = 250;

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
  const router = useRouter();
  /* Ce qui attend que la page suivante soit posée pour libérer la
     transition en cours. */
  const arrivee = useRef<(() => void) | null>(null);
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

      const cible = cibleDeTraversee(href, window.location);
      if (cible && !lien.hasAttribute("download") && !lien.closest("[data-sans-transition]") && peutTraverser()) {
        e.preventDefault();
        traverser(cible);
      }

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

    /** Le navigateur sait faire, et personne n'a demandé le calme. */
    function peutTraverser(): boolean {
      if (typeof document.startViewTransition !== "function") return false;
      const racine = document.documentElement;
      if (racine.dataset.fige === "1") return false;
      /* Une machine qui peinait déjà sans verre dépoli ne gagnera rien à
         photographier l'écran (voir `Menagement`). */
      if (racine.dataset.allege === "2") return false;
      if (racine.dataset.intro && racine.dataset.intro !== "vu") return false;
      if (racine.dataset.animChoisi !== "1" && matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      return true;
    }

    function traverser(cible: string) {
      const racine = document.documentElement;
      racine.dataset.transition = "1";

      /* La page qu'on quitte se fige le temps d'être photographiée. Les
         blocs animés au défilement (le cylindre) empêchaient Chromium
         de prendre la photographie tant qu'ils tournaient : il attendait
         jusqu'à son délai de quatre secondes. Figés à l'endroit exact où
         ils sont, ils ne changent rien à l'image. La page suivante est
         un nouvel élément, elle n'est pas concernée. */
      const quittee = document.querySelector<HTMLElement>("main .page-in");
      quittee?.setAttribute("data-depart", "");

      let trop = false;
      let photographiee = false;
      let delai = 0;
      let liberer!: () => void;
      const posee = new Promise<void>((r) => (liberer = r));
      arrivee.current = liberer;

      const transition = document.startViewTransition(() => {
        photographiee = true;
        router.push(cible);
        delai = window.setTimeout(() => {
          trop = true;
          arrivee.current = null;
          liberer();
        }, PATIENCE);
        return posee;
      });

      /*
       * LA PHOTOGRAPHIE ELLE-MÊME PEUT TARDER. Le navigateur la prend à
       * l'image suivante, en général en quelques millisecondes ; mais une
       * page lourde sur une machine sans carte graphique peut le faire
       * attendre bien plus, et l'on a vu Chromium y rester jusqu'à son
       * délai de quatre secondes. On ne laisse pas le clic sans réponse :
       * passé ce délai, on renonce à la transition, et le routeur part
       * aussitôt.
       */
      const garde = window.setTimeout(() => {
        if (!photographiee) transition.skipTransition();
      }, DELAI_PHOTO);

      transition.ready.then(
        () => trop && transition.skipTransition(),
        () => {}
      );
      transition.finished.finally(() => {
        window.clearTimeout(delai);
        window.clearTimeout(garde);
        delete racine.dataset.transition;
        quittee?.removeAttribute("data-depart");
      });
    }

    document.addEventListener("click", auClic, true);
    return () => {
      document.removeEventListener("click", auClic, true);
      arreter();
    };
  }, [arreter, terminer, router]);

  /* La page suivante est posée (ou son écran d'attente) : on libère la
     transition. En effet de mise en page, pour que le navigateur la
     photographie dans l'image même où elle apparaît. */
  useLayoutEffect(() => {
    const liberer = arrivee.current;
    arrivee.current = null;
    liberer?.();
  }, [pathname]);

  /*
   * Le pied de page entre avec le contenu.
   *
   * Il est hors de ce composant, donc rien ne le remonte à la navigation
   * et son fondu ne repartait pas tout seul. On bascule l'attribut d'une
   * valeur à l'autre : c'est le changement de nom d'animation qui le
   * relance côté CSS. (La barre du haut, elle, ne clignote plus : voir
   * globals.css.)
   *
   * Le premier passage est ignoré : le serveur a déjà écrit « a » sur
   * <html>, et le rejouer ici ferait clignoter le pied au chargement.
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
