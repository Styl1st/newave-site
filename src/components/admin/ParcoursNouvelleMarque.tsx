"use client";

import { useState } from "react";
import BrandPrefill from "./BrandPrefill";
import {
  CadreRelecture,
  CadreSource,
  EcranChoix,
  PRINCIPAL,
  useEtapes,
  type Choix,
} from "@/components/parcours/Parcours";

/**
 * Ajouter une marque, en quatre écrans — les mêmes qu'en candidature.
 *
 *   1. Qui es-tu par rapport à cette marque.
 *   2. On lit son site, ou tu remplis à la main.
 *   3. Tu relis ce qu'on a trouvé, tu corriges.
 *   4. C'est créé.
 *
 * POURQUOI L'ADMINISTRATION EMPRUNTE LE CHEMIN DU PUBLIC. Une fiche se
 * remplissait ici d'un seul tenant, tout à l'écran : c'est le bon
 * geste pour corriger une ligne, ce n'est pas le bon pour partir de
 * rien. On ouvrait une page de trente champs vides sans savoir par
 * lequel commencer, alors que le créateur, lui, était pris par la main.
 * Il n'y avait aucune raison que celui qui tient l'annuaire soit le
 * moins bien servi.
 *
 * LA DIFFÉRENCE EST À LA SORTIE, ET ELLE EST ENTIÈRE. Le parcours d'un
 * créateur se termine par une candidature : un dossier en attente, qui
 * n'écrit rien dans l'annuaire. Celui-ci se termine par une marque, tout
 * de suite, parce que la personne qui l'emprunte est justement celle
 * qui examine les dossiers. La forme est partagée (voir
 * `parcours/Parcours`), l'issue non.
 *
 * LE FORMULAIRE ARRIVE EN `children`, rendu par la page. Deux raisons,
 * et la seconde n'est pas un détail :
 *
 *   1. C'est le formulaire d'administration existant, celui que
 *      `saveBrand` attend, au caractère près. Le recopier en champs
 *      contrôlés ici aurait fait deux définitions d'une même fiche.
 *   2. Venant du serveur, l'élément ne change pas d'identité quand cet
 *      écran-ci change d'étape : React n'en refait donc pas le rendu, et
 *      ce que la lecture du site a écrit dans ses champs y reste. Un
 *      formulaire reconstruit à chaque étape perdrait tout entre le
 *      deuxième et le troisième écran, sans un mot.
 */

/** Comment la marque arrive dans l'annuaire. */
type Origine = "confiee" | "reperee";

const QUI: readonly Choix<Origine>[] = [
  {
    valeur: "confiee",
    titre: "La marque est au courant",
    texte:
      "Elle t'a écrit, ou vous vous êtes parlé. Tu remplis sa fiche à sa place, et tu lui en donneras les clés : c'est elle qui la tiendra ensuite.",
  },
  {
    valeur: "reperee",
    titre: "Je l'ajoute de moi-même",
    texte:
      "Tu l'as trouvée et sa place est ici. Personne ne reçoit les clés de la page : elle reste entre tes mains jusqu'au jour où la marque se manifeste.",
  },
];

export default function ParcoursNouvelleMarque({ children }: { children: React.ReactNode }) {
  const { etape, aller, haut } = useEtapes();
  const [origine, setOrigine] = useState<Origine>("confiee");
  const [lu, setLu] = useState(false);

  const confiee = origine === "confiee";

  return (
    // On ne fait pas danser une table de travail : l'administration
    // n'anime pas ses blocs. Voir admin/layout.tsx.
    <div ref={haut} data-no-reveal className="scroll-mt-28">
      {etape === "choix" && (
        <EcranChoix
          choix={QUI}
          onChoisir={(o) => {
            setOrigine(o);
            aller("source");
          }}
        />
      )}

      {etape === "source" && (
        <CadreSource
          onRetour={() => aller("choix")}
          onManuel={() => aller("relecture")}
          sansSite={{
            titre: "Pas de site ? Ce n'est pas un problème.",
            texte:
              "Beaucoup de marques ne vendent que par message privé, sur Instagram, sur Vinted ou sur Depop : il n'y a rien à lire chez elles, et il n'y aura jamais de catalogue à importer. Elles ont pourtant toute leur place ici — souvent plus que les autres, puisque justement on ne les trouve nulle part. Remplis la fiche à la main, et dis plus bas comment on achète chez elles.",
          }}
        >
          <BrandPrefill modeCreation onLu={() => setLu(true)} />

          {/* Le bouton n'apparaît qu'une fois qu'il y a quelque chose à
              vérifier. Avant la lecture, il ferait doublon avec
              « Remplir à la main », et laisserait croire qu'on saute une
              étape obligatoire. */}
          {lu && (
            <button
              type="button"
              onClick={() => aller("relecture")}
              className={`${PRINCIPAL} self-start`}
            >
              Vérifier les informations
            </button>
          )}
        </CadreSource>
      )}

      {/*
        LA FICHE NE SE DÉMONTE JAMAIS, elle se cache.
        Elle est montée dès le premier écran pour deux raisons : la
        lecture du site écrit directement dans ses champs et doit les
        trouver, et ce qui y a été saisi survit à un aller-retour entre
        les écrans. Un formulaire monté à la dernière étape aurait rendu
        la lecture inopérante, et « précédent » destructeur.
      */}
      <div className={etape === "relecture" ? "" : "hidden"}>
        <CadreRelecture
          onRetour={() => aller("source")}
          avis={
            <>
              {lu && (
                <>
                  Voici ce qu&apos;on a lu sur le site.{" "}
                  <strong className="font-extrabold">Rien n&apos;est définitif</strong> :
                  corrige ce qui est faux, complète ce qui manque.{" "}
                </>
              )}
              {confiee
                ? "Une fois créée, tu arriveras sur sa page : c'est là que tu rattacheras son compte, dans le bloc « Gérants ». Sans ce rattachement, la marque ne peut pas tenir sa page elle-même."
                : "Personne ne recevra les clés de cette page : elle reste entre tes mains. Le jour où la marque se manifestera, un rattachement suffira."}
            </>
          }
        >
          {children}
        </CadreRelecture>
      </div>
    </div>
  );
}
