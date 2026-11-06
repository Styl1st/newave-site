"use client";

import { createContext, useContext } from "react";

/**
 * Les quelques photos qui disent le style d'une marque, et combien elle
 * en a en tout. C'est ce que montrent la ligne de l'annuaire (quatre
 * vignettes et « +12 ») et le défilé d'une carte de marque.
 */
export type ApercuMarque = { images: string[]; total: number };

/*
 * UNE SEULE DEMANDE PAR MARQUE ET PAR VISITE.
 *
 * La ligne de l'annuaire, la carte de la grille, la marque de la semaine
 * et le panneau de recherche demandaient chacun les photos d'une marque
 * de leur côté, et redemandaient à chaque fois qu'ils réapparaissaient :
 * passer de la liste à la grille, effacer un filtre, rouvrir la
 * recherche, et les cases repassaient par le vide. Le navigateur ne
 * gardait rien, la réponse n'étant mise en cache que par Vercel.
 *
 * On garde donc la PROMESSE, et non la réponse : deux composants qui
 * demandent la même marque au même moment partagent le même appel au
 * lieu d'en lancer deux. Un échec est oublié, pour qu'on puisse
 * réessayer au passage suivant.
 */
const memoire = new Map<string, Promise<ApercuMarque>>();

export function chargerApercu(slug: string): Promise<ApercuMarque> {
  const deja = memoire.get(slug);
  if (deja) return deja;

  const demande = fetch(`/api/marques/${encodeURIComponent(slug)}/pieces?images=1`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`aperçu ${slug} : ${r.status}`))))
    .then((json: Partial<ApercuMarque>) => {
      /* Dédoublonné ici aussi : une réponse ancienne, gardée par le
         cache, peut encore porter deux fois la même photo. */
      const images = [...new Set(json.images ?? [])];
      return { images, total: json.total ?? images.length };
    });

  memoire.set(slug, demande);
  demande.catch(() => memoire.delete(slug));
  return demande;
}

/** Range une réponse arrivée avec la page, pour que personne ne la redemande. */
export function semerApercu(slug: string, apercu: ApercuMarque) {
  if (!memoire.has(slug)) memoire.set(slug, Promise.resolve(apercu));
}

/*
 * LES APERÇUS ARRIVÉS AVEC LA PAGE.
 *
 * Le serveur lit les photos des premières marques de l'annuaire en même
 * temps que la page, et les écrit dans le HTML : les premières lignes
 * s'affichent pleines, sans attendre que le JavaScript démarre puis
 * qu'un appel revienne.
 *
 * Un CONTEXTE et non la mémoire ci-dessus, et c'est voulu : la mémoire
 * est un module, partagé sur le serveur entre toutes les visites. La
 * lire pendant le rendu ferait dépendre le HTML de la visite d'avant,
 * et le navigateur, qui n'a pas cette mémoire-là, rendrait autre chose
 * à l'hydratation. Le contexte, lui, ne porte que ce que cette page a
 * reçu, à l'identique des deux côtés.
 */
const AUCUN: Record<string, ApercuMarque> = {};
export const ApercusInitiaux = createContext<Record<string, ApercuMarque>>(AUCUN);

export function useApercuInitial(slug: string): ApercuMarque | undefined {
  return useContext(ApercusInitiaux)[slug];
}
