"use server";

import { fetchIdentite, normalizeShopUrl, type Identite } from "./catalogue";
import { getProfile } from "./auth";

/** Hôtes qu'on refuse de joindre, pour ne pas servir de relais. */
const INTERDITS =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)/i;

/**
 * Lit l'identité d'une marque depuis son site.
 *
 * Réservé aux personnes connectées, et les adresses privées sont
 * refusées : sans ces deux gardes, l'action deviendrait un relais
 * anonyme permettant de sonder le réseau interne de l'hébergeur
 * depuis nos serveurs.
 */
export async function analyserSite(
  url: string
): Promise<{ ok: true; identite: Identite } | { ok: false; error: string }> {
  const profil = await getProfile();
  if (!profil) return { ok: false, error: "Connecte-toi d'abord." };

  const base = normalizeShopUrl(url);
  if (!base) return { ok: false, error: "Cette adresse n'est pas valide." };

  const hote = new URL(base).hostname;
  if (INTERDITS.test(hote) || !hote.includes(".")) {
    return { ok: false, error: "Cette adresse n'est pas joignable." };
  }

  const identite = await fetchIdentite(base);
  if (!identite || (!identite.name && !identite.description)) {
    return {
      ok: false,
      error:
        "Ce site ne publie pas assez d'informations pour être lu automatiquement. Remplis les champs à la main, ça marche tout aussi bien.",
    };
  }

  return { ok: true, identite };
}
