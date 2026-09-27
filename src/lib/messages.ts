/**
 * La messagerie privée : types, limites et petites fonctions
 * d'affichage partagées par le serveur et le navigateur.
 *
 * Pas de « use server » ici (même raison que `forum.ts`). Les actions
 * vivent dans `app/messages/actions.ts`, les lectures serveur dans
 * `lib/messages-queries.ts`.
 */

import { estUneRubrique, libelleDates, type RubriqueCle } from "./forum";

/** Recopiées de la migration 38 : la base les impose de toute façon. */
export const MESSAGE_MAX = 2000;
export const PIECE_JOINTE_MAX = 10 * 1024 * 1024;
export const PIECES_ACCEPTEES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export type ConversationResumee = {
  id: string;
  annonce: {
    id: string;
    titre: string;
    rubrique: RubriqueCle;
    ville: string | null;
    cloturee: boolean;
    image: string | null;
    auteurId: string;
    marqueNom: string | null;
  } | null;
  autre: { id: string; handle: string | null; nom: string | null; avatar: string | null };
  /** Vrai si l'autre personne est l'auteur de l'annonce, au nom d'une marque. */
  autreEstLaMarque: boolean;
  monAnnonce: boolean;
  dernier: { texte: string; auteurId: string; pieceNom: string | null; at: string };
  nonLu: boolean;
  /** Un blocage existe, dans un sens ou dans l'autre : plus personne n'écrit. */
  bloquee: boolean;
  /** C'est moi qui ai bloqué (je peux donc débloquer). */
  jeBloque: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  auteurId: string;
  texte: string;
  pieceJointe: string | null;
  pieceJointeNom: string | null;
  pieceJointeTaille: number | null;
  createdAt: string;
};

/** Une ligne de `messages` telle que la base la renvoie. */
export type LigneMessage = {
  id: string;
  conversation_id: string;
  auteur_id: string;
  texte: string;
  piece_jointe: string | null;
  piece_jointe_nom: string | null;
  piece_jointe_taille: number | null;
  created_at: string;
};

export const COLONNES_MESSAGE =
  "id, conversation_id, auteur_id, texte, piece_jointe, piece_jointe_nom, piece_jointe_taille, created_at";

export function versMessage(l: LigneMessage): Message {
  return {
    id: l.id,
    conversationId: l.conversation_id,
    auteurId: l.auteur_id,
    texte: l.texte,
    pieceJointe: l.piece_jointe,
    pieceJointeNom: l.piece_jointe_nom,
    pieceJointeTaille: l.piece_jointe_taille,
    createdAt: l.created_at,
  };
}

/* La ligne de `mes_conversations` (migration 38), et sa mise en forme.
   Ici et non dans les lectures serveur : la boîte se relit aussi depuis
   le navigateur, quand un message arrive d'une conversation inconnue. */
export type LigneConversation = {
  id: string;
  annonce_id: string | null;
  annonce_titre: string | null;
  annonce_rubrique: string | null;
  annonce_ville: string | null;
  annonce_cloturee: boolean;
  annonce_image: string | null;
  annonce_auteur_id: string | null;
  annonce_marque_nom: string | null;
  autre_id: string;
  autre_handle: string | null;
  autre_nom: string | null;
  autre_avatar: string | null;
  mon_annonce: boolean;
  dernier_texte: string | null;
  dernier_auteur_id: string;
  dernier_piece_nom: string | null;
  dernier_at: string;
  non_lu: boolean;
  bloquee: boolean;
  je_bloque: boolean;
};

