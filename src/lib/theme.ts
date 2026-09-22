/** Les couleurs du fond, et rien d'autre : le reste de l'identité ne bouge pas. */
export type Theme = {
  bg: [string, string, string, string, string, string];
  accents: [string, string, string];
};

/**
 * Le mouvement du fond, en deux réglages continus plutôt qu'en modes
 * figés : la vitesse et l'ampleur ne se ressentent pas pareil selon la
 * taille de l'écran, autant laisser régler.
 */
export type Mouvement = { vitesse: number; amplitude: number };

/**
 * Le décor bouge, ou il ne bouge pas.
 *
 * POURQUOI CE RÉGLAGE EXISTE À PART DE `mouvement`. La vitesse et
 * l'ampleur décrivent COMMENT le décor dérive ; celui-ci décide S'IL
 * dérive. La différence n'est pas cosmétique : un fond animé est la
 * seule chose du site qui consomme en permanence, sur un onglet où
 * personne ne touche à rien, et pendant toute la durée de la visite.
 * Tout le reste — le cylindre de défilement, l'inclinaison des cartes,
 * les entrées en cascade — ne coûte que pendant le geste qui le
 * déclenche.
 *
 * IL EST DONC FIXE PAR DÉFAUT, POUR TOUT LE MONDE. Quelqu'un qui passe
 * trente secondes sur une fiche n'a rien demandé, et il ne doit pas
 * payer le ventilateur d'un décor qu'il n'a pas choisi. Celui qui veut
 * le mouvement l'allume depuis son compte, et c'est alors un choix.
 */
export type Fond = "fixe" | "anime";
export type PresetMouvement = { id: string; nom: string; mouvement: Mouvement };

export type Ambiance = { id: string; nom: string; theme: Theme };

export type Preferences = {
  theme: Theme;
  /**
   * Fond clair plutôt que sombre.
   *
   * Ce n'est pas une palette de plus : c'est le sens de lecture du
   * site qui s'inverse. La palette choisie continue de s'appliquer,
   * simplement diluée — voir la section « mode clair » de globals.css.
   */
  clair?: boolean;
  mouvement: Mouvement;
  /**
   * Fond animé ou fixe. Absent vaut « fixe » : un compte créé avant ce
   * réglage, ou qui n'y a jamais touché, part du défaut économe.
   */
  fond?: Fond;
  /** Ambiances créées par la personne, en plus des nôtres. */
  ambiances: Ambiance[];
  /** Réglages de mouvement enregistrés par la personne. */
  mouvements: PresetMouvement[];
};

export const THEME_DEFAUT: Theme = {
  bg: ["#33217f", "#4e5bc0", "#9e63d6", "#c255c4", "#5a54c8", "#31217c"],
  accents: ["#e86fd8", "#5a72e0", "#b47aea"],
};

export const MOUVEMENT_DEFAUT: Mouvement = { vitesse: 1, amplitude: 1 };

/** Immobile. Voir le commentaire du type `Fond`. */
export const FOND_DEFAUT: Fond = "fixe";

export const PREFERENCES_DEFAUT: Preferences = {
  theme: THEME_DEFAUT,
  clair: false,
  mouvement: MOUVEMENT_DEFAUT,
  fond: FOND_DEFAUT,
  ambiances: [],
  mouvements: [],
};

export const PRESETS_MOUVEMENT: PresetMouvement[] = [
  { id: "fige", nom: "Figé", mouvement: { vitesse: 1, amplitude: 0 } },
  { id: "doux", nom: "Doux", mouvement: { vitesse: 0.45, amplitude: 0.55 } },
  { id: "anime", nom: "Animé", mouvement: MOUVEMENT_DEFAUT },
  { id: "vif", nom: "Vif", mouvement: { vitesse: 1.9, amplitude: 1.35 } },
];

