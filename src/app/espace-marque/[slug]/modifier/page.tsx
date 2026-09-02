import EditeurFiche from "@/components/editeur/EditeurFiche";
import { adminGetBrandManagers, adminGetVilles } from "@/lib/admin-queries";
import { getCatalogueInsight, requireManagedBrand } from "@/lib/brand-space";
import { paysAvecActuel } from "@/lib/pays";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";
import type { Profile } from "@/lib/types";

/**
 * Modifier une marque. UNE SEULE PAGE, POUR LES DEUX PUBLICS.
 *
 * POURQUOI ICI ET NON DANS `/admin`. C'est le même geste : un créateur
 * qui corrige son accroche et un administrateur qui la corrige pour lui
 * remplissent le même champ, qui part dans la même colonne. Tant qu'il
 * y avait deux écrans, il y avait deux définitions de la fiche, et une
 * seule était corrigée le jour où il manquait un champ. Or `/admin`
 * renvoie chez lui quiconque n'est pas administrateur : y laisser
 * l'éditeur obligeait à en garder un second ailleurs, et l'on revenait
 * au point de départ. C'est donc l'espace marque qui l'accueille.
 *
 * `requireManagedBrand` FAIT EXACTEMENT LE TRI QU'IL FAUT. Elle rend
 * n'importe quelle marque à un administrateur, la sienne à un gérant,
 * et redirige les autres avant même que la page se rende. Elle dit en
 * plus lequel des deux regarde — d'après la table `profiles`, pas
 * d'après l'adresse ni d'après un paramètre.
 *
 * `/admin/marques/[id]` renvoie ici en mode édition. Créer, en
 * revanche, reste là-bas : c'est un parcours en quatre écrans, pas un
 * formulaire, et les deux gestes n'ont rien à voir.
 */

/**
 * Enregistrer peut déclencher la lecture d'une boutique — « Remplir
 * depuis le site », côté administration, parcourt un plan de site et
 * demande une trentaine de requêtes. La limite par défaut de dix
 * secondes couperait la lecture en plein milieu. Même valeur que la
 * page d'import de l'espace marque.
 */
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function ModifierLaFiche({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);

  const [catalogue, gerants, villes] = await Promise.all([
    /*
     * Le nombre de pièces, sans filtre de statut : c'est celui que
     * `saveBrand` compte avant de publier, et la check-list doit dire la
     * même chose que la règle qu'elle annonce. Une pièce en brouillon
     * reste une pièce importée.
     */
    getCatalogueInsight(brand.id),

    // Les gérants ne s'affichent qu'à l'administration : c'est elle qui
    // rattache les comptes, et `addBrandManager` le revérifie de son côté.
    isAdmin ? adminGetBrandManagers(brand.id) : Promise.resolve<Profile[]>([]),

    /*
     * Les villes déjà employées, pour proposer l'orthographe existante
     * plutôt que d'en fabriquer une troisième. Le préfixe `admin` de
     * cette requête dit d'où elle vient, pas qui a le droit de
     * l'appeler : elle ne lit que le pays et la ville des fiches, deux
     * colonnes que l'annuaire affiche déjà à tout le monde.
     */
    adminGetVilles(),
  ]);

  return (
    <EditeurFiche
      brand={brand}
      estAdmin={isAdmin}
      pieces={catalogue?.total ?? 0}
      gerants={gerants}
      pays={paysAvecActuel(brand.country)}
      villes={villes}
      categories={withExisting(BRAND_CATEGORIES, brand.categories)}
    />
  );
}
