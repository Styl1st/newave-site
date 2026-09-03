"use client";

import Link from "next/link";
import { useState } from "react";
import ClassementMarques from "../ClassementMarques";
import ClassementPieces from "./ClassementPieces";
import LigneDesRayons from "./LigneDesRayons";
import { mesureDe, rayonsDeLAffichage } from "./classement";
import type { Contenu, Mesure, RayonVide } from "./classement";
import { LIGNES_PAR_LOT } from "./seuils";

/**
 * La colonne de gauche de la page des coups de cœur : les rayons, puis
 * le classement — pour les CINQ onglets.
 *
 * POURQUOI CE COMPOSANT EXISTE. La ligne de rayons vivait dans
 * `ClassementMarques`, donc dans un seul des cinq classements : les
 * quatre autres n'avaient pas de filtre du tout, et la page changeait
 * d'allure selon l'onglet. En la remontant d'un cran, elle coiffe
 * n'importe quel classement, et `ClassementMarques` redevient ce qu'il
 * dit être — un rendu de marques, qui reçoit une liste déjà filtrée.
 *
 * IL EST CÔTÉ NAVIGATEUR PARCE QUE LE FILTRE L'EST. Le classement est
 * déjà entièrement chargé — c'est lui qu'on vient d'afficher — et un
 * aller-retour par l'adresse rechargerait la page entière, décor et
 * podium compris, pour retirer des lignes d'une liste qu'on a sous la
 * main. Le rayon n'est donc pas dans l'URL : il ne se partage pas, et
 * c'est assumé. Ce qui se partage, c'est le classement (`?vue=`) et sa
 * période (`?periode=`) ; un rayon est un coup d'œil, pas une
 * destination.
 *
 * LA PAGINATION EST ICI ET NON DANS LES DEUX CORPS, et c'est ce qui
 * évite un bug d'ergonomie. Changer de rayon doit remettre le compteur à
 * zéro : sans ça on garde les « 48 lignes » demandées sur « Tout » en
 * passant à un rayon qui en compte six. La remonter ici la rend
 * accessible au clic sur une pastille — et évite de remonter les corps
 * par un `key`, ce qui aurait relancé toutes les requêtes de vignettes
 * des lignes de marques à chaque changement de rayon.
 */
export default function ClassementEnRayons({
  contenu,
  mesure,
  vides,
}: {
  /** Un classement de marques ou un classement de pièces. Jamais les deux. */
  contenu: Contenu;
  /** Ce que compte l'onglet : des cœurs, ou des avis. */
  mesure: Mesure;
  /**
   * Les rayons de l'annuaire qui n'ont encore aucun cœur.
   *
   * Réservé au classement des marques suivies : c'est le seul où la
   * question « et celles que personne n'a encore vues ? » a un sens, et
   * le seul dont la zone du bas mène quelque part. Voir `LigneDesRayons`.
   */
  vides?: RayonVide[];
}) {
  /** Le rayon choisi dans la ligne du haut, ou `null` pour « Tout ». */
  const [rayon, setRayon] = useState<string | null>(null);
  const [combien, setCombien] = useState(LIGNES_PAR_LOT);

  /*
   * LES RAYONS SE DÉRIVENT DE CE QUI EST À L'ÉCRAN, et le calcul est le
   * même pour les cinq onglets. C'est la doctrine de la page — « le
   * compteur ne compte que ce qui est à l'écran » — appliquée au filtre.
   * Le détail est écrit dans `rayonsDeLAffichage`.
   *
   * Le type est élargi à ce que la fonction lit vraiment : sans ça,
   * TypeScript refuse d'appeler une méthode sur une union de deux types
   * de tableaux, alors que les deux portent bien un champ `rayons`.
   */
  const entrees: { rayons: string[]; coeurs?: number; note?: { avis: number } }[] =
    contenu.entrees;
  const rayons = rayonsDeLAffichage(entrees);
  const choisi = rayons.find((r) => r.slug === rayon) ?? null;

  /* Le total de la pastille « Tout » : la mesure de tout ce qui est
     classé, et non celle du site. Même règle que le compteur en tête de
     page — on n'annonce que la somme de ce qu'on montre. */
  const total = entrees.reduce((n, e) => n + mesureDe(e), 0);

  /* Une seule ligne de filtre pour les deux classements : c'est tout
     l'intérêt d'avoir posé les rayons sur les entrées côté serveur. */
  function garder<T extends { rayons: string[] }>(liste: T[]): T[] {
    return choisi ? liste.filter((e) => e.rayons.includes(choisi.nom)) : liste;
  }

  function choisirLeRayon(slug: string | null) {
    setRayon(slug);
    setCombien(LIGNES_PAR_LOT);
  }

  const restant = garder(entrees).length;

  return (
    <>
      {/* La ligne de rayons EN PREMIER, avant le podium : c'est elle qui
          dit ce qu'on est en train de regarder, et un titre se lit avant
          ce qu'il titre. */}
      {(rayons.length > 0 || (vides?.length ?? 0) > 0) && (
        <LigneDesRayons
          rayons={rayons}
          mesure={mesure}
          actif={rayon}
          onChoisir={choisirLeRayon}
          total={total}
          vides={vides}
        />
      )}

      {/*
       * JAMAIS UNE LISTE VIDE SOUS UNE PASTILLE QU'ON VIENT DE CLIQUER.
       *
       * Le cas ne devrait pas se produire — la ligne du haut ne propose
       * que des rayons qui ont au moins une entrée classée — mais il
       * suffirait d'un rayon retiré d'une fiche entre deux rendus. Une
       * liste vide se lit comme une panne ; une phrase et le chemin vers
       * l'annuaire se lisent comme une réponse.
       */}
      {choisi && restant === 0 ? (
        <div className="glass p-6 text-center">
          <p className="m-0 text-[14px] leading-relaxed text-white/85">
            Rien de classé dans {choisi.nom} pour l&apos;instant.{" "}
            {/*
             * LA SORTIE DÉPEND DE CE QU'ON CLASSAIT, et ce n'est pas un
             * détail. Un rayon de marques est une catégorie d'annuaire,
             * et `/marques?cat=` la retrouve. Un rayon de pièces — Hauts,
             * Bas, Vestes — n'existe pas dans cette taxonomie-là : le
             * même lien mènerait à un annuaire filtré sur rien, c'est-à-
             * dire à la page vide qu'on cherche justement à éviter. La
             * vitrine, elle, range ses rayons elle-même.
             */}
            {contenu.quoi === "marques" ? (
              <Link
                href={`/marques?cat=${encodeURIComponent(choisi.slug)}`}
                className="font-bold text-white underline underline-offset-2"
              >
                Voir le rayon dans l&apos;annuaire
              </Link>
            ) : (
              <Link
                href="/pieces"
                className="font-bold text-white underline underline-offset-2"
              >
                Voir toutes les pièces
              </Link>
            )}
            .
          </p>
        </div>
      ) : contenu.quoi === "marques" ? (
        <ClassementMarques
          classement={garder(contenu.entrees)}
          mesure={mesure}
          favoris={contenu.suivies}
          total={contenu.total}
          rayon={choisi?.nom}
          combien={combien}
          onVoirPlus={() => setCombien((n) => n + LIGNES_PAR_LOT)}
        />
      ) : (
        <ClassementPieces
          pieces={garder(contenu.entrees)}
          rayon={choisi?.nom}
          combien={combien}
          onVoirPlus={() => setCombien((n) => n + LIGNES_PAR_LOT)}
        />
      )}
    </>
  );
}
