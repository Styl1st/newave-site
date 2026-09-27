import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { envoyerBienvenue } from "@/lib/emails";

/** Point d'arrivee du lien de confirmation envoye par email. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const suite = searchParams.get("suite") ?? "/";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        await accueillirSiNouveau(supabase, data.user);
        return NextResponse.redirect(`${origin}${suite}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
}

/**
 * L'email de bienvenue, une seule fois, à la toute première arrivée.
 *
 * Ce point d'arrivée sert à tout : confirmation d'inscription, mot de
 * passe oublié, changement d'adresse, connexion par Google. Il faut
 * donc reconnaître la première fois. Trois conditions :
 *
 *   - l'adresse vient d'être confirmée (moins d'un quart d'heure) ;
 *   - le compte est récent (moins d'une semaine), pour qu'un ancien
 *     membre ne reçoive pas une bienvenue le jour où ce code est
 *     déployé ;
 *   - elle n'est pas déjà partie. On le note dans les métadonnées du
 *     compte AVANT l'envoi : un mot de passe oublié dans le quart
 *     d'heure qui suit l'inscription ne doit pas en déclencher une
 *     deuxième.
 *
 * Rien ici ne peut empêcher la connexion : au pire, pas de bienvenue.
 */
async function accueillirSiNouveau(supabase: SupabaseClient, user: User | null) {
  try {
    if (!user?.email || !user.email_confirmed_at) return;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.bienvenue_envoyee) return;

    const maintenant = Date.now();
    const confirmeIlYA = maintenant - Date.parse(user.email_confirmed_at);
    const creeIlYA = maintenant - Date.parse(user.created_at);
    if (!(confirmeIlYA < 15 * 60_000) || !(creeIlYA < 7 * 24 * 3_600_000)) return;

    const { error } = await supabase.auth.updateUser({ data: { bienvenue_envoyee: true } });
    if (error) return;

    // Le prénom saisi à l'inscription, sinon celui que donne Google.
    const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const prenom =
      texte(meta.display_name) || texte(meta.full_name).split(" ")[0] || texte(meta.name).split(" ")[0] || null;

    envoyerBienvenue(user.email, prenom);
  } catch (erreur) {
    console.error("[emails] bienvenue :", erreur);
  }
}
