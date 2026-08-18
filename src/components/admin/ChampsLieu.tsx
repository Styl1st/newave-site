"use client";

import { useState } from "react";
import { FIELD, Label } from "./fields";

/**
 * D'où vient la marque : pays, ville, année.
 *
 * Trois champs libres jusqu'ici, et trois occasions de se tromper. Le
 * pays surtout : « Etats-Unis », « USA » et « États-Unis » faisaient
 * trois origines distinctes dans les filtres de l'annuaire, sans que
 * rien ne le signale, et une fois la faute enregistrée personne ne
 * relit un champ qui a l'air rempli.
 *
 * LA VILLE DÉPEND DU PAYS, mais reste écrivable à la main. C'est
 * volontaire : il n'existe pas de liste courte des villes du monde, et
 * en imposer une reviendrait à décider à la place des marques où elles
 * ont le droit d'être. La liste déroulante propose donc ce qui a déjà
 * été saisi dans ce pays — ce qui règle le vrai problème, l'orthographe
 * qui varie d'une fiche à l'autre — et s'enrichit toute seule.
 *
 * L'année devient une liste plutôt qu'un champ nombre : sur téléphone,
 * les petites flèches d'un champ numérique sont impossibles à viser, et
 * rien n'empêchait de taper 20255.
 */

/** Avant, c'est une maison de couture, pas une marque indépendante. */
const PREMIERE_ANNEE = 1980;

export default function ChampsLieu({
  pays,
  villes,
  paysActuel,
  villeActuelle,
  anneeActuelle,
}: {
  /** Tous les pays proposés, déjà traduits et triés. */
  pays: string[];
  /** Les villes déjà employées, par pays. */
  villes: Record<string, string[]>;
  paysActuel?: string | null;
  villeActuelle?: string | null;
  anneeActuelle?: number | null;
}) {
  const [choisi, setChoisi] = useState((paysActuel ?? "").trim());

  /*
   * Les villes du pays choisi, et à défaut toutes celles qu'on connaît.
   *
   * Le repli n'est pas de la paresse : une marque dont le pays n'est pas
   * encore renseigné doit quand même pouvoir profiter des suggestions,
   * sinon il faut choisir le pays d'abord, ce que rien n'indique.
   */
  const suggestions =
    villes[choisi] ??
    [...new Set(Object.values(villes).flat())].sort((a, b) => a.localeCompare(b, "fr"));

  const maintenant = new Date().getFullYear();
  const annees: number[] = [];
  for (let a = maintenant; a >= PREMIERE_ANNEE; a--) annees.push(a);
  // Une fiche peut porter une année hors de cette plage, saisie avant
  // que ce champ existe : on la garde plutôt que de l'effacer en
  // silence au premier enregistrement.
  if (anneeActuelle && !annees.includes(anneeActuelle)) annees.unshift(anneeActuelle);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="flex h-full flex-col">
        <Label htmlFor="country" hint="Laisse vide et je le devine depuis la boutique.">
          Pays
        </Label>
        <select
          id="country"
          name="country"
          value={choisi}
          onChange={(e) => setChoisi(e.target.value)}
          className={`${FIELD} mt-auto`}
        >
          <option value="">À deviner</option>
          {pays.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex h-full flex-col">
        <Label htmlFor="city" hint="Choisis dans la liste, ou écris-en une nouvelle.">
          Ville
        </Label>
        {/*
          `list` plutôt qu'un `select` : c'est une liste déroulante qui
          accepte quand même ce qu'on tape. Aucun script, et le clavier
          du téléphone reste celui du texte.
        */}
        <input
          id="city"
          name="city"
          list="villes-connues"
          defaultValue={villeActuelle ?? ""}
          placeholder="Paris"
          autoComplete="off"
          className={`${FIELD} mt-auto`}
        />
        <datalist id="villes-connues">
          {suggestions.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>

      <div className="flex h-full flex-col">
        <Label htmlFor="founded_year" hint="Si la marque l'annonce quelque part.">
          Année de création
        </Label>
        <select
          id="founded_year"
          name="founded_year"
          defaultValue={anneeActuelle ? String(anneeActuelle) : ""}
          className={`${FIELD} mt-auto`}
        >
          <option value="">Inconnue</option>
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
