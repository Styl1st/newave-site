/**
 * Les mots de la retouche, dans les deux voix.
 *
 * D'OÙ ILS VIENNENT. La moitié de ce fichier est reprise telle quelle
 * de `PanneauEdition`, qui portait déjà les libellés et les textes
 * d'aide de la fiche. Ce panneau disparaît avec la retouche en place,
 * mais ses mots avaient été écrits avec soin — « pas un slogan : ce que
 * tu fais, dit simplement » vaut mieux que « Accroche » —, et les
 * réécrire aurait fait perdre en une après-midi ce qui s'était réglé
 * phrase par phrase.
 *
 * DEUX VOIX, ET RIEN D'AUTRE. Un administrateur retouche la fiche d'une
 * marque qu'il ne tient pas : « ta démarche » et « ma page » sont alors
 * faux, et ce genre de petit mensonge se remarque tout de suite. Seuls
 * les mots changent — jamais un champ, jamais un bouton, jamais un
 * droit. Qui a le droit d'écrire sur quelle marque se décide dans
 * `saveBrandPresentation`, qui relit le rôle en base à chaque envoi.
 */

/** Qui parle : la marque chez elle, ou l'administration. */
export type Voix = "gerant" | "administration";

export type MotsDeLaRetouche = {
  /* --- repris de `PanneauEdition` --- */
  bouton: string;
  surtitre: string;
  accrocheLabel: string;
  accrocheAide: string;
  accrochePlaceholder: string;
  demarcheLabel: string;
  demarcheAide: string;
  categoriesLabel: string;
  categoriesAide: string;
  boutiqueAide: string;
  envoyer: string;
  /* --- propres à la retouche en place --- */
  /** L'étiquette flottante posée sur le champ ouvert. */
  accrocheEtiquette: string;
  demarcheEtiquette: string;
  /** L'état du bouton quand la retouche est en cours. */
  enRetouche: string;
  quitter: string;
  consigne: string;
  /** Au doigt, on ne clique pas sur un texte : la feuille monte. */
  consigneEtroite: string;
  couverture: string;
  logo: string;
  piecesTitre: string;
  piecesManque: string;
  importer: string;
  ajouterAlaMain: string;
  railNote: string;
  enregistre: string;
};

export const MOTS: Record<Voix, MotsDeLaRetouche> = {
  gerant: {
    bouton: "Modifier ma page",
    surtitre: "Ta page",
    accrocheLabel: "Ta phrase, en une ligne",
    accrocheAide: "Pas un slogan : ce que tu fais, dit simplement.",
    accrochePlaceholder: "Ce que tu fais, en une ligne",
    demarcheLabel: "Ta démarche",
    demarcheAide:
      "Matières, ateliers, quantités, ce que tu refuses de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication.",
    categoriesLabel: "Tes catégories",
    categoriesAide:
      "Coche ce qui te correspond vraiment. En cocher dix pour être partout dessert plus qu'autre chose.",
    boutiqueAide: "Une seule adresse : celle où l'on peut acheter tes pièces.",
    envoyer: "Enregistrer ma page",
    accrocheEtiquette: "Ta phrase",
    demarcheEtiquette: "Ta démarche",
    enRetouche: "Retouche en cours",
    quitter: "Quitter la retouche",
    consigne: "Clique sur un texte ou un visuel de ta page pour le changer.",
    consigneEtroite: "Touche un texte ou un visuel : le panneau s'ouvre dessus.",
    couverture: "Ta couverture",
    logo: "Ton logo",
    piecesTitre: "Mes pièces",
    piecesManque: "C'est la dernière chose qui te manque pour publier.",
    importer: "Importer depuis ma boutique",
    ajouterAlaMain: "Ajouter à la main",
    railNote:
      "Ta boutique, tes catégories et ton pays ne bloquent pas la publication.",
    enregistre: "Ta page est enregistrée.",
  },
  administration: {
    bouton: "Modifier la fiche",
    surtitre: "La fiche",
    accrocheLabel: "La phrase, en une ligne",
    accrocheAide: "Pas un slogan : ce que fait la marque, dit simplement.",
    accrochePlaceholder: "Ce qu'elle fait, en une ligne",
    demarcheLabel: "Sa démarche",
    demarcheAide:
      "Matières, ateliers, quantités, ce qu'elle refuse de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication.",
    categoriesLabel: "Ses catégories",
    categoriesAide:
      "Coche ce qui lui correspond vraiment. En cocher dix pour la mettre partout la dessert plus qu'autre chose.",
    boutiqueAide: "Une seule adresse : celle où l'on peut acheter ses pièces.",
    envoyer: "Enregistrer la fiche",
    accrocheEtiquette: "La phrase",
    demarcheEtiquette: "Sa démarche",
    enRetouche: "Retouche en cours",
    quitter: "Quitter la retouche",
    consigne: "Clique sur un texte ou un visuel de la fiche pour le changer.",
    consigneEtroite: "Touche un texte ou un visuel : le panneau s'ouvre dessus.",
    couverture: "Sa couverture",
    logo: "Son logo",
    piecesTitre: "Ses pièces",
    piecesManque: "C'est la dernière chose qui manque pour publier.",
    importer: "Importer depuis la boutique",
    ajouterAlaMain: "Ajouter à la main",
    railNote:
      "Sa boutique, ses catégories et son pays ne bloquent pas la publication.",
    enregistre: "La fiche est enregistrée.",
  },
};
