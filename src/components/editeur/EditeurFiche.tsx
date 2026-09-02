"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { annoncer } from "@/components/Confirmations";
import BrandManagers from "@/components/admin/BrandManagers";
import BrandPrefill from "@/components/admin/BrandPrefill";
import ChampsLieu from "@/components/admin/ChampsLieu";
import ImageUploader from "@/components/admin/ImageUploader";
import PretAPublier from "@/components/admin/PretAPublier";
import VisuelCouverture from "@/components/admin/VisuelCouverture";
import { Area, Check, CheckGroup, Select, Text } from "@/components/admin/fields";
import {
  compterLesModifications,
  useValeursDuFormulaire,
  valeursDeLaMarque,
} from "@/components/admin/etat-fiche";
import ApercuFiche from "./ApercuFiche";
import BarreEnregistrement from "./BarreEnregistrement";
import EnteteFiche from "./EnteteFiche";
import SommaireFiche, { type EntreeSommaire } from "./SommaireFiche";
import { enregistrerLaFiche } from "@/app/espace-marque/actions";
import { ACCES, ACCES_AIDE, ACCES_LABEL, doitAvoirDesPieces, unAcces } from "@/lib/acces";
import { AUDIENCES, AUDIENCE_AIDE, AUDIENCE_LABEL, uneAudience } from "@/lib/audience";
import { obstacleAPublication } from "@/lib/publication";
import type { Brand, Profile } from "@/lib/types";

/**
 * L'éditeur d'une fiche marque. UN SEUL, pour les deux publics.
 *
 * POURQUOI IL N'Y EN A PLUS QU'UN. Il y en avait deux : un formulaire
 * d'administration sur `/admin/marques/[id]`, et un panneau que la
 * marque ouvrait depuis sa page. Deux définitions d'une même fiche,
 * dont une seule était corrigée le jour où il manquait un champ. Ils
 * ont fusionné une première fois — l'administration ouvrait le panneau
 * du créateur — mais il restait deux pages, deux adresses, deux
 * enregistrements. C'est désormais la même page à la même adresse, et
 * ce qui change entre un administrateur et un créateur n'est pas
 * l'écran : ce sont les champs auxquels il a droit.
 *
 * ELLE VIT DANS L'ESPACE MARQUE, PAS DANS L'ADMINISTRATION. `/admin`
 * redirige tout ce qui n'est pas administrateur : y laisser l'éditeur
 * aurait voulu dire en garder un second ailleurs pour les créateurs, et
 * l'on serait revenu au point de départ. `requireManagedBrand` fait
 * exactement le tri qu'il faut — la marque à un administrateur quelle
 * qu'elle soit, la sienne à un gérant, la porte aux autres.
 *
 * LES CHAMPS RÉSERVÉS NE SONT PAS SEULEMENT CACHÉS. Le nom de
 * référence, l'adresse de la page, la mise à la une et « comment on
 * achète » ne s'affichent que pour un administrateur, mais un champ
 * caché reste envoyable à la main : c'est `enregistrerLaFiche` qui les
 * ignore, après avoir relu le rôle en base. Ce qui est ici n'est qu'une
 * question de propreté d'écran.
 *
 * TROIS COLONNES, ET CE QU'ELLES DEVIENNENT SUR UN TÉLÉPHONE. Sommaire,
 * formulaire, aperçu : à 390 pixels, aucune des trois n'a la place
 * d'exister à côté des autres. Le sommaire devient une rangée de
 * pastilles enroulées au-dessus du formulaire, l'aperçu et la
 * check-list passent en dessous, et le sommaire porte une entrée
 * « Prêt à publier » qui y descend d'un geste. La barre
 * d'enregistrement, elle, ne bouge pas : c'est la seule chose qui doit
 * rester à portée en bas d'un écran étroit.
 */

/** Longueur au-delà de laquelle l'accroche se fait couper sur la carte. */
const ACCROCHE_IDEALE = 70;

