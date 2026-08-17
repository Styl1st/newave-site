/**
 * Le message qui survit à une redirection.
 *
 * La plupart de nos enregistrements finissent par `redirect()` : la
 * page qui affichait le formulaire n'existe plus au moment où l'on
 * voudrait dire « c'est enregistré ». Impossible, donc, de renvoyer un
 * simple message au composant qui a soumis.
 *
 * On le fait voyager dans l'adresse. Ce n'est pas la solution la plus
 * élégante, mais c'est la seule qui traverse un rechargement complet
 * sans cookie ni état partagé — et le bandeau efface le paramètre
 * derrière lui, si bien que rafraîchir la page ne le remontre pas.
 *
 * On n'y met jamais rien de personnel : ces adresses finissent dans
 * l'historique du navigateur et dans les journaux du serveur.
 */

export type TonDuMessage = "ok" | "info" | "erreur";

const PARAMETRE: Record<TonDuMessage, string> = {
  ok: "ok",
  info: "info",
  erreur: "err",
};

/** `/admin/marques` + « Marque enregistrée » → `/admin/marques?ok=…` */
export function avecMessage(chemin: string, texte: string, ton: TonDuMessage = "ok"): string {
  const separateur = chemin.includes("?") ? "&" : "?";
  return `${chemin}${separateur}${PARAMETRE[ton]}=${encodeURIComponent(texte)}`;
}

/** Les noms de paramètres à relire côté navigateur. */
export const PARAMETRES_MESSAGE = PARAMETRE;
