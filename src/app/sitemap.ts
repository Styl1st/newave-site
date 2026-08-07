import type { MetadataRoute } from "next";
import { getBrands, getPosts, getProducts } from "@/lib/queries";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://newavesphere.fr";

/**
 * Plan du site. robots.ts y renvoyait deja : sans ce fichier, les
 * moteurs suivaient une adresse morte.
 *
 * Inutile tant que SITE_PASSWORD est actif — robots.txt interdit alors
 * tout le site — mais il sera pret le jour de l'ouverture.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brands, posts, products] = await Promise.all([
    getBrands(),
    getPosts(),
    getProducts(),
  ]);

  const fixed: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/marques`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/posts`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/a-propos`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE}/candidature`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE}/mentions-legales`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE}/confidentialite`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const brandPages: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${SITE}/marques/${b.slug}`,
    lastModified: b.published_at ? new Date(b.published_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE}/posts/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const piecePages: MetadataRoute.Sitemap = products
    .filter((p) => p.slug && p.brand?.slug)
    .map((p) => ({
      url: `${SITE}/marques/${p.brand!.slug}/${p.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...fixed, ...brandPages, ...postPages, ...piecePages];
}
