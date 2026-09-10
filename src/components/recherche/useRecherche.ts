"use client";

import { useEffect, useState } from "react";
import type { Recherche } from "@/lib/types";
import type { Critere } from "./Jeton";

/**
 * Les suggestions de recherche, et le résultat surligné.
 *
 * POURQUOI CE FICHIER EXISTE À PART DE L'ANNUAIRE. La même recherche se
 * fait maintenant à deux endroits : le panneau posé sous le champ, sur
 * ordinateur, et la feuille plein écran, au doigt (voir
 * `FeuilleRecherche`). Deux copies du même appel finiraient par diverger
 * — un délai ici, un minimum là — et l'on obtiendrait deux recherches qui
 * ne répondent pas pareil sur le même site.
 *
 * ON INTERROGE LA BASE POUR LES PIÈCES, PAS POUR LES MARQUES. Les
 * marques sont déjà toutes dans le navigateur : les filtrer sur place
 * est instantané, et c'est ce que fait l'annuaire pour sa liste. Les
 * mille deux cents pièces, elles, ne descendent pas avec la page.
 *
 * LES CRITÈRES NE VIENNENT PAS D'ICI NON PLUS, et pour la même raison :
 * les styles, les vestiaires et les gammes de prix sont déjà comptés
 * dans l'annuaire, filtre par filtre. Ils arrivent donc en paramètre,
 * tout prêts, et ce fichier ne s'occupe que de les mettre dans le même
 * ordre de clavier que les marques — un critère se POSE en jeton, une
 * marque s'OUVRE, et c'est la seule différence entre deux lignes qui se
 * ressemblent.
 */

/** En deçà, on ne cherche pas, on parcourt. Voir `rechercher`. */
export const MINIMUM = 2;

/** Le temps qu'on laisse aux doigts avant d'aller interroger la base. */
const REPOS = 180;

export function useRecherche(query: string, criteres: Critere[] = []) {
  const [suggestions, setSuggestions] = useState<Recherche | null>(null);
  const [surligne, setSurligne] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MINIMUM) {
      setSuggestions(null);
      return;
    }

    const halte = new AbortController();
    const minuteur = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: halte.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((json: Recherche) => {
          setSuggestions(json);
          setSurligne(0);
        })
        .catch(() => {
          /* Frappe suivante, ou réseau : le panneau garde ce qu'il a. */
        });
    }, REPOS);

    return () => {
      clearTimeout(minuteur);
      halte.abort();
    };
  }, [query]);

  const marques = suggestions?.marques ?? [];

  /*
   * Les critères d'abord, les marques ensuite : c'est l'ordre de la
   * liste à l'écran, donc l'ordre des flèches. Un seul compte pour les
   * deux, sans quoi la flèche du bas sauterait d'un groupe à l'autre
   * sans passer par la fin du premier.
   */
  const total = criteres.length + marques.length;

  /* L'index reste dans les clous quand la liste raccourcit sous lui :
     une frappe de plus, et la ligne surlignée n'existe plus. */
  useEffect(() => {
    setSurligne((i) => (i >= total ? 0 : i));
  }, [total]);

  /** Y a-t-il de quoi ouvrir un panneau, ou n'est-ce encore que du vide ? */
  const garni =
    criteres.length > 0 ||
    (query.trim().length >= MINIMUM &&
      Boolean(suggestions) &&
      (marques.length > 0 || (suggestions?.pieces.length ?? 0) > 0));

  /**
   * Les flèches et Entrée, partagées elles aussi.
   *
   * Entrée ouvre la marque SURLIGNÉE, pas la première : sans ça, la
   * flèche du bas ne servirait à rien.
   */
  function auClavier(
    e: React.KeyboardEvent<HTMLInputElement>,
    ouvrir: (slug: string, mot: string) => void,
    /* Absent au doigt : la feuille ne pose pas de jetons, elle ouvre. */
    poser?: (critere: Critere) => void
  ): boolean {
    if (total === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurligne((i) => (i + 1) % total);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i - 1 + total) % total);
      return true;
    }
    if (e.key === "Enter") {
      const critere = criteres[surligne];
      if (critere) {
        // Sans quoi pour poser, on laisse la touche au formulaire.
        if (!poser) return false;
        e.preventDefault();
        poser(critere);
        return true;
      }
      e.preventDefault();
      const cible = marques[surligne - criteres.length];
      if (cible) ouvrir(cible.slug, query.trim());
      return true;
    }
    return false;
  }

  return { suggestions, marques, surligne, setSurligne, garni, auClavier };
}
