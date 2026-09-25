import type { SupabaseClient } from "@supabase/supabase-js";
import { cleLien, type CatalogueItem } from "./catalogue-commun";
import { enEuros, lireLesTaux, type Taux } from "./devises";
import { lireLesRegles } from "./regles-tags";
import { avecLaFamille, classerLaPiece, type Classement } from "./tags";

/**
 * Ranger un catalogue lu chez une marque dans notre base.
 *
 * Cette logique sert deux fois : quand une marque importe elle-même
 * ses pièces, et quand la mise à jour quotidienne repasse derrière.
 * Il fallait qu'elle soit écrite une seule fois, sinon les deux
 * chemins auraient fini par diverger, et l'automate aurait
 * silencieusement abîmé ce que l'import faisait correctement.
 *
 * La règle qui compte : on ne remplace jamais une pièce par une
 * autre. Chaque pièce lue est appariée à une pièce existante, d'abord
 * par son identifiant chez la boutique, puis par son adresse. Si rien
 * ne correspond, c'est une nouvelle.
 *
 * Et ce que la personne a décidé lui appartient. Un rafraîchissement
 * met à jour le prix, les photos, les tailles et la disponibilité,
 * mais ne touche ni à la mise en avant, ni à l'ordre d'affichage, ni
 * au fait qu'une pièce soit publiée ou non.
 *
 * LE RAYON ET LES TAGS, EUX, SE RECALCULENT À CHAQUE PASSAGE, parce
 * qu'ils suivent le site de la marque : une pièce qui entre dans la
 * collection « Outerwear » doit s'y retrouver chez nous aussi. Sauf
 * quand un gérant les a choisis à la main (`classement_manuel`) : là,
 * seuls les tags propres à la marque bougent encore.
 */

export type Existante = {
  id: string;
  source_id: string | null;
  shop_url: string | null;
  slug: string | null;
  status: string;
  position: number | null;
  categories: string[] | null;
  featured: boolean | null;
  retired_at: string | null;
  /** Absents tant que la migration 34 n'est pas passée. */
  tags?: string[] | null;
  classement_manuel?: boolean | null;
};

export type Bilan = { creees: number; majs: number; retirees: number; erreur?: string };

/**
 * En deçà, on ne retire rien.
 *
 * Si une boutique ne renvoie plus qu'une poignée de pièces alors
 * qu'elle en avait cinquante, l'explication la plus probable n'est pas
 * qu'elle a tout arrêté : c'est que sa page a mal répondu, ou que son
 * site a changé de forme. Marquer tout son catalogue comme retiré sur
 * la foi d'une lecture bancale ferait bien plus de dégâts que
 * d'attendre le passage du lendemain.
 */
const SEUIL_DE_CONFIANCE = 0.4;

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function enLigne(item: CatalogueItem, brandId: string, taux?: Taux) {
  return {
    brand_id: brandId,
    source_id: item.source_id,
    slug: item.slug || slugify(item.name),
    name: item.name,
    description: item.description,
    price_cents: item.price_cents,
    compare_at_cents: item.compare_at_cents,
    /*
     * Le prix ramené en euros, calculé une fois ici plutôt qu'à chaque
     * affichage : sinon il faudrait transporter la table des taux
     * jusqu'à chaque carte de chaque grille du site.
     *
     * Nul quand on ne connaît pas la devise. Une conversion inventée
     * serait pire que pas de conversion du tout.
     */
    price_eur_cents: taux ? enEuros(item.price_cents, item.currency, taux) : null,
    compare_at_eur_cents: taux ? enEuros(item.compare_at_cents, item.currency, taux) : null,
    currency: item.currency,
    sizes: item.sizes,
    size_label: item.size_label,
    images: item.images,
    image_url: item.images[0] ?? null,
    shop_url: item.shop_url,
    available: item.available,
    /*
     * Ce que la boutique a déclaré, gardé tel quel. C'est ce qui permet
     * de reclasser tout le catalogue depuis l'admin, après une
     * correction du lexique ou une règle posée sur un tag, sans
     * relire une seule boutique.
     */
    rangement_boutique: item.rangement ?? null,
  };
}

/** Les colonnes de la migration 34, à retirer si la base ne les a pas encore. */
const COLONNES_34 = ["tags", "tags_locaux", "rangement_boutique", "classement_manuel"] as const;

