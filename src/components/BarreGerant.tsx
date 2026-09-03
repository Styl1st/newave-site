"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { conditionsDePublication } from "./publication/conditions";
import { useRetouche } from "./retouche/ContexteRetouche";
import { vignette } from "@/lib/vignette";
import { doitAvoirDesPieces } from "@/lib/acces";
import type { Brand } from "@/lib/types";

/**
 * La barre du gérant : où l'on est, ce qu'on peut faire, et ce qui manque.
 *
 * CE QU'ELLE NE DISAIT PAS, ET QUI COMPTAIT PLUS QUE LE RESTE. Trois
 * onglets et deux boutons, sans rien qui nomme la marque — un problème
 * réel dès qu'on en gère deux —, rien qui dise qu'elle est en brouillon,
 * et surtout rien sur ce qui l'empêche de partir en ligne. Cette
 * dernière information existait déjà dans `publication.ts`, mais on ne
 * l'entendait qu'au moment d'échouer : on remplissait sa fiche
 * consciencieusement, et l'on apprenait qu'il manquait une pièce au
 * catalogue le jour où quelqu'un s'étonnait de ne pas voir la marque
 * dans l'annuaire.
 *
 * D'OÙ DEUX ÉTAGES. Le premier ne change jamais : à qui appartient cette
 * zone, où aller, quoi faire. Le second dépend de l'état de la fiche —
 * ce qui retient un brouillon, ce que rapporte une fiche en ligne — et
 * garde la même place pour que l'œil sache où regarder.
 *
 * PLUS OPAQUE QUE LA BARRE PUBLIQUE, volontairement : c'est un outil,
 * pas du décor. Le filet de couleur en haut est le seul signe qui dit
 * « cette zone n'appartient qu'à toi ».
 *
 * ET C'EST D'ICI QU'ON ENTRE EN RETOUCHE. Sur la page publique de la
 * marque, « Modifier ma fiche » n'emmène plus nulle part : il allume un
 * ÉTAT, et la page devient modifiable là où elle est (voir
 * `retouche/SceneRetouche`). Ailleurs — « Mes pièces », « Statistiques »
 * —, il n'y a pas de page à retoucher : la barre ne trouve alors aucune
 * scène autour d'elle, et le bouton reste le lien vers l'éditeur. Ce
 * n'est pas deux barres, c'est la même qui répond à où elle se trouve.
 */

/** Ce qui part. */
const VERT = "#7de2ab";
/** Ce qui retient. */
const AMBRE = "#f0c05a";

