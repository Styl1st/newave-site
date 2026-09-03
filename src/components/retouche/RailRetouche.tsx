"use client";

import { conditionsDePublication } from "@/components/publication/conditions";
import { obstacleAPublication } from "@/lib/publication";
import EnvoiVisuel from "./EnvoiVisuel";
import { useRetouche } from "./ContexteRetouche";
import { AMBRE, VERT } from "./apparence";
import type { ChampBrouillon } from "./brouillon";

/**
 * Le rail : ce qui n'a pas d'équivalent visible dans la page.
 *
 * TOUT NE SE CLIQUE PAS SUR LA PAGE, et c'est la limite honnête de la
 * retouche en place. L'adresse de la boutique n'apparaît nulle part —
 * elle est derrière un bouton —, l'identifiant Instagram non plus,
 * et un logo absent n'occupe aucune place où l'on pourrait cliquer. Sans
 * ce rail, ces champs seraient devenus inatteignables le jour où le
 * panneau a disparu.
 *
 * « PRÊT À PUBLIER » NE JUGE RIEN LUI-MÊME. Les trois lignes viennent de
 * `conditionsDePublication`, qui repose la question à `publication.ts`
 * un manque à la fois : les phrases affichées sont celles que la
 * fonction renvoie, mot pour mot. En recopier une version plus courte
 * ici ferait une deuxième définition de la règle — exactement ce que
 * `publication.ts` existe pour empêcher — et c'est la version d'ici qui
 * deviendrait fausse le jour où la règle bouge.
 *
 * ET IL VIT AU FIL DE LA FRAPPE, sur le BROUILLON et non sur la base :
 * on colle une accroche, la ligne passe au vert avant même
 * d'enregistrer. C'est tout ce qu'on demande à une check-list.
 */
