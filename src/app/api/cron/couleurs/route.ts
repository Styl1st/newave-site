import { NextResponse } from "next/server";
import { connecterRobot } from "@/lib/robot";
import { lireUnLotDeCouleurs } from "@/lib/couleurs-lot";

/**
 * LA TÂCHE QUOTIDIENNE DES COULEURS.
 *
 * Elle passe après celle des catalogues (voir `vercel.json`) et lit les
 * pièces qui viennent d'entrer, ou dont la photo a changé. Quelques
 * dizaines par jour en temps normal : le passage dure quelques secondes.
 *
 * Le rattrapage de tout le catalogue, lui, se fait depuis l'admin
 * (Catalogues → Lire les couleurs) : cette tâche n'en verrait le bout
 * qu'en plusieurs jours.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
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

  const bilan = await lireUnLotDeCouleurs(supabase, 50_000);
  return NextResponse.json(bilan, { status: bilan.ok ? 200 : 500 });
}
