import { createClient } from "./supabase/server";
import { DEMO_ANNONCES, DEMO_COMMENTAIRES } from "./forum-demo";
import {
  estUneRubrique,
  LOT_FORUM,
  photoSure,
  type Annonce,
  type CarteAuteur,
  type Commentaire,
  type Details,
  type FiltresForum,
  type MoiForum,
  type ProfilMembre,
  type ReponseMembre,
  type RubriqueCle,
} from "./forum";

/**
 * Les lectures du forum, côté serveur.
 *
 * TOUT PASSE PAR LES FONCTIONS DE LA MIGRATION 37 (`forum_fil`,
 * `forum_annonce`…), en `security invoker` : la base applique ses
 * règles à qui lit, exactement comme une requête directe. Ce fichier
 * ne décide d'aucun droit, il remet les lignes en forme.
 *
 * UNE LECTURE RATÉE RENVOIE `null`, PAS UNE LISTE VIDE. « Il n'y a
 * rien » et « la base n'a pas répondu » n'appellent pas la même
 * phrase à l'écran, et c'est en particulier ce qui se passe tant que la
 * migration 37 n'est pas lancée : le fil dit qu'il ne s'est pas chargé,
 * il ne prétend pas que personne n'a jamais rien publié.
 */

function signaler(ou: string, error: { message: string; code?: string } | null) {
  if (error) console.error(`[forum] ${ou} : ${error.message}${error.code ? ` (${error.code})` : ""}`);
}

type LigneAnnonce = {
  id: string;
  rubrique: string;
  titre: string;
  extrait?: string;
  texte?: string;
  ville: string | null;
  images: string[] | null;
  details: Details | null;
  cloturee: boolean;
  masque?: boolean;
  votes: number;
  commentaires: number;
  created_at: string;
  auteur_id: string;
  auteur_handle: string | null;
  auteur_nom: string | null;
  auteur_avatar: string | null;
  marque_id: string | null;
  marque_nom: string | null;
  marque_slug: string | null;
  a_vote: boolean;
  total?: number | string;
};

function versAnnonce(l: LigneAnnonce): Annonce {
  return {
    id: l.id,
    rubrique: (estUneRubrique(l.rubrique) ? l.rubrique : "discussion") as RubriqueCle,
    titre: l.titre,
    texte: l.texte ?? l.extrait ?? "",
    ville: l.ville,
    // Seulement ce que sert notre stockage (voir `photoSure`).
    images: (l.images ?? []).map(photoSure).filter((u): u is string => Boolean(u)),
    details: l.details ?? {},
    cloturee: Boolean(l.cloturee),
    masque: Boolean(l.masque),
    votes: Number(l.votes) || 0,
    commentaires: Number(l.commentaires) || 0,
    created_at: l.created_at,
    auteur: {
      id: l.auteur_id,
      handle: l.auteur_handle,
      nom: l.auteur_nom,
      avatar: photoSure(l.auteur_avatar),
    },
    // Une marque dépubliée n'est plus lisible : l'annonce reste, au nom
    // de la personne.
    marque:
      l.marque_id && l.marque_nom && l.marque_slug
        ? { id: l.marque_id, nom: l.marque_nom, slug: l.marque_slug }
        : null,
    aVote: Boolean(l.a_vote),
  };
}

/* ------------------------------------------------------------------
   Le fil
   ------------------------------------------------------------------ */

export type PageDuFil = { annonces: Annonce[]; total: number };

/** Le même filtrage que `forum_fil`, pour le mode démonstration. */
function filDeDemo(f: FiltresForum, depuis: number, combien: number): PageDuFil {
  const q = f.q.trim().toLowerCase();
  const heures = (a: Annonce) => (Date.now() - new Date(a.created_at).getTime()) / 3600000;
  const toutes = DEMO_ANNONCES.filter(
    (a) =>
      (!f.ville || a.ville === f.ville) &&
      (!f.rubrique || a.rubrique === f.rubrique) &&
      (!q || `${a.titre} ${a.texte} ${a.ville ?? ""}`.toLowerCase().includes(q)) &&
      (f.tri !== "tendance" || !a.cloturee)
  ).sort((a, b) => {
    if (f.tri === "recentes") return b.created_at.localeCompare(a.created_at);
    if (f.tri === "tendance") {
      const sa = a.votes / Math.pow(heures(a) + 2, 0.8);
      const sb = b.votes / Math.pow(heures(b) + 2, 0.8);
      if (sb !== sa) return sb - sa;
    }
    return b.votes - a.votes || b.created_at.localeCompare(a.created_at);
  });
  return { annonces: toutes.slice(depuis, depuis + combien), total: toutes.length };
}

