import { exigeUnCatalogue } from "./boutiques";

/**
 * Une boutique n'est pas toujours ouverte, et ce n'est pas une panne.
 *
 * Beaucoup de marques indépendantes ne vendent pas en continu : un mot
 * de passe le temps d'un drop, une liste d'attente, des ventes
 * réservées à ceux qui suivent le compte. Notre lecture automatique
 * n'y voyait qu'un catalogue vide, et la fiche restait en brouillon
 * pour une raison qui n'en était pas une.
 *
 * Ces marques ont pourtant toute leur place dans l'annuaire — parfois
 * plus que les autres, puisque justement on ne les trouve nulle part.
 * Il suffisait de le DIRE au visiteur, au lieu de le laisser devant un
 * catalogue vide sans explication.
 *
 * Fichier pur : il sert aux cartes comme aux règles de publication.
 */

export const ACCES = ["ouvert", "bientot", "prive", "liste"] as const;
export type Acces = (typeof ACCES)[number];

/** Le libellé de la case à cocher, côté administration. */
export const ACCES_LABEL: Record<Acces, string> = {
  ouvert: "Boutique ouverte",
  bientot: "Pas encore ouverte",
  prive: "Ventes privées",
  liste: "Liste d'attente",
};

/** Une phrase d'explication sous la case, pour ne pas avoir à deviner. */
export const ACCES_AIDE: Record<Acces, string> = {
  ouvert: "On peut acheter maintenant. C'est le cas normal.",
  bientot: "Le site existe mais rien n'est encore en vente : mot de passe, page d'attente, drop en préparation.",
  prive: "Les ventes passent par le compte de la marque : invitations, messages privés, ventes fermées.",
  liste: "Il faut s'inscrire pour être prévenu, et attendre son tour.",
};

/** Ce qu'on écrit à la place du catalogue, sur la fiche publique. */
export const ACCES_MESSAGE: Record<Exclude<Acces, "ouvert">, { titre: string; corps: string }> = {
  bientot: {
    titre: "La boutique n'est pas encore ouverte",
    corps:
      "Cette marque existe, mais rien n'est en vente pour le moment. Ses pièces apparaîtront ici " +
      "d'elles-mêmes à l'ouverture : mets-la en favori pour ne pas avoir à y penser.",
  },
  prive: {
    titre: "Les ventes se font en privé",
    corps:
      "Cette marque ne vend pas en libre-service. Les pièces partent lors de ventes fermées, " +
      "annoncées à ceux qui la suivent. Passe par son compte pour savoir quand.",
  },
  liste: {
    titre: "L'accès se fait sur liste d'attente",
    corps:
      "Cette marque produit en petite quantité et sert dans l'ordre des inscriptions. " +
      "Inscris-toi chez elle pour être prévenu du prochain tour.",
  },
};

/** Ce qu'on affiche sur une carte, en deux mots. */
export const ACCES_ETIQUETTE: Record<Exclude<Acces, "ouvert">, string> = {
  bientot: "Bientôt",
  prive: "Ventes privées",
  liste: "Liste d'attente",
};

/** Une valeur venue de la base, ramenée à quelque chose de connu. */
export function unAcces(valeur: string | null | undefined): Acces {
  return ACCES.includes(valeur as Acces) ? (valeur as Acces) : "ouvert";
}

export function estOuverte(valeur: string | null | undefined): boolean {
  return unAcces(valeur) === "ouvert";
}

/**
 * Cette fiche doit-elle avoir au moins une pièce pour être publiée ?
 *
 * Non pour un profil Vinted ou Depop, qui n'aura jamais de catalogue
 * chez nous. Non pour une boutique fermée, dont le catalogue vide est
 * l'état annoncé et non un raté. Oui pour tout le reste : une vraie
 * boutique en ligne sans une seule pièce signale presque toujours que
 * notre lecture s'est plantée, et il vaut mieux le corriger que
 * publier une fiche creuse.
 */
export function doitAvoirDesPieces(marque: {
  shop_url?: string | null;
  website_url?: string | null;
  acces?: string | null;
}): boolean {
  if (!estOuverte(marque.acces)) return false;
  return exigeUnCatalogue(marque.shop_url ?? marque.website_url);
}
