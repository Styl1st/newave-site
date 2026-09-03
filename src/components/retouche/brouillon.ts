import type { Brand } from "@/lib/types";

/**
 * Le brouillon : ce qu'on a changé, tant que ce n'est pas parti.
 *
 * POURQUOI UN OBJET, ET NON LE FORMULAIRE. L'éditeur trois colonnes lit
 * ses valeurs dans le DOM (`admin/etat-fiche`), parce qu'il A un
 * formulaire : vingt champs rangés au même endroit, qu'il suffit de
 * relire. La retouche en place n'en a pas. Ses champs naissent au clic,
 * un à la fois, et disparaissent dès qu'on valide — un formulaire ne
 * porterait donc jamais que le champ ouvert, et fermer l'accroche pour
 * ouvrir la démarche aurait suffi à perdre l'accroche.
 *
 * ET SURTOUT : LE MÊME BROUILLON SERT AUX DEUX MAINS. Au doigt,
 * l'édition en place n'est pas praticable, et c'est une feuille qui
 * monte avec tous les champs. Elle n'est pas un second formulaire : elle
 * écrit dans cet objet-ci, exactement comme la page. Commencer une
 * phrase sur la page, tourner le téléphone, la finir dans la feuille et
 * n'enregistrer qu'une fois doit marcher.
 *
 * RIEN NE PART AVANT « ENREGISTRER ». C'est tout l'intérêt : on retouche
 * sa page en la regardant, on se ravise, et « Tout annuler » remet les
 * valeurs du serveur sans avoir rien écrit en base.
 */
export type Brouillon = {
  tagline: string;
  description: string;
  cover_url: string;
  cover_video_url: string;
  logo_url: string;
  country: string;
  city: string;
  /** En texte, comme le rendrait un champ : la base, elle, veut un nombre. */
  founded_year: string;
  price_tier: string;
  shop_url: string;
  instagram: string;
  categories: string[];
  /*
   * TRANSPORTÉ, PAS RETOUCHÉ.
   *
   * Rien dans cet écran ne modifie l'adresse du site : elle n'a ni
   * champ ni ligne dans la feuille. Mais `saveBrandPresentation` écrit
   * TOUTES les colonnes de présentation à chaque envoi, y compris
   * celle-ci, et un champ absent du formulaire y arrive comme une
   * valeur vide — c'est-à-dire comme un effacement.
   *
   * Le laisser dehors aurait donc effacé le site de la marque au
   * premier enregistrement, sans un mot et sans que personne y ait
   * touché. Il fait l'aller-retour pour revenir identique.
   *
   * Il est hors de `TEXTES` exprès : ce n'est pas une modification,
   * la barre d'enregistrement ne doit jamais s'ouvrir pour lui.
   */
  website_url: string;
};

export type ChampBrouillon = keyof Brouillon;

/**
 * Les champs qui se comparent comme du texte.
 *
 * Rangés à part des catégories, qui n'en sont pas : c'est le seul
 * intérêt de cette liste.
 */
const TEXTES = [
  "tagline",
  "description",
  "cover_url",
  "cover_video_url",
  "logo_url",
  "country",
  "city",
  "founded_year",
  "price_tier",
  "shop_url",
  "instagram",
] as const;

/** L'état de départ, celui que le serveur vient d'envoyer. */
export function brouillonDuServeur(brand: Brand): Brouillon {
  const propre = (valeur: string | null | undefined) => (valeur ?? "").trim();

  return {
    tagline: propre(brand.tagline),
    description: propre(brand.description),
    cover_url: propre(brand.cover_url),
    cover_video_url: propre(brand.cover_video_url),
    logo_url: propre(brand.logo_url),
    country: propre(brand.country),
    city: propre(brand.city),
    /*
     * L'année en texte. Comparer un nombre à ce que rend un champ —
     * toujours une chaîne — signalerait une modification à chaque
     * ouverture, et la barre d'enregistrement s'afficherait sans que
     * personne n'ait rien touché.
     */
    founded_year: brand.founded_year ? String(brand.founded_year) : "",
    price_tier: brand.price_tier || "intermediaire",
    /*
     * UNE SEULE ADRESSE DEMANDÉE, COMME DANS LE PANNEAU D'ORIGINE.
     * Une marque importée n'a parfois que `website_url` : la proposer
     * ici évite de la faire recoller à la main, et c'est `shop_url`
     * qu'elle deviendra à l'enregistrement.
     */
    shop_url: propre(brand.shop_url ?? brand.website_url),
    instagram: propre(brand.instagram),
    categories: brand.categories ?? [],
    website_url: propre(brand.website_url),
  };
}

