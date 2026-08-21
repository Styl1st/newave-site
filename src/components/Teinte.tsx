"use client";

import { useEffect, useRef } from "react";

/**
 * La carte prend la couleur de son image.
 *
 * Le bandeau blanc sous chaque vignette était le même pour tout le
 * monde : cent cartes, cent bandeaux identiques, alors que les images
 * au-dessus n'ont rien à voir entre elles. En lui donnant une teinte
 * tirée de la photo, chaque marque garde un peu de sa couleur jusque
 * dans le texte qui la présente, et la grille cesse de ressembler à un
 * tableau.
 *
 * CE COMPOSANT N'AFFICHE RIEN. Il lit l'image, en tire une couleur, et
 * la pose sur la carte qui l'englobe sous forme de variable. Le reste
 * est du CSS. C'est ce qui permet de l'employer aussi bien sur une
 * carte de marque que sur une carte de pièce, sans rien changer à leur
 * structure.
 *
 * ON NE PEUT PAS TOUJOURS LIRE. Un hébergeur qui n'autorise pas la
 * lecture pixel par pixel laisse la carte à sa teinte par défaut, celle
 * du site. C'est un embellissement, pas une information : il n'y a rien
 * à réparer quand il n'a pas lieu.
 */

/** Ce qu'on a déjà tiré de chaque image. */
const TEINTES = new Map<string, string | null>();

/**
 * La couleur dominante d'une image, en composantes séparées.
 *
 * POURQUOI PAS UNE SIMPLE MOYENNE. La moyenne d'une photo donne
 * invariablement un gris-brun : les couleurs vives s'annulent entre
 * elles, et l'on obtient la couleur de la boue. On ne retient donc que
 * les pixels COLORÉS — ceux dont le canal le plus fort et le plus
 * faible s'écartent nettement — et l'on ne se rabat sur la moyenne
 * générale que si l'image est vraiment sans couleur.
 *
 * La teinte est ensuite ramenée dans une plage utilisable : un noir pur
 * ou un blanc pur ne teinte rien du tout.
 */
async function couleurDominante(url: string): Promise<string | null> {
  const connue = TEINTES.get(url);
  if (connue !== undefined) return connue;

  return new Promise((resolve) => {
    const repondre = (v: string | null) => {
      TEINTES.set(url, v);
      resolve(v);
    };

    const sonde = new Image();
    sonde.crossOrigin = "anonymous";
    // Elle passe après tout le reste : rien de ce qui est visible ne
    // doit attendre une couleur de décoration.
    sonde.fetchPriority = "low";

    sonde.onload = () => {
      try {
        const cote = 20;
        const toile = document.createElement("canvas");
        toile.width = cote;
        toile.height = cote;
        const ctx = toile.getContext("2d", { willReadFrequently: true });
        if (!ctx) return repondre(null);

        ctx.drawImage(sonde, 0, 0, cote, cote);
        const px = ctx.getImageData(0, 0, cote, cote).data;

        let r = 0;
        let v = 0;
        let b = 0;
        let n = 0;

        // La moyenne de repli, tous pixels confondus.
        let rt = 0;
        let vt = 0;
        let bt = 0;
        let nt = 0;

        for (let i = 0; i < px.length; i += 4) {
          // Un pixel transparent n'a pas de couleur : c'est du vide.
          if (px[i + 3] < 40) continue;

          const [cr, cv, cb] = [px[i], px[i + 1], px[i + 2]];
          rt += cr;
          vt += cv;
          bt += cb;
          nt++;

          const max = Math.max(cr, cv, cb);
          const min = Math.min(cr, cv, cb);
          // Assez coloré, et ni trop sombre ni trop clair pour compter.
          if (max - min > 28 && max > 40 && min < 240) {
            r += cr;
            v += cv;
            b += cb;
            n++;
          }
        }

        const [mr, mv, mb] =
          n > 0 ? [r / n, v / n, b / n] : nt > 0 ? [rt / nt, vt / nt, bt / nt] : [0, 0, 0];
        if (!nt) return repondre(null);

        /*
         * On remonte la couleur vers une clarté moyenne. Une teinte
         * presque noire ne se verrait pas sur un fond clair, et une
         * teinte presque blanche ne se verrait pas non plus : dans les
         * deux cas le bandeau resterait blanc, et tout ce travail
         * n'aurait servi à rien.
         */
        const clarte = (mr + mv + mb) / 3;
        const facteur = clarte < 90 ? 90 / Math.max(clarte, 12) : clarte > 200 ? 200 / clarte : 1;

        const borne = (c: number) => Math.round(Math.min(255, Math.max(0, c * facteur)));
        repondre(`${borne(mr)} ${borne(mv)} ${borne(mb)}`);
      } catch {
        repondre(null);
      }
    };

    sonde.onerror = () => repondre(null);
    sonde.src = url;
  });
}

export default function Teinte({ src }: { src?: string | null }) {
  const ancre = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!src) return;

    /*
     * On remonte jusqu'à la carte plutôt que de teinter un élément
     * précis : c'est elle qui sait quoi faire de la couleur, et le même
     * composant sert ainsi aux marques comme aux pièces.
     */
    const carte = ancre.current?.closest(".card-light") as HTMLElement | null;
    if (!carte) return;

    let vivant = true;

    const lire = () => {
      couleurDominante(src).then((teinte) => {
        if (vivant && teinte) carte.style.setProperty("--teinte", teinte);
      });
    };

    /*
     * ON NE LIT QUE CE QUI APPROCHE DE L'ÉCRAN.
     *
     * L'annuaire pose cent cartes d'un coup. La lecture réclame l'image
     * en mode « croisé », que le navigateur ne considère pas comme celle
     * qu'il vient de télécharger pour l'afficher : c'est donc, dans le
     * pire des cas, cent requêtes de plus lancées en même temps que les
     * cent premières. De quoi retarder l'affichage pour un
     * embellissement.
     *
     * En attendant que la carte approche, la lecture tombe au moment où
     * l'image se charge de toute façon, et les cartes du bas de page ne
     * coûtent rien tant qu'on n'est pas descendu.
     */
    const guetteur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        guetteur.disconnect();
        lire();
      },
      { rootMargin: "400px" }
    );
    guetteur.observe(carte);

    return () => {
      vivant = false;
      guetteur.disconnect();
    };
  }, [src]);

  // Un point d'ancrage sans épaisseur : il ne sert qu'à retrouver la
  // carte dans le document.
  return <span ref={ancre} className="hidden" aria-hidden />;
}
