import { createClient } from "@/lib/supabase/server";
import { versRgb, type Preferences, type Theme } from "@/lib/theme";

/**
 * L'apparence est une préférence de personne, pas de machine.
 *
 * Elle vit donc sur le profil. Le navigateur en garde une copie, mais
 * uniquement pour peindre les bonnes couleurs avant même que React
 * démarre — et pour les visiteurs qui n'ont pas de compte.
 */

/** Vérifie sommairement la forme reçue : la base accepte n'importe quel JSON. */
function estUnTheme(valeur: unknown): valeur is Theme {
  const t = valeur as Theme | null;
  return Boolean(
    t &&
      Array.isArray(t.bg) &&
      t.bg.length === 6 &&
      t.bg.every((c) => typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c)) &&
      Array.isArray(t.accents)
  );
}

/** Ramène n'importe quoi à une préférence utilisable, ou à rien. */
export function nettoyerApparence(brut: unknown): Preferences | null {
  const o = brut as Partial<Preferences> | null;
  if (!o || !estUnTheme(o.theme)) return null;
  return {
    theme: o.theme,
    mouvement: {
      vitesse: Number(o.mouvement?.vitesse ?? 1) || 1,
      amplitude: Number(o.mouvement?.amplitude ?? 1) || 0,
    },
    // Une borne, sinon rien n'empêche d'enregistrer mille ambiances et
    // de faire grossir chaque page d'autant.
    ambiances: Array.isArray(o.ambiances) ? o.ambiances.slice(0, 40) : [],
    mouvements: Array.isArray(o.mouvements) ? o.mouvements.slice(0, 40) : [],
  };
}

/** L'apparence enregistrée sur le compte, ou null si personne n'est connecté. */
export async function lireApparenceDuCompte(): Promise<Preferences | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("apparence")
    .eq("id", user.id)
    .maybeSingle();

  return nettoyerApparence((data as { apparence: unknown } | null)?.apparence);
}

/**
 * Les variables CSS d'une préférence, prêtes à être posées sur <html>
 * par le serveur.
 *
 * Les écrire dès le HTML évite le scintillement sur un appareil qui ne
 * connaît pas encore le réglage — précisément le cas qu'on veut
 * couvrir, celui de la première connexion sur téléphone.
 */
export function styleDuCompte(prefs: Preferences | null): Record<string, string> | undefined {
  if (!prefs) return undefined;
  const style: Record<string, string> = {};
  prefs.theme.bg.forEach((c, i) => (style[`--bg-${i + 1}`] = c));
  prefs.theme.accents.forEach((c, i) => (style[`--accent-${i + 1}`] = versRgb(c)));
  style["--voile"] = versRgb(prefs.theme.bg[0]);
  style["--vit"] = String(Math.max(prefs.mouvement.vitesse, 0.1));
  style["--amp"] = String(prefs.mouvement.amplitude);
  return style;
}
