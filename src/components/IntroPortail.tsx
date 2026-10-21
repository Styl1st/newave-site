import { MINUTAGE } from "@/lib/intro";

/**
 * L'entrée sur le site : le portail. Voir `lib/intro` pour le principe.
 *
 * POURQUOI CE COMPOSANT EST DANS LE LAYOUT ET PAS DANS LA PAGE
 * D'ACCUEIL. L'intro recouvre tout, la barre du haut comprise. Posée
 * dans la page, elle vivrait sous <main>, qui forme son propre
 * empilement : elle ne pourrait pas passer au-dessus de la barre, et le
 * fondu d'arrivée des pages la ferait apparaître en transparence, page
 * visible dessous. Le layout la rend en tête de <body>, sur l'accueil
 * seulement.
 *
 * LE PORTAIL EST JOUÉ PAR LE CSS, du premier affichage jusqu'au
 * passage, sans attendre React ni le script : il démarre avec la page.
 * Le script placé juste après la scène ne fait que ce qu'une feuille de
 * style ne sait pas faire :
 *   - annoncer les étapes à la page (`data-intro` sur <html>), pour que
 *     les blobs arrivent, puis que la barre du haut et le manifeste
 *     montent, au bon moment ;
 *   - mesurer où se trouve le logo du manifeste, et y faire glisser
 *     celui de l'intro ;
 *   - passer l'intro d'un tap ou d'une touche.
 * Il est envoyé tel quel (`portail.toString()`) et tourne pendant que le
 * reste de la page se charge. React ne touche jamais à l'intérieur de la
 * scène : c'est du HTML brut, et `suppressHydrationWarning` lui dit de
 * ne pas s'étonner que le script y ait touché.
 *
 * Rien à télécharger de plus : l'anneau et le trou sont deux ellipses
 * écrites dans globals.css, le logo est celui du manifeste, déjà en
 * cache.
 */
export default function IntroPortail() {
  return (
    <>
      <div
        id="intro-portail"
        className="intro-portail"
        aria-hidden="true"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: SCENE }}
      />
      <script
        dangerouslySetInnerHTML={{ __html: `(${portail.toString()})(${JSON.stringify(MINUTAGE)});` }}
      />
    </>
  );
}

/**
 * La scène, en HTML brut.
 *
 * - le bouchon : la nuit qu'on voit à travers l'ovale tant qu'il n'est
 *   pas allumé ; il s'efface, et l'on voit la page ;
 * - la scène qu'on agrandit d'un bloc pour passer la porte : la nuit
 *   percée du trou, la lumière qui sort de l'ovale, l'anneau en chrome.
 *   Les trois grandissent ensemble avec `transform` : le trou et
 *   l'anneau restent alignés au pixel ;
 * - le logo complet, posé exactement sur l'anneau : son ovale tombe
 *   sur l'anneau, si bien qu'on ne voit qu'un logo. Il est d'abord en
 *   chrome, puis blanc ; il reste au centre pendant que l'anneau se
 *   détache et s'envole, puis glisse jusqu'au manifeste ;
 * - un bouton pour passer, qui ne fait que l'annoncer : un tap
 *   n'importe où passe aussi.
 */
const SCENE = `
<div class="intro-bouchon"></div>
<div class="intro-scene">
  <div class="intro-voile"></div>
  <div class="intro-halo"></div>
  <div class="intro-anneau"></div>
</div>
<div class="intro-logo" data-logo>
  <div class="intro-chrome"></div>
  <img src="/brand/logo-white.webp" alt="">
</div>
<button type="button" class="intro-passer" tabindex="-1">Passer</button>
`;

type Minutage = typeof MINUTAGE;

/**
 * LE SCRIPT DU PORTAIL, JOUÉ DANS LE NAVIGATEUR.
 *
 * Cette fonction est copiée en texte dans la page (`portail.toString()`)
 * et ne tourne jamais sur le serveur. Elle ne doit donc rien utiliser
 * qui vienne d'ailleurs dans ce fichier : tout ce dont elle a besoin
 * arrive par `m`.
 *
 * Le déroulé, que l'attribut `data-intro` de <html> suit pas à pas :
 *   « 1 »        la nuit, le logo en chrome, l'ovale qui s'allume ;
 *   « entree »   on passe la porte : l'anneau s'envole, les blobs
 *                arrivent dans leurs coins, le logo reste au centre ;
 *   « contenu »  le logo glisse à sa place, la barre du haut et le
 *                manifeste montent ;
 *   « vu »       c'est fini, l'intro est cachée et ne rejouera plus.
 */
