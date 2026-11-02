/**
 * La bio d'une marque telle qu'un visiteur doit la lire.
 *
 * DES NOTES DE RECHERCHE ONT ATTERRI DANS LE CHAMP « DESCRIPTION ».
 * Quand l'annuaire a été rempli en lot, la colonne de notes du tableur
 * (ce qu'on avait trouvé, ou pas, en cherchant le site de chaque marque)
 * a été versée dans la bio. Une marque sans bio affichait donc à tout le
 * monde « vitrine Shopify repérée, sans domaine propre » ou « rien
 * trouvé, présence Instagram uniquement ».
 *
 * La base se nettoie avec `supabase/migration-44.sql`. Ce filtre reste
 * en filet : il reconnaît les tournures qu'une bio n'emploie jamais
 * (« à confirmer », « sans rapport », « rien trouvé »…) et rend une bio
 * vide à la place, que la page sait déjà ne pas afficher.
 *
 * IL NE DEVINE PAS SUR LA FORME. Une bio courte, en minuscules et sans
 * point peut très bien être écrite ainsi par la marque elle-même : la
 * cacher sur ce seul indice la ferait disparaître sous les yeux de son
 * gérant. Ce cas-là est traité une fois pour toutes par la migration,
 * avec une copie de chaque texte retiré.
 *
 * Module sans dépendance, pour que les tests le lisent tel quel
 * (`npm test`).
 */

/** Au-delà, c'est un texte rédigé, pas une note prise en passant. */
const LONGUEUR_MAX_NOTE = 240;

const TOURNURES_DE_NOTE: RegExp[] = [
  /\brien trouv[eé]/i,
  /\brien de s[uû]r\b/i,
  /(^|[\s,;:(])à (confirmer|vérifier|fusionner)/i,
  /\bsans rapport\b/i,
  /\b(sans|aucun) domaine\b/i,
  /n['’]est pas (un site actif|référencé)/i,
  /\brenvoie (bien )?vers\b/i,
  /\b(instagram|tiktok)( et (instagram|tiktok))? uniquement\b/i,
  /\bvitrine \S+ rep[eé]r[eé]e/i,
  /\best bien (son|le) compte\b/i,
  /\bne peut pas être lu\b/i,
  /\best une autre marque\b/i,
];

/** Ce texte est-il une note de recherche plutôt qu'une bio ? */
export function estUneNoteDeRecherche(texte: string | null | undefined): boolean {
  const t = (texte ?? "").trim();
  if (!t || t.length > LONGUEUR_MAX_NOTE || t.includes("\n")) return false;
  return TOURNURES_DE_NOTE.some((tournure) => tournure.test(t));
}

/** La bio à montrer : le texte de la marque, ou rien si c'est une note. */
export function bioPublique(description: string | null | undefined): string {
  const t = (description ?? "").trim();
  return estUneNoteDeRecherche(t) ? "" : t;
}