export default function BarreGerant({
  brand,
  pieces,
  stats,
  peutPublier = false,
  voix = "gerant",
}: {
  brand: Brand;
  /**
   * Combien de pièces au catalogue.
   *
   * Absent = on ne sait pas, et l'on n'affiche alors PAS de check-list :
   * annoncer « il manque une pièce » à une marque qui en a quarante
   * serait pire que de ne rien dire. Les pages qui connaissent ce
   * nombre le passent ; les autres s'en passent.
   */
  pieces?: number;
  /** Les trois chiffres d'une fiche en ligne. Absents = pas de bandeau. */
  stats?: { vues7: number; favoris: number; clics: number };
  /**
   * Le bouton « Publier » ne s'affiche qu'à qui peut vraiment publier.
   *
   * Dans ce dépôt, la mise en ligne passe par une action réservée aux
   * administrateurs. Poser le bouton à tout le monde aurait donné un
   * geste qui échoue en silence — pire qu'un bouton absent, parce qu'on
   * croit avoir publié. Le gérant voit donc ce qui manque, et le geste
   * qui lève l'obstacle, sans la promesse qu'il ne peut pas tenir.
   */
  peutPublier?: boolean;
  /**
   * À qui la barre parle.
   *
   * Un administrateur voit la même barre sur n'importe quelle marque —
   * c'est voulu, il doit pouvoir agir partout. Mais « ton espace » et
   * « modifier ma fiche » devant une marque qu'on administre sans la
   * tenir sont faux, et ce genre de petit mensonge se remarque tout de
   * suite. Seuls les mots changent ; pas un bouton, pas un droit.
   */
  voix?: "gerant" | "administration";
}) {
  const chemin = usePathname();
  /* `null` partout où il n'y a pas de fiche à retoucher sous les yeux. */
  const retouche = useRetouche();

  const aMoi = voix !== "administration";
  const MOTS = aMoi
    ? {
        appartenance: "Ton espace",
        onglets: ["Ma page", "Mes pièces", "Statistiques"],
        modifier: "Modifier ma fiche",
        publier: "Publier ma marque",
        reste: "Il te reste",
        completer: "Compléter ma fiche",
        importer: "Importer depuis ma boutique",
      }
    : {
        appartenance: "Administration",
        onglets: ["Sa page", "Ses pièces", "Statistiques"],
        modifier: "Modifier la fiche",
        publier: "Publier cette marque",
        reste: "Il reste",
        completer: "Compléter la fiche",
        importer: "Importer depuis la boutique",
      };

  const onglets = [
    { href: `/marques/${brand.slug}`, label: MOTS.onglets[0], exact: true, compte: null as number | null },
    {
      href: `/espace-marque/${brand.slug}/pieces`,
      label: MOTS.onglets[1],
      exact: false,
      compte: pieces ?? null,
    },
    {
      href: `/espace-marque/${brand.slug}/stats`,
      label: MOTS.onglets[2],
      exact: true,
      compte: null,
    },
  ];

  const enLigne = brand.status === "published";

  /*
   * La check-list vient de `obstacleAPublication`, jamais d'un test
   * local : voir `publication/conditions`. Les phrases affichées sont
   * celles que la fonction renvoie.
   */
  const conditions =
    pieces === undefined
      ? null
      : conditionsDePublication({
          tagline: brand.tagline,
          description: brand.description,
          cover_url: brand.cover_url,
          logo_url: brand.logo_url,
          pieces,
          exigeDesPieces: doitAvoirDesPieces(brand),
        });

  const manquantes = conditions?.filter((c) => c.obstacle) ?? [];
  const complet = conditions !== null && manquantes.length === 0;

  const visuel = brand.logo_url ?? brand.cover_url;

  const base =
    "rounded-[13px] px-3.5 py-2.5 text-[13px] font-bold transition active:scale-[.97]";
  const repos = "text-white/75 hover:bg-white/14 hover:text-white";
  const ici = "bg-white font-extrabold text-[var(--color-ink)]";

  return (
    <div
      data-no-reveal
      className="overflow-hidden rounded-[22px] border border-white/18 bg-[rgba(6,2,26,0.72)] shadow-[0_18px_44px_-16px_rgba(12,3,36,0.9),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[26px]"
    >
      {/* Le filet d'appartenance. */}
      <span
        aria-hidden
        className="block h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(var(--accent-1),.9), rgba(var(--accent-3),.85), rgba(var(--accent-2),.9))",
        }}
      />

      {/* ---------- premier étage ---------- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3.5 sm:px-[18px]">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-white/10 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.5)]">
            {visuel ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={vignette(visuel, 160, { logo: Boolean(brand.logo_url) })}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-[15px] font-black text-white/70">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>

          <div className="min-w-0">
            <p className="m-0 text-[9px] font-black uppercase tracking-[0.2em] text-white/55">
              {MOTS.appartenance}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="m-0 min-w-0 truncate text-[15px] font-extrabold tracking-[-0.02em] text-white">
                {brand.name}
              </p>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]"
                style={
                  enLigne
                    ? {
                        background: "rgba(125,226,171,.16)",
                        boxShadow: "inset 0 0 0 1px rgba(125,226,171,.45)",
                        color: "#a6ecc6",
                      }
                    : {
                        background: "rgba(240,192,90,.18)",
                        boxShadow: "inset 0 0 0 1px rgba(240,192,90,.5)",
                        color: "#f5d38f",
                      }
                }
              >
                <span
                  aria-hidden
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: enLigne ? VERT : AMBRE }}
                />
                {enLigne ? "En ligne" : "Brouillon"}
              </span>
            </div>
          </div>
        </div>

        <span aria-hidden className="hidden h-[34px] w-px bg-white/18 lg:block" />

        {/* Les onglets défilent plutôt que de passer à la ligne : sur un
            téléphone, trois onglets et deux boutons empilés font une
            barre plus haute que le contenu qu'elle surmonte. */}
        <div className="sans-ascenseur -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 lg:mx-0 lg:w-auto lg:flex-none lg:px-0">
          {onglets.map((o) => {
            // « Mes pièces » couvre aussi l'ajout, l'import et la fiche
            // d'une pièce : ce sont des étapes de ce même onglet.
            const actif = o.exact ? chemin === o.href : chemin.startsWith(o.href);
            return (
              <Link
                key={o.href}
                href={o.href}
                className={`${base} shrink-0 whitespace-nowrap ${actif ? ici : repos}`}
              >
                {o.label}
                {o.compte !== null && (
                  <span className="ml-1.5 text-[12px] font-black tabular-nums opacity-55">
                    {o.compte}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex w-full items-stretch gap-2 lg:w-auto lg:flex-none">
          {retouche ? (
            <button
              type="button"
              aria-pressed={retouche.actif}
              onClick={() => (retouche.actif ? retouche.sortir() : retouche.entrer())}
              className={`${base} flex-1 text-center lg:flex-none ${
                retouche.actif
                  ? "text-white"
                  : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/16 hover:text-white"
              }`}
              /* En retouche, le bouton n'est plus un bouton : c'est le
                 témoin que le mode est allumé. D'où le dégradé
                 d'accents, la seule matière du site qui ne serve qu'à
                 dire « ceci est en cours ». */
              style={
                retouche.actif
                  ? {
                      backgroundImage:
                        "linear-gradient(118deg, rgba(var(--accent-1),.6), rgba(var(--accent-2),.58))",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)",
                    }
                  : undefined
              }
            >
              {retouche.actif ? retouche.mots.enRetouche : MOTS.modifier}
            </button>
          ) : (
            <Link
              href={`/espace-marque/${brand.slug}/modifier`}
              className={`${base} flex-1 border border-white/20 bg-white/10 text-center text-white/80 hover:bg-white/16 hover:text-white lg:flex-none`}
            >
              {MOTS.modifier}
            </Link>
          )}
          <Link
            href={`/espace-marque/${brand.slug}/pieces/ajouter`}
            className={`${base} flex-1 bg-white text-center text-[var(--color-ink)] shadow-[0_4px_16px_-4px_rgba(var(--accent-1),0.6)] hover:opacity-90 lg:flex-none`}
          >
            Ajouter des pièces
          </Link>
        </div>
      </div>

      {/* ---------- second étage ----------

          Même place, même hauteur, contenu différent selon l'état. Un
          bandeau qui apparaît et disparaît d'une page à l'autre ferait
          sauter tout ce qu'il y a en dessous. */}

      {/* En retouche, il porte la consigne et la sortie. La check-list
          ne disparaît pas pour autant : elle est passée dans le rail, où
          elle vit au fil de la frappe. La redire ici en ferait deux, et
          l'une des deux serait en retard d'un caractère. */}
      {retouche?.actif && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-white/10 px-3.5 py-3 sm:px-[18px]"
          style={{ background: "rgba(var(--accent-1),.14)" }}
        >
          <p className="m-0 min-w-0 flex-1 text-[12.5px] font-semibold text-white/85">
            {retouche.etroit ? retouche.mots.consigneEtroite : retouche.mots.consigne}
          </p>

          {retouche.etroit && (
            <button
              type="button"
              onClick={() => retouche.ouvrirFeuille()}
              className="rounded-full bg-white px-4 py-2 text-[12px] font-black text-[var(--color-ink)] transition active:scale-[.97]"
            >
              Ouvrir le panneau
            </button>
          )}

          <button
            type="button"
            onClick={retouche.sortir}
            className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12px] font-bold text-white/85 transition hover:bg-white/20 hover:text-white active:scale-[.97]"
          >
            {retouche.mots.quitter}
          </button>
        </div>
      )}

      {!retouche?.actif && !enLigne && conditions && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-white/10 px-3.5 py-3 sm:px-[18px]"
          style={{ background: "rgba(240,192,90,.12)" }}
        >
          <span
            aria-hidden
            className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-black text-[#3a2a06]"
            style={{ background: "rgba(240,192,90,.9)" }}
          >
            {manquantes.length}
          </span>

          <p className="m-0 min-w-0 flex-1 text-[12.5px] font-semibold text-white/85">
            {manquantes.length === 0
              ? "Tout est en règle. Cette fiche peut partir en ligne."
              : manquantes.length === 1
                ? `${MOTS.reste} une chose avant de pouvoir publier.`
                : `${MOTS.reste} ${manquantes.length} choses avant de pouvoir publier.`}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {conditions.map((c) => (
              <span
                key={c.cle}
                title={c.obstacle ?? undefined}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white/85"
                style={{ background: "rgba(255,255,255,.08)" }}
              >
                <span
                  aria-hidden
                  className="grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full text-[9px] font-black"
                  style={
                    c.obstacle
                      ? {
                          background: "rgba(240,192,90,.2)",
                          boxShadow: `inset 0 0 0 2px ${AMBRE}`,
                          color: "transparent",
                        }
                      : { background: "rgba(125,226,171,.22)", color: VERT }
                  }
                >
                  {c.obstacle ? "" : "✓"}
                </span>
                {c.titre}
              </span>
            ))}
          </div>

          {/* Le geste qui lève l'obstacle, plutôt qu'un rappel de plus.
              On ne propose que le premier : trois raccourcis à la suite
              se lisent comme une liste de reproches. */}
          {manquantes[0]?.cle === "pieces" && (
            <Link
              href={`/espace-marque/${brand.slug}/import`}
              className="text-[11.5px] font-bold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
            >
              {MOTS.importer}
            </Link>
          )}
          {manquantes[0] && manquantes[0].cle !== "pieces" && (
            <Link
              href={`/espace-marque/${brand.slug}/modifier`}
              className="text-[11.5px] font-bold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
            >
              {MOTS.completer}
            </Link>
          )}

          {peutPublier && (
            <button
              type="button"
              disabled={!complet}
              title={complet ? undefined : (manquantes[0]?.obstacle ?? undefined)}
              className="rounded-full px-4 py-2 text-[12px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background:
                  "linear-gradient(118deg, rgba(var(--accent-1),.7), rgba(var(--accent-2),.7))",
              }}
            >
              {MOTS.publier}
            </button>
          )}
        </div>
      )}

      {!retouche?.actif && enLigne && stats && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 bg-white/6 px-3.5 py-3 sm:px-[18px]">
          {[
            { valeur: stats.vues7, libelle: "vues sur 7 jours" },
            { valeur: stats.favoris, libelle: "en favori" },
            { valeur: stats.clics, libelle: "clics vers la boutique" },
          ].map((chiffre) => (
            <p key={chiffre.libelle} className="m-0 flex items-baseline gap-1.5">
              <span className="text-[17px] font-extrabold tabular-nums text-white">
                {chiffre.valeur}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                {chiffre.libelle}
              </span>
            </p>
          ))}

          <Link
            href={`/espace-marque/${brand.slug}/stats`}
            className="ml-auto text-[11.5px] font-bold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
          >
            Le détail
          </Link>
        </div>
      )}
    </div>
  );
}
