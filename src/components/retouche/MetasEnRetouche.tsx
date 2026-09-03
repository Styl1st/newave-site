"use client";

import PastillesCategories from "./PastillesCategories";
import { useRetouche } from "./ContexteRetouche";
import { PASTILLE } from "./apparence";
import { PRICE_TIER_LABEL, type PriceTier } from "@/lib/types";
import type { ChampBrouillon } from "./brouillon";

/**
 * Les métadonnées de la fiche, cliquables une à une.
 *
 * CE QUI CHANGE POUR LE VISITEUR : RIEN. La page publique garde son
 * `<dl>` et ses pastilles ; ce fichier en rend une seconde version,
 * réservée à qui gère la marque, avec exactement la même grille et la
 * même typographie. C'est le prix de la règle « hors retouche, pas un
 * pixel ne bouge » : deux rendus, jamais un composant client livré à
 * quelqu'un qui n'a rien à modifier.
 *
 * LA DIFFÉRENCE, C'EST LE VIDE. Le `<dl>` public saute les champs
 * absents — une fiche sans ville n'affiche pas « Origine : rien ». En
 * retouche, ces trous sont justement ce qu'on est venu combler : ils
 * apparaissent donc en pastille pointillée, « + Année de création »,
 * plutôt que de rester invisibles jusqu'à ce qu'on aille les chercher
 * dans un formulaire.
 *
 * L'ORIGINE EN OUVRE DEUX. Ville et pays sont une seule information à
 * l'écran — « Paris, France » — et les séparer en deux pastilles
 * donnerait deux boutons pour une phrase.
 */

const GAMMES: PriceTier[] = ["accessible", "intermediaire", "premium"];

