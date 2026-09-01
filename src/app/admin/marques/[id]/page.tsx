import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import PanneauEdition from "@/components/PanneauEdition";
import AdminForm from "@/components/admin/AdminForm";
import BrandManagers from "@/components/admin/BrandManagers";
import ChampsLieu from "@/components/admin/ChampsLieu";
import DeleteButton from "@/components/admin/DeleteButton";
import ImageUploader from "@/components/admin/ImageUploader";
import ParcoursNouvelleMarque from "@/components/admin/ParcoursNouvelleMarque";
import PublishToggle from "@/components/admin/PublishToggle";
import VisuelCouverture from "@/components/admin/VisuelCouverture";
import { Area, Check, CheckGroup, Select, Text } from "@/components/admin/fields";
import { deleteBrand, saveBrand, saveBrandReglages } from "../../actions";
import { adminGetBrand, adminGetBrandManagers, adminGetVilles } from "@/lib/admin-queries";
import { paysAvecActuel } from "@/lib/pays";
import { BRAND_CATEGORIES, withExisting } from "@/lib/taxonomy";
import { ACCES, ACCES_AIDE, ACCES_LABEL, unAcces } from "@/lib/acces";
import { AUDIENCES, AUDIENCE_AIDE, AUDIENCE_LABEL, uneAudience } from "@/lib/audience";

/**
 * Enregistrer une fiche peut déclencher la lecture de la boutique, et
 * parcourir un plan de site demande une trentaine de requêtes : la
 * limite par défaut de dix secondes couperait l'import en plein
 * milieu. Même valeur que la page d'import de l'espace marque.
 */
export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

/**
 * Une marque, vue de l'administration. Deux pages en une, et ce n'est
 * pas un hasard : créer et corriger ne sont pas le même geste.
 *
 * CRÉER, C'EST UN PARCOURS. On arrivait devant une page de trente
 * champs vides, sans savoir par lequel commencer, pendant qu'un
 * créateur, lui, était pris par la main sur /candidature. Il n'y avait
 * aucune raison que celui qui tient l'annuaire soit le moins bien
 * servi : c'est donc le même chemin en quatre écrans, avec la seule
 * différence qui compte — au bout, une marque, pas une candidature en
 * attente d'examen. Voir `ParcoursNouvelleMarque`.
 *
 * CORRIGER, C'EST LE PANNEAU DE LA MARQUE. Il existait ici un second
 * formulaire, qui demandait les mêmes choses que celui des créateurs
 * avec d'autres mots. Deux définitions d'une même fiche, dont une seule
 * était corrigée le jour où il manquait un champ. On ouvre désormais le
 * panneau que la marque ouvre chez elle, et l'on écrit par la même
 * action serveur.
 *
 * NE RESTE ICI QUE CE QU'UNE MARQUE NE DÉCIDE PAS POUR ELLE-MÊME : son
 * nom de référence, l'adresse de sa page, la mise à la une, la façon
 * dont on achète chez elle. Publier n'en fait pas partie : c'est le
 * bouton du haut, et lui seul, parce qu'il applique la règle commune.
 */
