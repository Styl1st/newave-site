import { obstacleAPublication, type FichePubliable } from "@/lib/publication";

/**
 * Les trois conditions de mise en ligne, une par une.
 *
 * POURQUOI CE FICHIER EXISTE. `obstacleAPublication()` est faite pour
 * TRANCHER : elle rend le PREMIER manque qu'elle rencontre, et rien
 * d'autre. C'est ce qu'il faut au serveur, qui n'a qu'une décision à
 * prendre. Mais une check-list montre les trois lignes en même temps,
 * et il lui faut donc trois verdicts.
 *
 * ON NE RELIT PAS LES CHAMPS POUR LES DEVINER. Recopier ici « il manque
 * un visuel » ferait une deuxième définition de la règle, exactement ce
 * que `publication.ts` dit vouloir empêcher. On lui repose donc la
 * question trois fois, en ne lui soumettant qu'un manque à la fois sur
 * une fiche par ailleurs en règle. Chaque phrase affichée sort de sa
 * bouche.
 *
 * TROIS, PAS QUATRE. La boutique, les catégories, le pays et le logo
 * seul ne bloquent pas : une boutique fermée n'est pas une fiche
 * incomplète. Ajouter une ligne ici durcirait la règle dans un seul
 * chemin — la faute que le fichier d'origine existe pour éviter.
 */

/** Une fiche dont tout est en règle, sur laquelle on repose un manque. */
const EN_REGLE: FichePubliable = { tagline: "…", cover_url: "…", pieces: 1 };

export type Condition = {
  cle: "visuel" | "texte" | "pieces";
  titre: string;
  /** La phrase de `obstacleAPublication`, ou `null` si la condition est tenue. */
  obstacle: string | null;
};

export function conditionsDePublication(fiche: FichePubliable): Condition[] {
  const seule = (manque: FichePubliable) => obstacleAPublication({ ...EN_REGLE, ...manque });

  return [
    {
      cle: "visuel",
      titre: "Un visuel",
      obstacle: seule({ cover_url: fiche.cover_url, logo_url: fiche.logo_url }),
    },
    {
      cle: "texte",
      titre: "Du texte",
      obstacle: seule({ tagline: fiche.tagline, description: fiche.description }),
    },
    {
      cle: "pieces",
      titre: "Au moins une pièce",
      obstacle: seule({ pieces: fiche.pieces, exigeDesPieces: fiche.exigeDesPieces }),
    },
  ];
}
