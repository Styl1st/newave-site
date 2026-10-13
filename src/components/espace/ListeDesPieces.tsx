"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmationCle } from "@/lib/confirmation";
import { bulkProductAction } from "@/app/espace-marque/actions";
import { formatPrice, type Product } from "@/lib/types";
import { vignette } from "@/lib/vignette";
import { MAX_EN_AVANT, phraseDuMaximum } from "@/lib/en-avant";
import { IconEtoile, IconLoupe } from "@/components/Icons";

/**
 * « MES PIÈCES » : TOUT LE CATALOGUE D'UNE MARQUE, ET DE QUOI LE TENIR.
 *
 * L'ancienne liste montrait tout d'un bloc — deux cents pièces en
 * moyenne, six cents pour les plus grosses — avec pour seuls outils
 * « Tout cocher » et « Les N brouillons ». On n'y retrouvait pas une
 * pièce par son nom, on ne voyait pas lesquelles étaient épuisées, et
 * une pièce retirée de la boutique s'affichait « Publié » alors qu'elle
 * ne se montrait plus nulle part.
 *
 * Ce qu'elle fait maintenant :
 *   — une recherche sur le nom, et des filtres qui disent combien ils
 *     contiennent (en ligne, brouillons, épuisées, retirées, en avant) ;
 *   — un état lisible sur chaque ligne, le même vocabulaire partout ;
 *   — l'étoile de mise en avant, d'un geste, sur chaque ligne ;
 *   — des actions groupées qui ne proposent que ce qui a un sens pour la
 *     sélection : « Mettre en ligne » n'apparaît que s'il y a des
 *     brouillons dedans, et ainsi de suite ;
 *   — un affichage par lots de cinquante, avec des vignettes réduites :
 *     six cents photos pleine taille faisaient ramer la page.
 *
 * LA DISPONIBILITÉ NE SE TOUCHE ICI QUE SANS RELECTURE AUTOMATIQUE. Pour
 * une marque dont le catalogue se relit chaque jour, c'est la boutique
 * qui dit ce qui est épuisé : marquer une pièce à la main serait défait
 * le lendemain, sans explication. Le bandeau de la page le dit.
 */

type Filtre = "tout" | "en_ligne" | "brouillons" | "epuisees" | "retirees" | "en_avant";

type Intention = "publish" | "draft" | "feature" | "unfeature" | "available" | "unavailable" | "delete";

const PAR_LOT = 50;

const estEnLigne = (p: Product) => p.status === "published" && !p.retired_at;
const estEnAvant = (p: Product) => Boolean(p.featured) && !p.retired_at;
const estEpuisee = (p: Product) => !p.available && !p.retired_at;

const FILTRES: { cle: Filtre; libelle: string; garde: (p: Product) => boolean }[] = [
  { cle: "tout", libelle: "Toutes", garde: () => true },
  { cle: "en_ligne", libelle: "En ligne", garde: estEnLigne },
  { cle: "brouillons", libelle: "Brouillons", garde: (p) => p.status === "draft" && !p.retired_at },
  { cle: "en_avant", libelle: "En avant", garde: estEnAvant },
  { cle: "epuisees", libelle: "Épuisées", garde: estEpuisee },
  { cle: "retirees", libelle: "Retirées", garde: (p) => Boolean(p.retired_at) },
];

