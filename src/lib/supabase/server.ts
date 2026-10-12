import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Client Supabase cote serveur (composants serveur, routes API).
 * Renvoie null si la configuration est absente : voir createClient().
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Appele depuis un composant serveur : sans effet, c'est attendu.
        }
      },
    },
  });
}

/**
 * LA PERSONNE CONNECTÉE, DEMANDÉE UNE SEULE FOIS PAR PAGE.
 *
 * `auth.getUser()` n'est pas une lecture locale : c'est un aller-retour
 * jusqu'au serveur d'authentification de Supabase, qui vérifie le jeton
 * à chaque appel. Or une même page le demandait partout où elle avait
 * besoin de savoir qui regarde : l'apparence du compte dans la mise en
 * page, le profil dans la barre, puis dans la page, les favoris, les
 * cœurs, les signalements, l'avis laissé… Sur une fiche marque, jusqu'à
 * huit allers-retours identiques pour une personne connectée, dont
 * plusieurs à la suite.
 *
 * `cache` de React garde la réponse le temps d'UNE requête, et d'une
 * seule : la suivante repart de zéro, donc rien ne peut être resservi à
 * quelqu'un d'autre ni survivre à une déconnexion. Hors d'un rendu (une
 * route d'API), React n'a pas de mémoire ouverte et la fonction est
 * simplement appelée à chaque fois, comme avant.
 *
 * À utiliser pour LIRE qui est là. Les actions qui écrivent (un cœur, un
 * favori, un avis) gardent leur propre appel à `getUser()` : elles ne
 * gagneraient rien à partager, et c'est à elles que la vérification
 * importe le plus.
 */
export const lireUtilisateur = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
