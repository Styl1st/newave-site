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
  featured: boolean;
  status: Status;
  published_at: string | null;
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
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Pourcentage de remise, ou null s'il n'y a pas de promo credible. */
export function discountPercent(product: Pick<Product, "price_cents" | "compare_at_cents">): number | null {
  const { price_cents: price, compare_at_cents: was } = product;
  if (price == null || was == null || was <= price) return null;
  return Math.round(((was - price) / was) * 100);
}
