import { valeursDeLaMarque } from "@/components/admin/etat-fiche";
import type { Brand } from "@/lib/types";

/**
 * Le socle de l'aperçu d'une fiche qui n'existe pas encore.
 *
 * Les deux parcours (nouvelle marque, candidature) montrent la vraie
 * carte de l'annuaire pendant qu'on remplit, et `ApercuFiche` part
 * d'une marque en base pour y reposer la saisie. Ici, il n'y en a pas :
 * voici donc une fiche vierge, écrite une fois pour toutes.
 *
 * Hors des composants, et c'est voulu : `useValeursDuFormulaire` relance
 * son écoute quand ses valeurs de départ changent d'identité. Un objet
 * refait à chaque rendu la relancerait sans fin.
 *
 * L'adresse ne désigne aucune marque : la carte y demande ses pièces
 * pour son défilé, reçoit un « introuvable », et s'en passe.
 */
export const MARQUE_VIDE: Brand = {
  id: "",
  slug: "apercu-nouvelle-marque",
  name: "",
  tagline: "",
  description: "",
  country: "",
  city: null,
  founded_year: null,
  categories: [],
  audience: null,
  price_tier: "intermediaire",
  website_url: null,
  shop_url: null,
  instagram: null,
  logo_url: null,
  cover_url: null,
  cover_video_url: null,
  featured: false,
  status: "draft",
  published_at: null,
  acces: null,
};

export const VALEURS_VIDES = valeursDeLaMarque(MARQUE_VIDE);
