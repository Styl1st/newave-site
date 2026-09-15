import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Tant que le site est verrouille, on interdit tout le monde.
  if (process.env.SITE_PASSWORD) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/espace-marque", "/compte", "/favoris", "/api", "/acces", "/reinitialisation"] },
    // Meme precaution de slash final que dans sitemap.ts : une adresse
    // collee depuis la barre du navigateur en porte un, et le lien
    // deviendrait `https://newavesphere.fr//sitemap.xml`.
    sitemap: `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://newavesphere.fr").replace(/\/+$/, "")}/sitemap.xml`,
  };
}
