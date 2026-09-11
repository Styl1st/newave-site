/**
 * Les adresses qu'on a changées, et où elles mènent maintenant.
 *
 * POURQUOI DANS `lib` ET PAS DANS LA PAGE. Une redirection écrite dans
 * un composant serveur ne peut plus rendre un vrai 308 : le gabarit a
 * commencé à couler vers le navigateur quand la page décide de partir
 * ailleurs, et Next n'a plus de statut à changer — il glisse la
 * redirection dans le flux, que le routeur du navigateur suit. Ça
 * marche pour quelqu'un qui clique, et pas pour un moteur de recherche,
 * un partage, ou un client qui ne lit que l'en-tête.
 *
 * Le seul endroit qui répond AVANT le rendu, c'est le middleware. La
 * table vit donc ici, en fonctions pures : le middleware tourne au bord
 * du réseau, il n'a droit à rien d'autre.
 *
 * ⚠️ ON NE SUPPRIME PAS UNE LIGNE DE CETTE TABLE. Une adresse publique
 * ne meurt pas parce qu'on a changé d'avis sur la forme d'un réglage :
 * elle est peut-être en signet, dans un lien externe ou dans un message
 * envoyé il y a six mois.
 */

/** `/populaires?vue=…` — les cinq onglets d'avant la phrase réglable. */
const VUES: Record<string, { quoi: string; mesure: string; periode?: string }> = {
  semaine: { quoi: "pieces", mesure: "coeurs", periode: "semaine" },
  toujours: { quoi: "pieces", mesure: "coeurs", periode: "toujours" },
  marques: { quoi: "marques", mesure: "coeurs", periode: "toujours" },
  "notes-pieces": { quoi: "pieces", mesure: "note" },
  "notes-marques": { quoi: "marques", mesure: "note" },
};

/** Les trois fenêtres, lues en toutes lettres. Jamais de transtypage. */
function laPeriode(valeur: string | null): string | undefined {
  return valeur === "semaine" || valeur === "mois" || valeur === "toujours"
    ? valeur
    : undefined;
}

/**
 * La nouvelle adresse d'un ancien classement, ou rien.
 *
 * `?vue=marques&periode=semaine` garde sa fenêtre : c'est la seule
 * ancienne adresse qui en portait une, et la perdre en chemin
 * renverrait sur un classement différent de celui qu'on avait mis en
 * signet.
 */
export function nouvelleAdresse(
  chemin: string,
  parametres: URLSearchParams
): { chemin: string; recherche: string } | null {
  if (chemin !== "/populaires") return null;

  const vue = parametres.get("vue");
  if (!vue) return null;

  const cible = VUES[vue];
  if (!cible) return null;

  const suite = new URLSearchParams({ quoi: cible.quoi, mesure: cible.mesure });
  const periode = vue === "marques" ? (laPeriode(parametres.get("periode")) ?? cible.periode) : cible.periode;
  if (periode) suite.set("periode", periode);

  return { chemin, recherche: `?${suite}` };
}