export function versConversation(l: LigneConversation): ConversationResumee {
  const annonce =
    l.annonce_id && l.annonce_titre
      ? {
          id: l.annonce_id,
          titre: l.annonce_titre,
          rubrique: (estUneRubrique(l.annonce_rubrique) ? l.annonce_rubrique : "discussion") as RubriqueCle,
          ville: l.annonce_ville,
          cloturee: Boolean(l.annonce_cloturee),
          image: l.annonce_image,
          auteurId: l.annonce_auteur_id ?? "",
          marqueNom: l.annonce_marque_nom,
        }
      : null;
  return {
    id: l.id,
    annonce,
    autre: { id: l.autre_id, handle: l.autre_handle, nom: l.autre_nom, avatar: l.autre_avatar },
    autreEstLaMarque: Boolean(annonce?.marqueNom) && annonce?.auteurId === l.autre_id,
    monAnnonce: Boolean(l.mon_annonce),
    dernier: {
      texte: l.dernier_texte ?? "",
      auteurId: l.dernier_auteur_id,
      pieceNom: l.dernier_piece_nom,
      at: l.dernier_at,
    },
    nonLu: Boolean(l.non_lu),
    bloquee: Boolean(l.bloquee),
    jeBloque: Boolean(l.je_bloque),
  };
}

/** Le nom qu'on montre pour l'autre personne : sa marque, sinon son pseudo. */
export function nomDeLAutre(c: ConversationResumee): string {
  if (c.autreEstLaMarque && c.annonce?.marqueNom) return c.annonce.marqueNom;
  return c.autre.handle ? `@${c.autre.handle}` : c.autre.nom ?? "Membre";
}

/**
 * Trois phrases qui s'ajoutent au clic dans le premier message.
 *
 * Elles ne remplacent pas le message, elles l'amorcent : la page
 * blanche est ce qui fait qu'on ne répond pas. La date de l'annonce,
 * quand elle en a une, entre dans la première.
 */
export function phrasesRapides(rubrique: RubriqueCle, date?: string | null): string[] {
  const quand = date ? `le ${libelleDates(date)}` : "aux dates prévues";
  switch (rubrique) {
    case "casting":
      return [`Je suis disponible ${quand}.`, "Mon book est joint.", "Ce serait ma première fois."];
    case "photo":
      return [`Je suis disponible ${quand}.`, "Mon portfolio est joint.", "Je peux envoyer des références."];
    case "collab":
      return ["On aimerait beaucoup en parler.", "Notre univers est en pièce jointe.", "On peut s'appeler cette semaine ?"];
    case "evenement":
      return ["J'aimerais exposer.", "Il reste de la place ?", "Ma marque est présentée en pièce jointe."];
    default:
      return ["Merci pour l'annonce.", "J'ai une question.", "On peut en parler de vive voix ?"];
  }
}

/** « Aujourd'hui », « Hier », sinon la date. Pour séparer les messages par jour. */
export function libelleJour(iso: string, maintenant = new Date()): string {
  const d = new Date(iso);
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86400000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    weekday: ecart < 7 ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== maintenant.getFullYear() ? "numeric" : undefined,
  });
}

export function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** L'heure dans la boîte : « 18:42 » aujourd'hui, « lun. » cette semaine, « 12 sept. » avant. */
export function momentCourt(iso: string, maintenant = new Date()): string {
  const d = new Date(iso);
  const ecart = (maintenant.getTime() - d.getTime()) / 86400000;
  if (d.toDateString() === maintenant.toDateString()) return heure(iso);
  if (ecart < 6) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function poidsLisible(octets: number | null): string {
  if (!octets) return "";
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

/** Une couleur d'avatar stable pour une personne, tirée de la palette du site. */
const TEINTES = ["#b49bf0", "#e58ad8", "#6fd0b0", "#f0a860", "#8fa8f0"];
export function teinteDe(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

/** Un nom de fichier propre pour le stockage : pas d'espaces ni d'accents. */
export function nomDeFichier(nom: string): string {
  const [base, ...reste] = nom.split(".");
  const ext = reste.length ? reste.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const propre = [base, ...reste]
    .join(".")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${propre || "fichier"}${ext ? `.${ext}` : ""}`;
}

/** Le nom d'un évènement de fenêtre : la pastille du header se relit quand il passe. */
export const EVENEMENT_LUS = "newave:messages-lus";
