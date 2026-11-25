import type { SupabaseClient } from "@supabase/supabase-js";
import {
  couleursDesPixels,
  couleursDuNom,
  indicesDuNom,
  teinteDe,
  type CleCouleur,
} from "./couleurs";
import { adresseSure } from "./photos-mortes";
import { vignette } from "./vignette";

/**
 * LIRE LES COULEURS DU CATALOGUE, PAR LOTS.
 *
 * Sert deux fois : à la tâche quotidienne (`/api/cron/couleurs`), qui
 * lit les pièces arrivées dans la journée, et au bouton de l'admin, qui
 * rattrape tout le catalogue d'un coup. Les deux s'arrêtent d'eux-mêmes
 * avant le délai de Vercel et reprennent là où ils en étaient : la file,
 * c'est la base (`couleurs is null`), pas la mémoire du serveur.
 *
 * LA SOBRIÉTÉ, CONCRÈTEMENT.
 *
 *   - Le nom d'abord : aucune requête.
 *   - Sinon une VIGNETTE de 64 pixels, demandée au CDN de la boutique
 *     quand il sait redimensionner (Shopify, Squarespace) : deux à trois
 *     kilo-octets au lieu de plusieurs centaines.
 *   - Une fois par pièce dans sa vie : une pièce lue n'est relue que si
 *     son nom ou sa photo principale change (déclencheur, migration 51).
 */

/** Combien de pièces on prend dans la file à chaque tour. */
const PAR_TOUR = 400;

/** Combien de photos se lisent en même temps. */
const EN_PARALLELE = 8;

/** Le côté de la vignette décodée. Assez pour la forme, pas plus. */
const COTE = 40;

/** Au-delà, on renonce : ce n'est pas une vignette. */
const POIDS_MAX = 2_500_000;

const ENTETES = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  // Pas d'AVIF : sharp le lit, mais c'est le format le plus lent à décoder.
  accept: "image/webp,image/png,image/jpeg,*/*;q=0.5",
};

type PieceALire = { id: string; name: string | null; image_url: string | null };

type Ligne = { id: string; couleurs: CleCouleur[]; teinte: string | null };

export type BilanCouleurs = {
  ok: boolean;
  erreur?: string;
  /** Pièces écrites pendant ce passage. */
  lues: number;
  parLeNom: number;
  parLaPhoto: number;
  /** Lues, mais rien de sûr (photo illisible, ou indécise). */
  sansReponse: number;
  /** Ce qui reste dans la file après ce passage. */
  restantes: number | null;
};

