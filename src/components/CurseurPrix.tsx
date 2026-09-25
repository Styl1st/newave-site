"use client";

import { useState } from "react";

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
 *
 * DEUX CHAMPS SOUS LE RAIL, POUR LE PRIX EXACT. Le rail avance par
 * crans (10 € sur un catalogue qui va jusqu'à 900 €) : parfait pour
 * dégrossir, impossible pour demander « jusqu'à 45 € ». Les champs
 * prennent l'euro près, centimes compris, et le rail suit.
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
  tactile = false,
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
  /** Au doigt : champs plus hauts, et en 16 px pour qu'iOS ne zoome pas. */
  tactile?: boolean;
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

  /* Tapé à la main : ramené dans le rail, et jamais au-delà de l'autre
     borne. Égales, elles restent permises : « exactement 50 € ». */
  const saisirBas = (v: number) => onChange([Math.max(min, Math.min(v, haut)), haut]);
  const saisirHaut = (v: number) => onChange([bas, Math.min(max, Math.max(v, bas))]);

  const curseur =
    "pointer-events-none absolute inset-x-0 top-0 m-0 h-[22px] w-full " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto";

  return (
    <div>
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
          data-curseur-zone="regler"
          data-curseur-mot="Ajuster"
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
          data-curseur-zone="regler"
          data-curseur-mot="Ajuster"
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

      {/* Les deux prix, lisibles ET modifiables : sans eux, on déplace
          une poignée sans savoir vers quoi. */}
      <div className="mt-3 flex items-center gap-2">
        <ChampPrix libelle="Prix minimum, en euros" valeur={bas} onValider={saisirBas} tactile={tactile} />
        <span aria-hidden="true" className="text-[13px] font-bold text-white/50">
          —
        </span>
        <ChampPrix libelle="Prix maximum, en euros" valeur={haut} onValider={saisirHaut} tactile={tactile} />
      </div>
    </div>
  );
}

/** Des centimes aux euros tels qu'on les tape : « 45 », « 49,90 ». */
const enEuros = (centimes: number) =>
  centimes % 100 === 0 ? String(centimes / 100) : (centimes / 100).toFixed(2).replace(".", ",");

/**
 * Un prix tapé à la main.
 *
 * Il ne s'applique qu'en sortant du champ ou sur Entrée, pas à chaque
 * chiffre : taper « 120 » passerait sinon par « 1 € », et la borne
 * haute irait se coller à la basse avant qu'on ait fini d'écrire.
 * Tant qu'on n'y touche pas, il suit le rail.
 */
function ChampPrix({
  libelle,
  valeur,
  onValider,
  tactile,
}: {
  libelle: string;
  /** En centimes. */
  valeur: number;
  onValider: (centimes: number) => void;
  tactile: boolean;
}) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? enEuros(valeur);

  const valider = () => {
    if (brouillon === null) return;
    const n = Number(brouillon.replace(",", ".").replace(/[^\d.]/g, ""));
    setBrouillon(null);
    /* Vide ou illisible : on garde le prix d'avant. */
    if (brouillon.trim() !== "" && Number.isFinite(n)) onValider(Math.round(n * 100));
  };

  return (
    <label
      className={`flex min-w-0 flex-1 cursor-text items-center gap-1 rounded-full bg-white/10 px-3 transition focus-within:bg-white/16 focus-within:ring-2 focus-within:ring-white/55 ${
        tactile ? "h-11" : "h-9"
      }`}
    >
      <input
        type="text"
        aria-label={libelle}
        inputMode="decimal"
        autoComplete="off"
        value={affiche}
        onFocus={(e) => {
          setBrouillon(affiche);
          e.currentTarget.select();
        }}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`champ-prix w-full min-w-0 bg-transparent font-extrabold tabular-nums text-white outline-none ${
          tactile ? "text-[16px]" : "text-[13px]"
        }`}
      />
      <span aria-hidden="true" className="text-[12.5px] font-bold text-white/55">
        €
      </span>
    </label>
  );
}
