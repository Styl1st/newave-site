/**
 * LE CLIENT SUPABASE DU NAVIGATEUR, CHARGÉ AU MOMENT OÙ L'ON S'EN SERT.
 *
 * `@supabase/ssr` et `supabase-js` pèsent à eux deux près de 250 Ko de
 * JavaScript (une soixantaine une fois compressés). Importés en tête
 * d'un composant posé dans la barre du haut, ils partaient avec CHAQUE
 * page du site, y compris pour un visiteur sans compte qui ne s'en
 * servira jamais : la pastille Messages n'est même pas affichée pour
 * lui, mais son code l'était.
 *
 * L'import dynamique ci-dessous fait de la bibliothèque un morceau à
 * part, que le navigateur ne va chercher qu'au premier appel. Le client
 * obtenu est exactement le même que celui de `createClient()` :
 * `createBrowserClient` en garde un seul exemplaire par onglet, donc
 * passer par ici ou par là ne crée pas deux sessions.
 *
 * À utiliser là où l'on parle à Supabase en réponse à un geste (un
 * envoi, un clic) ou après le montage. Un composant qui en a besoin
 * dès son premier rendu garde l'import direct de `./client`.
 *
 * ⚠️ Pour que le gain tienne, aucun composant de la mise en page
 * commune ne doit importer `./client` directement : un seul import
 * statique suffit à remettre la bibliothèque dans le paquet de toutes
 * les pages.
 */
export async function clientDiffere() {
  const { createClient } = await import("./client");
  return createClient();
}
