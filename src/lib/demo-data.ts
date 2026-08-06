import type { Article, Brand } from "./types";

/**
 * Donnees de demonstration.
 * Elles servent tant que Supabase n'est pas branche, pour que
 * `npm run dev` affiche un site vivant des la premiere minute.
 * Une fois la base remplie, elles ne sont plus jamais utilisees.
 */

export const DEMO_BRANDS: Brand[] = [
  {
    id: "demo-aryes",
    slug: "engineered-by-aryes",
    name: "Engineered By Aryes",
    tagline: "Minimalisme français, séries limitées",
    description:
      "Label français au vocabulaire épuré : chemises, pantalons, mailles et bijoux en argent. Des séries courtes, des noms de pièces empruntés à une poésie japonaise, et une obsession pour la coupe plutôt que pour le logo.",
    country: "France",
    city: "Paris",
    founded_year: 2022,
    categories: ["Minimalisme", "Maille", "Bijoux"],
    price_tier: "premium",
    website_url: "https://shoparyes.fr",
    shop_url: "https://shoparyes.fr",
    instagram: "engineeredbyaryes",
    logo_url: null,
    cover_url: null,
    featured: true,
    status: "published",
    published_at: "2026-07-02",
  },
  {
    id: "demo-pollen",
    slug: "pollen-fabrics",
    name: "Pollen Fabrics",
    tagline: "Le denim comme matière première",
    description:
      "Un travail du denim brut et des coupes larges, pensé pour durer plus d'une saison. Production en petites quantités, pièces retravaillées à la main.",
    country: "France",
    city: null,
    founded_year: 2023,
    categories: ["Denim", "Streetwear"],
    price_tier: "intermediaire",
    website_url: null,
    shop_url: null,
    instagram: "pollenfabrics",
    logo_url: null,
    cover_url: null,
    featured: true,
    status: "published",
    published_at: "2026-06-18",
  },
];

export const DEMO_ARTICLES: Article[] = [
  {
    id: "demo-a1",
    slug: "pourquoi-les-series-limitees",
    title: "Pourquoi les séries limitées changent tout",
    excerpt:
      "Produire moins n'est pas qu'un argument écologique. C'est aussi ce qui permet à une marque naissante de survivre à sa première année.",
    cover_url: null,
    body: "",
    brand_slug: "engineered-by-aryes",
    reading_minutes: 4,
    status: "published",
    published_at: "2026-07-28",
  },
  {
    id: "demo-a2",
    slug: "dans-l-atelier-de-pollen-fabrics",
    title: "Dans l'atelier de Pollen Fabrics",
    excerpt:
      "Trois mois pour une coupe. On est allés voir comment se fabrique un pantalon quand personne ne presse le bouton.",
    cover_url: null,
    body: "",
    brand_slug: "pollen-fabrics",
    reading_minutes: 6,
    status: "published",
    published_at: "2026-07-11",
  },
];
