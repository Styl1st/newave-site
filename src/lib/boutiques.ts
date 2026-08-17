/**
 * Où une marque vend, et ce qu'on peut en attendre.
 *
 * Toutes les boutiques ne sont pas des boutiques. Un créateur qui vend
 * sur Vinted, Depop ou par message privé n'a pas de site marchand : il
 * a un profil, sur une plateforme qui n'expose pas grand-chose.
 *
 * LA DISTINCTION N'EST PAS COSMÉTIQUE. Notre règle de publication
 * retient en brouillon toute fiche sans pièce — ce qui est juste pour
 * une boutique dont on n'a pas su lire le catalogue, et absurde pour
 * quelqu'un qui n'en aura jamais. Sans cette liste, ces créateurs
 * seraient invisibles pour toujours, alors qu'ils sont exactement le
 * genre de gens que l'annuaire existe pour montrer.
 *
 * Elle sert aussi à écrire la vérité sur la fiche : « Voir sa boutique
 * Vinted » plutôt qu'un « Découvrir la boutique » qui laisserait
 * attendre autre chose.
 *
 * CE FICHIER RESTE PUR. Il part dans le navigateur avec l'annuaire, et
 * n'a donc le droit de rien importer : la lecture d'un profil Vinted
 * vit dans `vinted.ts`, et le choix entre les deux lectures dans
 * `lecture.ts`, tous deux réservés au serveur.
 */

export type Plateforme = {
  /** Le nom tel qu'on l'écrit dans une phrase. */
  nom: string;
  /** La même chose en deux mots, pour une pastille sur une carte. */
  etiquette: string;
  /**
   * Peut-on espérer y lire un catalogue ?
   *
   * Vrai pour Vinted, dont les profils sont rendus côté serveur et
   * donc lisibles. Faux pour les autres : ils demandent une
   * identification, et n'exposent rien.
   */
  lisible: boolean;
  /** Ce qu'on écrit sur le bouton de sortie. */
  bouton: string;
};

const PLATEFORMES: { motif: RegExp; plateforme: Plateforme }[] = [
  {
    motif: /(^|\.)vinted\.[a-z.]+$/i,
    plateforme: {
      nom: "Vinted",
      etiquette: "Vinted",
      lisible: true,
      bouton: "Voir sa boutique Vinted",
    },
  },
  {
    motif: /(^|\.)depop\.com$/i,
    plateforme: {
      nom: "Depop",
      etiquette: "Depop",
      lisible: false,
      bouton: "Voir sa boutique Depop",
    },
  },
  {
    motif: /(^|\.)etsy\.com$/i,
    plateforme: {
      nom: "Etsy",
      etiquette: "Etsy",
      lisible: false,
      bouton: "Voir sa boutique Etsy",
    },
  },
  {
    motif: /(^|\.)instagram\.com$/i,
    plateforme: {
      nom: "Instagram",
      etiquette: "Instagram",
      lisible: false,
      bouton: "Voir son Instagram",
    },
  },
  {
    motif: /(^|\.)tiktok\.com$/i,
    plateforme: {
      nom: "TikTok",
      etiquette: "TikTok",
      lisible: false,
      bouton: "Voir son TikTok",
    },
  },
  {
    motif: /(^|\.)linktr\.ee$|(^|\.)beacons\.ai$|(^|\.)bio\.link$/i,
    plateforme: {
      nom: "sa page de liens",
      etiquette: "Page de liens",
      lisible: false,
      bouton: "Voir ses liens",
    },
  },
];

/** L'hôte d'une adresse écrite à la va-vite, ou null. */
export function hoteDe(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** La plateforme d'une adresse, ou null si c'est un vrai site marchand. */
export function plateformeDeVente(url: string | null | undefined): Plateforme | null {
  const hote = hoteDe(url);
  if (!hote) return null;
  return PLATEFORMES.find(({ motif }) => motif.test(hote))?.plateforme ?? null;
}

/**
 * Vaut-il la peine d'aller lire cette adresse ?
 *
 * Une adresse absente ne donne rien, et une plateforme illisible non
 * plus : dans les deux cas on s'épargne la requête.
 */
export function boutiqueLisible(url: string | null | undefined): boolean {
  if (!url) return false;
  const plateforme = plateformeDeVente(url);
  return plateforme === null || plateforme.lisible;
}

/**
 * Cette fiche doit-elle avoir des pièces pour être publiée ?
 *
 * Distinct de la question précédente, et la nuance compte. On sait
 * lire un profil Vinted, donc on essaie ; mais un profil vide est un
 * état NORMAL — le créateur a tout vendu, ou n'a rien listé cette
 * semaine — alors qu'une boutique en ligne sans une seule pièce
 * signale presque toujours une lecture ratée de notre côté.
 *
 * Retenir la première en brouillon reviendrait à ne jamais la publier.
 */
export function exigeUnCatalogue(url: string | null | undefined): boolean {
  if (!url) return false;
  return plateformeDeVente(url) === null;
}

/**
 * Ce profil est-il celui d'un créateur plutôt que d'une marque ?
 *
 * Vendre sur Vinted, Depop ou Instagram n'est pas un choix de canal
 * comme un autre : c'est ce que fait quelqu'un qui coud lui-même, à
 * l'unité, sans stock ni site à entretenir. L'onglet « Artistes » de
 * l'annuaire les prend donc sans qu'on ait à cocher quoi que ce soit,
 * et la case « Artiste » reste là pour les cas que l'adresse ne dit
 * pas — un peintre qui a un vrai site marchand, par exemple.
 */
export function estUnArtiste(marque: {
  categories?: string[] | null;
  shop_url?: string | null;
  website_url?: string | null;
}): boolean {
  if (marque.categories?.includes("Artiste")) return true;
  return plateformeDeVente(marque.shop_url ?? marque.website_url) !== null;
}
