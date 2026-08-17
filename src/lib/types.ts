export type PriceTier = "accessible" | "intermediaire" | "premium";
export type Status = "draft" | "published";
export type Role = "membre" | "createur" | "admin";

export type Brand = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  country: string;
  city: string | null;
  founded_year: number | null;
  categories: string[];
  price_tier: PriceTier;
  website_url: string | null;
  shop_url: string | null;
  instagram: string | null;
  logo_url: string | null;
  cover_url: string | null;
  /** Illustration animée, hébergée par la marque. cover_url reste l'image fixe. */
  cover_video_url?: string | null;
  featured: boolean;
  status: Status;
  published_at: string | null;
  /** La boutique est fermée volontairement : mot de passe, drop en préparation. */
  catalogue_verrouille?: boolean;
  /**
   * Comment on achète : `ouvert`, `bientot`, `prive`, `liste`.
   *
   * Voir `acces.ts`. Facultatif ici parce que d'anciennes lectures en
   * mémoire n'ont pas encore la colonne, et qu'une fiche sans valeur
   * doit se comporter comme une boutique ouverte.
   */
  acces?: string | null;
};

/** Une piece d'une marque. Le paiement se fait chez la marque, via shop_url. */
export type Size = { label: string; available: boolean };

export type Product = {
  id: string;
  brand_id: string;
  slug: string | null;
  name: string;
  price_cents: number | null;
  /** Prix barre. Rempli seulement s'il depasse le prix courant. */
  compare_at_cents: number | null;
  /* Les mêmes prix ramenés en euros, calculés à la lecture du
     catalogue. Nuls quand la devise est inconnue. */
  price_eur_cents?: number | null;
  compare_at_eur_cents?: number | null;
  currency: string;
  sizes: Size[];
  size_label: string;
  image_url: string | null;
  /** Le carrousel. image_url reste la vignette des listes. */
  images: string[];
  description: string;
  shop_url: string;
  categories: string[];
  featured: boolean;
  available: boolean;
  status: Status;
  position: number;
  /** Identifiant Shopify d'origine, pour eviter les doublons a l'import. */
  source_id: string | null;
  /**
   * Date a laquelle la piece a disparu de la boutique de la marque.
   * La fiche reste consultable : elle porte des coups de cœur, et ceux-ci
   * racontent ce que la marque a fait. On dit simplement que la piece
   * n'est plus en vente.
   */
  retired_at: string | null;
  /** Rempli par les requetes qui joignent la marque. */
  brand?: Pick<Brand, "id" | "slug" | "name"> | null;
};

/** Un post : une publication Instagram, hebergee chez toi. */
export type Post = {
  id: string;
  slug: string;
  title: string;
  caption: string;
  image_url: string | null;
  /** Le carrousel. image_url reste la vignette des listes. */
  images: string[];
  /** MP4 hebergé chez nous. Un Reel ne se lit pas depuis un site tiers. */
  video_url: string | null;
  /** Le post renvoie vers une vidéo plutôt que vers des photos. */
  est_video?: boolean;
  /** Image affichée avant lecture. */
  video_poster: string | null;
  image_alt: string;
  keywords: string[];
  brand_id: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  status: Status;
  published_at: string | null;
  brand?: Pick<Brand, "id" | "slug" | "name"> | null;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
};

export type BrandManager = {
  brand_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile | null;
};

/** Le candidat dirige-t-il la marque, ou la recommande-t-il ? */
export type Relationship = "proprietaire" | "decouvreur";

export type Application = {
  id: string;
  user_id: string | null;
  brand_id: string | null;
  relationship: Relationship;
  brand_name: string;
  contact_name: string;
  email: string;
  instagram: string | null;
  website: string | null;
  pitch: string;
  status: "nouvelle" | "en_cours" | "acceptee" | "refusee";
  created_at: string;
  /* La fiche telle qu'elle sera créée le jour où on accepte. Recueillie
     au dépôt, mais rien n'est écrit dans l'annuaire avant. */
  description?: string;
  pays?: string | null;
  ville?: string | null;
  categories?: string[];
  logo_url?: string | null;
  cover_url?: string | null;
  reseaux?: { reseau: string; identifiant: string }[];
};

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  accessible: "Accessible",
  intermediaire: "Intermédiaire",
  premium: "Premium",
};

export const APPLICATION_STATUS_LABEL: Record<Application["status"], string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  proprietaire: "C'est sa marque",
  decouvreur: "Recommandation",
};

export const ROLE_LABEL: Record<Role, string> = {
  membre: "Membre",
  createur: "Créateur",
  admin: "Administrateur",
};

/** Affiche un prix en centimes sous forme lisible. */
export function formatPrice(cents: number | null, currency = "EUR"): string | null {
  if (cents == null) return null;

  /*
   * `Intl` exige un code de trois lettres et lève une exception sinon.
   *
   * Ce n'est pas théorique depuis que la devise se saisit à la main
   * dans l'espace marque : quelqu'un écrit « Euro » ou « € », et c'est
   * la page publique de la marque qui tombe. Une pièce mal renseignée
   * ne doit pas emporter tout le reste avec elle.
   */
  const code = (currency || "EUR").toUpperCase();
  const valide = /^[A-Z]{3}$/.test(code);

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: valide ? code : "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Le prix tel qu'on l'écrit sur le site.
 *
 * Une boutique danoise affiche 899 DKK. Repris tel quel, à côté d'un
 * article français à 89 €, ça se lit comme un prix délirant alors que
 * c'est à peu près la même somme. On met donc l'euro devant, parce que
 * c'est lui qui permet de comparer.
 *
 * Mais on n'efface jamais le prix d'origine : c'est celui que la
 * personne paiera réellement chez la marque, et notre conversion n'est
 * qu'une aide à la lecture, jamais une promesse. Elle est donc écrite
 * comme une approximation, et le vrai prix reste affiché à côté.
 */
export function prixAffiche(
  p: Pick<Product, "price_cents" | "currency" | "price_eur_cents">
): { principal: string | null; origine: string | null } {
  const origine = formatPrice(p.price_cents, p.currency);
  const enEuros = p.price_eur_cents ?? null;

  const memeDevise = (p.currency || "EUR").toUpperCase() === "EUR";
  if (memeDevise || enEuros === null) return { principal: origine, origine: null };

  return { principal: `≈ ${formatPrice(enEuros, "EUR")}`, origine };
}

/** Pourcentage de remise, ou null s'il n'y a pas de promo credible. */
export function discountPercent(product: Pick<Product, "price_cents" | "compare_at_cents">): number | null {
  const { price_cents: price, compare_at_cents: was } = product;
  if (price == null || was == null || was <= price) return null;
  return Math.round(((was - price) / was) * 100);
}
