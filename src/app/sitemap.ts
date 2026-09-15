import type { MetadataRoute } from "next";
import { getBrands, getPosts, getProducts } from "@/lib/queries";

/*
 * L'ADRESSE DU SITE, SANS SLASH FINAL, ET ON NE FAIT PAS CONFIANCE À LA
 * VARIABLE POUR ÇA.
 *
 * Toutes les adresses de ce fichier sont construites en collant un
 * chemin derrière. Si quelqu'un renseigne `https://newavesphere.fr/`
 * dans Vercel — ce qui est exactement ce qu'on colle quand on copie
 * l'adresse depuis la barre du navigateur — le plan du site annonce
 * alors `https://newavesphere.fr//marques`. Un moteur traite cette
 * adresse comme une autre page, qui répond 404 : on lui livre un plan
 * dont chaque ligne est morte.
 *
 * Une expression régulière de six caractères vaut mieux qu'une consigne
 * dans un fichier d'exemple que personne ne relit au moment de coller.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://newavesphere.fr").replace(/\/+$/, "");

/**
 * Plan du site. robots.ts y renvoyait deja : sans ce fichier, les
 * moteurs suivaient une adresse morte.
 *
 * Inutile tant que SITE_PASSWORD est actif — robots.txt interdit alors
 * tout le site. Depuis l'ouverture de la beta publique, c'est lui que
 * les moteurs suivent : toute page publique ajoutee au site doit donc
 * etre ajoutee ici, sans quoi elle n'existe que pour qui connait deja
 * son adresse.
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
    /* Les trois qui manquaient. Ce sont des pages publiques, listées
       dans la navigation, et elles n'étaient annoncées nulle part : un
       moteur ne pouvait les trouver qu'en suivant un lien, alors que
       `/pieces` et `/populaires` sont deux des quatre entrées
       principales du site. */
    { url: `${SITE}/pieces`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/populaires`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/posts`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/a-propos`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE}/candidature`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE}/conditions`, changeFrequency: "yearly", priority: 0.1 },
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