export default function RailRetouche() {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { brouillon, pieces, exigeDesPieces, mots, slug, etroit, champOuvert, ouvrir } = retouche;

  const fiche = {
    tagline: brouillon.tagline,
    description: brouillon.description,
    cover_url: brouillon.cover_url,
    logo_url: brouillon.logo_url,
    pieces,
    exigeDesPieces,
  };

  const conditions = conditionsDePublication(fiche);
  const remplies = conditions.filter((c) => !c.obstacle).length;
  const part = Math.round((remplies / conditions.length) * 100);
  /* Le verdict vient d'un appel entier, sur la fiche entière — le même
     que celui du serveur. Les trois lignes ne sont qu'un affichage. */
  const obstacle = obstacleAPublication(fiche);

  const restants: { champ: ChampBrouillon; label: string; valeur: string }[] = [
    { champ: "cover_url", label: "Couverture", valeur: brouillon.cover_url },
    { champ: "logo_url", label: "Logo", valeur: brouillon.logo_url },
    { champ: "shop_url", label: "Boutique", valeur: brouillon.shop_url },
    { champ: "instagram", label: "Instagram", valeur: brouillon.instagram },
    { champ: "founded_year", label: "Année de création", valeur: brouillon.founded_year },
  ];

  return (
    <aside data-no-reveal className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
      {/* ---------- prêt à publier ---------- */}
      <section className="glass p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow m-0">Prêt à publier</h2>
          <span
            className="text-[11.5px] font-black tabular-nums"
            style={{ color: obstacle ? AMBRE : VERT }}
          >
            {remplies} sur {conditions.length}
          </span>
        </div>

        <span
          aria-hidden
          className="mt-2.5 block h-[6px] w-full overflow-hidden rounded-full bg-white/14"
        >
          <span
            className="block h-full rounded-full transition-[width] duration-300"
            style={{ width: `${part}%`, background: obstacle ? AMBRE : VERT }}
          />
        </span>

        <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {conditions.map((condition) => (
            <li key={condition.cle} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-black"
                style={
                  condition.obstacle
                    ? { background: "rgba(242,176,60,0.22)", color: AMBRE }
                    : { background: "rgba(87,217,154,0.22)", color: VERT }
                }
              >
                {condition.obstacle ? "!" : "✓"}
              </span>

              <div className="min-w-0">
                <p className="m-0 text-[13px] font-extrabold text-white">{condition.titre}</p>
                {/* La phrase EXACTE d'`obstacleAPublication` : elle dit ce
                    qui manque ET pourquoi, et la raccourcir perdrait
                    justement le pourquoi. */}
                {condition.obstacle && (
                  <p className="m-0 mt-0.5 text-[12px] leading-relaxed text-white/70">
                    {condition.obstacle}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="m-0 mt-4 border-t border-white/12 pt-3 text-[11.5px] leading-relaxed text-white/55">
          {mots.railNote}
        </p>
      </section>

      {/* ---------- aussi sur cette page ---------- */}
      <section className="glass p-4 sm:p-5">
        <h2 className="eyebrow m-0">Aussi sur cette page</h2>

        <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
          {restants.map((entree) => {
            const ouvert = !etroit && champOuvert === entree.champ;
            const rempli = Boolean(entree.valeur.trim());

            return (
              <li key={entree.champ}>
                <button
                  type="button"
                  onClick={() => (ouvert ? retouche.fermer() : ouvrir(entree.champ))}
                  className="flex w-full items-center justify-between gap-3 rounded-[12px] px-2 py-2 text-left transition hover:bg-white/10"
                >
                  <span className="text-[13px] font-bold text-white">{entree.label}</span>
                  {rempli ? (
                    <span
                      aria-label="rempli"
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-black"
                      style={{ background: "rgba(87,217,154,0.22)", color: VERT }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="shrink-0 text-[9.5px] font-black uppercase tracking-[0.16em] text-white/45">
                      Vide
                    </span>
                  )}
                </button>

                {ouvert && <ChampDuRail champ={entree.champ} dossier={`marques/${slug}`} />}
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}

/**
 * Le champ ouvert dans le rail lui-même.
 *
 * Il s'ouvre là où on a cliqué plutôt que d'envoyer vers un panneau :
 * c'est le même geste que sur la page, à un endroit où la page n'a rien
 * à montrer.
 */
function ChampDuRail({ champ, dossier }: { champ: ChampBrouillon; dossier: string }) {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { brouillon, definir, fermer, mots } = retouche;
  const visuel = champ === "cover_url" || champ === "logo_url";

  const surTouche = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      fermer();
    }
  };

  return (
    <div
      className="mb-1 rounded-[13px] p-2.5 shadow-[0_0_0_2px_rgba(var(--accent-1),0.75)]"
      style={{ background: "rgba(var(--voile),0.55)" }}
    >
      {visuel ? (
        <div className="flex flex-wrap items-center gap-2">
          <EnvoiVisuel
            dossier={dossier}
            libelle={brouillon[champ] ? "Remplacer" : "Envoyer un fichier"}
            className="rounded-full bg-white px-3 py-1.5 text-[11.5px] font-black text-[var(--color-ink)]"
            onEnvoye={(adresse) => definir(champ, adresse)}
          />
          {brouillon[champ] && (
            <button
              type="button"
              onClick={() => definir(champ, "")}
              className="rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white/65 underline decoration-white/40 underline-offset-4 transition hover:text-white"
            >
              Retirer
            </button>
          )}
          <input
            className="champ champ-petit"
            value={brouillon[champ] as string}
            placeholder="…ou colle une adresse"
            onKeyDown={surTouche}
            onChange={(e) => definir(champ, e.target.value)}
            aria-label={champ === "logo_url" ? mots.logo : mots.couverture}
          />
        </div>
      ) : (
        <>
          <input
            autoFocus
            className="champ champ-petit"
            type={champ === "founded_year" ? "number" : "text"}
            min={champ === "founded_year" ? 1900 : undefined}
            max={champ === "founded_year" ? 2100 : undefined}
            value={brouillon[champ] as string}
            placeholder={
              champ === "shop_url" ? "https://" : champ === "instagram" ? "tamarque" : ""
            }
            onKeyDown={surTouche}
            onChange={(e) => definir(champ, e.target.value)}
            aria-label={champ === "shop_url" ? "Boutique" : champ === "instagram" ? "Instagram" : "Année de création"}
          />
          {champ === "shop_url" && (
            <p className="m-0 mt-1.5 text-[11px] font-semibold leading-relaxed text-white/50">
              {mots.boutiqueAide}
            </p>
          )}
          {champ === "instagram" && (
            <p className="m-0 mt-1.5 text-[11px] font-semibold text-white/50">
              Sans l&apos;arobase.
            </p>
          )}
        </>
      )}

      <div className="mt-2 flex justify-end">
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