/** L'adresse d'une petite version de la photo, ou la photo elle-même. */
function adresseDeVignette(url: string): URL | null {
  const https = url.replace(/^http:\/\//i, "https://");
  const petite = vignette(https, 64);
  // `vignette` renvoie vers notre propre proxy quand l'hôte ne sait pas
  // redimensionner : depuis le serveur, on va directement à la source.
  const cible = petite && !petite.startsWith("/") ? petite : https;
  return adresseSure(cible);
}

/** Les octets d'une image, en suivant trois redirections sûres au plus. */
async function telecharger(url: string, signal: AbortSignal): Promise<Buffer | null> {
  let cible = adresseDeVignette(url);
  for (let saut = 0; cible && saut < 4; saut++) {
    const r = await fetch(cible, { headers: ENTETES, redirect: "manual", signal });
    if (r.status >= 300 && r.status < 400) {
      const suite = r.headers.get("location");
      cible = suite ? adresseSure(new URL(suite, cible).toString()) : null;
      continue;
    }
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") ?? "").toLowerCase();
    if (!type.startsWith("image/")) return null;
    const annonce = Number(r.headers.get("content-length") ?? 0);
    if (annonce > POIDS_MAX) return null;
    const octets = Buffer.from(await r.arrayBuffer());
    return octets.length > POIDS_MAX ? null : octets;
  }
  return null;
}

type Sharp = typeof import("sharp").default;

/** La couleur d'une photo. `null` : rien de lisible. */
async function lireLaPhoto(sharp: Sharp, url: string, signal: AbortSignal) {
  // Une erreur de réseau remonte : la pièce sera reprise plus tard.
  const octets = await telecharger(url, signal);
  if (!octets) return null;
  // Une image que sharp ne sait pas lire, elle, ne le saura jamais.
  try {
    const { data, info } = await sharp(octets, { failOn: "none", animated: false })
      .rotate()
      .resize(COTE, COTE, { fit: "inside" })
      // Un PNG détouré : la transparence devient du blanc, comme sur le site.
      .flatten({ background: "#ffffff" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return couleursDesPixels(data, info.width, info.height, info.channels);
  } catch {
    return null;
  }
}

/**
 * Un passage : vide la file autant que le temps le permet.
 *
 * `supabase` doit être celui d'un administrateur (l'automate en est un) :
 * l'écriture passe par `poser_les_couleurs`, qui le vérifie.
 */
export async function lireUnLotDeCouleurs(
  supabase: SupabaseClient,
  dureeMs: number
): Promise<BilanCouleurs> {
  const fin = Date.now() + dureeMs;
  const bilan: BilanCouleurs = { ok: true, lues: 0, parLeNom: 0, parLaPhoto: 0, sansReponse: 0, restantes: null };

  let sharp: Sharp | null = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    // Sans sharp, on lit encore les noms. Les photos attendront.
  }

  const ecrire = async (lignes: Ligne[]): Promise<boolean> => {
    if (lignes.length === 0) return true;
    const { error } = await supabase.rpc("poser_les_couleurs", { p_lignes: lignes });
    if (error) {
      bilan.ok = false;
      bilan.erreur = error.message;
      return false;
    }
    bilan.lues += lignes.length;
    return true;
  };

  /* Les pièces sans réponse dans CE passage : une photo qui n'a pas
     répondu à temps n'est pas écrite, et la requête suivante la
     reprendrait aussitôt. On l'écarte jusqu'à la fin du passage. */
  const differees = new Set<string>();

  while (Date.now() < fin - 3000) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, image_url")
      .is("couleurs", null)
      .eq("status", "published")
      .is("retired_at", null)
      .eq("a_un_visuel", true)
      .order("id", { ascending: true })
      .limit(PAR_TOUR + differees.size);

    if (error) {
      bilan.ok = false;
      // La colonne n'existe pas : la migration 51 n'est pas passée.
      bilan.erreur = /couleurs/.test(error.message)
        ? "La base n'a pas encore les couleurs : lance la migration 51."
        : error.message;
      return bilan;
    }

    const file = ((data as PieceALire[] | null) ?? []).filter((p) => !differees.has(p.id));
    if (file.length === 0) break;

    /* 1. Le nom : tout de suite, pour tout le tour. */
    const parLeNom: Ligne[] = [];
    const aRegarder: PieceALire[] = [];
    for (const p of file) {
      const couleurs = couleursDuNom(p.name);
      if (couleurs.length > 0) parLeNom.push({ id: p.id, couleurs, teinte: teinteDe(couleurs[0]) });
      else aRegarder.push(p);
    }
    if (!(await ecrire(parLeNom))) return bilan;
    bilan.parLeNom += parLeNom.length;

    /* 2. La photo, à plusieurs, jusqu'à l'heure. */
    const parLaPhoto: Ligne[] = [];
    let suivant = 0;
    const ouvrier = async () => {
      while (suivant < aRegarder.length && Date.now() < fin - 2500) {
        const p = aRegarder[suivant++];
        const delai = AbortSignal.timeout(Math.min(6000, Math.max(500, fin - Date.now() - 2000)));
        let lu: Awaited<ReturnType<typeof lireLaPhoto>> = null;
        try {
          if (sharp && p.image_url) lu = await lireLaPhoto(sharp, p.image_url, delai);
        } catch {
          // Le réseau ou le délai : rien n'est écrit, la pièce reste en file
          // pour le passage suivant.
          differees.add(p.id);
          continue;
        }

        if (lu && lu.couleurs.length > 0) {
          parLaPhoto.push({ id: p.id, couleurs: lu.couleurs, teinte: lu.teinte ?? teinteDe(lu.couleurs[0]) });
          bilan.parLaPhoto++;
        } else {
          // La photo n'a rien dit : l'indice du nom, s'il y en a un.
          const indice = indicesDuNom(p.name);
          parLaPhoto.push({ id: p.id, couleurs: indice, teinte: indice[0] ? teinteDe(indice[0]) : null });
          if (indice.length === 0) bilan.sansReponse++;
        }
      }
    };
    if (sharp) await Promise.all(Array.from({ length: EN_PARALLELE }, ouvrier));
    else for (const p of aRegarder) differees.add(p.id);

    // Les photos par paquets de deux cents : une requête raisonnable.
    for (let i = 0; i < parLaPhoto.length; i += 200) {
      if (!(await ecrire(parLaPhoto.slice(i, i + 200)))) return bilan;
    }

    // Plus rien n'avance dans ce passage : on rend la main.
    if (parLeNom.length === 0 && parLaPhoto.length === 0) break;
  }

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("couleurs", null)
    .eq("status", "published")
    .is("retired_at", null)
    .eq("a_un_visuel", true);
  bilan.restantes = count ?? null;

  return bilan;
}
