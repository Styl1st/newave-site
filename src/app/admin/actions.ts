"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { fetchCatalogue } from "@/lib/catalogue";
import { synchroniserCatalogue } from "@/lib/catalogue-sync";
import { obstacleAPublication, peutEtrePubliee } from "@/lib/publication";

/**
 * Toutes les ecritures de l'administration passent par ici.
 * requireAdmin() protege l'interface ; les regles RLS de schema.sql
 * protegent la base. Les deux, pas l'une ou l'autre.
 */

type Result = { ok: boolean; error?: string; message?: string };

/**
 * Relit toutes les cases cochees portant le meme nom.
 * getAll() renvoie un tableau vide si rien n'est coche, ce qui est
 * exactement ce qu'on veut stocker.
 */
function toArray(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function toText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function toNullable(value: FormDataEntryValue | null): string | null {
  const s = toText(value);
  return s === "" ? null : s;
}

/** "Écrans Larges !" -> "ecrans-larges" */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ============================ POSTS ============================ */

export async function savePost(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toNullable(formData.get("id"));
  const title = toText(formData.get("title"));
  if (!title) return { ok: false, error: "Le titre est obligatoire." };

  const status = toText(formData.get("status")) === "published" ? "published" : "draft";

  const images = toArray(formData, "images");

  const payload = {
    slug: toText(formData.get("slug")) || slugify(title),
    title,
    caption: toText(formData.get("caption")),
    image_url: images[0] ?? toNullable(formData.get("image_url")),
    images,
    video_url: toNullable(formData.get("video_url")),
    video_poster: toNullable(formData.get("video_poster")),
    // On ne devine plus à partir du lien : un carrousel de photos a
    // lui aussi son adresse Instagram, et promettre une vidéo qui
    // n'existe pas est le plus sûr moyen de décevoir.
    est_video: formData.get("est_video") === "on",
    image_alt: toText(formData.get("image_alt")),
    keywords: toArray(formData, "keywords"),
    brand_id: toNullable(formData.get("brand_id")),
    instagram_url: toNullable(formData.get("instagram_url")),
    tiktok_url: toNullable(formData.get("tiktok_url")),
    status,
    // On date la publication au moment où elle bascule, pas à la création.
    published_at:
      status === "published" ? toNullable(formData.get("published_at")) ?? new Date().toISOString() : null,
  };

  const { error } = id
    ? await supabase.from("posts").update(payload).eq("id", id)
    : await supabase.from("posts").insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/posts");
  revalidatePath("/posts");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("posts").delete().eq("id", toText(formData.get("id")));
  revalidatePath("/admin/posts");
  revalidatePath("/posts");
  redirect("/admin/posts");
}

/* ============================ MARQUES ============================ */

export async function saveBrand(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toNullable(formData.get("id"));
  const name = toText(formData.get("name"));
  if (!name) return { ok: false, error: "Le nom est obligatoire." };

  const status = toText(formData.get("status")) === "published" ? "published" : "draft";
  const year = toText(formData.get("founded_year"));

  // La même règle qu'ailleurs : on ne met pas en ligne une fiche sans
  // visuel, quel que soit le chemin emprunté pour la publier.
  if (status === "published") {
    const obstacle = obstacleAPublication({
      tagline: toText(formData.get("tagline")),
      description: toText(formData.get("description")),
      cover_url: toNullable(formData.get("cover_url")),
      logo_url: toNullable(formData.get("logo_url")),
    });
    if (obstacle) return { ok: false, error: obstacle };
  }

  const payload = {
    slug: toText(formData.get("slug")) || slugify(name),
    name,
    tagline: toText(formData.get("tagline")),
    description: toText(formData.get("description")),
    country: toText(formData.get("country")) || "France",
    city: toNullable(formData.get("city")),
    founded_year: year ? Number(year) : null,
    categories: toArray(formData, "categories"),
    price_tier: toText(formData.get("price_tier")) || "intermediaire",
    website_url: toNullable(formData.get("website_url")),
    shop_url: toNullable(formData.get("shop_url")),
    instagram: toNullable(formData.get("instagram")),
    logo_url: toNullable(formData.get("logo_url")),
    cover_url: toNullable(formData.get("cover_url")),
    featured: formData.get("featured") === "on",
    status,
    published_at:
      status === "published" ? toNullable(formData.get("published_at")) ?? new Date().toISOString() : null,
  };

  const { data: ecrite, error } = id
    ? await supabase.from("brands").update(payload).eq("id", id).select("id").maybeSingle()
    : await supabase.from("brands").insert(payload).select("id").maybeSingle();

  if (error) return { ok: false, error: error.message };

  /*
   * LE CATALOGUE SE LIT DANS LA FOULÉE.
   *
   * On enregistrait la fiche, et il fallait ensuite penser à ouvrir
   * l'espace de la marque pour lancer l'import. Personne n'y pense, et
   * la marque restait en ligne avec zéro pièce — le pire état
   * possible : visible, et vide.
   *
   * On le fait donc ici, tout de suite, mais SEULEMENT si la fiche n'a
   * encore aucune pièce. Relire un catalogue déjà importé est le
   * travail de la tâche quotidienne, pas d'un enregistrement de fiche :
   * ça rendrait chaque petite correction de texte interminable.
   *
   * Un échec ne fait pas échouer l'enregistrement. La fiche est
   * sauvegardée, la lecture est un bonus — et beaucoup de boutiques
   * n'exposent tout simplement pas de catalogue lisible.
   */
  const brandId = (ecrite as { id: string } | null)?.id ?? id;
  const adresse = payload.shop_url ?? payload.website_url;

  if (brandId && adresse) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    if ((count ?? 0) === 0) {
      const lecture = await fetchCatalogue(adresse);
      const verrouillee = !lecture.ok && Boolean(lecture.verrouillee);
      if (verrouillee) {
        await supabase
          .from("brands")
          .update({ catalogue_verrouille: true })
          .eq("id", brandId);
      }

      if (lecture.ok && lecture.items.length > 0) {
        await synchroniserCatalogue(supabase, brandId, lecture.items, {
          statutDesNouvelles: "published",
          marquerLesAbsentes: false,
        });
      } else if (status === "published") {
        /*
         * Rien n'est venu, et la fiche partait en ligne : on la retient
         * en brouillon. Mieux vaut une marque qui attend un jour de
         * plus qu'une fiche publique sans une seule pièce.
         */
        await supabase.from("brands")
          .update({ status: "draft", published_at: null })
          .eq("id", brandId);

        return {
          ok: false,
          error: verrouillee
            ? "La fiche est enregistrée, mais la boutique est fermée en ce moment — mot de passe " +
              "ou drop en préparation. Elle reste en brouillon : ses pièces seront lues d'elles-mêmes " +
              "à la réouverture, sans rien avoir à refaire."
            : "La fiche est enregistrée, mais aucune pièce n'a pu être lue sur cette boutique : " +
              "elle reste en brouillon. Ouvre son espace pour importer le catalogue à la main, " +
              "ou publie-la une fois qu'elle aura au moins une pièce.",
        };
      }
    }
  }

  revalidatePath("/admin/marques");
  revalidatePath("/marques");
  revalidatePath("/");
  redirect("/admin/marques");
}