export const PRESETS: Ambiance[] = [
  { id: "newave", nom: "NEWAVE", theme: THEME_DEFAUT },
  {
    id: "nuit",
    nom: "Nuit",
    theme: {
      bg: ["#0d1030", "#182a5c", "#1f4b7a", "#2d6f8f", "#1a3560", "#0b0e2a"],
      accents: ["#4fd1e0", "#3b6fd4", "#7a5cf0"],
    },
  },
  {
    id: "braise",
    nom: "Braise",
    theme: {
      bg: ["#2b0d1f", "#6b1338", "#a8264a", "#d4562f", "#8a1f3d", "#240a1a"],
      accents: ["#ff8a5c", "#e0345f", "#c2508f"],
    },
  },
  {
    id: "foret",
    nom: "Forêt",
    theme: {
      bg: ["#0c2119", "#14402f", "#1f6b4a", "#3f8f5c", "#175139", "#091a13"],
      accents: ["#6fe0a8", "#3d9e7a", "#c8d95c"],
    },
  },
  {
    id: "graphite",
    nom: "Graphite",
    theme: {
      bg: ["#141418", "#26262e", "#3a3a45", "#4d4d5a", "#2b2b34", "#101014"],
      accents: ["#9a9ab0", "#6e6e85", "#c4c4d8"],
    },
  },
];

export const CLE_STOCKAGE = "newave-theme";

/**
 * Deux thèmes identiques ? La comparaison porte sur les valeurs.
 *
 * Un thème n'est que douze chaînes de caractères : deux objets
 * différents peuvent porter exactement la même ambiance, et c'est même
 * le cas le plus courant — celui d'un preset recopié dans les
 * préférences. Comparer les références dirait « non » à chaque fois.
 *
 * Elle vit ici et non dans `ThemePicker` parce que le hub du compte a
 * besoin de la même réponse pour nommer l'ambiance en cours. Deux
 * définitions de « le même thème » finiraient par se contredire, et
 * c'est le genre de désaccord qu'on ne voit qu'en production.
 */
export function memeTheme(a: Theme, b: Theme): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * L'apparence en cours, lue en toutes lettres : « NEWAVE · Sombre ».
 *
 * « Sur mesure » quand aucune ambiance enregistrée ne correspond : les
 * couleurs ont alors été composées à la main, et il n'existe aucun nom
 * à donner. Dire « NEWAVE » dans ce cas serait faux, et laisser le
 * champ vide laisserait croire à un réglage perdu.
 */
export function decrireApparence(prefs: Preferences): string {
  const connue = [...PRESETS, ...prefs.ambiances].find((a) => memeTheme(a.theme, prefs.theme));
  return `${connue?.nom ?? "Sur mesure"} · ${prefs.clair ? "Clair" : "Sombre"}`;
}

/** Une phrase qui décrit le réglage courant, pour ne pas laisser deux nombres nus. */
export function decrire(m: Mouvement): string {
  if (m.amplitude <= 0.02) return "Aucun mouvement. Le fond reste immobile.";
  const vitesse =
    m.vitesse < 0.6 ? "lentement" : m.vitesse > 1.5 ? "rapidement" : "à rythme normal";
  const ampleur =
    m.amplitude < 0.6 ? "de façon discrète" : m.amplitude > 1.2 ? "largement" : "franchement";
  return `Le fond dérive ${vitesse}, ${ampleur}.`;
}

