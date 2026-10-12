import type { Brand } from "./types";

/**
 * UNE MARQUE TELLE QUE L'ANNUAIRE LA MONTRE, ET RIEN DE PLUS.
 *
 * L'annuaire reçoit les fiches lues par `getBrands()`, c'est-à-dire un
 * `select("*")` : toutes les colonnes de la table, y compris celles que
 * le type `Brand` ne connaît pas et qu'aucun composant ne lit — dates de
 * création et de synchronisation, réglage automatique du catalogue, note
 * laissée par la dernière synchronisation (« Rien n'a pu être lu à cette
 * adresse… »), réseaux de la candidature. Et la description, qui ne
 * s'affiche que sur la fiche de la marque.
 *
 * Tout cela partait dans le HTML de /marques pour cent soixante marques :
 * une cinquantaine de kilo-octets à télécharger et à lire avant que la
 * page ne réagisse, et des notes internes lisibles par n'importe qui dans
 * le code source de la page.
 *
 * LA LISTE EST ÉCRITE CHAMP PAR CHAMP, ET C'EST VOULU. Un `...reste`
 * laisserait repasser la prochaine colonne ajoutée en base. Ici, une
 * colonne nouvelle n'arrive dans le navigateur que si on l'écrit, et le
 * type dit à la compilation si un composant de l'annuaire en a besoin.
 */
export type FicheDAnnuaire = Omit<Brand, "description">;

export function pourLAnnuaire(b: Brand): FicheDAnnuaire {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    tagline: b.tagline,
    country: b.country,
    city: b.city,
    founded_year: b.founded_year,
    categories: b.categories,
    audience: b.audience,
    price_tier: b.price_tier,
    website_url: b.website_url,
    shop_url: b.shop_url,
    instagram: b.instagram,
    logo_url: b.logo_url,
    cover_url: b.cover_url,
    cover_video_url: b.cover_video_url,
    featured: b.featured,
    status: b.status,
    published_at: b.published_at,
    catalogue_verrouille: b.catalogue_verrouille,
    acces: b.acces,
  };
}
