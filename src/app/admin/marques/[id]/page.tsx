import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import BrandManagers from "@/components/admin/BrandManagers";
import BrandPrefill from "@/components/admin/BrandPrefill";
import PublishToggle from "@/components/admin/PublishToggle";
import DeleteButton from "@/components/admin/DeleteButton";
import ImageUploader from "@/components/admin/ImageUploader";
import VisuelCouverture from "@/components/admin/VisuelCouverture";
import AdminForm from "@/components/admin/AdminForm";
import { Area, Check, CheckGroup, Select, Text } from "@/components/admin/fields";
import { deleteBrand, saveBrand } from "../../actions";
import ChampsLieu from "@/components/admin/ChampsLieu";
import { adminGetBrand, adminGetBrandManagers, adminGetVilles } from "@/lib/admin-queries";
import { paysAvecActuel } from "@/lib/pays";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";
import { ACCES, ACCES_AIDE, ACCES_LABEL, unAcces } from "@/lib/acces";

/**
 * Enregistrer une fiche peut déclencher la lecture de la boutique, et
 * parcourir un plan de site demande une trentaine de requêtes : la
 * limite par défaut de dix secondes couperait l'import en plein
 * milieu. Même valeur que la page d'import de l'espace marque.
 */
export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

/**
 * La fiche d'une marque, d'un seul tenant.
 *
 * Elle se remplissait en quatre étapes, avec une barre de progression.
 * Un parcours guidé a du sens quand on part de rien et qu'on ignore ce
 * qu'on attend de nous. Ici, on vient presque toujours corriger une
 * ligne, et il fallait traverser trois écrans pour l'atteindre, sans
 * rien pouvoir enregistrer avant la fin.
 *
 * Tout est visible, on modifie ce qu'on veut, on enregistre. Les
 * sections restent, mais comme des repères, pas comme des portes.
 */
