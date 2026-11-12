/**
 * LES PHOTOS PRÊTES AVANT D'ÊTRE VUES.
 *
 * Ce qu'on voyait : un cadre vide, puis un aperçu flou, puis la photo
 * qui montait en fondu. Trois états pour une seule image, sur chaque
 * tuile, à chaque rangée qu'on découvrait en descendant.
 *
 * D'où ça venait, mesuré :
 *
 *   — L'APERÇU FLOU ÉTAIT UNE REQUÊTE DE PLUS, chez le même hébergeur
 *     que la photo. Or ce qui coûte, chez la boutique d'une marque, ce
 *     n'est pas le poids de l'image mais l'ouverture de la connexion :
 *     la miniature de trente-deux pixels mettait presque autant de
 *     temps à arriver que la vignette elle-même. On regardait donc un
 *     cadre vide le temps qu'arrive le flou, puis le flou le temps
 *     qu'arrive la photo, et la photo passait derrière la miniature
 *     dans la file du navigateur.
 *
 *   — LA PHOTO NE PARTAIT QU'EN ARRIVANT À L'ÉCRAN. `loading="lazy"`
 *     laisse chaque navigateur choisir sa marge : large sur Chrome,
 *     presque nulle sur Safari, c'est-à-dire sur tous les iPhone. Et
 *     une tuile mise de côté (`content-visibility`, voir `.carte-eco`)
 *     n'est pas mesurée du tout : sa photo ne partait qu'une fois la
 *     tuile revenue dans le champ.
 *
 *   — TOUT PASSAIT PAR UN FONDU, même une photo déjà en mémoire. En
 *     revenant sur une page qu'on venait de quitter, la grille entière
 *     se rallumait comme si elle chargeait.
 *
 * Ce que fait ce script, à la place :
 *
 *   1. IL PREND DE L'AVANCE. Dès qu'une tuile approche (un écran
 *      au-dessus, deux écrans et demi en dessous), sa photo passe de
 *      « à la demande » à « tout de suite ». On observe la TUILE et non
 *      l'image : une tuile mise de côté garde sa place dans la page,
 *      son image non. Quand la rangée entre à l'écran, la photo est
 *      déjà là.
 *
 *   2. UNE PHOTO ARRIVÉE SANS QU'ON L'AIT ATTENDUE S'AFFICHE D'EMBLÉE,
 *      sans fondu : elle était hors champ, ou en mémoire, ou elle est
 *      arrivée dans le dixième de seconde. On ne met pas en scène un
 *      chargement que personne n'a vu.
 *
 *   3. LE FONDU EST RÉSERVÉ À CELLE QU'ON A VRAIMENT ATTENDUE, cadre
 *      vide sous les yeux. Il est court, et la photo est DÉCODÉE avant
 *      qu'il parte (`decode()`), sinon elle apparaîtrait d'un bloc au
 *      milieu de son propre fondu.
 *
 *   4. PLUS D'APERÇU FLOU. L'attente, quand il y en a une, est le fond
 *      du cadre : une requête de moins par photo, un filtre de moins à
 *      peindre. Voir `AttentePhoto`.
 *
 * Une connexion en mode économie de données garde le comportement du
 * navigateur : on ne charge rien en avance pour qui a demandé d'en
 * charger moins.
 *
 * C'EST CE SCRIPT, ET NON UN `onLoad` DE REACT, QUI RÉVÈLE LES PHOTOS.
 * Sur un téléphone modeste, React met plusieurs secondes à prendre la
 * main sur la page. Une image arrivée avant lui resterait invisible
 * tout ce temps si c'était lui qui devait la révéler. Ici, l'écouteur
 * est posé dans le <head>, avant même que la première balise `img` ne
 * soit lue : aucun chargement ne lui échappe, et il ne dépend de rien.
 *
 * Les évènements `load` et `error` ne remontent pas le long de la page :
 * on les attrape à la descente (`true`, la phase de capture), un seul
 * écouteur pour toutes les images, présentes et à venir.
 *
 * UNE IMAGE EN ERREUR EST MARQUÉE `data-ratee`, et cette fois pour
 * TOUTES les images de la page. On montrait son texte de remplacement,
 * pensant mieux faire qu'un cadre vide : c'était l'icône d'image cassée
 * du navigateur et un nom de pièce collé en haut à gauche d'un grand
 * cadre lavande. Le CSS la cache maintenant, et le cadre dit
 * sobrement que la photo manque. La marque garde rarement en ligne la
 * photo d'une pièce qu'elle a retirée : c'est presque toujours ça.
 * Une image rechargée avec succès (une autre taille du `srcset`) perd
 * la marque.
 *
 * ET LA PIÈCE EST SIGNALÉE. Si l'image appartient à une pièce (un cadre
 * `data-piece` autour d'elle), son identifiant part vers
 * `/api/pieces/photo-ratee`, regroupé avec les autres de la page en un
 * seul envoi. Le serveur ne croit pas le navigateur sur parole : il va
 * lui-même voir chez la marque, et ne retire la pièce de la vitrine que
 * si ses photos y sont bel et bien introuvables.
 *
 * Sur un navigateur trop ancien pour les observateurs, il reste le
 * comportement d'avant, sans avance : la photo se révèle à l'arrivée.
 * Sans JavaScript du tout, une règle `<noscript>` les rend visibles
 * d'emblée (voir `layout.tsx`).
 *
 * LES VALEURS DE `data-charge`, que lit `globals.css` :
 *   `direct`  la photo est là, sans transition ;
 *   `fondu`   elle a été attendue à l'écran, elle monte en fondu.
 */