/** Sans accents ni majuscules : « veste » trouve « Veste matelassée ». */
function plat(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export default function ListeDesPieces({
  slug,
  products,
  synchroAuto,
}: {
  slug: string;
  products: Product[];
  /** Le catalogue se relit chaque jour depuis la boutique. */
  synchroAuto: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [lot, setLot] = useState(PAR_LOT);
  const [note, setNote] = useState<{ texte: string; erreur?: boolean } | null>(null);
  /** La ligne dont l'étoile vient d'être touchée, le temps que ça réponde. */
  const [etoileEnCours, setEtoileEnCours] = useState<string | null>(null);
  const { cle, demander, desarmer } = useConfirmationCle();

  const comptes = useMemo(() => {
    const c = {} as Record<Filtre, number>;
    for (const f of FILTRES) c[f.cle] = products.filter(f.garde).length;
    return c;
  }, [products]);

  const enAvant = comptes.en_avant;

  const affichables = useMemo(() => {
    const garde = FILTRES.find((f) => f.cle === filtre)!.garde;
    const q = plat(recherche.trim());
    return products.filter((p) => garde(p) && (!q || plat(p.name).includes(q)));
  }, [products, filtre, recherche]);

  const visibles = affichables.slice(0, lot);
  const choisies = products.filter((p) => selection.has(p.id));
  const toutChoisi = affichables.length > 0 && affichables.every((p) => selection.has(p.id));

  function changerDeFiltre(f: Filtre) {
    setFiltre(f);
    setSelection(new Set());
    setLot(PAR_LOT);
    desarmer();
  }

  function basculer(id: string) {
    desarmer();
    setSelection((avant) => {
      const apres = new Set(avant);
      if (apres.has(id)) apres.delete(id);
      else apres.add(id);
      return apres;
    });
  }

  function lancer(intention: Intention, ids: string[], reussite: string) {
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("intent", intention);
    ids.forEach((id) => formData.append("ids", id));

    startTransition(async () => {
      const res = await bulkProductAction(formData);
      setEtoileEnCours(null);
      if (!res.ok) {
        setNote({ texte: res.error ?? "L'action n'est pas passée. Réessaie dans un instant.", erreur: true });
        return;
      }
      setNote({ texte: reussite });
      setSelection(new Set());
      router.refresh();
    });
  }

  function agirSurLaSelection(intention: Intention) {
    /* Mettre en avant ne compte que ce qui peut l'être : une pièce déjà
       en avant ou retirée de la boutique ne prend pas de place. */
    const ids =
      intention === "feature"
        ? choisies.filter((p) => !p.featured && !p.retired_at).map((p) => p.id)
        : [...selection];
    const n = ids.length;
    if (intention === "feature" && enAvant + n > MAX_EN_AVANT) {
      desarmer();
      setNote({ texte: phraseDuMaximum(enAvant), erreur: true });
      return;
    }
    if (intention === "delete") {
      // Deuxième appui = confirmation. Une boîte de dialogue native se
      // fait escamoter par les navigateurs mobiles.
      if (!demander("delete")) return;
    }
    desarmer();
    const phrases: Record<Intention, string> = {
      publish: `${pluriel(n, "pièce")} en ligne.`,
      draft: `${pluriel(n, "pièce")} en brouillon : elles ne s'affichent plus sur ta page.`,
      feature: `${pluriel(n, "pièce")} en avant : en tête de ta page et de la vitrine.`,
      unfeature: `${pluriel(n, "pièce")} retirée${n > 1 ? "s" : ""} de la mise en avant.`,
      available: `${pluriel(n, "pièce")} de nouveau disponible${n > 1 ? "s" : ""}.`,
      unavailable: `${pluriel(n, "pièce")} marquée${n > 1 ? "s" : ""} épuisée${n > 1 ? "s" : ""}.`,
      delete: `${pluriel(n, "pièce")} supprimée${n > 1 ? "s" : ""}. Celles qui avaient reçu des cœurs sont archivées, pas effacées.`,
    };
    lancer(intention, ids, phrases[intention]);
  }

  function basculerEtoile(p: Product) {
    desarmer();
    if (!p.featured && enAvant >= MAX_EN_AVANT) {
      setNote({
        texte: `${MAX_EN_AVANT} pièces en avant au maximum. Retire l'étoile d'une autre pièce pour choisir celle-ci.`,
        erreur: true,
      });
      return;
    }
    setEtoileEnCours(p.id);
    lancer(
      p.featured ? "unfeature" : "feature",
      [p.id],
      p.featured
        ? `« ${p.name} » n'est plus en avant.`
        : `« ${p.name} » est en avant : en tête de ta page et de la vitrine.`
    );
  }

  /* Les actions qui ont un sens pour CETTE sélection, et elles seules. */
  const actions: { intention: Intention; libelle: string; principale?: boolean }[] = [];
  if (choisies.some((p) => p.status === "draft")) actions.push({ intention: "publish", libelle: "Mettre en ligne", principale: true });
  if (choisies.some((p) => p.status === "published")) actions.push({ intention: "draft", libelle: "Passer en brouillon" });
  if (choisies.some((p) => !p.featured && !p.retired_at)) actions.push({ intention: "feature", libelle: "Mettre en avant" });
  if (choisies.some((p) => p.featured)) actions.push({ intention: "unfeature", libelle: "Retirer de la mise en avant" });
  if (!synchroAuto && choisies.some((p) => p.available && !p.retired_at)) actions.push({ intention: "unavailable", libelle: "Marquer épuisée" });
  if (!synchroAuto && choisies.some((p) => !p.available && !p.retired_at)) actions.push({ intention: "available", libelle: "Remettre en stock" });

  const puce =
    "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-[.97]";
  const bouton =
    "rounded-full px-4 py-2 text-[12.5px] font-extrabold transition active:scale-[.97] disabled:opacity-50";

  return (
    <>
      {/* ---- chercher et filtrer ---- */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block sm:w-72">
          <span className="sr-only">Chercher une pièce</span>
          <IconLoupe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setLot(PAR_LOT);
            }}
            placeholder="Chercher une pièce…"
            autoComplete="off"
            enterKeyHint="search"
            className="champ champ-loupe w-full"
          />
        </label>
        <div className="sans-ascenseur -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {FILTRES.map((f) => {
            const n = comptes[f.cle];
            // Un filtre vide n'apprend rien, sauf « Toutes » et « En avant »,
            // qui disent ce qu'on peut faire.
            if (n === 0 && f.cle !== "tout" && f.cle !== "en_avant") return null;
            const pose = filtre === f.cle;
            return (
              <button
                key={f.cle}
                type="button"
                aria-pressed={pose}
                onClick={() => changerDeFiltre(f.cle)}
                className={`${puce} ${
                  pose
                    ? "bg-white text-[var(--color-ink)]"
                    : "border border-white/25 text-white/78 hover:bg-white/12 hover:text-white"
                }`}
              >
                {f.libelle}
                <span className="ml-1.5 tabular-nums opacity-60">
                  {f.cle === "en_avant" ? `${n}/${MAX_EN_AVANT}` : n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- agir sur la sélection ---- */}
      <div className="glass sticky top-[76px] z-20 mb-4 flex flex-wrap items-center justify-between gap-3 p-3 sm:top-[88px] sm:px-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-bold text-white/85">
            <input
              type="checkbox"
              className="case"
              checked={toutChoisi}
              disabled={affichables.length === 0}
              onChange={() => {
                desarmer();
                setSelection(toutChoisi ? new Set() : new Set(affichables.map((p) => p.id)));
              }}
            />
            {selection.size > 0 ? pluriel(selection.size, "sélectionnée") : `Tout sélectionner (${affichables.length})`}
          </label>
        </div>

        {selection.size === 0 ? (
          <p className="m-0 text-[12.5px] font-semibold text-white/60">
            Coche des pièces pour agir sur plusieurs à la fois.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((a) => (
              <button
                key={a.intention}
                type="button"
                disabled={pending}
                onClick={() => agirSurLaSelection(a.intention)}
                className={`${bouton} ${
                  a.principale
                    ? "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(var(--voile),0.3)]"
                    : "border border-white/35 text-white hover:bg-white/12"
                }`}
              >
                {a.libelle}
              </button>
            ))}
            <button
              type="button"
              disabled={pending}
              onClick={() => agirSurLaSelection("delete")}
              onBlur={desarmer}
              className={`${bouton} ${
                cle === "delete"
                  ? "border border-[#ff9db0] bg-[rgba(194,39,63,0.35)] text-white"
                  : "border border-white/25 text-white/70 hover:border-white/50 hover:text-white"
              }`}
            >
              {cle === "delete" ? `Supprimer ${pluriel(selection.size, "pièce")} ?` : "Supprimer"}
            </button>
          </div>
        )}
      </div>

      {note && (
        <p
          role="status"
          className={`glass m-0 mb-4 px-5 py-3 text-[13.5px] leading-relaxed ${note.erreur ? "text-[#ffd0d9]" : "text-white"}`}
        >
          {note.texte}
        </p>
      )}

      {/* ---- les lignes ---- */}
      {affichables.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[14.5px] leading-relaxed text-white/80">
            {recherche
              ? `Aucune pièce ne s'appelle « ${recherche} »${filtre !== "tout" ? " dans ce filtre" : ""}.`
              : filtre === "en_avant"
                ? `Aucune pièce en avant pour l'instant. Touche l'étoile d'une pièce pour la faire passer en tête de ta page et de la vitrine (${MAX_EN_AVANT} au plus).`
                : "Rien dans ce filtre."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visibles.map((p) => {
            const coche = selection.has(p.id);
            const photo = p.images?.[0] ?? p.image_url;
            const prix = formatPrice(p.price_cents, p.currency);
            const sousTitre = [prix, p.categories[0]].filter(Boolean).join(" · ");
            const etoileBloquee = !p.featured && enAvant >= MAX_EN_AVANT;
            return (
              <div
                key={p.id}
                className={`card-light flex items-center p-3 transition sm:p-3.5 ${coche ? "ring-3 ring-white" : ""} ${
                  p.retired_at ? "opacity-70" : ""
                }`}
              >
                <div className="relative z-3 flex w-full items-center gap-3 sm:gap-4">
                  <label className="flex shrink-0 cursor-pointer items-center p-1">
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() => basculer(p.id)}
                      aria-label={`Sélectionner ${p.name}`}
                      className="case"
                    />
                  </label>

                  <Link
                    href={`/espace-marque/${slug}/pieces/${p.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#e6dcfb]">
                      {photo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={vignette(photo, 160) ?? photo}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">
                        {p.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <EtatDeLaPiece piece={p} />
                        {sousTitre && (
                          <span className="truncate text-[12px] font-semibold text-[#6a5a92]">{sousTitre}</span>
                        )}
                      </span>
                    </span>
                  </Link>

                  {!p.retired_at && (
                    <button
                      type="button"
                      onClick={() => basculerEtoile(p)}
                      disabled={pending && etoileEnCours === p.id}
                      aria-pressed={p.featured}
                      aria-label={p.featured ? `Retirer ${p.name} de la mise en avant` : `Mettre ${p.name} en avant`}
                      title={
                        p.featured
                          ? "En avant : en tête de ta page et de la vitrine"
                          : etoileBloquee
                            ? `${MAX_EN_AVANT} pièces en avant au maximum`
                            : "Mettre en avant"
                      }
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 ${
                        p.featured
                          ? "bg-[rgba(240,192,90,0.22)] text-[#b07a10]"
                          : etoileBloquee
                            ? "text-[#c9bfe0]"
                            : "text-[#8a7bab] hover:bg-[rgba(23,10,51,0.06)] hover:text-[#3a2470]"
                      }`}
                    >
                      <IconEtoile pleine={p.featured} className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {affichables.length > visibles.length && (
            <button
              type="button"
              onClick={() => setLot((n) => n + PAR_LOT)}
              className="mx-auto mt-2 rounded-full border border-white/30 bg-white/8 px-5 py-2.5 text-[13px] font-bold text-white/85 transition hover:bg-white/16 hover:text-white"
            >
              Voir {Math.min(PAR_LOT, affichables.length - visibles.length)} de plus
              <span className="ml-1.5 opacity-60">
                ({visibles.length} sur {affichables.length})
              </span>
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * L'état d'une pièce, en mots, le même vocabulaire que les filtres.
 *
 * « En ligne » et non « Publié » : c'est ce que la marque veut savoir
 * (est-ce qu'on la voit ?), et c'est le mot du bandeau de sa page. Une
 * pièce retirée de la boutique n'est plus « en ligne », même si elle
 * reste publiée en base pour garder ses cœurs.
 */
function EtatDeLaPiece({ piece }: { piece: Product }) {
  const pastille = "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]";
  if (piece.retired_at) {
    return <span className={`${pastille} bg-[rgba(23,10,51,0.07)] text-[#8a7bab]`}>Retirée de ta boutique</span>;
  }
  return (
    <>
      {piece.status === "published" ? (
        <span className={`${pastille} bg-[rgba(47,122,79,0.12)] text-[#2f7a4f]`}>En ligne</span>
      ) : (
        <span className={`${pastille} bg-[rgba(23,10,51,0.07)] text-[#8a7bab]`}>Brouillon</span>
      )}
      {!piece.available && (
        <span className={`${pastille} bg-[rgba(194,39,63,0.1)] text-[#a3324a]`}>Épuisée</span>
      )}
    </>
  );
}