export async function deleteBrand(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("brands").delete().eq("id", toText(formData.get("id")));
  revalidatePath("/admin/marques");
  revalidatePath("/marques");
  redirect("/admin/marques");
}

/**
 * Publier, remettre en brouillon ou supprimer plusieurs marques.
 *
 * Le même geste que le bouton d'une ligne, appliqué à une sélection.
 * Ouvrir soixante-dix fiches pour répéter le même clic n'est pas du
 * travail, c'est de la manutention.
 *
 * Les règles ne changent pas pour autant. Une fiche sans accroche ni
 * description ne part pas en ligne, ici comme ailleurs : elle est
 * simplement laissée de côté, et le compte renvoyé le dit.
 */
export async function bulkBrandAction(
  formData: FormData
): Promise<Result & { traitees?: number; ecartees?: number }> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const intent = toText(formData.get("intent"));
  const ids = formData.getAll("ids").map((v) => String(v)).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "Aucune marque sélectionnée." };

  /* ---------- suppression ---------- */
  if (intent === "delete") {
    // Les pièces d'abord : selon la déclaration de la clé étrangère,
    // supprimer une marque qui en porte encore échouerait.
    const { error: pieces } = await supabase.from("products").delete().in("brand_id", ids);
    if (pieces) return { ok: false, error: pieces.message };

    const { error } = await supabase.from("brands").delete().in("id", ids);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/marques");
    revalidatePath("/marques");
    revalidatePath("/");
    return { ok: true, traitees: ids.length, ecartees: 0 };
  }

  if (intent !== "publish" && intent !== "draft") {
    return { ok: false, error: "Action inconnue." };
  }

  /* ---------- retrait de l'annuaire ---------- */
  if (intent === "draft") {
    const { error } = await supabase
      .from("brands")
      .update({ status: "draft", published_at: null })
      .in("id", ids);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/marques");
    revalidatePath("/marques");
    revalidatePath("/");
    return { ok: true, traitees: ids.length, ecartees: 0 };
  }

  /* ---------- publication ---------- */
  const { data, error: lecture } = await supabase
    .from("brands")
    .select("id, tagline, description, cover_url, logo_url, published_at")
    .in("id", ids);
  if (lecture) return { ok: false, error: lecture.message };

  const fiches =
    (data as
      | {
          id: string;
          tagline: string;
          description: string;
          cover_url: string | null;
          logo_url: string | null;
          published_at: string | null;
        }[]
      | null) ?? [];

  const publiables = fiches.filter(peutEtrePubliee);
  const ecartees = fiches.length - publiables.length;

  if (publiables.length === 0) {
    return {
      ok: false,
      // Toutes recalées pour la même raison, la plupart du temps : on
      // la donne plutôt qu'un message générique.
      error: obstacleAPublication(fiches[0] ?? {}) ?? "Aucune de ces fiches n'est publiable.",
    };
  }

  const maintenant = new Date().toISOString();

  // Deux lots plutôt qu'une boucle : celles qui ont déjà connu la
  // publication gardent leur date d'origine, qui ordonne l'annuaire.
  const jamaisPubliees = publiables.filter((f) => !f.published_at).map((f) => f.id);
  const dejaPubliees = publiables.filter((f) => f.published_at).map((f) => f.id);

  if (jamaisPubliees.length > 0) {
    const { error } = await supabase
      .from("brands")
      .update({ status: "published", published_at: maintenant })
      .in("id", jamaisPubliees);
    if (error) return { ok: false, error: error.message };
  }
  if (dejaPubliees.length > 0) {
    const { error } = await supabase
      .from("brands")
      .update({ status: "published" })
      .in("id", dejaPubliees);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/marques");
  revalidatePath("/marques");
  revalidatePath("/");
  return { ok: true, traitees: publiables.length, ecartees };
}

