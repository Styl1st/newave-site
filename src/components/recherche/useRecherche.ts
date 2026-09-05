"use client";

import { useEffect, useState } from "react";
import type { Recherche } from "@/lib/types";

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
 */

/** En deçà, on ne cherche pas, on parcourt. Voir `rechercher`. */
export const MINIMUM = 2;

/** Le temps qu'on laisse aux doigts avant d'aller interroger la base. */
const REPOS = 180;

export function useRecherche(query: string) {
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

  /** Y a-t-il de quoi ouvrir un panneau, ou n'est-ce encore que du vide ? */
  const garni =
    query.trim().length >= MINIMUM &&
    Boolean(suggestions) &&
    (marques.length > 0 || (suggestions?.pieces.length ?? 0) > 0);

  /**
   * Les flèches et Entrée, partagées elles aussi.
   *
   * Entrée ouvre la marque SURLIGNÉE, pas la première : sans ça, la
   * flèche du bas ne servirait à rien.
   */
  function auClavier(
    e: React.KeyboardEvent<HTMLInputElement>,
    ouvrir: (slug: string, mot: string) => void
  ): boolean {
    if (marques.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurligne((i) => (i + 1) % marques.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i - 1 + marques.length) % marques.length);
      return true;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const cible = marques[surligne];
      if (cible) ouvrir(cible.slug, query.trim());
      return true;
    }
    return false;
  }

  return { suggestions, marques, surligne, setSurligne, garni, auClavier };
}