export default async function EditBrand({ params }: Props) {
  const { id } = await params;
  const isNew = id === "nouveau";
  const brand = isNew ? null : await adminGetBrand(id);
  if (!isNew && !brand) notFound();
  const managers = isNew ? [] : await adminGetBrandManagers(brand!.id);
  // Les villes déjà employées dans l'annuaire, pour les proposer. Elles
  // ne servent qu'au parcours de création : ailleurs, c'est le panneau
  // de la marque qui demande son origine.
  const villes: Record<string, string[]> = isNew ? await adminGetVilles() : {};

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

      {isNew ? (
        /*
         * Le formulaire est rendu ICI, par le serveur, et confié au
         * parcours. Il y garde son identité d'un écran à l'autre : le
         * parcours peut donc le cacher et le montrer sans que React en
         * refasse le rendu, et ce que la lecture du site a écrit dans
         * ses champs y reste. Reconstruit à chaque étape, il perdrait
         * tout entre le deuxième écran et le troisième, sans un mot.
         */
        <ParcoursNouvelleMarque>
          <AdminForm action={saveBrand} submitLabel="Créer la marque">
            <Bloc titre="L'identité" intro="Ce que le visiteur voit en premier.">
              <Text
                name="name"
                label="Nom de la marque"
                required
                placeholder="Le nom tel qu'il s'écrit"
              />
              <Text
                name="tagline"
                label="Phrase d'accroche"
                hint="Une ligne, affichée sur la carte de l'annuaire."
                placeholder="Une phrase, pas un slogan"
              />
              {/* Un seul bloc pour la couverture, fixe ou animée : personne
                  ne pense « couverture fixe » et « couverture animée », on
                  pense « le visuel de la marque ». */}
              <VisuelCouverture folder="marques" />
              <ImageUploader name="logo_url" label="Logo" folder="marques" />
            </Bloc>

            <Bloc
              titre="La démarche"
              intro="Le texte de la fiche. Si la marque gère sa page elle-même, elle pourra le réécrire."
            >
              <Area name="description" label="Description" rows={10} />
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
              <ChampsLieu pays={paysAvecActuel(undefined)} villes={villes} />

              <CheckGroup
                name="categories"
                label="Catégories"
                options={withExisting(BRAND_CATEGORIES, undefined)}
              />

              <Select name="price_tier" label="Gamme de prix" defaultValue="intermediaire">
                <option value="accessible">Accessible</option>
                <option value="intermediaire">Intermédiaire</option>
                <option value="premium">Premium</option>
              </Select>
            </Bloc>

            <Bloc
              titre="Liens et publication"
              intro="Où envoyer les visiteurs, et si cette fiche est visible."
            >
              <Text
                name="shop_url"
                label="Boutique ou site officiel"
                hint="Une seule adresse : celle où l'on peut acheter, ou à défaut celle de la marque."
                type="url"
                placeholder="https://"
              />

              {/* Une boutique fermée n'est pas une fiche incomplète.
                  Beaucoup de marques ne vendent que par drops, sur
                  invitation, ou font patienter sur une liste : le dire
                  permet de les publier au lieu de les retenir en brouillon
                  pour un catalogue vide qui est leur état normal. */}
              {/* À qui ça s'adresse. C'est la première question que se pose
                  un visiteur, et il fallait ouvrir la fiche pour y
                  répondre. Rangé ici et non dans les catégories : voir
                  `lib/audience` pour le pourquoi. */}
              <Select
                name="audience"
                label="À qui ça s'adresse"
                hint={AUDIENCE_AIDE[uneAudience(undefined)]}
                defaultValue={uneAudience(undefined)}
              >
                {AUDIENCES.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {AUDIENCE_LABEL[valeur]}
                  </option>
                ))}
              </Select>
              <Select
                name="acces"
                label="Comment on achète"
                hint={ACCES_AIDE[unAcces(undefined)]}
                defaultValue={unAcces(undefined)}
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
                placeholder="tamarque"
              />
              <Text
                name="slug"
                label="Adresse de la page"
                hint="Laisse vide et je la fabrique à partir du nom."
                placeholder="ta-marque"
              />

              <Check name="featured" label="Mettre à la une sur l'accueil" />

              <Select
                name="status"
                label="État"
                hint="Une nouvelle fiche part en brouillon. Tu la publieras depuis le bouton en haut de sa page."
                defaultValue="draft"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </Select>
            </Bloc>
          </AdminForm>
        </ParcoursNouvelleMarque>
      ) : (
        <>
          <section className="glass mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-7">
            <div className="min-w-0">
              <h2 className="m-0 text-[17px] font-extrabold text-white">La fiche</h2>
              <p className="m-0 mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/72">
                Le panneau est celui que la marque ouvre depuis sa page : mêmes champs,
                même enregistrement. Ce qu&apos;on corrige ici, elle le retrouve chez elle,
                et l&apos;inverse. On voit donc exactement ce qu&apos;elle voit quand on
                lui explique quoi remplir.
              </p>
            </div>
            <PanneauEdition
              brand={brand!}
              voix="administration"
              className="border border-white/35 bg-white/8 hover:border-white/70"
            />
          </section>

          <section className="mb-8">
            <div className="mb-4">
              <h2 className="m-0 text-[17px] font-extrabold text-white">
                Réglages d&apos;administration
              </h2>
              <p className="m-0 mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/72">
                Ce qu&apos;une marque ne décide pas pour elle-même. Publier n&apos;en fait
                pas partie : c&apos;est le bouton en haut de page, qui vérifie d&apos;abord
                que la fiche a de quoi paraître.
              </p>
            </div>

            <AdminForm action={saveBrandReglages} submitLabel="Enregistrer les réglages">
              <input type="hidden" name="id" value={brand!.id} />

              <Text
                name="name"
                label="Nom de la marque"
                required
                defaultValue={brand!.name}
                placeholder="Le nom tel qu'il s'écrit"
              />
              <Text
                name="slug"
                label="Adresse de la page"
                hint="En changer casse les liens déjà partagés vers cette page. Laisse vide et je la refabrique à partir du nom."
                defaultValue={brand!.slug}
                placeholder="ta-marque"
              />

              {/* À qui ça s'adresse, et comment on achète : deux réponses
                  qui commandent les filtres de l'annuaire et la règle de
                  publication. Une marque qui se déclarerait « ouverte »
                  pour se publier plus vite fausserait les deux. */}
              <Select
                name="audience"
                label="À qui ça s'adresse"
                hint={AUDIENCE_AIDE[uneAudience(brand!.audience)]}
                defaultValue={uneAudience(brand!.audience)}
              >
                {AUDIENCES.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {AUDIENCE_LABEL[valeur]}
                  </option>
                ))}
              </Select>
              <Select
                name="acces"
                label="Comment on achète"
                hint={ACCES_AIDE[unAcces(brand!.acces)]}
                defaultValue={unAcces(brand!.acces)}
              >
                {ACCES.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {ACCES_LABEL[valeur]}
                  </option>
                ))}
              </Select>

              <Check
                name="featured"
                label="Mettre à la une sur l'accueil"
                defaultChecked={brand!.featured}
              />
            </AdminForm>
          </section>

          <BrandManagers brandId={brand!.id} managers={managers} />
        </>
      )}
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
