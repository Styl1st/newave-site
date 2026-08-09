import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Le compte sous lequel travaille l'automate.
 *
 * Une tâche planifiée n'a personne derrière elle, et sans session la
 * base refuse toute écriture — c'est le principe même des règles de
 * sécurité par ligne, et il ne faut surtout pas y toucher.
 *
 * Plutôt que de contourner ces règles avec une clé qui peut tout
 * faire, l'automate se connecte comme n'importe qui : un vrai compte,
 * avec le rôle administrateur. Trois conséquences agréables.
 *
 *   1. Il passe par les mêmes règles que nous. Un bogue de sa part ne
 *      peut rien faire qu'un administrateur ne pourrait faire à la
 *      main.
 *   2. Ses écritures portent son identité : on sait ce qui vient de
 *      lui.
 *   3. Si son mot de passe fuite, on le change depuis Supabase, et
 *      l'incident s'arrête là. Une clé de service qui fuite, elle,
 *      donne l'accès à toute la base, suppression comprise.
 *
 * La session n'est ni conservée ni rafraîchie : elle vit le temps de
 * l'exécution, puis disparaît avec le processus.
 */
export async function connecterRobot(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.ROBOT_EMAIL;
  const motDePasse = process.env.ROBOT_MOT_DE_PASSE;

  if (!url || !key || !email || !motDePasse) return null;

  const supabase = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) return null;

  return supabase;
}