export default function MetasEnRetouche({ classeGrille }: { classeGrille: string }) {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { brouillon, actif, etroit, champOuvert, ouvrir, fermer } = retouche;
  const ouvertIci = (champ: ChampBrouillon) => actif && !etroit && champOuvert === champ;

  const origine = [brouillon.city, brouillon.country].filter(Boolean).join(", ");

  /** Ce que la page publique montre : hors retouche, on n'en dévie pas. */
  const faits: { champ: ChampBrouillon; label: string; valeur: string; invite: string }[] = [
    { champ: "city", label: "Origine", valeur: origine, invite: "Ville" },
    {
      champ: "founded_year",
      label: "Fondée en",
      valeur: brouillon.founded_year,
      invite: "Année de création",
    },
    {
      champ: "price_tier",
      label: "Gamme de prix",
      valeur: PRICE_TIER_LABEL[brouillon.price_tier as PriceTier],
      invite: "Gamme de prix",
    },
    {
      champ: "instagram",
      label: "Instagram",
      valeur: brouillon.instagram ? `@${brouillon.instagram}` : "",
      invite: "Instagram",
    },
  ];

  return (
    <>
      <dl className={classeGrille}>
        {faits.map((fait) => {
          // Hors retouche, un champ vide ne laisse pas de case : c'est le
          // comportement du `<dl>` public, au pixel près.
          if (!actif && !fait.valeur) return null;

          return (
            <div key={fait.label} className="min-w-0">
              <dt className="eyebrow m-0">{fait.label}</dt>

              {ouvertIci(fait.champ) ? (
                <div className="mt-1.5">
                  <EditeurDeFait champ={fait.champ} />
                </div>
              ) : !actif ? (
                <dd className="m-0 mt-1.5 text-[14px] font-bold text-white">{fait.valeur}</dd>
              ) : (
                <dd className="m-0 mt-1.5">
                  <button
                    type="button"
                    onClick={() => ouvrir(fait.champ)}
                    className={
                      fait.valeur
                        ? "inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[14px] font-bold text-white transition hover:bg-white/14"
                        : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/40 px-2.5 py-1 text-[12px] font-bold text-white/70 transition hover:border-white/80 hover:text-white"
                    }
                  >
                    {fait.valeur ? (
                      <>
                        {fait.valeur}
                        <Crayon />
                      </>
                    ) : (
                      <>
                        <span aria-hidden>+</span>
                        {fait.invite}
                      </>
                    )}
                  </button>
                </dd>
              )}
            </div>
          );
        })}
      </dl>

      {/* ---------- les catégories ---------- */}
      <div className="mt-7 flex flex-wrap gap-1.5">
        {brouillon.categories.map((categorie) => (
          <span key={categorie} className={PASTILLE}>
            {categorie}
          </span>
        ))}

        {actif && !ouvertIci("categories") && (
          <button
            type="button"
            onClick={() => ouvrir("categories")}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/70 transition hover:border-white/80 hover:text-white active:scale-[.97]"
          >
            <span aria-hidden>+</span>
            {brouillon.categories.length === 0 ? "Tes catégories" : "Modifier"}
          </button>
        )}
      </div>

      {ouvertIci("categories") && (
        <div
          className="mt-3 rounded-[16px] p-3.5 shadow-[0_0_0_2px_rgba(var(--accent-1),0.75)]"
          style={{ background: "rgba(var(--voile),0.55)" }}
        >
          <p className="m-0 mb-3 text-[11.5px] leading-relaxed text-white/60">
            {retouche.mots.categoriesAide}
          </p>

          <PastillesCategories />

          <div className="mt-3.5 flex justify-end border-t border-white/12 pt-3">
            <button
              type="button"
              onClick={fermer}
              className="rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-black text-[var(--color-ink)] transition active:scale-[.97]"
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Le crayon des pastilles : 11 pixels, dedans, jamais à côté. */
function Crayon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-[11px] w-[11px] shrink-0 opacity-55"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * Le champ d'une métadonnée, ouvert à la place de sa valeur.
 *
 * Il reprend `.champ-petit`, la variante étroite du site : un champ de
 * saisie pleine taille à la place d'un mot de quatorze pixels ferait
 * sauter toute la grille pendant la frappe.
 */
function EditeurDeFait({ champ }: { champ: ChampBrouillon }) {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { brouillon, definir, fermer } = retouche;

  const surTouche = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      fermer();
    }
  };

  return (
    <div
      className="rounded-[13px] p-2.5 shadow-[0_0_0_2px_rgba(var(--accent-1),0.75)]"
      style={{ background: "rgba(var(--voile),0.55)" }}
    >
      {champ === "city" && (
        <div className="flex flex-wrap gap-2">
          <input
            autoFocus
            className="champ champ-petit min-w-0 flex-1"
            value={brouillon.city}
            placeholder="Paris"
            onKeyDown={surTouche}
            onChange={(e) => definir("city", e.target.value)}
            aria-label="Ville"
          />
          <input
            className="champ champ-petit min-w-0 flex-1"
            value={brouillon.country}
            placeholder="France"
            onKeyDown={surTouche}
            onChange={(e) => definir("country", e.target.value)}
            aria-label="Pays"
          />
        </div>
      )}

      {champ === "founded_year" && (
        <input
          autoFocus
          type="number"
          min={1900}
          max={2100}
          className="champ champ-petit"
          value={brouillon.founded_year}
          onKeyDown={surTouche}
          onChange={(e) => definir("founded_year", e.target.value)}
          aria-label="Année de création"
        />
      )}

      {champ === "price_tier" && (
        <select
          autoFocus
          className="champ champ-petit"
          value={brouillon.price_tier}
          onKeyDown={surTouche}
          onChange={(e) => definir("price_tier", e.target.value)}
          aria-label="Gamme de prix"
        >
          {GAMMES.map((gamme) => (
            <option key={gamme} value={gamme}>
              {PRICE_TIER_LABEL[gamme]}
            </option>
          ))}
        </select>
      )}

      {champ === "instagram" && (
        <>
          <input
            autoFocus
            className="champ champ-petit"
            value={brouillon.instagram}
            placeholder="tamarque"
            onKeyDown={surTouche}
            onChange={(e) => definir("instagram", e.target.value)}
            aria-label="Instagram"
          />
          <p className="m-0 mt-1.5 text-[11px] font-semibold text-white/50">Sans l&apos;arobase.</p>
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="m-0 text-[10.5px] font-semibold text-white/45">Échap · Entrée</p>
        <button
          type="button"
          onClick={fermer}
          className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[var(--color-ink)] transition active:scale-[.97]"
        >
          Valider
        </button>
      </div>
    </div>
  );
}
