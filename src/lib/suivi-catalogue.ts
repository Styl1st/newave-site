/**
 * CE QUE LA MARQUE DOIT SAVOIR DE LA RELECTURE QUOTIDIENNE DE SA BOUTIQUE.
 *
 * Pour les marques dont le catalogue est en lecture automatique, une
 * tâche relit chaque jour la boutique (`/api/cron/catalogues`) : les
 * nouvelles pièces arrivent EN LIGNE, la disponibilité suit la boutique,
 * et les pièces qui en ont disparu sont retirées. Rien de tout cela
 * n'était dit à la marque. Elle cochait « Épuisée » à la main et la case
 * revenait le lendemain ; elle voyait apparaître des pièces qu'elle
 * n'avait pas publiées ; et la page d'import lui promettait que « rien
 * ne s'affiche avant que tu l'aies relu », ce qui n'est vrai que pour le
 * premier import.
 *
 * Les trois colonnes lues ici existent en base mais pas dans le type
 * `Brand` : elles ne servent qu'à l'espace marque et à l'administration,
 * et n'ont rien à faire dans le HTML des pages publiques.
 */

export type SuiviDuCatalogue = {
  /** La boutique est relue chaque jour. */
  auto: boolean;
  /** Dernière relecture, ou rien si elle n'a jamais eu lieu. */
  derniere: string | null;
  /** Le compte rendu de la dernière relecture, tel que la tâche l'a écrit. */
  note: string | null;
};

export function suiviDuCatalogue(marque: object): SuiviDuCatalogue {
  const m = marque as {
    catalogue_auto?: boolean | null;
    catalogue_sync_at?: string | null;
    catalogue_sync_note?: string | null;
  };
  return {
    auto: Boolean(m.catalogue_auto),
    derniere: m.catalogue_sync_at ?? null,
    note: m.catalogue_sync_note?.trim() || null,
  };
}

/**
 * « il y a 3 h », « hier », « le 12 oct. » : assez précis pour savoir si
 * la dernière relecture est récente, sans heure à la minute près.
 */
export function ilYa(date: string, maintenant: Date = new Date()): string {
  const quand = new Date(date);
  const minutes = Math.round((maintenant.getTime() - quand.getTime()) / 60000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  if (heures < 48) return "hier";
  return `le ${quand.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
}