/** "#c255c4" -> "194, 85, 196", format attendu par rgba(). */
export function versRgb(hex: string): string {
  const propre = hex.replace("#", "");
  const n = parseInt(
    propre.length === 3 ? propre.split("").map((c) => c + c).join("") : propre,
    16
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/* ==================================================================
   TROIS TEINTES PLUTÔT QUE SIX, UNE BARRE PLUTÔT QUE DEUX CURSEURS

   L'écran demandait neuf couleurs — Départ, Transition, Cœur, Pic,
   Retour, Fin, plus trois nappes — et deux curseurs. Onze commandes
   pour un réglage qu'on fait une fois, et des mots dont personne ne
   pouvait deviner où ils tombaient dans la page : « Pic », c'est où ?

   LES DONNÉES NE CHANGENT PAS. `Theme.bg` reste six couleurs,
   `Mouvement` reste { vitesse, amplitude }. Ce qui change est
   entièrement au-dessus : ce que l'interface DEMANDE, et ce qu'elle en
   déduit. Un thème enregistré par l'ancien écran s'affiche donc
   exactement pareil, et rien n'est à migrer.
   ================================================================== */

/** "#4e5bc0" ou "#4e5" -> [78, 91, 192]. */
function enComposantes(hex: string): [number, number, number] {
  const propre = hex.replace("#", "");
  const n = parseInt(
    propre.length === 3 ? propre.split("").map((c) => c + c).join("") : propre,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const enHex = (c: number) =>
  `#${Math.round(Math.min(255, Math.max(0, c)))
    .toString(16)
    .padStart(2, "0")}`;

/**
 * Interpolation linéaire entre deux couleurs, composante par
 * composante, en sRGB.
 *
 * Pas d'OKLCH ici, et c'est délibéré : on interpole entre deux teintes
 * VOISINES d'un même dégradé, jamais entre deux couleurs opposées. À
 * cette distance, l'écart entre les deux espaces ne se voit pas, et
 * l'on garde une formule que n'importe qui peut relire.
 */
export function melanger(a: string, b: string, t: number): string {
  const [ar, ag, ab] = enComposantes(a);
  const [br, bg, bb] = enComposantes(b);
  return (
    enHex(ar + (br - ar) * t) + enHex(ag + (bg - ag) * t).slice(1) + enHex(ab + (bb - ab) * t).slice(1)
  );
}

/** Les trois teintes qu'on demande, nommées par leur place réelle. */
export type TroisTeintes = { haut: string; coeur: string; bas: string };

/**
 * LES SIX TEINTES DU DÉGRADÉ, DÉDUITES DES TROIS.
 *
 * Haut, Cœur et Bas disent OÙ la couleur tombe dans la page, ce que
 * Départ / Transition / Pic ne disaient pas. Les trois autres arrêts
 * sont des intermédiaires : personne ne les réglait pour eux-mêmes, on
 * les poussait jusqu'à ce que la transition cesse de faire une bande.
 *
 * `bg[3]` est l'ancien « pic », éclairci de seize pour cent vers le
 * blanc : c'est lui qui donne au dégradé sa zone lumineuse aux deux
 * tiers de la page, et sans cet éclaircissement le fond s'aplatit.
 */
export function sixDepuisTrois({ haut, coeur, bas }: TroisTeintes): Theme["bg"] {
  return [
    haut,
    melanger(haut, coeur, 0.55),
    coeur,
    melanger(coeur, "#ffffff", 0.16),
    melanger(coeur, bas, 0.55),
    bas,
  ];
}

/**
 * Les trois teintes à MONTRER pour un thème déjà enregistré.
 *
 * ⚠️ ON LIT, ON NE RÉÉCRIT PAS. Un thème composé avec l'ancien écran a
 * six couleurs libres, qui ne sont pas forcément l'interpolation de
 * trois d'entre elles. Les rangs 0, 2 et 5 sont fidèles pour
 * l'écrasante majorité — ils ont été posés à la souris en suivant une
 * progression — mais tant que la personne ne touche à aucune des trois,
 * son thème doit rester affiché avec ses six valeurs d'origine. C'est
 * `ThemePicker` qui tient cette règle : il ne recalcule qu'au premier
 * changement d'une teinte.
 */
export function troisDepuisSix(bg: Theme["bg"]): TroisTeintes {
  return { haut: bg[0], coeur: bg[2], bas: bg[5] };
}

/* ---------------- le mouvement, sur une seule barre ---------------- */

/**
 * Les quatre paliers nommés, et leur position sur la barre.
 *
 * Ils sont cliquables et la poignée les rejoint : on choisit un mot, ou
 * l'on glisse entre eux si l'on veut affiner.
 */
export const PALIERS_MOUVEMENT = [
  { valeur: 0, nom: "Figé" },
  { valeur: 22, nom: "Doux" },
  { valeur: 55, nom: "Animé" },
  { valeur: 88, nom: "Vif" },
] as const;

/** Le mot qui correspond à une position, pour le retour de lecture. */
export function nomDuMouvement(v: number): string {
  if (v === 0) return "Figé";
  if (v < 34) return "Doux";
  if (v < 71) return "Animé";
  return "Vif";
}

/**
 * CE QUE LA BARRE ÉCRIT, ET POURQUOI ELLE ÉCRIT AUSSI `fond`.
 *
 * La barre porte les deux réglages d'hier — vitesse et ampleur — plus
 * l'interrupteur Fixe/Animé, qui vivait à part. Un seul objet à régler,
 * donc, et « Figé » veut dire la même chose partout.
 *
 * ⚠️ À ZÉRO, ON POSE `fond: "fixe"` ET ON NE TOUCHE PAS AU MOUVEMENT.
 * Écrire `vitesse: 0` serait sans effet — `appliquerMouvement` remonte
 * toute vitesse à 0.1 — et zéroter l'ampleur reviendrait à effacer le
 * réglage de quelqu'un pour dire une chose que `data-fond="fixe"` dit
 * déjà, et mieux : il coupe le décor entier, pas seulement sa dérive.
 * En repartant de zéro, la barre redonne de toute façon des valeurs
 * dérivées, donc rien n'est perdu.
 *
 * L'AMPLEUR SUIT LA VITESSE, et c'est le pari de ce chantier :
 * personne ne veut un fond qui file en bougeant à peine, ni qui rampe
 * en traversant l'écran. Les deux curseurs décrivaient une seule
 * sensation. La donnée reste séparée dans le modèle, donc un réglage
 * fin reste rouvrable le jour où un cas le demande.
 */
export function mouvementDepuisBarre(
  v: number,
  actuel: Mouvement
): { fond: Fond; mouvement: Mouvement } {
  if (v <= 0) return { fond: "fixe", mouvement: actuel };
  return {
    fond: "anime",
    mouvement: {
      vitesse: 0.35 + (v / 100) * 2.2,
      amplitude: 0.4 + (v / 100) * 1.1,
    },
  };
}

/**
 * La position de la barre pour des préférences existantes.
 *
 * Le fond décide d'abord : fixe, la barre est à zéro, quelles que
 * soient les valeurs enregistrées derrière. C'est ce qui fait qu'un
 * compte neuf — `fond` vaut « fixe » par défaut, pour tout le monde,
 * voir le type `Fond` — ouvre la barre sur « Figé » plutôt que sur un
 * « Animé » qui ne s'appliquerait pas.
 *
 * Sinon on inverse la formule de la vitesse. Un thème réglé à l'ancien
 * écran peut tomber entre deux paliers, et c'est très bien : la barre
 * est continue, elle montrera la position réelle et le mot le plus
 * proche.
 */
export function barreDepuisMouvement(fond: Fond | undefined, m: Mouvement): number {
  if (fond !== "anime") return 0;
  const v = Math.round(((m.vitesse - 0.35) / 2.2) * 100);
  return Math.min(100, Math.max(1, v));
}

export function appliquerTheme(theme: Theme, cible: HTMLElement) {
  theme.bg.forEach((c, i) => cible.style.setProperty(`--bg-${i + 1}`, c));
  theme.accents.forEach((c, i) => cible.style.setProperty(`--accent-${i + 1}`, versRgb(c)));
  // Le voile suit la couleur la plus sombre, sinon il jure avec le fond.
  cible.style.setProperty("--voile", versRgb(theme.bg[0]));
}

/**
 * Applique le mouvement.
 *
 * "explicite" marque que la personne a choisi elle-même : dans ce cas
 * son réglage prime sur la préférence système « réduire les
 * animations ». Sans ce marqueur, un ordinateur configuré pour limiter
 * les animations garderait un fond immobile quoi qu'on règle ici — et
 * c'est exactement ce qui donnait un site figé sans qu'on comprenne
 * pourquoi.
 */
/** Pose ou retire le mode clair. */
export function appliquerClarte(clair: boolean, cible: HTMLElement) {
  if (clair) cible.dataset.clair = "1";
  else delete cible.dataset.clair;
}

/**
 * Pose ou retire le drapeau qui fige le décor.
 *
 * ON ÉCRIT LE CAS FIXE, ET ON EFFACE POUR ANIMER. C'est l'inverse de
 * l'habitude, et c'est voulu : le serveur écrit `data-fond="fixe"` dans
 * le HTML lui-même pour tout visiteur sans compte, donc l'absence
 * d'attribut est ce qui demande le mouvement. Un décor qui démarrerait
 * animé le temps que JavaScript arrive, pour se figer ensuite, serait
 * exactement le scintillement qu'on cherche à éviter partout ailleurs.
 */
export function appliquerFond(fond: Fond | undefined, cible: HTMLElement) {
  if (fond === "anime") delete cible.dataset.fond;
  else cible.dataset.fond = "fixe";
}

export function appliquerMouvement(m: Mouvement, cible: HTMLElement, explicite = false) {
  cible.style.setProperty("--vit", String(Math.max(m.vitesse, 0.1)));
  cible.style.setProperty("--amp", String(m.amplitude));
  if (m.amplitude <= 0.02) cible.dataset.fige = "1";
  else delete cible.dataset.fige;
  if (explicite) cible.dataset.animChoisi = "1";
}

/**
 * Relit ce qui est enregistré, en tolérant l'ancien format.
 * Les premières versions ne stockaient qu'un thème nu : on ne va pas
 * effacer la personnalisation de quelqu'un parce qu'on a changé de
 * structure entre-temps.
 */
export function lire(): Preferences {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return PREFERENCES_DEFAUT;
    const objet = JSON.parse(brut);
    if (objet?.theme?.bg) {
      const prefs = { ...PREFERENCES_DEFAUT, ...objet } as Preferences;
      // Les premières versions stockaient un mot ("anime", "doux",
      // "fixe") là où il y a maintenant deux nombres. On traduit plutôt
      // que d'écraser la préférence de quelqu'un.
      const brutM = objet.mouvement as unknown;
      if (typeof brutM === "string") {
        const trouve = PRESETS_MOUVEMENT.find((p) => p.id === brutM || p.id === "anime");
        prefs.mouvement = trouve?.mouvement ?? MOUVEMENT_DEFAUT;
      }
      if (!Array.isArray(prefs.mouvements)) prefs.mouvements = [];
      return prefs;
    }
    if (objet?.bg) return { ...PREFERENCES_DEFAUT, theme: objet as Theme };
    return PREFERENCES_DEFAUT;
  } catch {
    return PREFERENCES_DEFAUT;
  }
}

export function ecrire(prefs: Preferences) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(prefs));
  } catch {
    // navigation privée saturée : l'aperçu marche quand même
  }
}