export async function lireLeFil(
  f: FiltresForum,
  depuis = 0,
  combien = LOT_FORUM
): Promise<PageDuFil | null> {
  const supabase = await createClient();
  if (!supabase) return filDeDemo(f, depuis, combien);

  const { data, error } = await supabase.rpc("forum_fil", {
    p_tri: f.tri,
    p_ville: f.ville,
    p_rubrique: f.rubrique,
    p_q: f.q.trim() || null,
    p_limite: combien,
    p_decalage: depuis,
  });
  signaler("fil", error);
  if (error || !data) return null;

  const lignes = data as LigneAnnonce[];
  return {
    annonces: lignes.map(versAnnonce),
    // Le total est répété sur chaque ligne ; une page vide au-delà de
    // la fin n'en porte pas, et c'est alors qu'on est au bout.
    total: lignes.length > 0 ? Number(lignes[0].total) || 0 : depuis,
  };
}

/* ------------------------------------------------------------------
   Une annonce, ses commentaires, son auteur
   ------------------------------------------------------------------ */

export async function lireAnnonce(id: string): Promise<Annonce | null> {
  const supabase = await createClient();
  if (!supabase) return DEMO_ANNONCES.find((a) => a.id === id) ?? null;

  const { data, error } = await supabase.rpc("forum_annonce", { p_id: id });
  signaler("annonce", error);
  const ligne = (data as LigneAnnonce[] | null)?.[0];
  return ligne ? versAnnonce(ligne) : null;
}

type LigneCommentaire = {
  id: string;
  parent_id: string | null;
  texte: string;
  votes: number;
  masque: boolean;
  created_at: string;
  auteur_id: string;
  auteur_handle: string | null;
  auteur_nom: string | null;
  auteur_avatar: string | null;
  a_vote: boolean;
};

/**
 * Les commentaires, rangés : ceux de tête par votes, leurs réponses
 * dessous dans l'ordre où elles ont été écrites (une réponse se lit
 * après ce à quoi elle répond, jamais avant).
 */
export async function lireCommentaires(annonceId: string): Promise<Commentaire[]> {
  const supabase = await createClient();
  if (!supabase) {
    return annonceId === DEMO_ANNONCES[1].id ? DEMO_COMMENTAIRES : [];
  }

  const { data, error } = await supabase.rpc("forum_commentaires_de", { p_annonce: annonceId });
  signaler("commentaires", error);
  const lignes = (data as LigneCommentaire[] | null) ?? [];

  const tous = lignes.map(
    (l): Commentaire => ({
      id: l.id,
      parentId: l.parent_id,
      texte: l.texte,
      votes: Number(l.votes) || 0,
      masque: Boolean(l.masque),
      created_at: l.created_at,
      auteur: { id: l.auteur_id, handle: l.auteur_handle, nom: l.auteur_nom, avatar: photoSure(l.auteur_avatar) },
      aVote: Boolean(l.a_vote),
      reponses: [],
    })
  );

  const tete = tous.filter((c) => !c.parentId);
  const parId = new Map(tete.map((c) => [c.id, c]));
  for (const c of tous) {
    if (c.parentId) parId.get(c.parentId)?.reponses.push(c);
  }
  for (const c of tete) c.reponses.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return tete.sort((a, b) => b.votes - a.votes || a.created_at.localeCompare(b.created_at));
}

export async function lireCarteAuteur(
  auteurId: string,
  marqueId: string | null
): Promise<CarteAuteur | null> {
  const supabase = await createClient();
  if (!supabase) return { votesRecus: 1942, annonces: 7, reponsesUtiles: 46 };

  const { data, error } = await supabase.rpc("forum_carte_auteur", {
    p_auteur: auteurId,
    p_marque: marqueId,
  });
  signaler("carte d'auteur", error);
  const l = (data as { votes_recus: number; annonces: number; reponses_utiles: number }[] | null)?.[0];
  if (!l) return null;
  return {
    votesRecus: Number(l.votes_recus) || 0,
    annonces: Number(l.annonces) || 0,
    reponsesUtiles: Number(l.reponses_utiles) || 0,
  };
}

