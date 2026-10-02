import { NextResponse } from "next/server";
import { getLikeCounts, getMyLikes } from "@/lib/likes";

/**
 * Les coups de cœur d'une poignée de pièces : combien, et si c'est moi.
 *
 * C'est ce qui permet d'aimer une pièce depuis la vitrine (`/pieces`).
 * La fiche d'une marque lit ces deux chiffres au serveur, avec la page ;
 * la vitrine ne le peut pas, puisque ses pièces arrivent par lots, à la
 * demande, longtemps après le rendu. Elle les redemande donc ici, lot
 * par lot, pour les seules pièces qu'elle vient de recevoir.
 *
 * UNE ROUTE ET NON UNE ACTION SERVEUR. Les actions passent l'une après
 * l'autre dans la même file que la navigation : une simple lecture qui
 * traîne y retarderait un clic sur un lien ou sur un cœur.
 *
 * Rien de partagé en cache : la moitié de la réponse dépend de la
 * personne connectée.
 */
export const dynamic = "force-dynamic";

/** Quatre lots de vingt-quatre. Personne n'en demande plus d'un coup. */
const MAX = 96;

/** Un identifiant de pièce, et rien d'autre : ça part tel quel dans un `in`. */
const ID = /^[0-9a-zA-Z_-]{1,64}$/;

export async function GET(request: Request) {
  const brut = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(brut.split(","))].filter((id) => ID.test(id)).slice(0, MAX);

  if (ids.length === 0) {
    return NextResponse.json({}, { headers: { "Cache-Control": "private, no-store" } });
  }

  const [comptes, miens] = await Promise.all([getLikeCounts(ids), getMyLikes(ids)]);

  const coeurs = Object.fromEntries(
    ids.map((id) => [id, { count: comptes.get(id) ?? 0, liked: miens.has(id) }])
  );

  return NextResponse.json(coeurs, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
