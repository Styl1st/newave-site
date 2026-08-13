import { createClient as creerClient } from "@supabase/supabase-js";

/**
 * Un client Supabase qui ne connaît personne.
 *
 * Le client habituel lit les cookies de la requête pour savoir qui
 * consulte. C'est ce qu'il faut presque partout — et c'est justement ce
 * qu'on ne peut pas faire à l'intérieur d'un cache : le résultat serait
 * calculé pour quelqu'un, puis resservi à tout le monde. Next.js
 * l'interdit d'ailleurs franchement, en levant une erreur dès qu'une
 * fonction mise en cache tente de lire les cookies.
 *
 * Celui-ci n'a pas de session, pas de cookie, rien à retenir. Il ne
 * voit donc que ce qui est public, au sens des règles de la base : les
 * marques publiées, les pièces publiées, les posts publiés. C'est
 * exactement ce qu'on met en cache, et cette limitation est une
 * garantie plutôt qu'une gêne — il ne PEUT pas divulguer les données de
 * quelqu'un, même par erreur de notre part.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return creerClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
