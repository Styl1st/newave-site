"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps } from "react";

/**
 * Un lien de liste, qui ne prépare sa page que si l'on s'arrête dessus.
 *
 * CE QUE FAIT UN LIEN ORDINAIRE, ET CE QUE ÇA COÛTAIT. Next prépare la
 * page de chaque lien dès qu'il entre à l'écran : c'est ce qui rend le
 * clic immédiat, et c'est très bien pour une barre de navigation. Sur
 * une grille de pièces, chaque tuile porte trois liens. En descendant
 * la vitrine sur cinq écrans, mesuré : trente-six demandes au serveur,
 * pour des pièces qu'on a croisées sans les regarder. Chacune réveille
 * une fonction côté serveur, relit le compte et l'apparence, et fait
 * travailler le téléphone à la réception, en plein défilement, au
 * moment précis où il doit rester fluide et où les photos arrivent.
 *
 * ICI, ON ATTEND QUE LE DÉFILEMENT S'ARRÊTE. Tant que la page bouge,
 * rien ne part. Un quart de seconde après l'arrêt, les liens encore à
 * l'écran préparent leur page, et eux seulement. Personne ne clique une
 * tuile qu'il n'a pas eue sous les yeux un quart de seconde : au clic,
 * la page est prête exactement comme avant, et le passage en
 * profondeur se joue pareil (voir `PageTransition`).
 *
 * L'INTENTION PASSE DEVANT. Survoler un lien ou poser le doigt dessus
 * le prépare tout de suite, sans attendre l'arrêt.
 *
 * `intention` : ne préparer QUE sur ce signal, jamais à l'arrêt. Pour
 * les liens secondaires d'une tuile (le nom de la marque sous une
 * pièce) : on les suit rarement, et les préparer tous doublerait les
 * demandes pour presque rien.
 *
 * COMMENT. Le lien de Next garde toute sa mécanique ; on lui dit
 * seulement QUAND il a le droit de préparer, par sa propriété
 * `prefetch` : `false` tant qu'on attend, puis sa valeur par défaut.
 * Aucune interface interne de Next n'est touchée.
 */

/** Le calme qu'on attend après le dernier mouvement de la page. */
const ARRET = 260;

/* Un seul observateur et un seul minuteur pour tous les liens de la
   page : cent tuiles ne posent pas cent écouteurs de défilement. */
const visibles = new Map<Element, () => void>();
const suivis = new WeakMap<Element, () => void>();
let veille: IntersectionObserver | null = null;
let minuteur = 0;
let ecoute = false;

function liberer() {
  minuteur = 0;
  /* Copie : chaque lien se retire de la liste en se préparant. */
  for (const preparer of [...visibles.values()]) preparer();
  visibles.clear();
}

function patienter() {
  if (minuteur) window.clearTimeout(minuteur);
  minuteur = visibles.size ? window.setTimeout(liberer, ARRET) : 0;
}

function suivre(el: Element, preparer: () => void): () => void {
  if (!veille) {
    veille = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const fait = suivis.get(e.target);
        if (e.isIntersecting && fait) visibles.set(e.target, fait);
        else visibles.delete(e.target);
      }
      patienter();
    });
  }
  if (!ecoute) {
    ecoute = true;
    window.addEventListener("scroll", patienter, { passive: true });
  }

  suivis.set(el, preparer);
  veille.observe(el);

  return () => {
    suivis.delete(el);
    visibles.delete(el);
    veille?.unobserve(el);
  };
}

export default function LienPatient({
  intention = false,
  onPointerEnter,
  onTouchStart,
  ...props
}: ComponentProps<typeof Link> & {
  /** Ne préparer la page qu'au survol ou au toucher. */
  intention?: boolean;
}) {
  const [pret, setPret] = useState(false);
  const ancre = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ancre.current;
    if (pret || intention || !el || typeof IntersectionObserver === "undefined") return;
    return suivre(el, () => setPret(true));
  }, [pret, intention]);

  return (
    <Link
      {...props}
      ref={ancre}
      prefetch={pret ? undefined : false}
      onPointerEnter={(e) => {
        if (!pret) setPret(true);
        onPointerEnter?.(e);
      }}
      onTouchStart={(e) => {
        if (!pret) setPret(true);
        onTouchStart?.(e);
      }}
    />
  );
}