function sansColonnes34<T extends Record<string, unknown>>(ligne: T): T {
  const copie = { ...ligne };
  for (const c of COLONNES_34) delete copie[c];
  return copie;
}

/** Le classement d'une pièce, tel qu'il s'écrit en base. */
function colonnesDuClassement(
  classe: Classement,
  existante: Existante | null
): { categories: string[]; tags: string[]; tags_locaux: string[] } {
  // Choisi à la main : on garde le rayon et le tag fin tels quels.
  if (existante?.classement_manuel) {
    return {
      categories: existante.categories ?? [],
      tags: existante.tags ?? [],
      tags_locaux: classe.locaux,
    };
  }
  return {
    categories: avecLaFamille(existante?.categories, classe.famille),
    tags: classe.tags,
    tags_locaux: classe.locaux,
  };
}

export async function synchroniserCatalogue(
  supabase: SupabaseClient,
  brandId: string,
  items: CatalogueItem[],
  options: {
    /** Ce que devient une pièce qu'on n'avait jamais vue. */
    statutDesNouvelles: "draft" | "published";
    /**
     * true seulement quand on vient de lire la boutique ENTIÈRE.
     *
     * Un import depuis l'adresse d'une seule pièce ne dit rien des
     * autres : conclure de son absence qu'elles ont disparu serait
     * absurde. Seule la relecture quotidienne, qui parcourt tout le
     * catalogue, est en droit d'en tirer cette conclusion.
     */
    marquerLesAbsentes?: boolean;
  }
): Promise<Bilan> {
  if (items.length === 0) return { creees: 0, majs: 0, retirees: 0 };

  // Les taux du jour et les règles de tags, lus une fois pour tout le catalogue.
  const [taux, regles] = await Promise.all([lireLesTaux(), lireLesRegles(supabase)]);

  /*
   * ⚠️ LA LECTURE DE L'EXISTANT SE FAIT PAR TRANCHES, ET C'EST LA PLUS
   * IMPORTANTE DES TROIS.
   *
   * PostgREST s'arrête à mille lignes sans le dire (voir `stats.ts`).
   * Sur une boutique de onze cents pièces, cette requête en rendait
   * mille : les cent dernières n'existaient plus pour la synchro. Elle
   * les aurait donc traitées comme des nouveautés — réinsérées en
   * double, ou refusées par la contrainte d'unicité sur `source_id` —
   * et, avec `marquerLesAbsentes`, le calcul des disparues aurait porté
   * sur un existant incomplet.
   *
   * C'est le seul des trois plafonds qui ÉCRIT. Les autres affichent un
   * chiffre faux ; celui-ci abîme le catalogue.
   */
  const existantes: Existante[] = [];
  const TRANCHE = 1000;
  const CHAMPS = "id, source_id, shop_url, slug, status, position, categories, featured, retired_at";

  /*
   * UNE BASE SANS LA MIGRATION 34 NE DOIT PAS ARRÊTER LA SYNCHRO.
   *
   * La tâche quotidienne tourne sans personne pour la regarder. Si le
   * code arrive avant la migration, lire `tags` échoue : on se rabat
   * alors sur les anciennes colonnes, et l'on écrit sans les tags. Les
   * prix et les disponibilités continuent d'être mis à jour.
   */
  let ancienneBase = false;

  for (let de = 0; de < 100 * TRANCHE; de += TRANCHE) {
    const lire = (champs: string) =>
      supabase
        .from("products")
        .select(champs)
        .eq("brand_id", brandId)
        /* Un ordre total, sinon deux tranches peuvent se recouvrir : une
           pièce serait alors lue deux fois et une autre jamais. */
        .order("id", { ascending: true })
        .range(de, de + TRANCHE - 1);

    let { data: brut, error: lecture } = ancienneBase
      ? await lire(CHAMPS)
      : await lire(`${CHAMPS}, tags, classement_manuel`);

    if (lecture && !ancienneBase && /tags|classement_manuel/.test(lecture.message)) {
      ancienneBase = true;
      ({ data: brut, error: lecture } = await lire(CHAMPS));
    }

    if (lecture) return { creees: 0, majs: 0, retirees: 0, erreur: lecture.message };

    const lot = (brut as unknown as Existante[] | null) ?? [];
    existantes.push(...lot);
    if (lot.length < TRANCHE) break;
  }
  const parSource = new Map<string, Existante>();
  const parLien = new Map<string, Existante>();
  const slugsPris = new Set<string>();

  for (const p of existantes) {
    if (p.source_id) parSource.set(p.source_id, p);
    const cle = cleLien(p.shop_url);
    if (cle) parLien.set(cle, p);
    if (p.slug) slugsPris.add(p.slug);
  }

  let rang = existantes.reduce((max, p) => Math.max(max, p.position ?? 0), -1) + 1;

  const aMettreAJour: Record<string, unknown>[] = [];
  const aCreer: Record<string, unknown>[] = [];
  const dejaTraitees = new Set<string>();

  for (const item of items) {
    const ligne = enLigne(item, brandId, taux);
    const classe = classerLaPiece(
      { nom: ligne.name, description: ligne.description, rangement: item.rangement },
      regles
    );
    const trouvee =
      (ligne.source_id ? parSource.get(ligne.source_id) : undefined) ??
      parLien.get(cleLien(ligne.shop_url));

    if (trouvee) {
      // Postgres refuse de modifier deux fois la même ligne dans un
      // même lot : on ne reprend donc une pièce qu'une fois.
      if (dejaTraitees.has(trouvee.id)) continue;
      dejaTraitees.add(trouvee.id);

      aMettreAJour.push({
        ...ligne,
        id: trouvee.id,
        slug: trouvee.slug ?? ligne.slug,
        status: trouvee.status,
        position: trouvee.position ?? 0,
        ...colonnesDuClassement(classe, trouvee),
        featured: trouvee.featured ?? false,
        // Elle est de retour dans la boutique : on lève l'archive.
        retired_at: null,
      });
    } else {
      // Deux pièces d'une même marque ne peuvent pas partager une
      // adresse : on suffixe plutôt que d'échouer sur un message brut.
      const base = ligne.slug || slugify(ligne.name);
      let pieceSlug = base;
      while (slugsPris.has(pieceSlug)) {
        pieceSlug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      slugsPris.add(pieceSlug);

      aCreer.push({
        ...ligne,
        slug: pieceSlug,
        ...colonnesDuClassement(classe, null),
        status: options.statutDesNouvelles,
        position: rang++,
      });
    }
  }

  if (ancienneBase) {
    aMettreAJour.forEach((l, i) => (aMettreAJour[i] = sansColonnes34(l)));
    aCreer.forEach((l, i) => (aCreer[i] = sansColonnes34(l)));
  }

  if (aMettreAJour.length > 0) {
    const { error } = await supabase.from("products").upsert(aMettreAJour);
    if (error) return { creees: 0, majs: 0, retirees: 0, erreur: error.message };
  }
  if (aCreer.length > 0) {
    const { error } = await supabase.from("products").insert(aCreer);
    if (error) {
      return { creees: 0, majs: aMettreAJour.length, retirees: 0, erreur: error.message };
    }
  }

  /* ---------- les pièces qui ont quitté la boutique ----------
     On ne les efface pas. Elles ont peut-être reçu des coups de cœur,
     et ceux-ci racontent ce que la marque a fait : les jeter
     reviendrait à effacer une partie de son histoire, et à retirer à
     la marque une visibilité qu'elle a méritée. On date leur retrait,
     et la fiche le dit clairement. */
  let retirees = 0;

  if (options.marquerLesAbsentes) {
    // Seules les pièces venues d'un import sont concernées : une pièce
    // saisie à la main n'a jamais été dans le flux de la boutique, son
    // absence ne prouve donc rien.
    const importees = existantes.filter((p) => p.source_id && !p.retired_at);
    const disparues = importees.filter((p) => !dejaTraitees.has(p.id));

    const proportionLue = importees.length === 0 ? 1 : dejaTraitees.size / importees.length;

    if (disparues.length > 0 && proportionLue >= SEUIL_DE_CONFIANCE) {
      const { error } = await supabase
        .from("products")
        .update({ retired_at: new Date().toISOString(), available: false })
        .in("id", disparues.map((p) => p.id))
        .eq("brand_id", brandId);
      if (!error) retirees = disparues.length;
    }
  }

  return { creees: aCreer.length, majs: aMettreAJour.length, retirees };
}
