import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import BrandManagers from "@/components/admin/BrandManagers";
import DeleteButton from "@/components/admin/DeleteButton";
import ImageUploader from "@/components/admin/ImageUploader";
import StepForm, { type Etape } from "@/components/admin/StepForm";
import { Area, Check, CheckGroup, Select, Text } from "@/components/admin/fields";
import { deleteBrand, saveBrand } from "../../actions";
import { adminGetBrand, adminGetBrandManagers } from "@/lib/admin-queries";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";

type Props = { params: Promise<{ id: string }> };

export default async function EditBrand({ params }: Props) {
  const { id } = await params;
  const isNew = id === "nouveau";
  const brand = isNew ? null : await adminGetBrand(id);
  if (!isNew && !brand) notFound();
  const managers = isNew ? [] : await adminGetBrandManagers(brand!.id);

  const etapes: Etape[] = [
    {
      titre: "L'identité",
      intro: "Le nom, la phrase d'accroche et les visuels. Ce que le visiteur voit en premier.",
      contenu: (
        <>
          <Text
            name="name"
            label="Nom de la marque"
            required
            defaultValue={brand?.name}
            placeholder="Engineered By Aryes"
          />
          <Text
            name="tagline"
            label="Phrase d'accroche"
            hint="Une ligne, affichée sur la carte de l'annuaire."
            defaultValue={brand?.tagline}
            placeholder="Minimalisme français, séries limitées"
          />
          <ImageUploader name="cover_url" label="Image de couverture" defaultValue={brand?.cover_url} folder="marques" />
          <ImageUploader name="logo_url" label="Logo" defaultValue={brand?.logo_url} folder="marques" />
        </>
      ),
    },
    {
      titre: "La démarche",
      intro: "Le texte de la fiche. Si la marque gère sa page elle-même, elle pourra le réécrire.",
      contenu: (
        <Area name="description" label="Description" rows={10} defaultValue={brand?.description} />
      ),
    },
    {
      titre: "Le classement",
      intro: "Origine, catégories, gamme de prix. C'est ce qui fait apparaître la marque dans les filtres.",
      contenu: (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Text name="country" label="Pays" defaultValue={brand?.country ?? "France"} />
            <Text name="city" label="Ville" defaultValue={brand?.city ?? ""} placeholder="Paris" />
            <Text
              name="founded_year"
              label="Année de création"
              type="number"
              min={1900}
              max={2100}
              defaultValue={brand?.founded_year ?? ""}
            />
          </div>

          <CheckGroup
            name="categories"
            label="Catégories"
            options={withExisting(BRAND_CATEGORIES, brand?.categories)}
            selected={brand?.categories}
          />

          <Select name="price_tier" label="Gamme de prix" defaultValue={brand?.price_tier ?? "intermediaire"}>
            <option value="accessible">Accessible</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="premium">Premium</option>
          </Select>
        </>
      ),
    },
    {
      titre: "Liens et publication",
      intro: "Où envoyer les visiteurs, et si cette fiche doit être visible.",
      contenu: (
        <>
          <Text
            name="shop_url"
            label="Boutique ou site officiel"
            hint="Une seule adresse : celle où l'on peut acheter, ou à défaut celle de la marque."
            type="url"
            defaultValue={brand?.shop_url ?? brand?.website_url ?? ""}
            placeholder="https://"
          />
          <Text
            name="instagram"
            label="Instagram"
            hint="Sans l'arobase."
            defaultValue={brand?.instagram ?? ""}
            placeholder="engineeredbyaryes"
          />
          <Text
            name="slug"
            label="Adresse de la page"
            hint="Laisse vide et je la fabrique à partir du nom."
            defaultValue={brand?.slug}
            placeholder="engineered-by-aryes"
          />

          <Check name="featured" label="Mettre à la une sur l'accueil" defaultChecked={brand?.featured} />

          <Select name="status" label="État" defaultValue={brand?.status ?? "draft"}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </Select>
        </>
      ),
    },
  ];

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <BackLink href="/admin/marques">Marques</BackLink>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            {isNew ? "Nouvelle marque" : brand!.name}
          </h1>
        </div>

        {!isNew && (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/espace-marque/${brand!.slug}/stats`}
              className="rounded-full border border-white/35 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
            >
              Statistiques
            </Link>
            <Link
              href={`/espace-marque/${brand!.slug}/pieces`}
              className="rounded-full border border-white/35 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
            >
              Gérer les pièces
            </Link>
            <DeleteButton
              action={deleteBrand}
              id={brand!.id}
              label="Supprimer"
              confirmText="Supprimer la marque supprimera aussi ses pièces. Continuer ?"
            />
          </div>
        )}
      </header>

      <StepForm action={saveBrand} etapes={etapes} submitLabel={isNew ? "Créer la marque" : "Enregistrer"}>
        {!isNew && <input type="hidden" name="id" value={brand!.id} />}
        {brand?.published_at && <input type="hidden" name="published_at" value={brand.published_at} />}
      </StepForm>

      {!isNew && <BrandManagers brandId={brand!.id} managers={managers} />}
    </>
  );
}