/** Deux ou trois annonces de la même rubrique, pour la colonne de droite. */
export async function lireVoisines(a: Annonce, combien = 3): Promise<Annonce[]> {
  const page = await lireLeFil(
    { tri: "populaires", ville: null, rubrique: a.rubrique, q: "" },
    0,
    combien + 1
  );
  return (page?.annonces ?? []).filter((x) => x.id !== a.id).slice(0, combien);
}

/* ------------------------------------------------------------------
   La personne connectée
   ------------------------------------------------------------------ */

/**
 * Ce que le forum sait de qui lit : son pseudo surtout.
 *
 * LUE À PART DE `getProfile`, ET C'EST UNE PRÉCAUTION. `getProfile`
 * sert à tout le site ; lui ajouter la colonne `handle` le ferait
 * échouer tant que la migration 37 n'est pas passée, et tout le monde
 * paraîtrait déconnecté. Ici, une colonne absente donne seulement
 * `pret: false`, et le forum se tait.
 */
export async function moiForum(): Promise<MoiForum | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, handle, ville, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    signaler("profil du forum", error);
    return { id: user.id, handle: null, nom: null, ville: null, bio: null, avatar: null, pret: false };
  }

  const p = data as {
    id: string;
    display_name: string | null;
    handle: string | null;
    ville: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  return {
    id: p.id,
    handle: p.handle,
    nom: p.display_name,
    ville: p.ville,
    bio: p.bio,
    avatar: photoSure(p.avatar_url),
    pret: true,
  };
}

/* ------------------------------------------------------------------
   Le profil public (lot C, migration 39)
   ------------------------------------------------------------------ */

/**
 * Au plus soixante annonces et soixante réponses par profil. Pendant la
 * bêta, personne n'en approche ; le jour où quelqu'un y arrive, on
 * ajoutera « Voir plus », comme dans le fil.
 */
export const PROFIL_MAX = 60;

/** Le profil de démonstration : l'auteur retrouvé dans les annonces de démo. */
function profilDeDemo(handle: string): ProfilMembre | null {
  const commentaires = DEMO_COMMENTAIRES.flatMap((c) => [c, ...c.reponses]);
  const auteur =
    DEMO_ANNONCES.find((a) => a.auteur.handle === handle)?.auteur ??
    commentaires.find((c) => c.auteur.handle === handle)?.auteur;
  if (!auteur || !auteur.handle) return null;

  const annonces = DEMO_ANNONCES.filter((a) => a.auteur.id === auteur.id && !a.marque);
  const reponses = commentaires.filter((c) => c.auteur.id === auteur.id);
  const PHRASES: Record<string, { bio: string; ville: string }> = {
    "lea.grain": { bio: "Photographe argentique, portraits et lookbooks", ville: "Lyon" },
    "sacha.mdl": { bio: "Mannequin freelance, maille et mouvement", ville: "Paris" },
  };
  return {
    id: auteur.id,
    handle: auteur.handle,
    nom: auteur.nom ?? auteur.handle,
    ville: PHRASES[handle]?.ville ?? annonces[0]?.ville ?? null,
    bio: PHRASES[handle]?.bio ?? null,
    avatar: null,
    created_at: "2026-03-12T10:00:00.000Z",
    votesRecus: annonces.reduce((n, a) => n + a.votes, 0) + reponses.reduce((n, c) => n + c.votes, 0),
    annonces: annonces.length,
    reponses: reponses.length,
    reponsesUtiles: reponses.filter((c) => c.votes > 0).length,
  };
}

/**
 * Le profil d'un pseudo : `null` s'il n'existe pas, `"erreur"` si la
 * base n'a pas répondu (migration 39 absente, surtout). Les deux
 * n'appellent pas la même page : une 404 dans le premier cas, une
 * phrase d'excuse dans le second.
 */