/* ========================= CANDIDATURES ========================= */

export async function setApplicationStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("applications")
    .update({ status: toText(formData.get("status")) })
    .eq("id", toText(formData.get("id")));
  revalidatePath("/admin/candidatures");
}

/* ========================= GERANTS DE MARQUE ========================= */

/**
 * Rattache un compte existant a une marque.
 *
 * La personne doit s'etre inscrite au prealable : on ne cree pas de
 * compte a sa place, sinon on choisirait son mot de passe. On la
 * retrouve par son adresse email.
 */
export async function addBrandManager(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const brandId = toText(formData.get("brand_id"));
  const email = toText(formData.get("email")).toLowerCase();
  if (!brandId || !email) return { ok: false, error: "Adresse manquante." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error:
        "Aucun compte avec cette adresse. Demande à la marque de créer son compte sur /connexion, puis reviens ici.",
    };
  }

  const { error } = await supabase
    .from("brand_managers")
    .upsert({ brand_id: brandId, user_id: (profile as { id: string }).id });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/marques/${brandId}`);
  return { ok: true };
}

export async function removeBrandManager(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;

  const brandId = toText(formData.get("brand_id"));
  await supabase
    .from("brand_managers")
    .delete()
    .eq("brand_id", brandId)
    .eq("user_id", toText(formData.get("id")));

  revalidatePath(`/admin/marques/${brandId}`);
}

/**
 * Accepte une candidature en un geste.
 *
 * Trois choses d'un coup, parce que les faire separement c'est trois
 * occasions d'en oublier une :
 *   1. creer la fiche marque, en brouillon, pre-remplie avec le dossier
 *   2. rattacher le compte du candidat comme gerant, s'il en a un
 *   3. passer la candidature en "acceptee"
 *
 * La marque reste en brouillon : accepter un dossier n'est pas la
 * publier. Tu gardes la main sur ce qui parait.
 */
export async function acceptApplication(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toText(formData.get("id"));

  const { data: appRow } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const application = appRow as {
    id: string;
    brand_name: string;
    email: string;
    instagram: string | null;
    website: string | null;
    pitch: string;
    description: string | null;
    pays: string | null;
    ville: string | null;
    categories: string[] | null;
    logo_url: string | null;
    cover_url: string | null;
    reseaux: unknown;
    user_id: string | null;
    brand_id: string | null;
    relationship: "proprietaire" | "decouvreur";
  } | null;

  if (!application) return { ok: false, error: "Candidature introuvable." };

  let brandId = application.brand_id;

  /*
   * C'est ICI que la fiche naît, et nulle part ailleurs.
   *
   * Le dépôt d'une candidature n'écrit rien dans l'annuaire. Sans quoi
   * un brouillon voudrait dire deux choses à la fois : « relu et gardé
   * pour plus tard » et « personne ne l'a encore regardé ». La fiche
   * apparaît donc au moment où l'on accepte, remplie d'un coup avec
   * tout ce que la personne avait renseigné.
   */
  if (!brandId) {
    // Le slug doit etre unique : on suffixe plutot que d'echouer.
    let slug = slugify(application.brand_name);
    const { data: clash } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const description = application.description?.trim() || application.pitch;

    const { data: created, error: createError } = await supabase
      .from("brands")
      .insert({
        slug,
        name: application.brand_name,
        // Une accroche provisoire, tirée de la première phrase : la
        // fiche reste ainsi publiable sans qu'on ait à la réécrire.
        tagline: description.split(/[.!?\n]/)[0]?.trim().slice(0, 160) || "Marque indépendante",
        description,
        country: application.pays || "France",
        city: application.ville,
        categories: application.categories ?? [],
        instagram: application.instagram?.replace(/^@/, "") ?? null,
        reseaux: Array.isArray(application.reseaux) ? application.reseaux : [],
        website_url: application.website,
        shop_url: application.website,
        logo_url: application.logo_url,
        cover_url: application.cover_url,
        featured: false,
        status: "draft",
      })
      .select("id")
      .single();

    if (createError) return { ok: false, error: createError.message };
    brandId = (created as { id: string }).id;
  }

  // On ne donne les cles de la fiche qu'a quelqu'un qui dirige la
  // marque. Une recommandation ne confere aucun droit sur le travail
  // d'autrui, meme faite de bonne foi.
  const estProprietaire = application.relationship === "proprietaire";
  if (estProprietaire && application.user_id) {
    await supabase
      .from("brand_managers")
      .upsert({ brand_id: brandId, user_id: application.user_id });

    // Le role suit le rattachement, sans jamais retrograder un admin
    // qui candidaterait pour sa propre marque.
    await supabase
      .from("profiles")
      .update({ role: "createur" })
      .eq("id", application.user_id)
      .eq("role", "membre");
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "acceptee", brand_id: brandId })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/candidatures");
  revalidatePath("/admin/marques");
  let message: string;
  if (!estProprietaire) {
    message =
      "Marque créée en brouillon. Aucun droit accordé : il s'agissait d'une recommandation, pas de la marque du candidat.";
  } else if (application.user_id) {
    message = "Marque créée en brouillon. Le candidat passe créateur et en devient gérant.";
  } else {
    message =
      "Marque créée en brouillon. Le candidat n'avait pas de compte : rattache-le depuis sa fiche quand il en aura un.";
  }

  return { ok: true, message };
}

/** Efface une candidature. Sans retour possible. */
export async function deleteApplication(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("applications").delete().eq("id", toText(formData.get("id")));
  revalidatePath("/admin/candidatures");
}

/* ========================= COMPTES ========================= */

/**
 * Change le role d'un compte.
 *
 * Deux verrous en plus de requireAdmin() : on ne peut pas se
 * retrograder soi-meme, ce qui fermerait la porte de l'administration
 * a clé de l'interieur, et le declencheur en base refuse tout
 * changement de role venant d'un non-admin.
 */
export async function updateUserRole(formData: FormData): Promise<Result> {
  const me = await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const userId = toText(formData.get("user_id"));
  const role = toText(formData.get("role"));

  if (role !== "membre" && role !== "createur" && role !== "admin") {
    return { ok: false, error: "Rôle inconnu." };
  }
  if (userId === me.id && role !== "admin") {
    return {
      ok: false,
      error: "Tu ne peux pas retirer ton propre rôle d'administrateur, sinon plus personne ne pourrait entrer.",
    };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${userId}`);
  return { ok: true, message: "Rôle mis à jour." };
}