/** Script injecté avant le premier rendu, pour éviter un flash. */
export const SCRIPT_ANTI_FLASH = `
(function(){
  try {
    var o = JSON.parse(localStorage.getItem(${JSON.stringify(CLE_STOCKAGE)}));
    if (!o) return;
    var t = o.theme && o.theme.bg ? o.theme : (o.bg ? o : null);
    var r = document.documentElement;
    var m = o.mouvement;
    if (typeof m === 'string') { m = m === 'fixe' ? {vitesse:1,amplitude:0}
      : m === 'doux' ? {vitesse:.45,amplitude:.55} : {vitesse:1,amplitude:1}; }
    if (m) {
      r.style.setProperty('--vit', String(Math.max(m.vitesse, .1)));
      r.style.setProperty('--amp', String(m.amplitude));
      if (m.amplitude <= .02) r.dataset.fige = '1';
      r.dataset.animChoisi = '1';
    }
    if (o.clair) r.dataset.clair = '1';
    if (!t) return;
    var rgb = function(h){h=h.replace('#','');if(h.length===3){h=h.split('').map(function(c){return c+c}).join('')}
      var n=parseInt(h,16);return ((n>>16)&255)+', '+((n>>8)&255)+', '+(n&255)};
    t.bg.forEach(function(c,i){ r.style.setProperty('--bg-'+(i+1), c) });
    (t.accents||[]).forEach(function(c,i){ r.style.setProperty('--accent-'+(i+1), rgb(c)) });
    r.style.setProperty('--voile', rgb(t.bg[0]));
  } catch (e) {}
})();
`;
