/**
 * Le lien vers le profil Instagram d'une marque, à partir de ce qui a
 * été saisi.
 *
 * La colonne `instagram` contient le plus souvent un pseudo nu
 * (« supram »), mais rien n'empêche d'y coller « @supram » ou l'adresse
 * complète du profil. On accepte les trois et on rend toujours la même
 * chose : le pseudo, et l'adresse canonique du profil.
 *
 * Un lien de post ou de reel n'est pas un profil, et un pseudo
 * impossible (espace, plus de trente caractères) ne donne pas de lien
 * plutôt qu'un lien cassé.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

export type LienInstagram = { handle: string; url: string };

/* Les premiers segments d'adresse qui ne sont pas des profils. */
const RESERVES = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct"]);

const PSEUDO = /^[A-Za-z0-9._]{1,30}$/;

export function lienInstagram(saisie: string | null | undefined): LienInstagram | null {
  let brut = (saisie ?? "").trim();
  if (!brut) return null;

  const adresse = brut.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
  if (adresse) {
    brut = adresse[1];
  } else if (/[/:]/.test(brut)) {
    // Une adresse, mais pas chez Instagram.
    return null;
  }

  const handle = brut.replace(/^@/, "");
  if (!PSEUDO.test(handle) || RESERVES.has(handle.toLowerCase())) return null;

  return { handle, url: `https://www.instagram.com/${handle}/` };
}
