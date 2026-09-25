import type { SupabaseClient } from "@supabase/supabase-js";
import { tableDesRegles, type RegleTag, type Regles } from "./tags";

/**
 * Les décisions de l'admin sur les tags locaux (table `tags_regles`).
 *
 * Lues une fois par synchro ou par reclassement, jamais par pièce.
 *
 * UNE TABLE ABSENTE N'EST PAS UNE PANNE. Tant que la migration 34 n'est
 * pas passée, la lecture échoue : on classe alors avec le seul lexique,
 * ce qui est exactement ce qu'on ferait sans aucune règle.
 */
export async function lireLesRegles(supabase: SupabaseClient): Promise<Regles> {
  const { data, error } = await supabase
    .from("tags_regles")
    .select("cle, decision, tag, famille");
  if (error || !data) return new Map();
  return tableDesRegles(data as RegleTag[]);
}