/**
 * Supprime definitivement un compte.
 *
 * Passe par la fonction delete_user_account de la base : la table
 * auth.users est inaccessible depuis la cle publique, et c'est cette
 * fonction qui verifie les droits, refuse l'auto-suppression et
 * protege les autres administrateurs.
 *
 * Le profil, les favoris, les coups de cœur et les rattachements
 * partent avec. Les marques restent : elles appartiennent au site.
 */
export async function deleteUserAccount(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const userId = toText(formData.get("user_id"));
  if (!userId) return { ok: false, error: "Compte introuvable." };

  const { error } = await supabase.rpc("delete_user_account", { target: userId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: "Compte supprimé." };
}

/**
 * Revendication d'une marque par son fondateur.
 *
 * On ne donne AUCUN droit ici : la demande arrive dans les
 * candidatures, rattachee a la fiche existante et au compte du
 * demandeur. C'est l'admin qui tranche, avec le bouton Accepter, et
 * lui seul. Sans ce passage, n'importe qui pourrait s'emparer de la
 * page d'une marque en cliquant un bouton.
 */
export async function claimBrand(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connecte-toi d'abord." };

  const brandId = toText(formData.get("brand_id"));
  const brandName = toText(formData.get("brand_name"));
  const contact = toText(formData.get("contact_name"));
  const pitch = toText(formData.get("pitch"));

  if (!brandId || !contact || !pitch) {
    return { ok: false, error: "Il manque ton nom ou ta preuve." };
  }

  // Une demande en attente suffit : inutile d'en empiler trois.
  const { data: dejaLa } = await supabase
    .from("applications")
    .select("id")
    .eq("brand_id", brandId)
    .eq("user_id", user.id)
    .eq("status", "nouvelle")
    .maybeSingle();

  if (dejaLa) {
    return { ok: false, error: "Tu as déjà une demande en attente sur cette marque." };
  }

  const { error } = await supabase.from("applications").insert({
    brand_id: brandId,
    user_id: user.id,
    relationship: "proprietaire",
    brand_name: brandName,
    contact_name: contact,
    email: user.email ?? "",
    pitch,
    status: "nouvelle",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/candidatures");
  return {
    ok: true,
    message:
      "Demande envoyée. On vérifie que tu es bien à la tête de cette marque, puis on t'ouvre l'accès à sa page.",
  };
}

/**
 * Rattache un compte a une marque depuis la fiche du compte.
 *
 * Meme effet que le bloc "Gerants" cote marque, pris par l'autre bout :
 * quand on a la personne sous les yeux, chercher sa marque est plus
 * naturel que l'inverse.
 */
export async function attachUserToBrand(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const userId = toText(formData.get("user_id"));
  const brandId = toText(formData.get("brand_id"));
  if (!userId || !brandId) return { ok: false, error: "Compte ou marque manquant." };

  const { error } = await supabase
    .from("brand_managers")
    .upsert({ brand_id: brandId, user_id: userId });

  if (error) return { ok: false, error: error.message };

  // Le role suit le rattachement, sans jamais retrograder un admin.
  await supabase
    .from("profiles")
    .update({ role: "createur" })
    .eq("id", userId)
    .eq("role", "membre");

  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath(`/admin/marques/${brandId}`);
  return { ok: true, message: "Marque rattachée." };
}

/**
 * Retire l'acces d'un compte a une marque.
 *
 * On ne retire pas le role "createur" au passage : la personne peut
 * gerer d'autres marques, et l'admin voit de toute facon un
 * avertissement sur les createurs sans rattachement.
 */
export async function detachUserFromBrand(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const userId = toText(formData.get("user_id"));
  const brandId = toText(formData.get("brand_id"));

  const { error } = await supabase
    .from("brand_managers")
    .delete()
    .eq("brand_id", brandId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath(`/admin/marques/${brandId}`);
  return { ok: true, message: "Accès retiré." };
}

/**
 * Publie ou retire une marque, en un geste.
 *
 * Le formulaire garde son menu « État » — il sert quand on remplit une
 * fiche d'un bout à l'autre. Mais publier ne devrait jamais demander
 * de traverser quatre étapes : c'est l'action la plus fréquente de
 * l'administration.
 */
export async function toggleBrandStatus(formData: FormData): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase n'est pas configuré." };

  const id = toText(formData.get("id"));
  const publier = toText(formData.get("publier")) === "1";

  const { data: brand } = await supabase
    .from("brands")
    .select("name, tagline, description, cover_url, logo_url, published_at")
    .eq("id", id)
    .maybeSingle();

  const fiche = brand as {
    name: string;
    tagline: string;
    description: string;
    cover_url: string | null;
    logo_url: string | null;
    published_at: string | null;
  } | null;
  if (!fiche) return { ok: false, error: "Marque introuvable." };

  if (publier) {
    const obstacle = obstacleAPublication(fiche);
    if (obstacle) return { ok: false, error: obstacle };
  }

  const { error } = await supabase
    .from("brands")
    .update({
      status: publier ? "published" : "draft",
      // On garde la date de première publication : elle ordonne
      // l'annuaire, et la remettre à zéro remonterait artificiellement
      // une vieille marque simplement republiée.
      published_at: publier ? (fiche.published_at ?? new Date().toISOString()) : null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/marques");
  revalidatePath(`/admin/marques/${id}`);
  revalidatePath("/marques");
  return {
    ok: true,
    message: publier
      ? `${fiche.name} est en ligne.`
      : `${fiche.name} est repassée en brouillon.`,
  };
}
