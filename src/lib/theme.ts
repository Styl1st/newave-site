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

export const PREFERENCES_DEFAUT: Preferences = {
  theme: THEME_DEFAUT,
  clair: false,
  mouvement: MOUVEMENT_DEFAUT,
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
