/**
 * Un fichier .html importé dans le code arrive sous forme de texte.
 * C'est la règle `asset/source` de next.config.ts qui s'en charge ;
 * cette déclaration dit seulement à TypeScript à quoi s'attendre.
 */
declare module "*.html" {
  const contenu: string;
  export default contenu;
}
