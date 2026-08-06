export type PriceTier = "accessible" | "intermediaire" | "premium";

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
  status: "draft" | "published";
  published_at: string | null;
};

export type Product = {
  id: string;
  brand_id: string;
  name: string;
  price_cents: number | null;
  currency: string;
  image_url: string | null;
  /** Lien vers le shop de la marque. C'est ici que se greffe l'affiliation. */
  affiliate_url: string;
  featured: boolean;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  body: string;
  brand_slug: string | null;
  reading_minutes: number;
  status: "draft" | "published";
  published_at: string | null;
};

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  accessible: "Accessible",
  intermediaire: "Intermédiaire",
  premium: "Premium",
};
