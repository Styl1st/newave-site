"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Confirmation en deux temps, à la place de window.confirm.
 *
 * Les navigateurs mobiles suppriment les boîtes de dialogue natives dès
 * qu'ils les jugent envahissantes — Brave et Chrome le font sans rien
 * afficher, et confirm() renvoie alors false. Le bouton semblait donc
 * inerte : on appuyait, il ne se passait rien, aucune explication.
 *
 * Ici la confirmation vit dans la page. Le premier appui arme le
 * bouton, le second exécute. Sans réponse, il se désarme tout seul :
 * un bouton resté en « Confirmer » finirait par se faire toucher par
 * accident.
 */
export function useConfirmation(delai = 6000) {
  const [arme, setArme] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const desarmer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setArme(false);
  }, []);

  useEffect(() => desarmer, [desarmer]);

  /** true si l'action doit partir maintenant, false si on vient d'armer. */
  const demander = useCallback((): boolean => {
    if (arme) {
      desarmer();
      return true;
    }
    setArme(true);
    minuteur.current = setTimeout(() => setArme(false), delai);
    return false;
  }, [arme, delai, desarmer]);

  return { arme, demander, desarmer };
}

/**
 * Même principe, quand plusieurs actions se partagent un composant :
 * armer « Supprimer » ne doit pas armer « Refuser ».
 */
export function useConfirmationCle(delai = 6000) {
  const [cle, setCle] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const desarmer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setCle(null);
  }, []);

  useEffect(() => desarmer, [desarmer]);

  const demander = useCallback(
    (nouvelle: string): boolean => {
      if (cle === nouvelle) {
        desarmer();
        return true;
      }
      if (minuteur.current) clearTimeout(minuteur.current);
      setCle(nouvelle);
      minuteur.current = setTimeout(() => setCle(null), delai);
      return false;
    },
    [cle, delai, desarmer]
  );

  return { cle, demander, desarmer };
}
