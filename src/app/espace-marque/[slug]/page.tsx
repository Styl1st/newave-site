import BrandSpaceNav from "@/components/BrandSpaceNav";
import BrandPrefill from "@/components/admin/BrandPrefill";
import ImportHighlight from "@/components/ImportHighlight";
import { getBrandProducts } from "@/lib/brand-space";
import ImageUploader from "@/components/admin/ImageUploader";
import AdminForm from "@/components/admin/AdminForm";
import { Area, CheckGroup, Select, Text } from "@/components/admin/fields";
import { saveBrandPresentation } from "../actions";
import { requireManagedBrand } from "@/lib/brand-space";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";

type Props = { params: Promise<{ slug: string }> };

export default async function BrandPresentation({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);
  const pieces = await getBrandProducts(brand.id);

  /*
   * Un formulaire d'un seul tenant, plus un parcours en quatre étapes.
   *
   * Les étapes servent à CRÉER : elles guident quelqu'un qui part de
   * rien et ne sait pas ce qu'on attend de lui. Une fois la marque
   * créée, elles deviennent une gêne — pour corriger une faute dans sa
   * description, il fallait traverser trois écrans, et rien ne
   * s'enregistrait avant la fin.
   *
   * Ici tout est visible, on modifie ce qu'on veut, on enregistre.
   * C'est le fonctionnement d'un profil, et c'est celui que tout le
   * monde connaît déjà.
   */
  return (
    <>
      <BrandSpaceNav slug={slug} name={brand.name} isAdmin={isAdmin} published={brand.status === "published"} />

      <header className="mb-5 sm:mb-7">
        <p className="eyebrow m-0">Ta page</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Présentation
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          Modifie ce que tu veux, quand tu veux, puis enregistre. Le nom et la mise en
          avant restent gérés par la rédaction.
        </p>
      </header>

      {/* Le nom n'est pas modifiable ici : il reste géré par la rédaction. */}
      <BrandPrefill modeCreation={false} />

      <ImportHighlight slug={slug} shopUrl={brand.shop_url} vide={pieces.length === 0} />

      <AdminForm action={saveBrandPresentation} submitLabel="Enregistrer ma page">
        <input type="hidden" name="slug" value={slug} />

        <Bloc titre="Ton identité" intro="Une phrase et deux images. C'est ce que les gens voient avant de cliquer, donc c'est ce qui décide s'ils cliquent.">
          <Text
            name="tagline"
            label="Ta phrase, en une ligne"
            hint="Pas un slogan : ce que tu fais, dit simplement. « Minimalisme français, séries limitées » suffit."
            defaultValue={brand.tagline}
            placeholder="Minimalisme français, séries limitées"
          />
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
        </Bloc>

        <Bloc titre="Ta démarche" intro="La partie qui compte. Raconte comment tu fabriques et pourquoi. C'est ce que les gens viennent chercher ici, pas une fiche produit.">
          <Area
            name="description"
            label="Raconte"
            hint="Matières, ateliers, quantités, ce que tu refuses de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication."
            rows={10}
            defaultValue={brand.description}
          />
        </Bloc>

        <Bloc titre="D'où tu viens" intro="Ces informations alimentent les filtres de l'annuaire. Elles t'aident à être trouvé.">
          <div className="grid gap-6 sm:grid-cols-3">
            <Text name="country" label="Pays" defaultValue={brand.country} />
            <Text name="city" label="Ville" defaultValue={brand.city ?? ""} placeholder="Paris" />
            <Text
              name="founded_year"
              label="Année de création"
              type="number"
              min={1900}
              max={2100}
              defaultValue={brand.founded_year ?? ""}
            />
          </div>

          <CheckGroup
            name="categories"
            label="Tes catégories"
            hint="Coche ce qui te correspond vraiment. En cocher dix pour être partout dessert plus qu'autre chose."
            options={withExisting(BRAND_CATEGORIES, brand.categories)}
            selected={brand.categories}
          />

          <Select name="price_tier" label="Gamme de prix" defaultValue={brand.price_tier}>
            <option value="accessible">Accessible</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="premium">Premium</option>
          </Select>
        </Bloc>

        <Bloc titre="Où te trouver" intro="Les liens vers lesquels on enverra les visiteurs. Le dernier pas avant l'achat.">
          <Text
            name="shop_url"
            label="Boutique ou site officiel"
            hint="Une seule adresse : celle où l'on peut acheter tes pièces."
            type="url"
            defaultValue={brand.shop_url ?? brand.website_url ?? ""}
            placeholder="https://"
          />
          <Text
            name="instagram"
            label="Instagram"
            hint="Sans l'arobase."
            defaultValue={brand.instagram ?? ""}
            placeholder="tamarque"
          />
        </Bloc>
      </AdminForm>
    </>
  );
}

/** Une section du formulaire : un titre, une phrase, des champs. */
function Bloc({
  titre,
  intro,
  children,
}: {
  titre: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass p-4 sm:p-5">
      <h2 className="m-0 text-[15.5px] font-extrabold tracking-[-0.01em] text-white">{titre}</h2>
      <p className="m-0 mb-5 mt-1.5 text-[13px] leading-relaxed text-white/65">{intro}</p>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
