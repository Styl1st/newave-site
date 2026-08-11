import { cache } from "react";
import { createClient } from "./supabase/server";

/**
 * Les prix étrangers, ramenés à quelque chose de lisible.
 *
 * Une boutique danoise affiche 899 DKK. Posé à côté d'un article
 * français à 89 €, ça se lit comme un prix délirant, alors que c'est
 * à peu près la même somme. Le problème n'est pas la marque, c'est
 * qu'on juxtapose des unités différentes sans le dire.
 *
 * On garde toujours le prix d'origine : c'est lui qui sera payé, et
 * c'est lui qui fait foi. L'euro n'est qu'une aide à la lecture, et
 * il est présenté comme telle, jamais comme le prix réel.
 */

export type Taux = Map<string, number>;

/** La source des taux : la Banque centrale européenne, via Frankfurter. */
const SOURCE = "https://api.frankfurter.app/latest?from=EUR";

/**
 * Au-delà, on préfère ne rien convertir.
 *
 * Un taux d'il y a un mois reste bien plus juste qu'une absence de
 * conversion, mais un taux d'il y a un an ne veut plus rien dire. Dix
 * jours laissent largement le temps à la tâche quotidienne de repasser.
 */
const PEREMPTION_JOURS = 10;

/**
 * Les taux du jour, lus une seule fois par rendu de page.
 *
 * `cache` de React, et non un cache global : un cache qui survit aux
 * requêtes finirait par servir les taux de la veille à tout le monde
 * pendant des heures.
 */
export const lireLesTaux = cache(async (): Promise<Taux> => {
  const supabase = await createClient();
  if (!supabase) return new Map();

  const { data } = await supabase.from("taux_change").select("devise, pour_un_euro, maj_at");

  const taux: Taux = new Map();
  const limite = Date.now() - PEREMPTION_JOURS * 24 * 3600 * 1000;

  for (const l of (data ?? []) as { devise: string; pour_un_euro: number; maj_at: string }[]) {
    if (new Date(l.maj_at).getTime() < limite) continue;
    const valeur = Number(l.pour_un_euro);
    if (Number.isFinite(valeur) && valeur > 0) taux.set(l.devise.toUpperCase(), valeur);
  }

  return taux;
});

/**
 * Convertit en centimes d'euro, ou renvoie null si on ne sait pas.
 *
 * Renvoyer null plutôt qu'une approximation est délibéré : afficher un
 * prix faux avec un symbole € serait pire que de laisser les couronnes.
 */
export function enEuros(cents: number | null, devise: string, taux: Taux): number | null {
  if (cents === null) return null;

  const code = (devise || "EUR").toUpperCase();
  if (code === "EUR") return cents;

  const pourUnEuro = taux.get(code);
  if (!pourUnEuro) return null;

  return Math.round(cents / pourUnEuro);
}

/* ---------------- le rafraîchissement ---------------- */

export type BilanTaux = { ok: boolean; devises: number; erreur?: string };

/**
 * Va chercher les taux du jour et les range.
 *
 * Appelé par la tâche quotidienne, qui passe déjà relire les
 * catalogues. Une seule requête, sans clé d'API, sur les taux publiés
 * par la Banque centrale européenne.
 */
export async function rafraichirLesTaux(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<BilanTaux> {
  if (!supabase) return { ok: false, devises: 0, erreur: "Supabase n'est pas configuré." };

  let charge: { rates?: Record<string, number> };
  try {
    const r = await fetch(SOURCE, {
      headers: { Accept: "application/json" },
      // Les taux ne bougent qu'une fois par jour ouvré.
      next: { revalidate: 3600 },
    });
    if (!r.ok) return { ok: false, devises: 0, erreur: `La source a répondu ${r.status}.` };
    charge = await r.json();
  } catch {
    return { ok: false, devises: 0, erreur: "La source des taux est injoignable." };
  }

  const lignes = Object.entries(charge.rates ?? {})
    .filter(([code, valeur]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(valeur) && valeur > 0)
    .map(([code, valeur]) => ({
      devise: code,
      pour_un_euro: valeur,
      maj_at: new Date().toISOString(),
    }));

  if (lignes.length === 0) {
    return { ok: false, devises: 0, erreur: "La source n'a renvoyé aucun taux." };
  }

  // L'euro vaut un euro. L'écrire évite un cas particulier partout ailleurs.
  lignes.push({ devise: "EUR", pour_un_euro: 1, maj_at: new Date().toISOString() });

  const { error } = await supabase.from("taux_change").upsert(lignes, { onConflict: "devise" });
  if (error) return { ok: false, devises: 0, erreur: error.message };

  return { ok: true, devises: lignes.length };
}
