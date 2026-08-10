"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchIdentite, normalizeShopUrl } from "@/lib/catalogue";
import { BRAND_CATEGORIES } from "@/lib/taxonomy";

/**
 * Les deux moments du parcours de candidature.
 *
 *   1. On lit le site de la marque, pour ne rien faire retaper.
 *   2. On dépose ce que la personne a relu.
 *
 * Ces deux actions sont appelées depuis un formulaire PUBLIC, sans
 * compte. C'est ce qui les rend différentes du reste du site, et ce
 * qui explique les précautions ci-dessous.
 */

export type Trouvaille = {
  site: string;
  nom: string | null;
  description: string;
  logo: string | null;
  couverture: string | null;
  instagram: string | null;
  ville: string | null;
  pays: string | null;
  annee: number | null;
  categories: string[];
  /** Combien de pièces on a vues, pour dire ce qu'on a lu. */
  pieces: number;
};

export type Analyse =
  | { ok: true; trouvaille: Trouvaille }
  | { ok: false; error: string };

/**
 * Refuse tout ce qui ne ressemble pas à une boutique publique.
 *
 * Cette action va chercher une page pour le compte de qui la demande,
 * sans qu'il ait eu à se connecter. Sans ce filtre, n'importe qui
 * pourrait s'en servir pour faire sonner, depuis nos serveurs, une
 * adresse interne à laquelle il n'a lui-même pas accès. On n'accepte
 * donc que du https, sur un nom de domaine public, sur le port normal.
 */
function adresseAcceptable(url: URL): string | null {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Seules les adresses commençant par https sont acceptées.";
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return "Cette adresse utilise un port inhabituel.";
  }

  const hote = url.hostname.toLowerCase();

  // Pas de nom local, pas d'adresse de machine, pas de réseau privé.
  if (
    hote === "localhost" ||
    hote.endsWith(".local") ||
    hote.endsWith(".internal") ||
    hote.endsWith(".localhost") ||
    !hote.includes(".")
  ) {
    return "Cette adresse ne désigne pas un site public.";
  }
  if (
    /^127\./.test(hote) ||
    /^10\./.test(hote) ||
    /^192\.168\./.test(hote) ||
    /^169\.254\./.test(hote) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hote) ||
    hote === "0.0.0.0" ||
    hote.startsWith("[")
  ) {
    return "Cette adresse ne désigne pas un site public.";
  }

  return null;
}

export async function analyserLeSite(formData: FormData): Promise<Analyse> {
  const saisie = String(formData.get("site") ?? "").trim();
  if (!saisie) return { ok: false, error: "Colle d'abord l'adresse du site." };

  const base = normalizeShopUrl(saisie);
  if (!base) {
    return { ok: false, error: "Cette adresse n'est pas valide. Exemple : tamarque.fr" };
  }

  const refus = adresseAcceptable(new URL(base));
  if (refus) return { ok: false, error: refus };

  const identite = await fetchIdentite(base);
  if (!identite) {
    return {
      ok: false,
      error:
        "Ce site n'a pas répondu. Vérifie l'adresse, ou remplis les informations à la main : ça marche exactement pareil.",
    };
  }

  // On ne garde que les catégories que le site connaît déjà : une
  // catégorie inventée ne servirait à rien dans les filtres.
  const categories = identite.categories.filter((c) =>
    (BRAND_CATEGORIES as readonly string[]).includes(c)
  );

  return {
    ok: true,
    trouvaille: {
      site: base,
      nom: identite.name,
      description: identite.description ?? "",
      logo: identite.logo,
      couverture: identite.cover,
      instagram: identite.instagram,
      ville: identite.city,
      pays: identite.country,
      annee: identite.founded_year,
      categories,
      pieces: identite.indices.pieces,
    },
  };
}

/* ---------------- le dépôt ---------------- */

export type Reseau = { reseau: string; identifiant: string };

export type Depot = { ok: true } | { ok: false; error: string };

export async function deposerLaCandidature(formData: FormData): Promise<Depot> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Le formulaire n'est pas branché pour le moment. Écris-nous à contact@newavesphere.fr, on répond à tout.",
    };
  }

  const texte = (nom: string) => String(formData.get(nom) ?? "").trim();

  let reseaux: Reseau[] = [];
  try {
    reseaux = (JSON.parse(String(formData.get("reseaux") ?? "[]")) as Reseau[])
      .filter((r) => r?.reseau && r?.identifiant?.trim())
      .map((r) => ({ reseau: r.reseau, identifiant: r.identifiant.trim().replace(/^@/, "") }))
      .slice(0, 8);
  } catch {
    reseaux = [];
  }

  const instagram = reseaux.find((r) => r.reseau === "instagram")?.identifiant ?? null;

  const categories = String(formData.get("categories") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => (BRAND_CATEGORIES as readonly string[]).includes(c));

  /*
   * Tout se joue dans une fonction de la base, pas ici.
   *
   * La table des marques n'accepte d'écriture que d'un administrateur,
   * et il n'était pas question d'ouvrir cette porte pour un formulaire
   * public. La fonction, elle, ne sait faire qu'une chose : déposer un
   * brouillon et sa candidature. Elle valide aussi l'email et refuse
   * les envois en rafale.
   */
  const { error } = await supabase.rpc("deposer_candidature", {
    p_relation: texte("relation") === "decouvreur" ? "decouvreur" : "proprietaire",
    p_marque: texte("marque"),
    p_contact: texte("contact"),
    p_email: texte("email"),
    p_pitch: texte("pitch"),
    p_site: texte("site") || null,
    p_instagram: instagram,
    p_reseaux: reseaux,
    p_description: texte("description"),
    p_pays: texte("pays") || "France",
    p_ville: texte("ville") || null,
    p_categories: categories,
    p_logo: texte("logo") || null,
    p_couverture: texte("couverture") || null,
  });

  if (error) {
    // Les messages levés par la fonction sont écrits pour être lus.
    return { ok: false, error: error.message || "L'envoi a échoué. Réessaie dans un instant." };
  }

  return { ok: true };
}
