/**
 * Quelle touche annoncer pour le raccourci de recherche : ⌘ ou Ctrl.
 *
 * Le raccourci répond aux deux depuis toujours (voir
 * `RechercheAccueil`), mais l'étiquette disait « ⌘ K » partout, y
 * compris sous Windows où cette touche n'existe pas. On lit la
 * plateforme que le navigateur déclare (`userAgentData`), puis
 * l'ancien `navigator.platform`, puis l'agent utilisateur. Mac, iPhone
 * et iPad ont ⌘ ; tout le reste a Ctrl.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

export type ToucheCommande = "⌘" | "Ctrl";

export type IndicesPlateforme = {
  userAgentDataPlatform?: string | null;
  platform?: string | null;
  userAgent?: string | null;
};

const APPLE = /mac|iphone|ipad|ipod|ios/i;

export function toucheCommande(indices: IndicesPlateforme): ToucheCommande {
  const declaree = indices.userAgentDataPlatform || indices.platform;
  if (declaree) return APPLE.test(declaree) ? "⌘" : "Ctrl";
  return indices.userAgent && /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(indices.userAgent) ? "⌘" : "Ctrl";
}

/* « ⌘K » peut se coller dans une phrase ; « CtrlK » ne se lit pas. */
export function libelleRaccourci(touche: ToucheCommande, options: { colle?: boolean } = {}): string {
  if (touche === "⌘") return options.colle ? "⌘K" : "⌘ K";
  return "Ctrl K";
}
