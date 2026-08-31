"use client";

/**
 * Le double curseur de prix de la vitrine.
 *
 * POURQUOI DEUX `input[type=range]` EMPILÉS PLUTÔT QU'UN CONTRÔLE
 * DESSINÉ À LA MAIN. Une poignée dessinée en `div` doit refaire
 * elle-même tout ce qu'un curseur natif sait déjà : la prise au doigt,
 * les flèches du clavier, `Début`/`Fin`, l'annonce de la valeur par un
 * lecteur d'écran, le suivi du pointeur qui sort de l'élément. Chacun de
 * ces points se rate en silence, et l'on ne s'en aperçoit que le jour où
 * quelqu'un ne peut plus filtrer. Deux curseurs natifs superposés
 * gardent tout cela pour rien.
 *
 * LE DESSIN VIENT DE `globals.css`, PAS D'ICI. Le site a déjà des
 * curseurs — ceux de l'apparence — et leur piste comme leur poignée y
 * sont réglées pour toutes les `input[type=range]` de la page, hors
 * couche CSS, donc plus fort que n'importe quelle classe écrite dans un
 * composant. Les redessiner ici était impossible sans toucher à la
 * feuille commune, et surtout ce n'était pas souhaitable : deux curseurs
 * de dessins différents sur un même site se remarquent aussitôt. Les
 * deux pistes se recouvrent exactement, et l'on n'en voit donc qu'une.
 *
 * Ce qui reste à faire ici : rendre les DEUX poignées attrapables. Un
 * curseur posé sur l'autre capterait seul tous les clics ; les deux
 * éléments sont donc transparents au pointeur, et seules leurs poignées
 * le reprennent.
 */

/** Ce que le navigateur dessine comme poignée. Sert au calcul ci-dessous. */
const POIGNEE = 18;

export default function CurseurPrix({
  min,
  max,
  pas,
  valeur,
  onChange,
  format,
}: {
  min: number;
  max: number;
  /** Le cran, dans la même unité que les bornes. */
  pas: number;
  /** [bas, haut], toujours dans cet ordre. */
  valeur: [number, number];
  onChange: (v: [number, number]) => void;
  /** Comment écrire une borne. La vitrine y met des euros. */
  format: (v: number) => string;
}) {
  const [bas, haut] = valeur;
  const etendue = max - min || 1;
  const a = ((bas - min) / etendue) * 100;
  const b = ((haut - min) / etendue) * 100;

  /*
   * LA PLAGE REMPLIE S'ARRÊTE AU BORD DES POIGNÉES, ET C'EST CE QUI
   * DEMANDE CE CALCUL. Elle est peinte PAR-DESSUS les deux curseurs,
   * seule façon d'obtenir une couleur franche là où deux pistes
   * translucides se superposent ; il faut donc qu'elle ne passe jamais
   * en travers d'une poignée.
   *
   * Le navigateur ne promène pas le centre d'une poignée de 0 à 100 % de
   * la piste, mais d'une demi-poignée à la largeur moins une
   * demi-poignée. Les deux termes ci-dessous rattrapent exactement ce
   * décalage, sans avoir à mesurer quoi que ce soit.
   */
  const gauche = `calc(${a.toFixed(3)}% + ${(POIGNEE - (POIGNEE / 100) * a).toFixed(2)}px)`;
  const droite = `calc(${(100 - b).toFixed(3)}% + ${((POIGNEE / 100) * b).toFixed(2)}px)`;

  /* La poignée basse ne peut pas dépasser la haute, et réciproquement :
     croisées, elles rendraient une plage vide sans que rien ne le dise. */
  const bougerBas = (v: number) => onChange([Math.min(v, haut - pas), haut]);
  const bougerHaut = (v: number) => onChange([bas, Math.max(v, bas + pas)]);

  const curseur =
    "pointer-events-none absolute inset-x-0 top-0 m-0 h-[22px] w-full " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto";

  return (
    <div>
      {/* Les bornes au-dessus du rail : sans elles, on déplace une
          poignée sans savoir vers quoi. */}
      <div className="mb-2.5 flex items-center justify-between text-[13px] font-extrabold tabular-nums text-white">
        <span>{format(bas)}</span>
        <span>{format(haut)}</span>
      </div>

      <div className="relative h-[22px]">
        <input
          type="range"
          min={min}
          max={max}
          step={pas}
          value={bas}
          onChange={(e) => bougerBas(Number(e.target.value))}
          aria-label="Prix minimum"
          aria-valuetext={format(bas)}
          className={curseur}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={pas}
          value={haut}
          onChange={(e) => bougerHaut(Number(e.target.value))}
          aria-label="Prix maximum"
          aria-valuetext={format(haut)}
          className={curseur}
        />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: gauche,
            right: droite,
            backgroundImage:
              "linear-gradient(90deg, rgba(var(--accent-1),0.9), rgba(var(--accent-2),0.9))",
          }}
        />
      </div>
    </div>
  );
}
