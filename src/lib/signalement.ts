/**
 * Ce qu'on peut signaler, et pour quelles raisons.
 *
 * Ce fichier ne porte PAS de directive « use server », et c'est
 * volontaire : un module serveur ne peut exporter que des fonctions
 * asynchrones. Ces listes sont lues par le formulaire côté navigateur
 * autant que par l'action côté serveur, elles doivent donc vivre à
 * part.
 *
 * Les motifs sont propres à chaque cible, et ce n'est pas du zèle : on
 * ne reproche pas la même chose à un commentaire, à une pièce et à une
 * fiche de marque. Une liste unique aurait obligé à choisir « autre »
 * neuf fois sur dix, et un signalement sans motif utile ne vaut guère
 * mieux que pas de signalement.
 */

export type CibleSignalement = "avis" | "piece" | "marque" | "annonce" | "commentaire" | "conversation";

/** Toutes les cibles, dans l'ordre des filtres de la pile d'administration. */
export const CIBLES: CibleSignalement[] = ["avis", "piece", "marque", "annonce", "commentaire", "conversation"];

type Motif = { cle: string; label: string };

export const MOTIFS: Record<CibleSignalement, Motif[]> = {
  avis: [
    { cle: "insulte", label: "Insultant ou haineux" },
    { cle: "hors-sujet", label: "Sans rapport avec la marque" },
    { cle: "faux", label: "Manifestement faux" },
    { cle: "spam", label: "Publicité ou spam" },
    { cle: "autre", label: "Autre" },
  ],
  piece: [
    { cle: "prix", label: "Prix erroné" },
    { cle: "indisponible", label: "N'existe plus sur la boutique" },
    { cle: "image", label: "Photo trompeuse ou volée" },
    { cle: "contrefacon", label: "Contrefaçon" },
    { cle: "choquant", label: "Contenu choquant" },
    { cle: "autre", label: "Autre" },
  ],
  marque: [
    { cle: "fermee", label: "La marque n'existe plus" },
    { cle: "infos", label: "Informations fausses" },
    { cle: "usurpation", label: "Ce n'est pas la vraie marque" },
    { cle: "contrefacon", label: "Vend de la contrefaçon" },
    { cle: "arnaque", label: "Soupçon d'arnaque" },
    { cle: "choquant", label: "Contenu choquant" },
    { cle: "autre", label: "Autre" },
  ],
  // Le forum (migration 37). « Faux casting » a sa ligne : c'est l'abus
  // le plus grave qu'on puisse y croiser, et il ne doit pas se perdre
  // dans « autre ».
  annonce: [
    { cle: "faux-casting", label: "Faux casting" },
    { cle: "arnaque", label: "Soupçon d'arnaque" },
    { cle: "spam", label: "Publicité ou spam" },
    { cle: "insulte", label: "Insultant ou haineux" },
    { cle: "hors-sujet", label: "Hors sujet" },
    { cle: "autre", label: "Autre" },
  ],
  commentaire: [
    { cle: "insulte", label: "Insultant ou haineux" },
    { cle: "arnaque", label: "Soupçon d'arnaque" },
    { cle: "spam", label: "Publicité ou spam" },
    { cle: "hors-sujet", label: "Hors sujet" },
    { cle: "autre", label: "Autre" },
  ],
  // La messagerie (migration 38). Signaler une conversation est ce qui
  // ouvre sa lecture à l'administration : sans signalement, personne
  // d'autre que les deux participants ne la voit.
  conversation: [
    { cle: "harcelement", label: "Harcèlement ou insistance" },
    { cle: "arnaque", label: "Soupçon d'arnaque" },
    { cle: "bancaire", label: "Demande de coordonnées bancaires" },
    { cle: "faux-casting", label: "Faux casting" },
    { cle: "spam", label: "Publicité ou spam" },
    { cle: "autre", label: "Autre" },
  ],
};

export const NOM_CIBLE: Record<CibleSignalement, string> = {
  avis: "cet avis",
  piece: "cette pièce",
  marque: "cette marque",
  annonce: "cette annonce",
  commentaire: "ce commentaire",
  conversation: "cette conversation",
};

/** L'étiquette lisible d'un motif, ou le motif brut s'il est inconnu. */
export function libelleMotif(cible: CibleSignalement, cle: string): string {
  return MOTIFS[cible].find((m) => m.cle === cle)?.label ?? cle;
}

export function motifValide(cible: CibleSignalement, valeur: string): boolean {
  return MOTIFS[cible].some((m) => m.cle === valeur);
}

export function estUneCible(valeur: string): valeur is CibleSignalement {
  return (CIBLES as string[]).includes(valeur);
}

export type Signalement = {
  motif: string;
  detail: string | null;
  created_at: string;
};

export type ASignaler = {
  /** L'identifiant du signalement le plus récent sur cette cible. */
  id: string;
  cible: CibleSignalement;
  /** L'identifiant de l'objet visé : avis, pièce, marque, annonce ou commentaire. */
  cibleId: string;
  /** Ce qu'on lit pour juger : le commentaire, le nom de la pièce… */
  titre: string;
  extrait: string;
  /** Où aller voir en contexte. */
  href: string | null;
  signalements: Signalement[];
};
