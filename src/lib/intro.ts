/**
 * L'ENTRÉE SUR LE SITE : LE PORTAIL.
 *
 * La même entrée que la page de liens (liens.newavesphere.fr), à une
 * différence près. Le logo apparaît en chrome sur fond de nuit, un
 * reflet coule dessus, et l'intérieur de son ovale s'allume : on y voit
 * déjà la page. Puis l'ovale se détache du logo et grandit jusqu'à
 * sortir de l'écran, comme une porte qu'on franchit. LE LOGO, LUI, NE
 * BOUGE PAS : il reste au centre pendant tout le passage, devient blanc,
 * puis glisse jusqu'à celui du manifeste.
 *
 * Ce fichier ne contient que ce qui se décide sans navigateur : le
 * script qui choisit de jouer l'entrée ou non, et le minutage. Il
 * n'importe rien, pour que `npm test` le lise tel quel. La chorégraphie
 * est dans `components/IntroPortail.tsx`, le dessin dans globals.css,
 * section « l'entrée sur le site ».
 */

/** La mémoire de l'onglet : l'entrée ne se joue qu'une fois par visite. */
export const CLE_INTRO = "newave-intro";

/**
 * Le déroulé, en millisecondes depuis l'arrivée sur la page.
 *
 * Les quatre premiers temps sont dessinés en CSS (le logo, le reflet,
 * l'ovale qui s'allume, le passage) : ces valeurs doivent rester
 * celles de globals.css, un test y veille. Les suivants sont donnés par
 * le script du portail.
 */
export const MINUTAGE = {
  /** L'intérieur de l'ovale s'allume : on voit la page à travers. */
  allumage: 800,
  /** L'ovale se détache et grandit : on passe la porte. */
  passage: 1150,
  /** Durée du passage. */
  dureePassage: 1050,
  /** Le logo part rejoindre celui du manifeste. */
  envol: 1900,
  /** Durée de l'envol. */
  dureeEnvol: 950,
  /** La barre du haut et le manifeste montent. */
  contenu: 2150,
  /** Tout est en place, l'intro se range. */
  fin: 3300,
} as const;

/**
 * Le script qui décide, posé dans <head> avant tout affichage.
 *
 * Plus tard, la page complète apparaîtrait une fraction de seconde avant
 * que la nuit de l'intro ne tombe dessus. Il écrit `data-intro="1"` sur
 * <html> ; tout le reste (le portail, le CSS qui tient la page en
 * attente) ne s'enclenche que sur cet attribut.
 *
 * PAS D'INTRO quand :
 *   - on a déjà vu l'entrée dans cet onglet ;
 *   - l'adresse porte une ancre (`/#la-suite`) : on vient pour la suite ;
 *   - le visiteur a figé les animations, ou demandé moins de mouvement
 *     au système sans avoir réglé le mouvement sur son compte (la même
 *     règle que pour le reste du site, voir globals.css) ;
 *   - c'est un robot : il n'a rien à regarder, et l'aperçu d'un lien
 *     partagé montrerait une page noire.
 * `/#intro` la rejoue à coup sûr, pour la voir et la régler.
 *
 * Le filet de sécurité en bas : si le script du portail ne tournait pas,
 * la page se libère seule au bout de sept secondes et demie.
 *
 * La clé est écrite en dur ici, c'est `CLE_INTRO` : un test vérifie que
 * les deux restent identiques.
 */
export const SCRIPT_DECISION_INTRO = `
(function(){
  try {
    var r = document.documentElement, l = location;
    if (l.pathname !== '/') return;
    var force = l.hash === '#intro';
    if (!force) {
      if (l.hash) return;
      if (r.dataset.fige === '1') return;
      if (r.dataset.animChoisi !== '1' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (/bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) return;
      if (sessionStorage.getItem('newave-intro')) return;
    }
    sessionStorage.setItem('newave-intro', '1');
    r.dataset.intro = '1';
    setTimeout(function(){
      if (r.dataset.intro && r.dataset.intro !== 'vu') r.dataset.intro = 'vu';
    }, 7500);
  } catch (e) {}
})();
`;