/**
 * Le brouillon tel que la base va le relire.
 *
 * `saveBrandPresentation` coupe les blancs et repose ses deux valeurs
 * par défaut. Appliquer ici les mêmes règles fait que le brouillon
 * enregistré est déjà, au caractère près, ce qui vient d'être écrit :
 * le compte de modifications retombe à zéro tout de suite, sans
 * attendre que le serveur ait renvoyé la page.
 */
export function normalise(brouillon: Brouillon): Brouillon {
  const propre = (valeur: string) => valeur.trim();

  return {
    tagline: propre(brouillon.tagline),
    description: propre(brouillon.description),
    cover_url: propre(brouillon.cover_url),
    cover_video_url: propre(brouillon.cover_video_url),
    logo_url: propre(brouillon.logo_url),
    country: propre(brouillon.country) || "France",
    city: propre(brouillon.city),
    founded_year: propre(brouillon.founded_year),
    price_tier: propre(brouillon.price_tier) || "intermediaire",
    shop_url: propre(brouillon.shop_url),
    instagram: propre(brouillon.instagram),
    categories: brouillon.categories,
    website_url: brouillon.website_url,
  };
}

/**
 * Combien de champs diffèrent de ce qui est enregistré.
 *
 * C'est ce chiffre qui fait apparaître la barre d'enregistrement et qui
 * décide d'avertir avant de quitter la page.
 */
export function champsModifies(avant: Brouillon, apres: Brouillon): number {
  let total = 0;
  for (const cle of TEXTES) if (avant[cle] !== apres[cle]) total += 1;
  /*
   * L'ordre des catégories n'appartient à personne : la base les rend
   * dans l'ordre où elles ont été écrites, les cases dans celui du
   * vocabulaire. Comparer sans trier signalerait une modification
   * permanente sur une fiche à laquelle personne n'a touché.
   */
  const rangees = (liste: string[]) => [...liste].sort().join("|");
  if (rangees(avant.categories) !== rangees(apres.categories)) total += 1;
  return total;
}

/**
 * Ce qui part au serveur.
 *
 * LES MÊMES NOMS DE CHAMPS QUE LE PANNEAU D'ORIGINE, AU CARACTÈRE PRÈS,
 * et la même action. `saveBrandPresentation` n'a pas bougé d'une ligne :
 * elle relit les droits en base par `requireManagedBrand` à chaque
 * envoi, et la retouche ne donne donc rien à personne. Quelqu'un qui
 * ferait apparaître ces champs dans son navigateur n'obtiendrait qu'un
 * envoi refusé.
 *
 * `slug` DÉSIGNE la marque, il ne la renomme pas : c'est la convention
 * de tout l'espace marque.
 */
export function enFormData(brouillon: Brouillon, slug: string): FormData {
  const donnees = new FormData();
  donnees.set("slug", slug);

  for (const cle of TEXTES) donnees.set(cle, brouillon[cle]);
  // Plusieurs valeurs sous un même nom : exactement ce que relit
  // `formData.getAll()` côté serveur.
  for (const categorie of brouillon.categories) donnees.append("categories", categorie);

  // Reposé tel qu'il est arrivé. Voir `website_url` dans `Brouillon` :
  // ne pas l'envoyer revient à demander son effacement.
  donnees.set("website_url", brouillon.website_url);

  return donnees;
}
