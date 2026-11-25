import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connecterRobot } from "@/lib/robot";
import { lireLaBoutique } from "@/lib/lecture";
import { boutiqueLisible, plateformeDeVente } from "@/lib/boutiques";
import { synchroniserCatalogue } from "@/lib/catalogue-sync";
import { rafraichirLesTaux } from "@/lib/devises";

/**
 * LA RELECTURE DES CATALOGUES, TOUTES LES MARQUES, CHAQUE NUIT.
 *
 * Une marque change ses prix, épuise une taille, retire une pièce. Sans
 * cette tâche, sa fiche chez nous vieillit jusqu'à mentir : une pièce
 * retirée chez elle restait ici, avec une photo qui n'existe plus et un
 * lien qui mène à une page 404.
 *
 * QUI L'APPELLE. Supabase, toutes les cinq minutes entre 2 h et 4 h UTC
 * (pg_cron et pg_net, migration 52). Vercel ne sait lancer une tâche
 * qu'une fois par jour, et une fonction n'y vit qu'une minute : on ne
 * relit pas cent soixante boutiques en une minute. Chaque appel prend
 * donc les marques qui n'ont pas été relues depuis dix-huit heures, en
 * commençant par les plus anciennes, en lit quatre à la fois, et
 * s'arrête avant d'être coupé. L'appel suivant reprend là. Quand tout
 * le monde est à jour, les appels restants ne font rien et répondent
 * tout de suite.
 *
 * La tâche de Vercel (vercel.json) reste en filet de sécurité : elle
 * passe en journée et ne trouve normalement plus rien à faire.
 *
 * Les nouvelles pièces sont publiées directement. C'est un choix
 * assumé : demander une relecture à chaque nouveauté reviendrait à
 * n'en publier aucune, et ce qui est en ligne chez la marque est déjà
 * public de toute façon.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Combien de boutiques se lisent en même temps. */
const EN_PARALLELE = 4;

/** Après ce délai, on ne commence plus de nouvelle boutique. */
const DERNIER_DEPART_MS = 32_000;

/** Une marque relue depuis moins longtemps est à jour. */
const FRAICHEUR_H = 18;

type Marque = {
  id: string;
  name: string;
  slug: string;
  shop_url: string | null;
  website_url: string | null;
  acces: string | null;
};

async function relire(supabase: SupabaseClient, marque: Marque): Promise<string> {
  const adresse = marque.shop_url ?? marque.website_url;
  let note: string;
  let fermeture: string | null = null;

  if (!adresse) {
    note = "Aucune adresse de boutique renseignée.";
  } else if (!boutiqueLisible(adresse)) {
    note = `Vend sur ${plateformeDeVente(adresse)?.nom ?? "une plateforme"} : rien à lire depuis l'extérieur.`;
  } else {
    const lecture = await lireLaBoutique(adresse);
    /* Une boutique fermée ou en pause : on le note, et la fiche le dit.
       On ne retire rien sur la foi d'une boutique qui ne répond pas. */
    fermeture = !lecture.ok ? (lecture.fermeture ?? null) : null;

    if (!lecture.ok) {
      note = lecture.error;
    } else if (lecture.items.length === 0) {
      note = "La boutique répond, mais son catalogue est vide.";
    } else {
      const bilan = await synchroniserCatalogue(supabase, marque.id, lecture.items, {
        statutDesNouvelles: "published",
        marquerLesAbsentes: true,
      });
      note = bilan.erreur
        ? bilan.erreur
        : `${bilan.creees} nouvelle${bilan.creees > 1 ? "s" : ""}, ${bilan.majs} mise${
            bilan.majs > 1 ? "s" : ""
          } à jour, ${bilan.retirees} retirée${bilan.retirees > 1 ? "s" : ""}.`;
    }
  }

  await supabase
    .from("brands")
    .update({
      catalogue_sync_at: new Date().toISOString(),
      catalogue_sync_note: note,
      catalogue_verrouille: fermeture !== null,
      // Ne verrouille la fiche que si personne ne l'a déjà réglée.
      ...(fermeture && (marque.acces ?? "ouvert") === "ouvert" ? { acces: fermeture } : {}),
    })
    .eq("id", marque.id);

  return note;
}

export async function GET(request: Request) {
  /*
   * Vercel ajoute cet en-tête à ses tâches dès qu'on définit CRON_SECRET,
   * et Supabase l'envoie avec le même secret (rangé dans son coffre,
   * migration 52). Sans cette vérification, l'adresse serait publique et
   * n'importe qui pourrait déclencher des dizaines de lectures de
   * boutiques à la seconde.
   */
  const attendu = process.env.CRON_SECRET;
  if (!attendu) {
    return NextResponse.json({ erreur: "CRON_SECRET n'est pas défini." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${attendu}`) {
    return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });
  }

  const debut = Date.now();
  const supabase = await connecterRobot();
  if (!supabase) {
    return NextResponse.json(
      { erreur: "Le compte de l'automate n'a pas pu se connecter (ROBOT_EMAIL, ROBOT_MOT_DE_PASSE)." },
      { status: 500 }
    );
  }

  const avant = new Date(Date.now() - FRAICHEUR_H * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, shop_url, website_url, acces")
    .eq("status", "published")
    .eq("catalogue_auto", true)
    .or(`catalogue_sync_at.is.null,catalogue_sync_at.lt.${avant}`)
    .order("catalogue_sync_at", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true })
    .limit(40);

  if (error) {
    return NextResponse.json({ erreur: error.message }, { status: 500 });
  }

  const file = (data as Marque[] | null) ?? [];
  if (file.length === 0) {
    return NextResponse.json({ traitees: 0, note: "Toutes les marques sont à jour." });
  }

  // Les taux du jour, une fois par appel : les prix étrangers en dépendent.
  const taux = await rafraichirLesTaux(supabase);

  const journal: { marque: string; resultat: string }[] = [];
  let suivante = 0;
  const ouvrier = async () => {
    while (suivante < file.length && Date.now() - debut < DERNIER_DEPART_MS) {
      const marque = file[suivante++];
      try {
        journal.push({ marque: marque.slug, resultat: await relire(supabase, marque) });
      } catch (e) {
        journal.push({ marque: marque.slug, resultat: `Échec : ${(e as Error)?.message ?? e}` });
      }
    }
  };
  await Promise.all(Array.from({ length: EN_PARALLELE }, ouvrier));

  return NextResponse.json({
    taux: taux.ok ? `${taux.devises} devises` : (taux.erreur ?? "échec"),
    traitees: journal.length,
    restantes: file.length - journal.length,
    journal,
  });
}