function portail(m: Minutage) {
  const racine = document.documentElement;
  if (racine.dataset.intro !== "1") return;

  const scene = document.getElementById("intro-portail");
  const logo = scene?.querySelector<HTMLElement>("[data-logo]");
  /* Un onglet ouvert en arrière-plan ne joue pas ses animations : on
     trouverait en y arrivant une intro figée à mi-course. */
  if (!scene || !logo || document.visibilityState === "hidden") {
    racine.dataset.intro = "vu";
    return;
  }

  let debut = performance.now();
  const minuteurs: number[] = [];
  let phase = 0;
  let envole = false;
  let parti = false;

  const plusTard = (fn: () => void, dans: number) => {
    minuteurs.push(window.setTimeout(fn, Math.max(0, dans)));
  };
  const aLHeure = (fn: () => void, t: number) => plusTard(fn, t - (performance.now() - debut));

  function entrer() {
    if (phase >= 1) return;
    phase = 1;
    racine.dataset.intro = "entree";
  }

  /* Le logo rejoint celui du manifeste, à sa place et à sa taille. On
     les mesure au dernier moment : la page est en place, et le
     défilement est bloqué en haut tant que l'intro joue. */
  function envoler(duree: number) {
    if (envole || !logo) return;
    envole = true;
    const cible = document.querySelector("[data-logo-accueil]");
    if (!cible) return;
    const a = logo.getBoundingClientRect();
    const b = cible.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    logo.animate(
      [{ transform: "none" }, { transform: `translate(${dx}px,${dy}px) scale(${b.width / a.width})` }],
      { duration: duree, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" }
    );
    plusTard(() => {
      racine.dataset.introLogo = "pose";
    }, duree + 10);
  }

  function montrer() {
    if (phase >= 2) return;
    phase = 2;
    racine.dataset.intro = "contenu";
  }

  function finir() {
    if (phase >= 3) return;
    phase = 3;
    minuteurs.forEach(clearTimeout);
    ecoute(false);
    racine.dataset.intro = "vu";
    delete racine.dataset.introLogo;
    window.dispatchEvent(new CustomEvent("newave:intro-fin"));
  }

  /* Passer : un tap, un clic, la molette ou une touche. On ne coupe pas
     net, la page arriverait d'un bloc : le portail file jusqu'au bout
     sept fois plus vite, le logo rejoint sa place, et l'on est sur
     l'accueil en une seconde. */
  function passer() {
    ecoute(false);
    parti = true;
    racine.dataset.introPret = "1";
    minuteurs.forEach(clearTimeout);
    minuteurs.length = 0;
    if (scene) {
      for (const a of scene.getAnimations({ subtree: true })) {
        try {
          a.updatePlaybackRate(7);
        } catch {
          /* une animation déjà terminée refuse, c'est sans importance */
        }
      }
    }
    entrer();
    plusTard(() => envoler(520), 150);
    plusTard(montrer, 250);
    plusTard(finir, 1050);
  }

  const EVENEMENTS = ["pointerdown", "keydown", "wheel", "touchstart"];
  function ecoute(oui: boolean) {
    for (const e of EVENEMENTS) {
      if (oui) window.addEventListener(e, passer, { capture: true, passive: true });
      else window.removeEventListener(e, passer, { capture: true });
    }
    if (oui) document.addEventListener("visibilitychange", finir, { once: true });
    else document.removeEventListener("visibilitychange", finir);
  }
  ecoute(true);

  /* ON ATTEND LE LOGO. Le portail entier est suspendu (en CSS, tant que
     <html> n'a pas `data-intro-pret`) jusqu'à ce que l'image du logo
     soit arrivée : sans elle, la nuit tomberait, l'ovale s'ouvrirait, et
     le logo n'apparaîtrait qu'en route, voire pas du tout. Elle est
     petite et presque toujours déjà là ; au-delà d'une seconde, on part
     quand même. */
  function partir() {
    if (parti || !scene) return;
    parti = true;
    racine.dataset.introPret = "1";
    debut = performance.now();
    aLHeure(entrer, m.passage);
    aLHeure(() => envoler(m.dureeEnvol), m.envol);
    aLHeure(montrer, m.contenu);
    aLHeure(finir, m.fin);
  }
  const image = scene.querySelector("img");
  if (!image || (image.complete && image.naturalWidth)) {
    partir();
  } else {
    image.addEventListener("load", partir, { once: true });
    image.addEventListener("error", partir, { once: true });
    plusTard(partir, 1000);
  }
}
