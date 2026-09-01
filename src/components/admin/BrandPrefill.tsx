"use client";

import { useState, useTransition } from "react";
import { analyserSite } from "@/lib/site-actions";
import { IconCheck, IconDownload } from "@/components/Icons";
import { FIELD } from "./fields";

/**
 * Remplit le formulaire à partir de l'adresse du site de la marque.
 *
 * Le formulaire n'est pas modifié : on écrit directement dans ses
 * champs. Ça évite de faire remonter un état à travers toutes les
 * étapes, et ça laisse chaque valeur modifiable ensuite — c'est un
 * point de départ, pas un verdict.
 *
 * COROLLAIRE : ce bloc doit vivre DANS la page qui porte le formulaire
 * qu'il remplit, et pendant que celui-ci existe. Le parcours de
 * création le montre à son deuxième écran alors que la fiche est déjà
 * montée, mais cachée ; le panneau d'édition le pose à l'intérieur de
 * lui-même. Sorti de là, il annoncerait avoir tout repris sans que
 * rien n'ait bougé.
 */
export default function BrandPrefill({
  modeCreation,
  onLu,
}: {
  modeCreation: boolean;
  /**
   * Prévient qu'une lecture a réussi.
   *
   * Sert au parcours de création à n'afficher « Vérifier les
   * informations » qu'une fois qu'il y a quelque chose à vérifier.
   */
  onLu?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [pending, lancer] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; texte: string } | null>(null);

  /**
   * Écrit dans un champ de façon que React s'en aperçoive.
   *
   * Poser `.value` directement ne suffit pas : un champ contrôlé par
   * React retrouverait son ancienne valeur au rendu suivant. On passe
   * donc par le setter natif, puis on émet l'événement.
   *
   * Le setter est pris sur le PROTOTYPE DE L'ÉLÉMENT lui-même, pas sur
   * une classe devinée. Deviner produisait « Illegal invocation » dès
   * qu'un champ n'était pas du type attendu — un setter d'une classe
   * refuse d'être appliqué à une autre.
   */
  function ecrire(nom: string, valeur: string | null) {
    if (!valeur) return false;

    // On reste dans le formulaire : ailleurs dans la page, un champ
    // pourrait porter le même nom.
    const champ =
      document.querySelector<HTMLElement>(`form [name="${nom}"]`) ??
      document.querySelector<HTMLElement>(`[name="${nom}"]`);
    if (!champ) return false;

    try {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(champ),
        "value"
      )?.set;

      if (setter) setter.call(champ, valeur);
      else (champ as HTMLInputElement).value = valeur;

      champ.dispatchEvent(new Event("input", { bubbles: true }));
      champ.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch {
      // Un champ récalcitrant ne doit pas faire échouer les autres.
      return false;
    }
  }

  /** Coche les cases correspondantes dans un groupe de cases. */
  function cocher(nom: string, valeurs: string[]): number {
    let coches = 0;
    for (const valeur of valeurs) {
      const boite = document.querySelector<HTMLInputElement>(
        `input[type="checkbox"][name="${nom}"][value="${valeur}"]`
      );
      if (boite && !boite.checked) {
        boite.click();
        coches += 1;
      }
    }
    return coches;
  }

  function analyser() {
    setNote(null);
    lancer(async () => {
      const res = await analyserSite(url);
      if (!res.ok) {
        setNote({ ok: false, texte: res.error });
        return;
      }

      const { identite } = res;
      const remplis: string[] = [];

      // ---- ce qui est LU sur le site ----
      if (modeCreation && ecrire("name", identite.name)) remplis.push("le nom");
      if (ecrire("description", identite.description)) remplis.push("la description");
      if (ecrire("shop_url", identite.shop_url)) remplis.push("la boutique");
      if (ecrire("instagram", identite.instagram)) remplis.push("Instagram");
      if (ecrire("logo_url", identite.logo)) remplis.push("le logo");
      if (ecrire("cover_url", identite.cover)) remplis.push("la couverture");
      // Beaucoup de marques ouvrent sur une vidéo plutôt que sur une
      // photo : on la reprend telle quelle, elle reste chez elles.
      if (ecrire("cover_video_url", identite.coverVideo)) {
        remplis.push("l'illustration animée");
      }
      if (ecrire("city", identite.city)) remplis.push("la ville");
      if (ecrire("country", identite.country)) remplis.push("le pays");

      // ---- ce qui est DÉDUIT ----
      const devines: string[] = [];
      if (ecrire("founded_year", identite.founded_year ? String(identite.founded_year) : null)) {
        devines.push(`l'année (${identite.founded_year})`);
      }
      if (ecrire("price_tier", identite.price_tier)) {
        const medianeEuros = identite.indices.prixMedian
          ? Math.round(identite.indices.prixMedian / 100)
          : null;
        devines.push(
          medianeEuros
            ? `la gamme de prix (médiane ${medianeEuros} €)`
            : "la gamme de prix"
        );
      }
      const coches = cocher("categories", identite.categories);
      if (coches > 0) devines.push(`${coches} catégorie${coches > 1 ? "s" : ""}`);

      const phrases: string[] = [];
      if (remplis.length) phrases.push(`Repris du site : ${remplis.join(", ")}.`);
      if (devines.length) phrases.push(`Deviné, à vérifier : ${devines.join(", ")}.`);
      if (identite.indices.pieces > 0) {
        phrases.push(`${identite.indices.pieces} pièces lues pour établir ces suppositions.`);
      }

      setNote({
        ok: true,
        texte: phrases.length
          ? `${phrases.join(" ")} Rien n'est enregistré avant la fin.`
          : "Rien d'exploitable sur ce site. Remplis les champs à la main.",
      });

      onLu?.();
    });
  }

  return (
    <section className="card-light mb-6 overflow-hidden">
      <div className="relative z-3 p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgba(23,10,51,0.08)] text-[var(--color-ink)]">
            <IconDownload className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-[16.5px] font-extrabold leading-snug text-[var(--color-ink)]">
              Gagner du temps : partir du site
            </h2>
            <p className="m-0 mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-[#4a3a78]">
              Colle l&apos;adresse du site de la marque. On reprend {modeCreation && "le nom, "}
              la description, le logo, la ville et les réseaux, et on devine l&apos;année,
              la gamme de prix et les catégories à partir du catalogue. Tout reste
              modifiable ensuite.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (url.trim()) analyser();
              }
            }}
            placeholder="https://tamarque.fr"
            className={`${FIELD} !border-[rgba(23,10,51,0.15)]`}
          />
          <button
            type="button"
            disabled={pending || !url.trim()}
            onClick={analyser}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[13px] bg-[var(--color-ink)] px-6 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#2a1350] active:scale-[.97] disabled:opacity-50"
          >
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Lecture…
              </>
            ) : (
              "Remplir depuis le site"
            )}
          </button>
        </div>

        {note && (
          <p
            className={`m-0 mt-4 flex items-start gap-2 rounded-[13px] px-4 py-3 text-[13px] leading-relaxed ${
              note.ok
                ? "bg-[rgba(23,10,51,0.06)] text-[#3a2c5e]"
                : "bg-[rgba(194,39,63,0.1)] text-[#8a1f30]"
            }`}
          >
            {note.ok && <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />}
            {note.texte}
          </p>
        )}

        {modeCreation && (
          <p className="m-0 mt-3 text-[12px] leading-relaxed text-[#6a5a92]">
            Les pièces s&apos;importent après, depuis l&apos;onglet Importer de la
            marque : elle doit exister avant qu&apos;on puisse y rattacher un catalogue.
          </p>
        )}
      </div>
    </section>
  );
}
