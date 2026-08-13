"use client";

import { useState, useTransition } from "react";
import { importerLeCatalogue } from "@/app/espace-marque/actions";
import { FIELD, Label } from "./fields";

/**
 * Une adresse, un bouton.
 *
 * Il y avait avant une étape de tri : la boutique s'affichait, on
 * cochait ses pièces, on validait. C'était joli et ça marchait une
 * fois sur deux, parce que valider relançait la lecture complète de la
 * boutique. Ici la lecture n'a lieu qu'une fois, au clic, et tout ce
 * qu'elle trouve est rangé en brouillon. Le tri se fait après, sur la
 * page des pièces, qui sait déjà publier et supprimer en lot.
 */
export default function FormulaireImport({
  slug,
  adresseConnue,
}: {
  slug: string;
  adresseConnue: string;
}) {
  const [adresse, setAdresse] = useState(adresseConnue);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function lancer() {
    setErreur(null);
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("boutique", adresse);

    demarrer(async () => {
      // En cas de succès l'action redirige : ce qui suit n'est atteint
      // que si quelque chose s'est mal passé.
      const res = await importerLeCatalogue(formData);
      if (res && !res.ok) setErreur(res.error ?? "L'import a échoué.");
    });
  }

  return (
    <div className="glass p-4 sm:p-7">
      <Label htmlFor="boutique" hint="L'adresse de la boutique, ou le lien direct d'une pièce. Les deux fonctionnent.">
        Adresse de ta boutique
      </Label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="boutique"
          className={FIELD}
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="https://tamarque.fr"
          disabled={enCours}
        />
        <button
          type="button"
          onClick={lancer}
          disabled={enCours || !adresse.trim()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[13px] bg-white px-6 py-3 text-[13.5px] font-extrabold text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.42)] active:scale-[.97] disabled:opacity-55"
        >
          {enCours ? (
            <>
              {/* Un anneau qui tourne : lire un plan de site prend une
                  dizaine de secondes, et un bouton inerte laisserait
                  croire que le clic n'a pas pris. */}
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(23,10,51,0.25)] border-t-[var(--color-ink)]" />
              Lecture de ta boutique…
            </>
          ) : (
            "Importer mes pièces"
          )}
        </button>
      </div>

      {enCours && (
        <p className="m-0 mt-4 text-[13px] leading-relaxed text-white/65">
          On essaie Shopify, WooCommerce et Big Cartel, puis les données que ta boutique
          publie déjà pour Google, et enfin son plan de site. Cette dernière méthode va
          chercher les pages une par une, donc laisse-lui une dizaine de secondes.
        </p>
      )}

      {erreur && (
        <p className="m-0 mt-4 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
          {erreur}
        </p>
      )}
    </div>
  );
}
