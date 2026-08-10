import { redirect } from "next/navigation";
import { requireManagedBrand } from "@/lib/brand-space";

type Props = { params: Promise<{ slug: string }> };

/**
 * Cette adresse ne montre plus de formulaire, elle renvoie à sa page.
 *
 * Elle affichait auparavant un écran de présentation à remplir, et
 * c'était le premier écran qu'un gérant voyait de sa marque : on
 * atterrissait sur une table de travail au lieu d'atterrir chez soi.
 * On voit désormais sa page telle que les visiteurs la voient, et les
 * outils sont posés dessus.
 *
 * L'adresse est conservée plutôt que supprimée : elle traîne dans des
 * favoris, dans d'anciens liens et dans la mémoire des navigateurs.
 * Un renvoi coûte moins cher qu'une page introuvable.
 *
 * requireManagedBrand() reste utile : elle vérifie les droits, et
 * renvoie quelqu'un qui n'a rien à faire là avant même la redirection.
 */
export default async function EspaceMarqueRacine({ params }: Props) {
  const { slug } = await params;
  const { brand } = await requireManagedBrand(slug);
  redirect(`/marques/${brand.slug}`);
}
