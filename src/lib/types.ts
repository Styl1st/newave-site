export type PriceTier = "accessible" | "intermediaire" | "premium";
export type Status = "draft" | "published";
export type Role = "membre" | "admin";

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
export type Product = {
  id: string;
  brand_id: string;
  name: string;
  price_cents: number | null;
  currency: string;
  image_url: string | null;
  shop_url: string;
  categories: string[];
  featured: boolean;
  status: Status;
  position: number;
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

export type Application = {
  id: string;
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

/** Affiche un prix en centimes sous forme lisible. */
export function formatPrice(cents: number | null, currency = "EUR"): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
