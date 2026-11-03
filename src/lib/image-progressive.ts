/**
 * Le passage du flou au net, sans attendre React.
 *
 * Une image marquée `data-progressif` naît transparente, posée sur son
 * aperçu flou (voir `ApercuFlou`). Elle apparaît en fondu quand elle a
 * fini de charger, c'est-à-dire quand elle porte `data-charge`.
 *
 * C'EST CE SCRIPT, ET NON UN `onLoad` DE REACT, QUI POSE `data-charge`.
 * Sur un téléphone modeste, React met plusieurs secondes à prendre la
 * main sur la page. Une image arrivée avant lui resterait invisible
 * tout ce temps si c'était lui qui devait la révéler. Ici, l'écouteur
 * est posé dans le <head>, avant même que la première balise `img` ne
 * soit lue : aucun chargement ne lui échappe, et il ne dépend de rien.
 *
 * Les évènements `load` et `error` ne remontent pas le long de la page :
 * on les attrape à la descente (`true`, la phase de capture), un seul
 * écouteur pour toutes les images, présentes et à venir. Une image en
 * erreur est révélée aussi, pour qu'on voie son texte de remplacement
 * plutôt qu'un aperçu flou éternel.
 *
 * Sans JavaScript du tout, une règle `<noscript>` les rend visibles
 * d'emblée (voir `layout.tsx`).
 */
export const SCRIPT_IMAGES_PROGRESSIVES = `
(function(){
  function marquer(e){
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-progressif')) t.setAttribute('data-charge', '1');
  }
  document.addEventListener('load', marquer, true);
  document.addEventListener('error', marquer, true);
})();
`;
