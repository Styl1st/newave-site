import AdminForm from "@/components/admin/AdminForm";
import BrandSpaceNav from "@/components/BrandSpaceNav";
import ImageUploader from "@/components/admin/ImageUploader";
import { Area, CheckGroup, Select, Text } from "@/components/admin/fields";
import { saveBrandPresentation } from "../actions";
import { requireManagedBrand } from "@/lib/brand-space";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";

type Props = { params: Promise<{ slug: string }> };

export default async function BrandPresentation({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);

  return (
    <>
      <BrandSpaceNav slug={slug} name={brand.name} isAdmin={isAdmin} published={brand.status === "published"} />

      <header className="mb-7">
        <p className="eyebrow m-0">Ta page</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
          Présentation
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          C&apos;est ce que voient les visiteurs sur ta fiche. Le nom, l&apos;adresse de
          la page et la mise en avant restent gérés par la rédaction — le reste
          t&apos;appartient.
        </p>
      </header>

      <AdminForm action={saveBrandPresentation} submitLabel="Enregistrer">
        <input type="hidden" name="slug" value={slug} />

        <Text
          name="tagline"
          label="Phrase d'accroche"
          hint="Une ligne, celle qui apparaît sur ta carte dans l'annuaire."
          defaultValue={brand.tagline}
          placeholder="Minimalisme français, séries limitées"
        />

        <Area
          name="description"
          label="Ta démarche"
          hint="Ce que tu fabriques, comment, et pourquoi. Les visiteurs viennent pour ça."
          rows={8}
          defaultValue={brand.description}
        />

        <div className="grid gap-6 sm:grid-cols-3">
          <Text name="country" label="Pays" defaultValue={brand.country} />
          <Text name="city" label="Ville" defaultValue={brand.city ?? ""} placeholder="Paris" />
          <Text name="founded_year" label="Année de création" type="number" min={1900} max={2100} defaultValue={brand.founded_year ?? ""} />
        </div>

        <CheckGroup
          name="categories"
          label="Catégories"
          hint="Elles déterminent dans quels filtres de l'annuaire tu apparais."
          options={withExisting(BRAND_CATEGORIES, brand.categories)}
          selected={brand.categories}
        />

        <Select name="price_tier" label="Gamme de prix" defaultValue={brand.price_tier}>
          <option value="accessible">Accessible</option>
          <option value="intermediaire">Intermédiaire</option>
          <option value="premium">Premium</option>
        </Select>

        <Text
          name="shop_url"
          label="Boutique ou site officiel"
          hint="Une seule adresse : celle où l'on peut acheter tes pièces."
          type="url"
          defaultValue={brand.shop_url ?? brand.website_url ?? ""}
          placeholder="https://"
        />

        <Text name="instagram" label="Instagram" hint="Sans l'arobase." defaultValue={brand.instagram ?? ""} placeholder="tamarque" />

        <ImageUploader
          name="cover_url"
          label="Image de couverture"
          defaultValue={brand.cover_url}
          folder={`marques/${slug}`}
        />
        <ImageUploader
          name="logo_url"
          label="Logo"
          defaultValue={brand.logo_url}
          folder={`marques/${slug}`}
        />
      </AdminForm>
    </>
  );
}
