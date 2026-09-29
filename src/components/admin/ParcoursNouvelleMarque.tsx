"use client";

import { useEffect, useRef, useState } from "react";
import BrandPrefill from "./BrandPrefill";
import { useValeursDuFormulaire } from "./etat-fiche";
import ApercuFiche from "@/components/editeur/ApercuFiche";
import ApercuPieces from "@/components/parcours/ApercuPieces";
import { MARQUE_VIDE, VALEURS_VIDES } from "@/components/parcours/marque-vide";
import { CadreFiche, EcranChoix, useEtapes, type Choix } from "@/components/parcours/Parcours";
import type { Identite } from "@/lib/catalogue";

/**
 * Ajouter une marque, en deux écrans et une issue.
 *
 *   1. Qui es-tu par rapport à cette marque.
 *   2. La fiche : tu colles le lien du site, elle se remplit, et tu vois
 *      à côté ce que ça donne (la carte de l'annuaire, le haut de la
 *      page, les pièces trouvées). Tu corriges, l'aperçu suit.
 *   3. C'est créé : on arrive sur la page de la marque.
 *
 * L'ÉCRAN « VÉRIFIER LES INFORMATIONS » A DISPARU. La lecture du site
 * finissait par une phrase (« 42 pièces lues… ») et un bouton qui
 * menait à un troisième écran de champs, sans rien montrer du résultat.
 * La lecture déplie maintenant la fiche sur place, avec l'aperçu.
 *
 * POURQUOI L'ADMINISTRATION EMPRUNTE LE CHEMIN DU PUBLIC. Une fiche se
 * remplissait ici d'un seul tenant, tout à l'écran : c'est le bon
 * geste pour corriger une ligne, ce n'est pas le bon pour partir de
 * rien. La forme est partagée (voir `parcours/Parcours`), l'issue non :
 * le parcours d'un créateur se termine par une candidature, celui-ci
 * par une marque, tout de suite.
 *
 * LE FORMULAIRE ARRIVE EN `children`, rendu par la page. Deux raisons :
 *
 *   1. C'est le formulaire d'administration existant, celui que
 *      `saveBrand` attend, au caractère près. Le recopier en champs
 *      contrôlés ici aurait fait deux définitions d'une même fiche.
 *   2. Venant du serveur, l'élément ne change pas d'identité quand cet
 *      écran-ci change d'étape : React n'en refait donc pas le rendu, et
 *      ce que la lecture du site a écrit dans ses champs y reste.
 *
 * L'APERÇU LIT LE FORMULAIRE, IL NE LE PILOTE PAS. `useValeursDuFormulaire`
 * est le même outil que dans l'éditeur d'une fiche existante : il relit
 * les champs à la frappe, y compris ce que la lecture du site y écrit
 * et les visuels envoyés, et `ApercuFiche` rend la vraie carte avec.
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
  const { etape, aller, revenir, haut } = useEtapes();
  const [origine, setOrigine] = useState<Origine>("confiee");
  const [ouverte, setOuverte] = useState(false);
  const [lu, setLu] = useState<Identite | null>(null);

  /*
   * Le formulaire vient du serveur, en `children` : on le retrouve dans
   * le DOM plutôt que par une `ref`, qu'on ne peut pas lui passer.
   */
  const conteneur = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  useEffect(() => {
    setForm(conteneur.current?.querySelector("form") ?? null);
  }, []);

  const valeurs = useValeursDuFormulaire(form, VALEURS_VIDES);

  /*
   * Déplier la fiche et y amener l'œil, qu'on vienne du site ou non.
   *
   * Le défilement attend le rendu qui la montre (un effet, et non un
   * appel direct) : la lecture du site se termine dans une transition,
   * et une fiche encore cachée n'a pas de place où défiler.
   */
  const fiche = useRef<HTMLDivElement>(null);
  const [depliages, setDepliages] = useState(0);
  const deplier = () => {
    setOuverte(true);
    setDepliages((n) => n + 1);
  };
  useEffect(() => {
    if (depliages > 0) fiche.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [depliages]);

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
            aller("fiche");
          }}
        />
      )}

      {/*
        LA FICHE NE SE DÉMONTE JAMAIS, elle se cache.
        Elle est montée dès le premier écran : la lecture du site écrit
        directement dans ses champs et doit les trouver, et ce qui y a
        été saisi survit à un aller-retour vers le premier écran.
      */}
      <div ref={conteneur} className={etape === "fiche" ? "" : "hidden"}>
        <CadreFiche
          onRetour={() => revenir("choix")}
          ouverte={ouverte}
          onManuel={deplier}
          refFiche={fiche}
          sansSite={{
            titre: "Pas de site ? Ce n'est pas un problème.",
            texte:
              "Beaucoup de marques ne vendent que par message privé, sur Instagram, sur Vinted ou sur Depop : il n'y a rien à lire chez elles, et il n'y aura jamais de catalogue à importer. Elles ont pourtant toute leur place ici, souvent plus que les autres, puisque justement on ne les trouve nulle part. Remplis la fiche à la main, et dis plus bas comment on achète chez elles.",
          }}
          lecture={
            <BrandPrefill
              modeCreation
              onLu={(identite) => {
                setLu(identite);
                deplier();
              }}
            />
          }
          avis={
            confiee
              ? "Une fois créée, tu arriveras sur sa page : c'est là que tu rattacheras son compte, dans le bloc « Gérants ». Sans ce rattachement, la marque ne peut pas tenir sa page elle-même."
              : "Personne ne recevra les clés de cette page : elle reste entre tes mains. Le jour où la marque se manifestera, un rattachement suffira."
          }
          apercu={
            <>
              <ApercuFiche brand={MARQUE_VIDE} valeurs={valeurs} />
              {lu && (
                <ApercuPieces
                  pieces={lu.apercu}
                  total={lu.indices.pieces}
                  note="Lues sur la boutique. Elles arrivent sur la fiche à sa création."
                />
              )}
            </>
          }
        >
          {children}
        </CadreFiche>
      </div>
    </div>
  );
}
