"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkBrandAction } from "@/app/admin/actions";
import { annoncer } from "@/components/Confirmations";
import { useConfirmationCle } from "@/lib/confirmation";
import { peutEtrePubliee } from "@/lib/publication";
import { StatusPill } from "./ListRow";
import type { BrandAdmin } from "@/lib/admin-queries";

/**
 * L'annuaire côté administration : on filtre, on coche, on agit.
 *
 * Chaque ligne portait son propre bouton, ce qui va très bien pour
 * trois marques et beaucoup moins pour soixante-dix : publier une
 * fournée revenait à cliquer soixante-dix fois la même chose, en
 * cherchant à chaque fois où l'on s'était arrêté.
 *
 * Les filtres ne sont pas un supplément décoratif, ils font partie du
 * geste : on réduit d'abord la liste à ce qui nous intéresse, puis
 * « Cocher les affichées » ne coche que celles-là. Les critères du
 * bas répondent aux questions qu'on se pose devant une base tout
 * juste importée, et ils se prennent dans les deux sens : avec ou
 * sans visuel, avec ou sans boutique, avec ou sans pièces.
 */

type Etat = "tout" | "published" | "draft";
type Tri = "nom" | "recentes" | "pieces";

/**
 * Les critères du bas, chacun une question qu'on se pose.
 *
 * Chaque question se pose dans les deux sens, et il fallait les deux :
 * « sans visuel » sert à réparer, « avec visuel » sert à choisir quoi
 * publier. Il n'y avait que la moitié négative, ce qui obligeait à
 * lire la liste entière pour trouver l'autre.
 */
type Cle = "visuel" | "boutique" | "piece" | "gerant" | "aLaUne" | "publiable";
type Sens = "avec" | "sans";

const TESTS: Record<Cle, (b: BrandAdmin) => boolean> = {
  visuel: (b) => Boolean(b.cover_url || b.logo_url),
  boutique: (b) => Boolean(b.shop_url || b.website_url),
  piece: (b) => b.pieces > 0,
  gerant: (b) => b.gerants > 0,
  aLaUne: (b) => b.featured,
  // Ce qui peut partir en ligne en l'état. Pris à l'envers, c'est la
  // liste à traiter avant une mise en ligne groupée.
  publiable: (b) => peutEtrePubliee(b),
};

/** Le nom du critère, puis comment se lisent ses deux faces. */
const CRITERES: { cle: Cle; nom: string; avec: string; sans: string }[] = [
  { cle: "visuel", nom: "Visuel", avec: "Avec visuel", sans: "Sans visuel" },
  { cle: "boutique", nom: "Boutique", avec: "Avec boutique", sans: "Sans boutique" },
  { cle: "piece", nom: "Pièces", avec: "Avec pièces", sans: "Sans pièce" },
  { cle: "gerant", nom: "Gérant", avec: "Avec gérant", sans: "Sans gérant" },
  { cle: "aLaUne", nom: "À la une", avec: "À la une", sans: "Pas à la une" },
  { cle: "publiable", nom: "Publiable", avec: "Publiables", sans: "Non publiables" },
];

const CHAMP =
  "w-full rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[13px] text-white placeholder:text-white/45 focus:border-white/60 focus:outline-none";

