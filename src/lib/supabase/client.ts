import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase cote navigateur.
 * Renvoie null tant que les variables d'environnement ne sont pas remplies,
 * ce qui permet au site de tourner en local sur les donnees de demonstration.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
