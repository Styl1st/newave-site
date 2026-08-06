import Link from "next/link";
import { notFound } from "next/navigation";
import AdminForm from "@/components/admin/AdminForm";
import DeleteButton from "@/components/admin/DeleteButton";
import ImageUploader from "@/components/admin/ImageUploader";
import { Check, Select, Text } from "@/components/admin/fields";
import { deleteProduct, saveProduct } from "../../actions";
import { adminGetBrands, adminGetProduct } from "@/lib/admin-queries";

type Props = { params: Promise<{ id: string }> };

export default async function EditProduct({ params }: Props) {
  const { id } = await params;
  const isNew = id === "nouveau";

  const [product, brands] = await Promise.all([
    isNew ? Promise.resolve(null) : adminGetProduct(id),
    adminGetBrands(),
  ]);
  if (!isNew && !product) notFound();

  const priceEuros =
    product?.price_cents != null ? (product.price_cents / 100).toFixed(2) : "";

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/pieces" className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/60 hover:text-white">
            ← Pièces
          </Link>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            {isNew ? "Nouvelle pièce" : product!.name}
          </h1>
        </div>
        {!isNew && <DeleteButton action={deleteProduct} id={product!.id} label="Supprimer cette pièce" />}
      </header>

      {brands.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">
            Crée d&apos;abord une marque : une pièce doit appartenir à quelqu&apos;un.
          </p>
        </div>
      ) : (
        <AdminForm action={saveProduct} submitLabel={isNew ? "Créer la pièce" : "Enregistrer"}>
          {!isNew && <input type="hidden" name="id" value={product!.id} />}

          <Select name="brand_id" label="Marque" required defaultValue={product?.brand_id ?? ""}>
            <option value="">Choisir…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>

          <Text name="name" label="Nom de la pièce" required defaultValue={product?.name} placeholder="Write Denim Pant" />

          <div className="grid gap-6 sm:grid-cols-3">
            <Text
              name="price_euros"
              label="Prix en euros"
              hint="Laisse vide si le prix varie."
              inputMode="decimal"
              defaultValue={priceEuros}
              placeholder="110"
            />
            <Text name="currency" label="Devise" defaultValue={product?.currency ?? "EUR"} />
            <Text name="position" label="Ordre d'affichage" type="number" defaultValue={product?.position ?? 0} />
          </div>

          <Text
            name="shop_url"
            label="Lien vers la boutique"
            hint="C'est là que part le visiteur pour acheter. Obligatoire."
            type="url"
            required
            defaultValue={product?.shop_url ?? ""}
            placeholder="https://"
          />

          <ImageUploader defaultValue={product?.image_url} folder="pieces" />

          <Text
            name="categories"
            label="Catégories"
            hint="Séparées par des virgules. Elles filtrent la page Pièces."
            defaultValue={product?.categories.join(", ")}
            placeholder="Denim, Pantalon"
          />

          <Check name="featured" label="Mettre en avant" defaultChecked={product?.featured} />

          <Select name="status" label="État" defaultValue={product?.status ?? "published"}>
            <option value="published">Publié</option>
            <option value="draft">Brouillon</option>
          </Select>
        </AdminForm>
      )}
    </>
  );
}
