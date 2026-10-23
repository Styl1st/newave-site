"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { phraseDeDepart, suiteDePhrases } from "@/lib/phrases-attente";

/** Le temps de lecture d'une phrase, en millisecondes. */
const TOUR = 2400;

/**
 * L'écran d'attente : le logo en chrome, une lumière qui fait le tour
 * de son anneau, et une phrase qui dit ce qu'on prépare.
 *
 * POURQUOI LE LOGO ET PAS UN SQUELETTE. Le squelette reprenait la
 * silhouette d'une grille de cartes : juste sur l'annuaire, faux
 * partout ailleurs, et sur une fiche de marque il annonçait six cartes
 * qui n'arrivaient jamais. Presque toutes les pages sont lues à la
 * demande, cet écran est donc vu à chaque navigation : c'est l'endroit
 * du site qu'on regarde le plus souvent sans rien y faire. Il porte la
 * marque, et il occupe l'œil.
 *
 * L'ANNEAU, C'EST L'IDÉE. Le logo est un ovale autour du monogramme :
 * une orbite. Une lumière en fait le tour, une traînée derrière elle,
 * pendant qu'un reflet passe sur le chrome. Rien d'autre ne bouge.
 *
 * IL N'APPARAÎT QU'APRÈS UN INSTANT (voir `.chargement` dans
 * globals.css) : une page qui arrive en cent millisecondes ne doit pas
 * faire clignoter un logo au milieu de l'écran.
 *
 * IL S'EN VA EN RECULANT. Quand la page est prête, React retire cet
 * écran d'un coup ; on en laisse un double par-dessus, le temps qu'il
 * s'efface pendant que la page arrive. Voir plus bas.
 */
export default function EcranChargement() {
  const chemin = usePathname();
  const cadre = useRef<HTMLDivElement>(null);

  const depart = phraseDeDepart(chemin);
  /* La graine change d'une attente à l'autre, et c'est sans danger
     pour l'hydratation : seule la phrase d'ouverture est rendue tant
     que le premier tour n'est pas passé, et elle ne dépend que de
     l'adresse. */
  const [graine] = useState(() => Date.now() / TOUR);
  const suite = suiteDePhrases(depart, graine);
  const [rang, setRang] = useState(0);

  useEffect(() => {
    const minuteur = window.setInterval(() => setRang((r) => r + 1), TOUR);
    return () => window.clearInterval(minuteur);
  }, []);

  /*
   * LE DOUBLE QUI S'EFFACE.
   *
   * Le nettoyage d'un effet de mise en page passe AVANT que React ne
   * retire le nœud : on peut encore le mesurer et le copier. La copie
   * est posée au même endroit, en position fixe, et recule en
   * s'effaçant pendant que la page arrive dessous. Sans elle, le logo
   * disparaîtrait d'une image à l'autre et la page monterait d'un écran
   * vide.
   *
   * Les boucles de la copie repartiraient de zéro : la lumière sauterait
   * au début de l'anneau, le reflet aussi. On recale donc chaque
   * animation copiée sur l'heure de l'originale.
   */
  useLayoutEffect(() => {
    const el = cadre.current;
    return () => {
      if (!el || !el.isConnected) return;
      const racine = document.documentElement;
      const calme =
        racine.dataset.fige === "1" ||
        (racine.dataset.animChoisi !== "1" && matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (calme) return;

      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) return;

      /* Une page prête avant la fin du délai d'apparition : l'écran n'a
         jamais été vu, il ne doit pas surgir au moment de partir. Et s'il
         était à moitié apparu, le double part de là. */
      const opacite = Number(getComputedStyle(el).opacity);
      if (!(opacite > 0.05)) return;

      const fantome = el.cloneNode(true) as HTMLElement;
      fantome.removeAttribute("role");
      fantome.setAttribute("aria-hidden", "true");
      fantome.classList.add("chargement-fantome");
      Object.assign(fantome.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      document.body.appendChild(fantome);

      const originaux = [el, ...Array.from(el.querySelectorAll("*"))];
      const copies = [fantome, ...Array.from(fantome.querySelectorAll("*"))];
      for (const anim of el.getAnimations({ subtree: true })) {
        const effet = anim.effect as KeyframeEffect | null;
        const i = effet?.target ? originaux.indexOf(effet.target) : -1;
        const nom = (anim as CSSAnimation).animationName;
        if (i < 0 || !nom) continue;
        const jumelle = copies[i]
          ?.getAnimations()
          .find((a) => (a as CSSAnimation).animationName === nom);
        if (jumelle) jumelle.currentTime = anim.currentTime;
      }

      const sortie = fantome.animate(
        [
          { opacity: opacite, transform: "none" },
          { opacity: 0, transform: "scale(.94)" },
        ],
        { duration: 420, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" }
      );
      const retirer = () => fantome.remove();
      sortie.onfinish = retirer;
      window.setTimeout(retirer, 900);
    };
  }, []);

  const phrase = suite[rang % suite.length];
  const precedente = rang > 0 ? suite[(rang - 1) % suite.length] : null;

  return (
    <div ref={cadre} className="chargement" role="status">
      <span className="sr-only">Chargement de la page…</span>

      <div className="chargement-scene" aria-hidden="true">
        <div className="chargement-halo" />
        <div className="chargement-logo">
          <div className="chargement-chrome" />
          {/* L'orbite est dessinée dans le repère de l'anneau du logo
              (2030 × 838, les mesures de l'intro) : son ellipse passe au
              milieu de la bande blanche, entre le bord extérieur et le
              bord intérieur de l'ovale. */}
          <svg className="chargement-orbite" viewBox="0 0 2030 838" focusable="false">
            <g transform="rotate(-12.8 1013.5 418.5)">
              <ellipse className="chargement-trainee chargement-trainee-longue" cx="1013.5" cy="418.5" rx="937.7" ry="326.2" pathLength={1000} />
              <ellipse className="chargement-trainee" cx="1013.5" cy="418.5" rx="937.7" ry="326.2" pathLength={1000} />
              <ellipse className="chargement-etincelle" cx="1013.5" cy="418.5" rx="937.7" ry="326.2" pathLength={1000} />
            </g>
          </svg>
        </div>
      </div>

      <p className="chargement-phrase" aria-hidden="true">
        {precedente && (
          <span key={`sortante-${rang}`} className="chargement-sortante">
            {precedente}
          </span>
        )}
        <span key={`entrante-${rang}`} className="chargement-entrante">
          {phrase}
        </span>
      </p>
    </div>
  );
}