/** Ce que renvoie `enregistrerLaFiche`, tel qu'on le garde à l'écran. */
type Retour = { ok: boolean; error?: string; slug?: string; message?: string };

const GAMMES = [
  { valeur: "accessible", symbole: "€", libelle: "Accessible", aide: "L'essentiel sous cinquante euros." },
  { valeur: "intermediaire", symbole: "€€", libelle: "Intermédiaire", aide: "Le cas le plus courant." },
  { valeur: "premium", symbole: "€€€", libelle: "Premium", aide: "Petites séries, matières chères, pièces d'auteur." },
] as const;

export default function EditeurFiche({
  brand,
  estAdmin,
  pieces,
  gerants,
  pays,
  villes,
  categories,
}: {
  brand: Brand;
  /** Relu en base par `requireManagedBrand`, jamais deviné ici. */
  estAdmin: boolean;
  /** Combien de pièces la marque porte, brouillons compris. */
  pieces: number;
  gerants: Profile[];
  pays: string[];
  villes: Record<string, string[]>;
  categories: string[];
}) {
  const router = useRouter();

  /*
   * L'état de départ, celui que le serveur vient d'envoyer. Après un
   * enregistrement, `router.refresh()` renvoie la marque à jour, cet
   * objet change, et le compte de modifications retombe à zéro tout
   * seul : la barre disparaît sans qu'on ait à la remettre à jour.
   */
  const initiales = useMemo(() => valeursDeLaMarque(brand), [brand]);

  /*
   * Le formulaire arrive par un état, pas par une `ref`.
   *
   * « Annuler » le remonte d'un bloc en changeant sa clé — c'est le
   * seul moyen de faire revenir aussi `VisuelCouverture` et
   * `ImageUploader`, qui tiennent leur adresse dans un état React et
   * qu'un `form.reset()` ne toucherait pas. Une `ref` ne l'aurait pas
   * signalé : on serait resté accroché à un élément détaché, sans un mot.
   */
  const [cle, setCle] = useState(0);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const champPublier = useRef<HTMLInputElement>(null);

  const valeurs = useValeursDuFormulaire(form, initiales);
  const modifications = compterLesModifications(initiales, valeurs);

  const [etat, envoyer, enCours] = useActionState<Retour | null, FormData>(
    async (_precedent, donnees) => {
      const res = await enregistrerLaFiche(donnees);

      if (!res.ok) {
        annoncer(res.error ?? "L'enregistrement a échoué.", "erreur");
        return res;
      }

      annoncer(res.message ?? "Fiche enregistrée.");

      /*
       * L'adresse retenue par le serveur revient dans le champ.
       *
       * Le champ accepte d'être laissé vide — « je la refabrique à
       * partir du nom » — et le serveur en fabrique donc une. Sans cette
       * ligne, le champ resterait vide face à une fiche qui, elle, a une
       * adresse : la barre annoncerait une modification en attente sur
       * quelque chose que personne n'a touché, et jusqu'au rechargement.
       */
      const champAdresse = form?.elements.namedItem("nouveau_slug");
      if (res.slug && champAdresse instanceof HTMLInputElement) {
        champAdresse.value = res.slug;
      }

      /*
       * L'adresse de la page a pu changer sous nos pieds : rester sur
       * l'ancienne afficherait « marque introuvable » au premier
       * rechargement, alors que tout s'est bien passé.
       */
      if (res.slug && res.slug !== brand.slug) {
        router.replace(`/espace-marque/${res.slug}/modifier`);
      } else {
        router.refresh();
      }
      return res;
    },
    null
  );

  /*
   * L'avertissement avant de quitter.
   *
   * Le navigateur n'affiche sa boîte que si l'événement est annulé, et
   * il n'accepte pas de message personnalisé depuis des années : on se
   * contente donc de dire qu'il reste quelque chose, ce qui est
   * exactement l'information manquante.
   */
  useEffect(() => {
    if (modifications === 0) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifications]);

  /*
   * CE QUI DÉCIDE DE LA PUBLICATION EST APPELÉ ICI, PAS RECOPIÉ.
   *
   * `obstacleAPublication` est la seule définition de « publiable », et
   * l'importer dans le navigateur est explicitement le but de son
   * fichier : la check-list se recalcule à la frappe avec la fonction
   * même que le serveur exécute à l'enregistrement. Aucune règle n'est
   * réécrite ici — ni assouplie, ni durcie.
   */
  const exigeDesPieces = doitAvoirDesPieces({
    shop_url: valeurs.shop_url,
    website_url: brand.website_url,
    acces: valeurs.acces,
  });

  const fiche = {
    tagline: valeurs.tagline,
    description: valeurs.description,
    cover_url: valeurs.cover_url,
    logo_url: valeurs.logo_url,
    pieces,
    exigeDesPieces,
  };
  const obstacle = obstacleAPublication(fiche);

  /* ---- le sommaire ---- */

  const vide = (texte: string) => texte.trim() === "";
  const compter = (...manques: boolean[]) => manques.filter(Boolean).length;

  const sommaire: EntreeSommaire[] = [
    {
      id: "identite",
      titre: "L'identité",
      vides: compter(
        estAdmin && vide(valeurs.name),
        vide(valeurs.tagline),
        vide(valeurs.cover_url) && vide(valeurs.cover_video_url),
        vide(valeurs.logo_url)
      ),
    },
    { id: "demarche", titre: "La démarche", vides: compter(vide(valeurs.description)) },
    {
      id: "classement",
      titre: "Le classement",
      vides: compter(
        vide(valeurs.country),
        vide(valeurs.city),
        vide(valeurs.founded_year),
        valeurs.categories.length === 0
      ),
    },
    {
      id: "liens",
      titre: "Liens et boutique",
      vides: compter(vide(valeurs.shop_url), vide(valeurs.instagram)),
    },
  ];

  if (estAdmin) {
    sommaire.push({ id: "gerants", titre: "Les gérants", vides: compter(gerants.length === 0) });
  }

  /*
   * L'entrée « Prêt à publier » n'est pas une section du formulaire :
   * elle mène à la check-list, qui vit dans la troisième colonne. Sur un
   * téléphone cette colonne passe sous le formulaire, et c'est
   * précisément là qu'un raccourci devient nécessaire — sinon la
   * check-list ne se découvre qu'après avoir fait défiler tout le reste.
   */
  sommaire.push({ id: "publier", titre: "Prêt à publier", vides: obstacle ? 1 : 0 });

  /* ---- enregistrer ---- */

  function enregistrer(avecPublication: boolean) {
    if (!form) return;
    /*
     * Écriture directe dans un champ non contrôlé, juste avant l'envoi.
     * Passer par un état React n'aurait pas marché : le rendu suivant
     * arrive après la soumission, et le champ serait parti à « 0 ».
     */
    if (champPublier.current) champPublier.current.value = avecPublication ? "1" : "0";
    // `requestSubmit` et non `submit` : c'est le seul qui déclenche la
    // validation du navigateur, et donc le « Le nom est obligatoire ».
    form.requestSubmit();
    /*
     * Et l'on repose aussitôt l'intention à zéro. Les données sont déjà
     * relevées — React construit le `FormData` dans le gestionnaire de
     * soumission, avant que cette ligne s'exécute. Sans elle, un envoi
     * suivant déclenché autrement que par le bouton publierait une
     * seconde fois sans que personne l'ait demandé.
     */
    if (champPublier.current) champPublier.current.value = "0";
  }

  const ancre = "scroll-mt-[92px] sm:scroll-mt-[156px]";

  return (
    <>
      <EnteteFiche
        brand={brand}
        estAdmin={estAdmin}
        enCours={enCours}
        enregistre={Boolean(etat?.ok) && modifications === 0 && !enCours}
      />

      {/*
        LA GRILLE, ET LE PIÈGE QU'ELLE ÉVITE.

        `grid-cols-[minmax(0,1fr)]` au premier palier n'est pas
        décoratif : une grille sans modèle de colonnes s'en fabrique une
        implicite en `auto`, dimensionnée sur son enfant le plus large —
        et un seul aperçu un peu grand fait alors déborder toute la page
        vers la droite. Le `minmax(0,…)` des colonnes souples dit la même
        chose : une colonne a le droit d'être plus étroite que son
        contenu, à charge pour lui de se couper.

        La place de la barre d'enregistrement est réservée en bas tant
        qu'elle est visible : sans ça, elle recouvrirait le dernier champ
        du formulaire, qui est exactement celui qu'on vient de remplir.
      */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[190px_minmax(0,1fr)_300px] lg:gap-5 ${
          modifications > 0 ? "pb-[150px] sm:pb-[120px]" : "pb-10"
        }`}
      >
        <SommaireFiche entrees={sommaire} />

        <form
          key={cle}
          ref={setForm}
          action={envoyer}
          className="flex min-w-0 flex-col gap-4"
        >
          {/* CE `slug` DÉSIGNE LA MARQUE, il ne la renomme pas : c'est
              lui que `requireManagedBrand` relit pour savoir de quelle
              fiche on parle et qui a le droit d'y toucher. L'adresse de
              la page, elle, se saisit plus bas sous `nouveau_slug`. */}
          <input type="hidden" name="slug" value={brand.slug} readOnly />
          <input type="hidden" name="publier" ref={champPublier} defaultValue="0" />

          <Bloc
            id="identite"
            ancre={ancre}
            titre="L'identité"
            intro="Ce que le visiteur voit en premier, dans une grille de cent trente-six cartes."
          >
            {/* RELIRE LA BOUTIQUE, réservé à l'administration. Le bloc
                remplit les champs en écrivant dedans : il doit vivre
                dans le formulaire qu'il remplit, sinon il annoncerait
                avoir tout repris sans que rien n'ait bougé.
                Une marque ne le voit pas : chez elle, ce qu'elle a écrit
                sur sa propre démarche vaut mieux que ce qu'un robot lit
                sur sa page d'accueil. */}
            {estAdmin && <BrandPrefill modeCreation={false} />}

            {estAdmin && (
              <Text
                name="name"
                label="Nom de référence"
                required
                hint="Le nom sous lequel la marque est référencée. Une marque ne le change pas elle-même."
                defaultValue={brand.name}
                placeholder="Le nom tel qu'il s'écrit"
              />
            )}

            <div>
              <Text
                name="tagline"
                label={estAdmin ? "La phrase, en une ligne" : "Ta phrase, en une ligne"}
                hint={
                  estAdmin
                    ? "Pas un slogan : ce que fait la marque, dit simplement."
                    : "Pas un slogan : ce que tu fais, dit simplement."
                }
                defaultValue={brand.tagline}
                placeholder={estAdmin ? "Ce qu'elle fait, en une ligne" : "Ce que tu fais, en une ligne"}
              />
              {/* Le compteur ne bloque pas, il prévient. Au-delà, la
                  carte de l'annuaire coupe la phrase, et c'est la fin
                  qu'on perd — souvent le seul mot qui disait quelque
                  chose. */}
              <p className="m-0 mt-1.5 flex flex-wrap items-baseline gap-x-2.5 text-[11.5px] font-semibold">
                <span
                  className="tabular-nums"
                  style={{
                    color:
                      valeurs.tagline.length > ACCROCHE_IDEALE
                        ? "#f2b03c"
                        : "rgba(255,255,255,0.55)",
                  }}
                >
                  {valeurs.tagline.length} / {ACCROCHE_IDEALE}
                </span>
                <span className="text-white/40">Vue dans l&apos;aperçu, sur la carte.</span>
              </p>
            </div>

            {/* Un seul bloc pour la couverture, fixe ou animée : personne
                ne pense « couverture fixe » et « couverture animée », on
                pense « le visuel de la marque ». */}
            <VisuelCouverture
              image={brand.cover_url}
              video={brand.cover_video_url}
              folder={`marques/${brand.slug}`}
            />

            <ImageUploader
              name="logo_url"
              label="Logo"
              defaultValue={brand.logo_url}
              folder={`marques/${brand.slug}`}
            />
          </Bloc>

          <Bloc
            id="demarche"
            ancre={ancre}
            titre="La démarche"
            intro={
              estAdmin
                ? "Le texte de la fiche. Si la marque gère sa page elle-même, elle pourra le réécrire."
                : "Le texte de ta page. C'est ce qu'on lit après avoir cliqué sur ta carte."
            }
          >
            <Area
              name="description"
              label={estAdmin ? "Sa démarche" : "Ta démarche"}
              hint="Matières, ateliers, quantités, ce qu'on refuse de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication."
              rows={10}
              defaultValue={brand.description}
            />
          </Bloc>

          <Bloc
            id="classement"
            ancre={ancre}
            titre="Le classement"
            intro="Origine, catégories, gamme. C'est ce qui fait apparaître la marque dans les filtres — rien de tout ça ne retient sa publication."
          >
            {/* Trois listes plutôt que trois champs libres. Le pays
                surtout : « Etats-Unis », « USA » et « États-Unis »
                faisaient trois origines distinctes dans les filtres,
                sans que rien ne le signale. */}
            <ChampsLieu
              pays={pays}
              villes={villes}
              paysActuel={brand.country}
              villeActuelle={brand.city}
              anneeActuelle={brand.founded_year}
            />

            <div>
              <CheckGroup
                name="categories"
                label={estAdmin ? "Ses catégories" : "Tes catégories"}
                hint="Coche ce qui correspond vraiment. En cocher dix pour être partout dessert plus qu'autre chose."
                options={categories}
                selected={brand.categories}
              />
              <p className="m-0 mt-2 text-[12px] font-semibold text-white/55 tabular-nums">
                {valeurs.categories.length === 0
                  ? "Aucune choisie"
                  : `${valeurs.categories.length} choisie${valeurs.categories.length > 1 ? "s" : ""}`}
              </p>
            </div>

            <GammeDePrix defaut={brand.price_tier} courante={valeurs.price_tier} />
          </Bloc>

          <Bloc
            id="liens"
            ancre={ancre}
            titre="Liens et boutique"
            intro="Où envoyer les visiteurs, et ce qu'ils y trouveront."
          >
            <Text
              name="shop_url"
              label="Boutique ou site officiel"
              hint="Une seule adresse : celle où l'on peut acheter, ou à défaut celle de la marque."
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

            {/* À qui ça s'adresse, et comment on achète : deux réponses
                qui commandent les filtres de l'annuaire et la règle de
                publication. Une marque qui se déclarerait « ouverte »
                pour se publier plus vite fausserait les deux — d'où le
                fait qu'elle ne les décide pas elle-même. */}
            {estAdmin ? (
              <>
                <Select
                  name="audience"
                  label="À qui ça s'adresse"
                  hint={AUDIENCE_AIDE[uneAudience(valeurs.audience)]}
                  defaultValue={uneAudience(brand.audience)}
                >
                  {AUDIENCES.map((valeur) => (
                    <option key={valeur} value={valeur}>
                      {AUDIENCE_LABEL[valeur]}
                    </option>
                  ))}
                </Select>

                <div>
                  <Select
                    name="acces"
                    label="Comment on achète"
                    hint={ACCES_AIDE[unAcces(valeurs.acces)]}
                    defaultValue={unAcces(brand.acces)}
                  >
                    {ACCES.map((valeur) => (
                      <option key={valeur} value={valeur}>
                        {ACCES_LABEL[valeur]}
                      </option>
                    ))}
                  </Select>
                  <NoteCatalogue exige={exigeDesPieces} reglable />
                </div>

                <Text
                  name="nouveau_slug"
                  label="Adresse de la page"
                  hint="En changer casse les liens déjà partagés vers cette page. Laisse vide et je la refabrique à partir du nom."
                  defaultValue={brand.slug}
                  placeholder="ta-marque"
                />

                <Check
                  name="featured"
                  label="Mettre à la une sur l'accueil"
                  defaultChecked={brand.featured}
                />
              </>
            ) : (
              /* Le créateur ne règle pas « comment on achète », mais il
                 doit savoir ce que ce réglage lui impose : sans ça, la
                 check-list réclame un catalogue sans qu'on comprenne
                 d'où sort l'exigence. */
              <div>
                <p className="eyebrow m-0">Comment on achète</p>
                <p className="m-0 mt-1.5 text-[13.5px] font-bold text-white">
                  {ACCES_LABEL[unAcces(brand.acces)]}
                </p>
                <p className="m-0 mt-1 text-[12px] font-medium text-white/58">
                  {ACCES_AIDE[unAcces(brand.acces)]} Écris-nous si ce n&apos;est plus le cas.
                </p>
                <NoteCatalogue exige={exigeDesPieces} reglable={false} />
              </div>
            )}
          </Bloc>

          {/* L'erreur revient à côté du formulaire, et pas seulement dans
              le bandeau du site : celui-ci s'efface au bout de quelques
              secondes, et un message d'échec doit rester lisible le
              temps qu'on comprenne quoi corriger. */}
          {etat?.error && (
            <p className="glass m-0 px-4 py-3 text-[13.5px] leading-relaxed text-white">
              {etat.error}
            </p>
          )}
        </form>

        <aside className="flex min-w-0 flex-col gap-4">
          <ApercuFiche brand={brand} valeurs={valeurs} />

          {/* La check-list. Elle affiche le message EXACT renvoyé par
              `obstacleAPublication`, jamais une reformulation, et se
              recalcule à la frappe : c'est tout l'intérêt d'avoir une
              seule définition de « publiable ». */}
          <PretAPublier
            fiche={fiche}
            hrefPieces={`/espace-marque/${brand.slug}/pieces`}
            enLigne={brand.status === "published"}
          />

          {/* Rattacher un compte n'a rien à voir avec écrire une
              démarche, et c'est pour ça que ça reste un formulaire à
              part : mélangés, un ajout de gérant ferait perdre la saisie
              en cours. Un formulaire dans un autre est d'ailleurs refusé
              par le navigateur — d'où cette colonne posée à côté du
              formulaire, et non dedans. */}
          {estAdmin && (
            <div id="gerants" className={`${ancre} [&>section]:mt-0`}>
              <BrandManagers brandId={brand.id} managers={gerants} />
            </div>
          )}
        </aside>
      </div>

      <BarreEnregistrement
        modifications={modifications}
        enCours={enCours}
        obstacle={obstacle}
        peutPublier={estAdmin && brand.status !== "published"}
        onEnregistrer={() => enregistrer(false)}
        onPublier={() => enregistrer(true)}
        onAnnuler={() => setCle((n) => n + 1)}
      />
    </>
  );
}

/** Une section du formulaire : un titre, une phrase, des champs. */
function Bloc({
  id,
  ancre,
  titre,
  intro,
  children,
}: {
  id: string;
  /** Le dégagement des barres collantes, pour que l'ancre ne passe pas dessous. */
  ancre: string;
  titre: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`glass ${ancre} p-4 sm:p-6`}>
      <h2 className="m-0 text-[15.5px] font-extrabold tracking-[-0.01em] text-white">{titre}</h2>
      <p className="m-0 mb-5 mt-1.5 text-[13px] leading-relaxed text-white/65">{intro}</p>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

/**
 * La gamme de prix, en trois touches plutôt qu'en liste déroulante.
 *
 * Trois valeurs, et l'on ouvrait un menu pour en choisir une : c'est un
 * geste de plus pour une question qui se règle du regard. Les symboles
 * se comparent d'un coup d'œil, ce qu'une liste ne permet pas puisqu'on
 * n'en voit qu'une ligne à la fois — et le libellé complet reste écrit
 * en dessous, parce que « €€ » ne veut rien dire tout seul.
 */
function GammeDePrix({ defaut, courante }: { defaut: string; courante: string }) {
  const choisie = GAMMES.find((g) => g.valeur === courante) ?? GAMMES[1];

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="eyebrow mb-2 p-0">Gamme de prix</legend>

      {/* Des boutons radio, cachés mais bien là : le formulaire envoie
          `price_tier` exactement comme le faisait le `<select>`, et rien
          ne dépend d'un script pour que la valeur parte. */}
      <div className="flex gap-1.5">
        {GAMMES.map((gamme) => (
          <label key={gamme.valeur} htmlFor={`prix-${gamme.valeur}`} className="flex-1 cursor-pointer select-none">
            <input
              type="radio"
              id={`prix-${gamme.valeur}`}
              name="price_tier"
              value={gamme.valeur}
              defaultChecked={defaut === gamme.valeur}
              className="peer sr-only"
            />
            <span className="block rounded-[13px] border border-white/28 bg-white/10 px-3 py-2.5 text-center text-[15px] font-black text-white/78 transition hover:bg-white/20 peer-checked:border-white peer-checked:bg-white peer-checked:text-[var(--color-ink)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
              {gamme.symbole}
              <span className="sr-only"> — {gamme.libelle}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="m-0 mt-2 text-[12px] font-medium text-white/58">
        <span className="font-bold text-white/80">{choisie.libelle}</span> — {choisie.aide}
      </p>
    </fieldset>
  );
}

/**
 * Ce que « comment on achète » fait à la check-list, écrit noir sur blanc.
 *
 * C'est le champ le moins évident de la fiche : il ne change rien à
 * l'écran, et il décide pourtant si l'absence de catalogue retient la
 * marque en brouillon. On le disait dans `acces.ts`, dans
 * `doitAvoirDesPieces` et dans la check-list — nulle part à côté du
 * champ lui-même, c'est-à-dire nulle part où on le lit.
 *
 * La phrase du haut est la règle, celle du bas est son effet ICI, sur
 * cette fiche, avec la boutique qui y est renseignée : un profil Depop
 * n'exige pas de catalogue même déclaré ouvert, et il n'y avait aucun
 * moyen de le deviner.
 */
function NoteCatalogue({ exige, reglable }: { exige: boolean; reglable: boolean }) {
  return (
    <div className="mt-2 rounded-[13px] border border-white/16 bg-white/8 px-3.5 py-3">
      {reglable && (
        <p className="m-0 text-[12px] leading-relaxed text-white/65">
          Ce réglage commande la check-list. « Boutique ouverte » exige au moins une pièce
          au catalogue ; « Pas encore ouverte », « Ventes privées » et « Liste d&apos;attente »
          ne l&apos;exigent pas — leur catalogue vide est l&apos;état annoncé, pas un raté.
          Un profil Vinted, Depop ou Instagram ne l&apos;exige jamais.
        </p>
      )}
      <p
        className={`m-0 text-[12px] font-bold leading-relaxed ${reglable ? "mt-2" : ""}`}
        style={{ color: exige ? "#f2b03c" : "#57d99a" }}
      >
        {exige
          ? "Ici, la check-list exige au moins une pièce au catalogue."
          : "Ici, la check-list n'exige aucune pièce au catalogue."}
      </p>
    </div>
  );
}
