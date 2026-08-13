import { notFound } from "next/navigation";
import AdminForm from "@/components/admin/AdminForm";
import BarreGerant from "@/components/BarreGerant";
import DeleteButton from "@/components/admin/DeleteButton";
import MultiImageUploader from "@/components/admin/MultiImageUploader";
import { Area, Check, CheckGroup, Select, Text } from "@/components/admin/fields";
import { deleteBrandProduct, saveBrandProduct } from "../../../actions";
import { getBrandProduct, requireManagedBrand } from "@/lib/brand-space";
import { PRODUCT_CATEGORIES, withExisting } from "@/lib/taxonomy";
import BackLink from "@/components/BackLink";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function EditBrandProduct({ params }: Props) {
  const { slug, id } = await params;
  const { brand } = await requireManagedBrand(slug);

  const isNew = id === "nouvelle";
  const product = isNew ? null : await getBrandProduct(id);
  if (!isNew && (!product || product.brand_id !== brand.id)) notFound();

  const priceEuros = product?.price_cents != null ? (product.price_cents / 100).toFixed(2) : "";
  const compareEuros =
    product?.compare_at_cents != null ? (product.compare_at_cents / 100).toFixed(2) : "";
  // Dédoublonné, comme sur la fiche publique : une pièce importée
  // avant la correction porte autant de fois « Apricot » qu'elle a de
  // tailles, et le champ à modifier doit montrer la liste propre.
  const sizeList = Array.from(
    new Set((product?.sizes ?? []).map((s) => s.label.trim()).filter(Boolean))
  ).join(", ");

  return (
    <>
      <div className="mb-7">
        <BarreGerant brand={brand} />
      </div>

      <header className="mb-5 sm:mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <BackLink href={`/espace-marque/${slug}/pieces`}>Pièces</BackLink>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            {isNew ? "Nouvelle pièce" : product!.name}
          </h1>
        </div>
        {!isNew && (
          <DeleteButton action={deleteBrandProduct} id={product!.id} label="Supprimer" extra={{ slug }} />
        )}
      </header>

      <AdminForm action={saveBrandProduct} submitLabel={isNew ? "Créer la pièce" : "Enregistrer"}>
        <input type="hidden" name="slug" value={slug} />
        {!isNew && <input type="hidden" name="id" value={product!.id} />}

        <Text name="name" label="Nom de la pièce" required defaultValue={product?.name} placeholder="Le nom de la pièce" />

        <Area
          name="description"
          label="Description"
          hint="Matière, coupe, détails. Ce qui donne envie de cliquer."
          rows={6}
          defaultValue={product?.description ?? ""}
        />

        <MultiImageUploader
          name="images"
          label="Visuels"
          defaultValue={product?.images ?? []}
          folder={`pieces/${slug}`}
        />

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Le champ s'appelait « Prix en euros », ce qui était faux
              dès que la boutique comptait dans une autre monnaie : on
              saisit le prix DANS LA DEVISE indiquée à côté, et le site
              affiche l'équivalent en euros tout seul. */}
          <Text
            name="price_euros"
            label="Prix"
            hint="Dans la devise ci-contre. Vide si le prix varie."
            inputMode="decimal"
            defaultValue={priceEuros}
            placeholder="80"
          />
          <Text
            name="compare_at_euros"
            label="Prix barré"
            hint="Le prix d'avant. Ignoré s'il n'est pas supérieur au prix actuel."
            inputMode="decimal"
            defaultValue={compareEuros}
            placeholder="110"
          />
          <Text
            name="currency"
            label="Devise"
            hint="EUR, DKK, GBP… Le site convertit en euros pour l'affichage."
            defaultValue={product?.currency ?? "EUR"}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Text
            name="size_label"
            label="Intitulé des déclinaisons"
            hint="Taille, Couleur, Format…"
            defaultValue={product?.size_label ?? "Taille"}
          />
          <div className="sm:col-span-2">
            <Text
              name="sizes"
              label="Déclinaisons disponibles"
              hint="Séparées par des virgules. L'import Shopify les remplit tout seul, ruptures comprises."
              defaultValue={sizeList}
              placeholder="XS, S, M, L, XL"
            />
          </div>
        </div>

        {/* « Ordre d'affichage » a disparu. Un numéro à saisir à la
            main pour ranger ses pièces les unes par rapport aux autres
            ne veut rien dire tant qu'on ne les a pas toutes sous les
            yeux, et personne ne s'en servait. L'ordre reste celui de
            l'arrivée, ce qui est prévisible. */}
        {/* Même raison que pour un post : personne ne savait ce qu'on
            attendait dans ce champ, et on le confondait avec un lien.
            L'adresse existante est conservée telle quelle — la changer
            casserait les liens déjà partagés. */}
        {product?.slug && <input type="hidden" name="piece_slug" value={product.slug} />}

        <Text
          name="shop_url"
          label="Lien d'achat"
          hint="La page de cette pièce sur ta boutique. C'est là qu'on envoie le visiteur."
          type="url"
          required
          defaultValue={product?.shop_url ?? brand.shop_url ?? ""}
          placeholder="https://"
        />

        <CheckGroup
          name="categories"
          label="Rayon"
          options={withExisting(PRODUCT_CATEGORIES, product?.categories)}
          selected={product?.categories}
        />

        <div className="flex flex-wrap gap-6">
          <Check name="available" label="Disponible" defaultChecked={product?.available ?? true} />
          <Check name="featured" label="Mettre en avant" defaultChecked={product?.featured} />
        </div>

        <Select
          name="status"
          label="État"
          hint="Un brouillon n'apparaît pas sur ta page publique."
          defaultValue={product?.status ?? "published"}
        >
          <option value="published">Publiée</option>
          <option value="draft">Brouillon</option>
        </Select>
      </AdminForm>
    </>
  );
}