export default async function EditBrand({ params }: Props) {
  const { id } = await params;
  const isNew = id === "nouveau";
  const brand = isNew ? null : await adminGetBrand(id);
  if (!isNew && !brand) notFound();
  const managers = isNew ? [] : await adminGetBrandManagers(brand!.id);
  // Les villes déjà employées dans l'annuaire, pour les proposer.
  const villes = await adminGetVilles();

  const bouton =
    "rounded-full border border-white/35 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]";

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
        <div>
          <BackLink href="/admin/marques">Marques</BackLink>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
              {isNew ? "Nouvelle marque" : brand!.name}
            </h1>
            {!isNew && (
              <span
                className={
                  brand!.status === "published"
                    ? "rounded-full bg-white px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)]"
                    : "rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.1em] text-white/80"
                }
              >
                {brand!.status === "published" ? "En ligne" : "Brouillon"}
              </span>
            )}
          </div>
        </div>

        {!isNew && (
          <div className="flex flex-wrap items-center gap-3">
            <PublishToggle
              brandId={brand!.id}
              brandName={brand!.name}
              published={brand!.status === "published"}
            />
            <Link href={`/marques/${brand!.slug}`} className={bouton}>
              Voir la page
            </Link>
            <Link href={`/espace-marque/${brand!.slug}/pieces`} className={bouton}>
              Pièces
            </Link>
            <Link href={`/espace-marque/${brand!.slug}/stats`} className={bouton}>
              Statistiques
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

      <BrandPrefill modeCreation={isNew} />

      <AdminForm action={saveBrand} submitLabel={isNew ? "Créer la marque" : "Enregistrer"}>
        {!isNew && <input type="hidden" name="id" value={brand!.id} />}
        {brand?.published_at && <input type="hidden" name="published_at" value={brand.published_at} />}

        <Bloc titre="L'identité" intro="Ce que le visiteur voit en premier.">
          <Text
            name="name"
            label="Nom de la marque"
            required
            defaultValue={brand?.name}
            placeholder="Le nom tel qu'il s'écrit"
          />
          <Text
            name="tagline"
            label="Phrase d'accroche"
            hint="Une ligne, affichée sur la carte de l'annuaire."
            defaultValue={brand?.tagline}
            placeholder="Une phrase, pas un slogan"
          />
          {/* Un seul bloc pour la couverture, fixe ou animée : personne
              ne pense « couverture fixe » et « couverture animée », on
              pense « le visuel de la marque ». */}
          <VisuelCouverture
            image={brand?.cover_url}
            video={brand?.cover_video_url}
            folder="marques"
          />
          <ImageUploader name="logo_url" label="Logo" defaultValue={brand?.logo_url} folder="marques" />
        </Bloc>

        <Bloc
          titre="La démarche"
          intro="Le texte de la fiche. Si la marque gère sa page elle-même, elle pourra le réécrire."
        >
          <Area name="description" label="Description" rows={10} defaultValue={brand?.description} />
        </Bloc>

        <Bloc
          titre="Le classement"
          intro="Origine, catégories, gamme. C'est ce qui fait apparaître la marque dans les filtres."
        >
          {/* Trois listes plutôt que trois champs libres. Le pays
              surtout : « Etats-Unis », « USA » et « États-Unis »
              faisaient trois origines distinctes dans les filtres, sans
              que rien ne le signale. Vide reste possible, et veut dire
              « devine-le depuis la boutique ». */}
          <ChampsLieu
            pays={paysAvecActuel(brand?.country)}
            villes={villes}
            paysActuel={brand?.country}
            villeActuelle={brand?.city}
            anneeActuelle={brand?.founded_year}
          />

          <CheckGroup
            name="categories"
            label="Catégories"
            options={withExisting(BRAND_CATEGORIES, brand?.categories)}
            selected={brand?.categories}
          />

          <Select
            name="price_tier"
            label="Gamme de prix"
            defaultValue={brand?.price_tier ?? "intermediaire"}
          >
            <option value="accessible">Accessible</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="premium">Premium</option>
          </Select>
        </Bloc>

        <Bloc titre="Liens et publication" intro="Où envoyer les visiteurs, et si cette fiche est visible.">
          <Text
            name="shop_url"
            label="Boutique ou site officiel"
            hint="Une seule adresse : celle où l'on peut acheter, ou à défaut celle de la marque."
            type="url"
            defaultValue={brand?.shop_url ?? brand?.website_url ?? ""}
            placeholder="https://"
          />

          {/* Une boutique fermée n'est pas une fiche incomplète.
              Beaucoup de marques ne vendent que par drops, sur
              invitation, ou font patienter sur une liste : le dire
              permet de les publier au lieu de les retenir en brouillon
              pour un catalogue vide qui est leur état normal. */}
          <Select
            name="acces"
            label="Comment on achète"
            hint={ACCES_AIDE[unAcces(brand?.acces)]}
            defaultValue={unAcces(brand?.acces)}
          >
            {ACCES.map((valeur) => (
              <option key={valeur} value={valeur}>
                {ACCES_LABEL[valeur]}
              </option>
            ))}
          </Select>
          <Text
            name="instagram"
            label="Instagram"
            hint="Sans l'arobase."
            defaultValue={brand?.instagram ?? ""}
            placeholder="tamarque"
          />
          <Text
            name="slug"
            label="Adresse de la page"
            hint="Laisse vide et je la fabrique à partir du nom."
            defaultValue={brand?.slug}
            placeholder="ta-marque"
          />

          <Check name="featured" label="Mettre à la une sur l'accueil" defaultChecked={brand?.featured} />

          <Select
            name="status"
            label="État"
            hint={
              isNew
                ? "Une nouvelle fiche part en brouillon. Tu la publieras depuis le bouton en haut de page."
                : "Le bouton en haut de page fait la même chose, sans repasser par le formulaire."
            }
            defaultValue={brand?.status ?? "draft"}
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </Select>
        </Bloc>
      </AdminForm>

      {!isNew && <BrandManagers brandId={brand!.id} managers={managers} />}
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
    <section className="border-t border-white/12 pt-6 first:border-0 first:pt-0">
      <h2 className="m-0 text-[15.5px] font-extrabold tracking-[-0.01em] text-white">{titre}</h2>
      <p className="m-0 mb-5 mt-1.5 text-[13px] leading-relaxed text-white/65">{intro}</p>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
