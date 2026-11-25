"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarqueTrouvee, Recherche } from "@/lib/types";
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
const REPOS = 140;

/** Combien de marques le panneau propose. */
const MARQUES_PROPOSEES = 6;

/*
 * LES MARQUES SE CHERCHENT SUR PLACE.
 *
 * Elles attendaient la base à chaque frappe, et la base mettait trois
 * secondes : le panneau apparaissait longtemps après qu'on avait fini de
 * taper. La liste entière (une quinzaine de kilo-octets) descend une fois,
 * à la première lettre, partagée par tous les champs de la page ; les
 * marques s'affichent ensuite à la frappe. Voir `/api/recherche/marques`.
 */
let indexDesMarques: Promise<MarqueTrouvee[]> | null = null;

function chargerLesMarques(): Promise<MarqueTrouvee[]> {
  indexDesMarques ??= fetch("/api/recherche/marques")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j: { marques?: MarqueTrouvee[] }) => j.marques ?? [])
    .catch(() => {
      // Un raté ne reste pas : la frappe suivante retentera.
      indexDesMarques = null;
      return [];
    });
  return indexDesMarques;
}

/** Minuscules, sans accents ni ponctuation : « Supermade® » se trouve en tapant « supermade ». */
function aplatir(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les marques qui portent le mot, les plus évidentes d'abord : celles dont
 * le nom COMMENCE par lui, puis celles dont un mot commence par lui, puis
 * le reste.
 */
function marquesQuiPortent(index: MarqueTrouvee[], q: string): MarqueTrouvee[] {
  const mot = aplatir(q);
  if (!mot) return [];
  const classees: { m: MarqueTrouvee; rang: number }[] = [];
  for (const m of index) {
    const nom = aplatir(m.name);
    const ou = nom.indexOf(mot);
    if (ou === -1) continue;
    classees.push({ m, rang: ou === 0 ? 0 : nom[ou - 1] === " " ? 1 : 2 });
  }
  return classees
    .sort((a, b) => a.rang - b.rang || a.m.name.localeCompare(b.m.name, "fr"))
    .slice(0, MARQUES_PROPOSEES)
    .map((x) => x.m);
}

export function useRecherche(query: string, criteres: Critere[] = []) {
  const [suggestions, setSuggestions] = useState<Recherche | null>(null);
  const [surligne, setSurligne] = useState(0);
  /*
   * UNE RÉPONSE EST EN ROUTE.
   *
   * Sans cache, la recherche met deux à trois secondes à répondre. Le
   * panneau montrait pendant ce temps « En ce moment », et la feuille
   * du téléphone « Rien ne correspond » : on croyait la recherche vide
   * ou cassée. `enCours` permet de dire qu'elle cherche.
   */
  const [enCours, setEnCours] = useState(false);
  const [index, setIndex] = useState<MarqueTrouvee[] | null>(null);

  // Dès la première lettre : la liste est là avant la deuxième.
  useEffect(() => {
    if (index || query.trim().length === 0) return;
    let vivant = true;
    chargerLesMarques().then((liste) => {
      if (vivant && liste.length > 0) setIndex(liste);
    });
    return () => {
      vivant = false;
    };
  }, [query, index]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MINIMUM) {
      setSuggestions(null);
      setEnCours(false);
      return;
    }

    setEnCours(true);
    const halte = new AbortController();
    const minuteur = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: halte.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((json: Recherche) => {
          setSuggestions(json);
          setSurligne(0);
          setEnCours(false);
        })
        .catch(() => {
          /* Frappe suivante (la requête est abandonnée, une autre part) :
             on reste en attente. Panne réseau : on arrête d'attendre, et
             le panneau garde ce qu'il a. */
          if (!halte.signal.aborted) setEnCours(false);
        });
    }, REPOS);

    return () => {
      clearTimeout(minuteur);
      halte.abort();
    };
  }, [query]);

  /*
   * CE QUE LE PANNEAU MONTRE : les marques trouvées sur place, tout de
   * suite, et les pièces de la base quand elles arrivent. Tant que la
   * liste des marques n'est pas descendue, on garde celles de la base.
   */
  const q = query.trim();
  const locales = useMemo(() => (index ? marquesQuiPortent(index, q) : null), [index, q]);
  const fusion: Recherche | null =
    q.length < MINIMUM
      ? null
      : locales
        ? {
            marques: locales,
            pieces: suggestions?.pieces ?? [],
            posts: suggestions?.posts ?? [],
            totalPieces: suggestions?.totalPieces ?? 0,
          }
        : suggestions;

  const marques = fusion?.marques ?? [];

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
    (q.length >= MINIMUM &&
      Boolean(fusion) &&
      (marques.length > 0 || (fusion?.pieces.length ?? 0) > 0));

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

  return { suggestions: fusion, marques, surligne, setSurligne, garni, auClavier, enCours };
}
