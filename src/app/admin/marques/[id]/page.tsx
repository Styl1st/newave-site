import { notFound, redirect } from "next/navigation";
import BackLink from "@/components/BackLink";
import AdminForm from "@/components/admin/AdminForm";
import ChampsLieu from "@/components/admin/ChampsLieu";
import ImageUploader from "@/components/admin/ImageUploader";
import ParcoursNouvelleMarque from "@/components/admin/ParcoursNouvelleMarque";
import VisuelCouverture from "@/components/admin/VisuelCouverture";
import { Area, Check, CheckGroup, Select, Text } from "@/components/admin/fields";
import { saveBrand } from "../../actions";
import { adminGetBrand, adminGetVilles } from "@/lib/admin-queries";
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
 * Créer une marque. Rien de plus, désormais.
 *
 * CRÉER, C'EST UN PARCOURS. On arrivait devant une page de trente
 * champs vides, sans savoir par lequel commencer, pendant qu'un
 * créateur, lui, était pris par la main sur /candidature. Il n'y avait
 * aucune raison que celui qui tient l'annuaire soit le moins bien
 * servi : c'est donc le même chemin en quatre écrans, avec la seule
 * différence qui compte — au bout, une marque, pas une candidature en
 * attente d'examen. Voir `ParcoursNouvelleMarque`.
 *
 * CORRIGER A DÉMÉNAGÉ, ET C'ÉTAIT LA SUITE LOGIQUE. Il y avait ici un
 * panneau d'édition, puis un second formulaire pour les réglages
 * d'administration, pendant qu'une marque en ouvrait un troisième chez
 * elle. Trois entrées vers la même fiche, et autant d'occasions d'en
 * corriger une seule. Il n'y a plus qu'un éditeur, à une seule adresse,
 * que les deux publics atteignent : `/espace-marque/[slug]/modifier`.
 * Il ne pouvait pas rester sous `/admin`, qui renvoie chez lui tout ce
 * qui n'est pas administrateur.
 *
 * Cette adresse-ci est conservée plutôt que supprimée : elle traîne
 * dans des favoris, dans d'anciens liens et dans la mémoire des
 * navigateurs. Un renvoi coûte moins cher qu'une page introuvable.
 */
export default async function EditBrand({ params }: Props) {
  const { id } = await params;

  if (id !== "nouveau") {
    const marque = await adminGetBrand(id);
    if (!marque) notFound();
    // Par l'adresse de la page et non par l'identifiant : l'éditeur vit
    // dans l'espace marque, où c'est le `slug` qui désigne une marque.
    redirect(`/espace-marque/${marque.slug}/modifier`);
  }

  // Les villes déjà employées dans l'annuaire, pour les proposer.
  const villes: Record<string, string[]> = await adminGetVilles();

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
        <div>
          <BackLink href="/admin/marques">Marques</BackLink>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
              Nouvelle marque
            </h1>
          </div>
        </div>
      </header>

      {/*
       * Le formulaire est rendu ICI, par le serveur, et confié au
       * parcours. Il y garde son identité d'un écran à l'autre : le
       * parcours peut donc le cacher et le montrer sans que React en
       * refasse le rendu, et ce que la lecture du site a écrit dans
       * ses champs y reste. Reconstruit à chaque étape, il perdrait
       * tout entre le deuxième écran et le troisième, sans un mot.
       */}
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