/** En deçà, personne n'a eu le temps de voir un cadre vide. */
export const ATTENTE_PERCUE_MS = 120;

/**
 * L'avance prise sur le défilement : un écran au-dessus, deux et demi
 * en dessous. On descend plus qu'on ne remonte, et ce qui est au-dessus
 * a presque toujours déjà été chargé.
 */
export const MARGE_D_AVANCE = "100% 0px 250% 0px";

/** Les cadres mis de côté hors écran, qu'on observe à la place de leur image. */
export const CADRES_MIS_DE_COTE = ".carte-eco,.carte-eco-etroit,.ligne-eco";

export const SCRIPT_IMAGES_PROGRESSIVES = `
(function(){
  var d = document, w = window;

  function reveler(img, fondu){
    if (img.hasAttribute('data-charge')) return;
    img.setAttribute('data-charge', fondu ? 'fondu' : 'direct');
  }

  var vues = w.WeakMap ? new WeakMap() : null;

  function arrivee(img){
    if (img.hasAttribute('data-charge')) return;
    var t = vues && vues.get(img);
    if (!t || performance.now() - t < ${ATTENTE_PERCUE_MS}) return reveler(img, false);
    var fait = false;
    function poser(){ if (!fait) { fait = true; reveler(img, true); } }
    if (img.decode) { img.decode().then(poser, poser); setTimeout(poser, 400); }
    else poser();
  }

  var signalees = {}, aSignaler = [], minuterie = 0;
  function envoyer(){
    minuterie = 0;
    var ids = aSignaler.splice(0, 24);
    if (!ids.length) return;
    var corps = JSON.stringify({ ids: ids });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/pieces/photo-ratee', new Blob([corps], { type: 'application/json' }))))
        fetch('/api/pieces/photo-ratee', { method: 'POST', body: corps, headers: { 'content-type': 'application/json' }, keepalive: true });
    } catch (e) {}
    if (aSignaler.length) minuterie = setTimeout(envoyer, 1500);
  }
  function signaler(img){
    var c = img.closest && img.closest('[data-piece]');
    var id = c && c.getAttribute('data-piece');
    if (!id || signalees[id]) return;
    signalees[id] = 1;
    aSignaler.push(id);
    if (!minuterie) minuterie = setTimeout(envoyer, 1500);
  }

  function surImage(e){
    var t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    if (e.type === 'error') { t.setAttribute('data-ratee', ''); signaler(t); }
    else t.removeAttribute('data-ratee');
    if (!t.hasAttribute('data-progressif')) return;
    if (e.type === 'error') reveler(t, false); else arrivee(t);
  }
  d.addEventListener('load', surImage, true);
  d.addEventListener('error', surImage, true);

  if (!vues || !w.WeakSet || !w.IntersectionObserver || !w.MutationObserver) return;

  var econome = false;
  try { econome = !!(navigator.connection && navigator.connection.saveData); } catch (e) {}

  var suivies = new WeakSet(), hates = new WeakSet();

  var ecran = new IntersectionObserver(function(es){
    for (var i = 0; i < es.length; i++) {
      var img = es[i].target;
      if (img.hasAttribute('data-charge')) { ecran.unobserve(img); continue; }
      if (!es[i].isIntersecting) vues.delete(img);
      else if (!vues.get(img)) vues.set(img, performance.now());
    }
  });

  function hater(cadre){
    hates.add(cadre);
    var l = cadre.tagName === 'IMG' ? [cadre] : cadre.querySelectorAll('img[data-progressif]');
    for (var i = 0; i < l.length; i++) if (l[i].loading === 'lazy') l[i].loading = 'eager';
  }

  var proche = new IntersectionObserver(function(es){
    for (var i = 0; i < es.length; i++) {
      if (!es[i].isIntersecting) continue;
      proche.unobserve(es[i].target);
      hater(es[i].target);
    }
  }, { rootMargin: '${MARGE_D_AVANCE}' });

  function suivre(img){
    if (suivies.has(img)) return;
    suivies.add(img);
    if (img.hasAttribute('data-charge')) return;
    if (img.complete && img.naturalWidth) return reveler(img, false);
    if (img.getAttribute('data-progressif') !== 'net') ecran.observe(img);
    if (econome || img.loading !== 'lazy') return;
    var cadre = img.closest('${CADRES_MIS_DE_COTE}') || img;
    if (hates.has(cadre)) img.loading = 'eager'; else proche.observe(cadre);
  }

  function balayer(n){
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IMG') { if (n.hasAttribute('data-progressif')) suivre(n); return; }
    var l = n.getElementsByTagName('img');
    for (var i = 0; i < l.length; i++) if (l[i].hasAttribute('data-progressif')) suivre(l[i]);
  }

  new MutationObserver(function(rs){
    for (var i = 0; i < rs.length; i++) {
      var a = rs[i].addedNodes;
      for (var j = 0; j < a.length; j++) balayer(a[j]);
    }
  }).observe(d.documentElement, { childList: true, subtree: true });
})();
`;
