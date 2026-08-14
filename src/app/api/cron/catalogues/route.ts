import { NextResponse } from "next/server";
import { connecterRobot } from "@/lib/robot";
import { fetchCatalogue } from "@/lib/catalogue";
import { synchroniserCatalogue } from "@/lib/catalogue-sync";
import { rafraichirLesTaux } from "@/lib/devises";

/**
 * Relecture quotidienne des catalogues, vers midi.
 *
 * Une marque change ses prix, épuise une taille, sort une pièce. Sans
 * cette tâche, sa fiche chez nous vieillit doucement jusqu'à mentir.
 * Elle passe donc chaque jour remettre tout le monde à jour.
 *
 * L'heure est réglée dans vercel.json, et elle y est écrite en UTC :
 * « 0 10 * * * » vaut midi à Paris de fin mars à fin octobre, et onze
 * heures le reste de l'année. Vercel ne connaît pas l'heure d'été, et
 * la suivre demanderait de changer cette ligne deux fois par an pour
 * une différence que personne ne remarque.
 *
 * Les nouvelles pièces sont publiées directement. C'est un choix
 * assumé : demander une relecture à chaque nouveauté reviendrait à
 * n'en publier aucune, et ce qui est en ligne chez la marque est déjà
 * public de toute façon.
 *
 * Elle ne traite qu'un petit lot par passage, en commençant par les
 * marques vues il y a le plus longtemps. Vercel coupe une fonction au
 * bout d'une minute, et lire un plan de site prend une dizaine de
 * secondes : vouloir tout faire d'un coup, c'est se garantir une
 * exécution coupée en plein milieu. En quelques jours, tout le monde
 * est passé.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** De quoi tenir dans la minute allouée, même sur des boutiques lentes. */
const PAR_PASSAGE = 6;

type Marque = {
  id: string;
  name: string;
  slug: string;
  shop_url: string | null;
  website_url: string | null;
};

export async function GET(request: Request) {
  /*
   * Vercel ajoute cet en-tête aux tâches planifiées dès qu'on définit
   * CRON_SECRET. Sans cette vérification, l'adresse serait publique et
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

  const supabase = await connecterRobot();
  if (!supabase) {
    return NextResponse.json(
      { erreur: "Le compte de l'automate n'a pas pu se connecter." },
      { status: 500 }
    );
  }

  /*
   * Les taux de change, avant les catalogues.
   *
   * L'ordre compte : la lecture d'un catalogue calcule au passage
   * l'équivalent en euros de chaque prix. Rafraîchir les taux après
   * coup les laisserait vieux d'un jour à chaque fois.
   *
   * Un échec ici n'arrête rien : on se contentera des taux de la
   * veille, ce qui est très largement suffisant.
   */
  const taux = await rafraichirLesTaux(supabase);

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, shop_url, website_url")
    .eq("status", "published")
    .eq("catalogue_auto", true)
    .order("catalogue_sync_at", { ascending: true, nullsFirst: true })
    // Départage les ex æquo — et il y en a : toutes les fiches jamais
    // lues ont la même valeur vide. Sans ce second critère, deux
    // exécutions peuvent choisir les mêmes six marques et en laisser
    // d'autres de côté indéfiniment.
    .order("id", { ascending: true })
    .limit(PAR_PASSAGE);

  if (error) {
    return NextResponse.json({ erreur: error.message }, { status: 500 });
  }

  const marques = (data as Marque[] | null) ?? [];
  const journal: Record<string, string>[] = [];

  for (const marque of marques) {
    const adresse = marque.shop_url ?? marque.website_url;
    let note: string;

    let verrouillee = false;

    if (!adresse) {
      note = "Aucune adresse de boutique renseignée.";
    } else {
      const lecture = await fetchCatalogue(adresse);
      // Fermée pour un drop : ce n'est pas un échec de lecture, et la
      // fiche doit pouvoir le dire à ses visiteurs.
      verrouillee = !lecture.ok && Boolean(lecture.verrouillee);

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

    // On note toujours la date, même après un échec : sinon une
    // boutique en panne monopoliserait tous les passages suivants et
    // les autres marques ne seraient plus jamais relues.
    await supabase
      .from("brands")
      .update({
        catalogue_sync_at: new Date().toISOString(),
        catalogue_sync_note: note,
        catalogue_verrouille: verrouillee,
      })
      .eq("id", marque.id);

    journal.push({ marque: marque.slug, resultat: note });
  }

  return NextResponse.json({
    taux: taux.ok ? `${taux.devises} devises` : (taux.erreur ?? "échec"),
    traitees: marques.length,
    journal,
  });
}
