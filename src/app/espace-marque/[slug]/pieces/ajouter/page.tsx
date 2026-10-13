import { redirect } from "next/navigation";
import { requireManagedBrand } from "@/lib/brand-space";

type Props = { params: Promise<{ slug: string }> };

/**
 * L'ANCIENNE PAGE « AJOUTER DES PIÈCES », QUI NE FAISAIT QUE CHOISIR.
 *
 * Elle proposait deux cartes, « Importer depuis ma boutique » et « Créer
 * une pièce à la main », alors que la page Mes pièces porte déjà ces
 * deux boutons, et que la page d'import propose aussi la saisie à la
 * main. C'était un écran de plus entre l'envie d'ajouter et le geste.
 *
 * « Ajouter des pièces » mène maintenant droit à l'import, le chemin de
 * presque toutes les marques. L'adresse est gardée et renvoie au même
 * endroit : elle traîne dans des favoris et dans d'anciens liens.
 */
export default async function AjouterDesPieces({ params }: Props) {
  const { slug } = await params;
  const { brand } = await requireManagedBrand(slug);
  redirect(`/espace-marque/${brand.slug}/import`);
}