export async function lireProfil(handle: string): Promise<ProfilMembre | null | "erreur"> {
  const supabase = await createClient();
  if (!supabase) return profilDeDemo(handle);

  const { data, error } = await supabase.rpc("forum_profil", { p_handle: handle });
  signaler("profil", error);
  if (error) return "erreur";

  const l = (data as
    | {
        id: string;
        handle: string;
        nom: string | null;
        ville: string | null;
        bio: string | null;
        avatar_url: string | null;
        created_at: string;
        votes_recus: number | string;
        annonces: number | string;
        reponses: number | string;
        reponses_utiles: number | string;
      }[]
    | null)?.[0];
  if (!l) return null;

  return {
    id: l.id,
    handle: l.handle,
    nom: l.nom || l.handle,
    ville: l.ville,
    bio: l.bio,
    avatar: photoSure(l.avatar_url),
    created_at: l.created_at,
    votesRecus: Number(l.votes_recus) || 0,
    annonces: Number(l.annonces) || 0,
    reponses: Number(l.reponses) || 0,
    reponsesUtiles: Number(l.reponses_utiles) || 0,
  };
}

/**
 * Ses annonces à son nom, de la plus récente à la plus ancienne. Celles
 * publiées au nom d'une marque restent à la marque ; celles en cours de
 * relecture n'apparaissent pas, même à leur auteur (c'est la vitrine
 * publique : Mon compte les montre).
 */
export async function lireAnnoncesDe(p: ProfilMembre): Promise<Annonce[]> {
  const supabase = await createClient();
  if (!supabase) return DEMO_ANNONCES.filter((a) => a.auteur.id === p.id && !a.marque);

  const { data, error } = await supabase
    .from("forum_annonces")
    .select("id, rubrique, titre, ville, images, details, cloturee, votes, commentaires, created_at, auteur_id")
    .eq("auteur_id", p.id)
    .is("marque_id", null)
    .eq("masque", false)
    .order("created_at", { ascending: false })
    .limit(PROFIL_MAX);
  signaler("annonces du profil", error);

  return ((data as Omit<LigneAnnonce, "auteur_handle" | "auteur_nom" | "auteur_avatar" | "marque_id" | "marque_nom" | "marque_slug" | "a_vote">[] | null) ?? []).map(
    (l) =>
      versAnnonce({
        ...l,
        auteur_handle: p.handle,
        auteur_nom: p.nom,
        auteur_avatar: p.avatar,
        marque_id: null,
        marque_nom: null,
        marque_slug: null,
        a_vote: false,
      })
  );
}

/** Ses commentaires, du plus récent au plus ancien, avec l'annonce où ils ont été écrits. */
export async function lireReponsesDe(p: ProfilMembre): Promise<ReponseMembre[]> {
  const supabase = await createClient();
  if (!supabase) {
    return DEMO_COMMENTAIRES.flatMap((c) => [c, ...c.reponses])
      .filter((c) => c.auteur.id === p.id)
      .map((c) => ({
        id: c.id,
        texte: c.texte,
        votes: c.votes,
        created_at: c.created_at,
        estReponse: Boolean(c.parentId),
        annonce: { id: DEMO_ANNONCES[1].id, titre: DEMO_ANNONCES[1].titre, rubrique: DEMO_ANNONCES[1].rubrique },
      }));
  }

  const { data, error } = await supabase.rpc("forum_reponses_de", {
    p_auteur: p.id,
    p_limite: PROFIL_MAX,
    p_decalage: 0,
  });
  signaler("réponses du profil", error);

  return (
    (data as
      | {
          id: string;
          texte: string;
          votes: number;
          created_at: string;
          est_reponse: boolean;
          annonce_id: string;
          annonce_titre: string;
          annonce_rubrique: string;
        }[]
      | null) ?? []
  ).map((l) => ({
    id: l.id,
    texte: l.texte,
    votes: Number(l.votes) || 0,
    created_at: l.created_at,
    estReponse: Boolean(l.est_reponse),
    annonce: {
      id: l.annonce_id,
      titre: l.annonce_titre,
      rubrique: (estUneRubrique(l.annonce_rubrique) ? l.annonce_rubrique : "discussion") as RubriqueCle,
    },
  }));
}