export default function BrandBulkList({ brands }: { brands: BrandAdmin[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [pending, demarrer] = useTransition();
  const { cle, demander, desarmer } = useConfirmationCle();

  /* ---- filtres ---- */
  const [recherche, setRecherche] = useState("");
  const [etat, setEtat] = useState<Etat>("tout");
  const [pays, setPays] = useState("");
  const [categorie, setCategorie] = useState("");
  const [gamme, setGamme] = useState("");
  const [tri, setTri] = useState<Tri>("nom");
  /** Pour chaque critère retenu, dans quel sens on l'a pris. */
  const [criteres, setCriteres] = useState<Partial<Record<Cle, Sens>>>({});
  /*
   * Les filtres sont repliés au départ.
   *
   * Six menus et douze boutons dépliés en permanence, c'est un mur
   * avant la liste, alors qu'on vient neuf fois sur dix chercher un
   * nom. La recherche reste donc toujours là, le reste s'ouvre quand
   * on en a besoin, et le bouton dit combien de filtres sont actifs
   * pour qu'un filtre oublié ne se cache jamais.
   */
  const [ouverts, setOuverts] = useState(false);

  // Les choix proposés viennent des marques elles-mêmes : une liste
  // figée finirait par proposer des pays qu'on n'a plus, et par taire
  // ceux qu'on vient d'ajouter.
  const lesPays = useMemo(
    () => Array.from(new Set(brands.map((b) => b.country).filter(Boolean))).sort(),
    [brands]
  );
  const lesCategories = useMemo(
    () => Array.from(new Set(brands.flatMap((b) => b.categories ?? []))).sort(),
    [brands]
  );

  /** Combien de marques de chaque côté, pour l'afficher sur le bouton. */
  const comptes = useMemo(() => {
    const total = {} as Record<Cle, { avec: number; sans: number }>;
    for (const { cle } of CRITERES) {
      const avec = brands.filter(TESTS[cle]).length;
      total[cle] = { avec, sans: brands.length - avec };
    }
    return total;
  }, [brands]);

  const visibles = useMemo(() => {
    const mot = recherche.trim().toLowerCase();

    const gardees = brands.filter((b) => {
      if (etat !== "tout" && b.status !== etat) return false;
      if (pays && b.country !== pays) return false;
      if (categorie && !(b.categories ?? []).includes(categorie)) return false;
      if (gamme && b.price_tier !== gamme) return false;
      // Plusieurs critères se cumulent : « sans visuel » ET « sans
      // pièce » donne les fiches les plus incomplètes, pas leur somme.
      for (const [cle, sens] of Object.entries(criteres) as [Cle, Sens][]) {
        if (TESTS[cle](b) !== (sens === "avec")) return false;
      }
      if (!mot) return true;
      // Le nom, mais aussi le pseudo et l'adresse : on cherche souvent
      // une marque dont on a l'Instagram en tête, pas l'orthographe.
      return [b.name, b.slug, b.instagram, b.tagline, b.city, b.shop_url, b.website_url]
        .filter(Boolean)
        .some((champ) => String(champ).toLowerCase().includes(mot));
    });

    if (tri === "recentes") {
      return gardees
        .slice()
        .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
    }
    if (tri === "pieces") {
      return gardees.slice().sort((a, b) => b.pieces - a.pieces);
    }
    return gardees;
  }, [brands, recherche, etat, pays, categorie, gamme, criteres, tri]);

  /** Ce qui est actif dans le repli, pour l'annoncer sur le bouton. */
  const nbCriteres =
    Object.keys(criteres).length +
    [etat !== "tout", Boolean(pays), Boolean(categorie), Boolean(gamme)].filter(Boolean).length;

  const filtreActif = Boolean(recherche) || nbCriteres > 0;

  /*
   * La sélection ne porte que sur ce qui est affiché.
   *
   * Sans cette précaution, on filtrerait sur « brouillons », on
   * cocherait tout, on changerait de filtre, et on publierait sans le
   * savoir des marques qu'on n'a jamais vues à l'écran.
   */
  const idsVisibles = useMemo(() => new Set(visibles.map((b) => b.id)), [visibles]);
  const retenues = useMemo(
    () => Array.from(selection).filter((id) => idsVisibles.has(id)),
    [selection, idsVisibles]
  );
  const toutCoche = visibles.length > 0 && retenues.length === visibles.length;

  function basculer(id: string) {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  /** Cliquer sur une face l'active ; recliquer dessus la relâche. */
  function basculerCritere(cle: Cle, sens: Sens) {
    setCriteres((prev) => {
      const suivant = { ...prev };
      if (suivant[cle] === sens) delete suivant[cle];
      else suivant[cle] = sens;
      return suivant;
    });
  }

  function reinitialiser() {
    setRecherche("");
    setEtat("tout");
    setPays("");
    setCategorie("");
    setGamme("");
    setCriteres({});
  }

  function agir(intent: "publish" | "draft" | "delete") {
    // Deuxième appui = confirmation. Une boîte de dialogue native se
    // fait escamoter par les navigateurs mobiles, et le bouton semblait
    // alors ne rien faire.
    if (intent === "delete" && !demander("delete")) {
      setNote(
        `Appuie encore sur Supprimer pour effacer définitivement ${retenues.length} marque${retenues.length > 1 ? "s" : ""} et toutes leurs pièces.`
      );
      return;
    }
    desarmer();

    const formData = new FormData();
    formData.set("intent", intent);
    retenues.forEach((id) => formData.append("ids", id));

    demarrer(async () => {
      const res = await bulkBrandAction(formData);
      if (!res.ok) {
        setNote(res.error ?? "L'action a échoué.");
        annoncer(res.error ?? "L'action a échoué.", "erreur");
        return;
      }

      const n = res.traitees ?? 0;
      const verbe =
        intent === "publish" ? "publiée" : intent === "draft" ? "remise en brouillon" : "supprimée";
      const bilan =
        `${n} marque${n > 1 ? "s" : ""} ${verbe}${n > 1 ? "s" : ""}.` +
        (res.ecartees
          ? ` ${res.ecartees} laissée${res.ecartees > 1 ? "s" : ""} de côté : il leur manque un visuel ou un texte.`
          : "");
      setNote(bilan);
      // Le même texte dans le bandeau : la barre d'actions est en haut
      // de page, et l'on vient souvent de faire défiler la liste pour
      // cocher la dernière ligne.
      annoncer(bilan, intent === "delete" ? "info" : "ok");
      setSelection(new Set());
      router.refresh();
    });
  }

  const bouton =
    "rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.07em] transition disabled:opacity-45";

  return (
    <>
      {/* ---------- filtres ---------- */}
      <div className="glass mb-4 flex flex-col gap-3 p-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, pseudo, ville, site"
            aria-label="Chercher une marque"
            className={`${CHAMP} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={() => setOuverts((o) => !o)}
            aria-expanded={ouverts}
            className={`shrink-0 rounded-full border px-4 py-2 text-[12.5px] font-bold transition ${
              nbCriteres > 0 || ouverts
                ? "border-white/60 bg-white/18 text-white"
                : "border-white/30 text-white/78 hover:bg-white/12 hover:text-white"
            }`}
          >
            Filtres
            {nbCriteres > 0 && <span className="ml-1.5 text-white/60">{nbCriteres}</span>}
          </button>
          <span className="shrink-0 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
            {visibles.length}
            {filtreActif && ` / ${brands.length}`}
          </span>
          {filtreActif && (
            <button
              type="button"
              onClick={reinitialiser}
              className="shrink-0 text-[12.5px] font-bold text-white/70 underline underline-offset-2 transition hover:text-white"
            >
              Tout afficher
            </button>
          )}
        </div>

        {ouverts && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={etat}
            onChange={(e) => setEtat(e.target.value as Etat)}
            aria-label="Filtrer par état"
            className={CHAMP}
          >
            <option value="tout">Tous les états</option>
            <option value="published">En ligne</option>
            <option value="draft">En brouillon</option>
          </select>

          <select
            value={pays}
            onChange={(e) => setPays(e.target.value)}
            aria-label="Filtrer par pays"
            className={CHAMP}
          >
            <option value="">Tous les pays</option>
            {lesPays.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            aria-label="Filtrer par catégorie"
            className={CHAMP}
          >
            <option value="">Toutes les catégories</option>
            {lesCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={gamme}
            onChange={(e) => setGamme(e.target.value)}
            aria-label="Filtrer par gamme de prix"
            className={CHAMP}
          >
            <option value="">Toutes les gammes</option>
            <option value="accessible">Accessible</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="premium">Premium</option>
          </select>

          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            aria-label="Trier"
            className={CHAMP}
          >
            <option value="nom">Par nom</option>
            <option value="recentes">Publiées en dernier</option>
            <option value="pieces">Le plus de pièces</option>
          </select>
        </div>
        )}

        {/* Chaque critère se prend dans les deux sens, côte à côte, et
            porte son nombre : un côté à zéro se voit avant d'être
            cliqué, ce qui évite un aller-retour pour rien. */}
        {ouverts && (
        <div className="flex flex-wrap gap-2">
          {CRITERES.map((critere) => {
            const choisi = criteres[critere.cle];
            const faces: { sens: Sens; texte: string; n: number }[] = [
              { sens: "avec", texte: critere.avec, n: comptes[critere.cle].avec },
              { sens: "sans", texte: critere.sans, n: comptes[critere.cle].sans },
            ];

            return (
              <div
                key={critere.cle}
                role="group"
                aria-label={critere.nom}
                className="flex items-center overflow-hidden rounded-full border border-white/25"
              >
                {faces.map((f, i) => {
                  const actif = choisi === f.sens;
                  return (
                    <button
                      key={f.sens}
                      type="button"
                      onClick={() => basculerCritere(critere.cle, f.sens)}
                      aria-pressed={actif}
                      disabled={f.n === 0 && !actif}
                      className={`px-3 py-1.5 text-[11.5px] font-bold transition disabled:opacity-25 ${
                        i === 1 ? "border-l border-white/20" : ""
                      } ${
                        actif
                          ? "bg-white text-[var(--color-ink)]"
                          : "text-white/72 hover:bg-white/12 hover:text-white"
                      }`}
                    >
                      {f.texte}
                      <span className={actif ? "ml-1.5 text-[#6a5a92]" : "ml-1.5 text-white/40"}>
                        {f.n}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* ---------- barre d'action ----------
          Elle n'apparaît qu'une fois quelque chose de coché. Une barre
          de boutons désactivés en permanence n'apprend rien et occupe
          la place où l'on cherche justement la liste. */}
      {retenues.length > 0 && (
        <div className="glass mb-4 flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/70">
            {retenues.length} sélectionnée{retenues.length > 1 ? "s" : ""}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("publish")}
              className={`${bouton} bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] hover:shadow-[0_8px_20px_rgba(35,12,85,0.4)]`}
            >
              {pending ? "…" : "Publier"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("draft")}
              className={`${bouton} border border-white/35 text-white hover:bg-white/12`}
            >
              Retirer
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => agir("delete")}
              onBlur={desarmer}
              className={
                cle === "delete"
                  ? `${bouton} border border-[#ff9db0] bg-[rgba(194,39,63,0.35)] text-white`
                  : `${bouton} border border-white/25 text-white/70 hover:border-white/50 hover:text-white`
              }
            >
              {cle === "delete" ? "Confirmer" : "Supprimer"}
            </button>
          </div>
        </div>
      )}

      {note && <p className="glass m-0 mb-4 px-5 py-3 text-[13.5px] text-white">{note}</p>}

      {/* ---------- la liste ---------- */}
      {visibles.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">
            {brands.length === 0
              ? "Aucune marque pour l'instant."
              : "Aucune marque ne correspond à ces filtres."}
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              setSelection(toutCoche ? new Set() : new Set(visibles.map((b) => b.id)))
            }
            className="mb-3 rounded-full border border-white/35 px-4 py-2 text-[12px] font-bold text-white/85 transition hover:bg-white/12"
          >
            {toutCoche ? "Tout décocher" : `Cocher les ${visibles.length} affichées`}
          </button>

          <div className="flex flex-col gap-3">
            {visibles.map((b) => {
              const coche = selection.has(b.id);
              const visuel = b.logo_url ?? b.cover_url;
              const sousTitre = [
                b.country,
                `${b.pieces} pièce${b.pieces > 1 ? "s" : ""}`,
                b.gerants > 0 ? "gérée" : null,
                !visuel ? "sans visuel" : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={b.id}
                  className={`card-light relative flex items-center gap-4 p-4 transition ${
                    coche ? "ring-3 ring-white" : ""
                  }`}
                >
                  <div className="relative z-3 flex w-full items-center gap-4">
                    <label className="flex shrink-0 cursor-pointer items-center p-1">
                      <input
                        type="checkbox"
                        checked={coche}
                        onChange={() => basculer(b.id)}
                        aria-label={`Sélectionner ${b.name}`}
                        className="case"
                      />
                    </label>

                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#e6dcfb]">
                      {visuel && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={visuel} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>

                    <Link href={`/admin/marques/${b.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">
                        {b.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#6a5a92]">
                        {sousTitre}
                      </span>
                    </Link>

                    <StatusPill status={b.status} />

                    <Link
                      href={`/admin/marques/${b.id}`}
                      aria-label={`Ouvrir ${b.name}`}
                      className="text-[18px] font-black text-[#3a2470]"
                    >
                      →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
