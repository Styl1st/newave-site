"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { vignette } from "@/lib/vignette";
import type { Recherche } from "@/lib/types";

/**
 * Le champ de recherche du manifeste.
 *
 * IL NE CHERCHE PAS SUR L'ACCUEIL, IL EMMÈNE AILLEURS. C'est la seule
 * chose à comprendre de ce fichier. L'accueil n'a ni filtres, ni index
 * A→Z, ni mode liste : y fabriquer une deuxième recherche reviendrait à
 * proposer la moins bonne des deux, et à laisser croire que l'annuaire
 * n'a rien de plus. Ce champ propose donc des DESTINATIONS — une fiche
 * de marque, une fiche de pièce — et rend la main à `/marques` dès que
 * la question dépasse ce qu'une liste de six lignes peut dire.
 *
 * Les suggestions viennent de `/api/recherche`, la même route que celle
 * de l'annuaire. Aucune recherche n'est écrite ici : si un jour elle
 * change de comportement, les deux champs changent ensemble.
 *
 * CE QUE CE CHAMP NE FAIT PAS ENCORE : transmettre la saisie à
 * l'annuaire. `/marques` ne lit aucun paramètre d'adresse aujourd'hui,
 * et fabriquer un `?q=` que personne ne lit donnerait un champ vide à
 * l'arrivée — l'impression que la recherche a été perdue en chemin.
 * Le jour où l'annuaire lira ce paramètre, il n'y a qu'une ligne à
 * changer ici : celle de `versLAnnuaire`.
 */

/** En deçà, on ne cherche pas, on parcourt. Même seuil que l'annuaire. */
const MINIMUM = 2;

/** Le temps qu'on laisse aux doigts avant d'aller interroger la base. */
const REPOS = 180;

export default function RechercheAccueil() {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const bloc = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Recherche | null>(null);
  const [panneau, setPanneau] = useState(false);
  const [surligne, setSurligne] = useState(0);

  /*
   * ⌘K depuis n'importe où dans la page.
   *
   * Le manifeste occupe le premier écran : passé le pli, le champ n'est
   * plus là. Le raccourci le ramène sans avoir à remonter, et c'est le
   * même geste que sur l'annuaire — un réflexe ne s'apprend qu'une fois.
   *
   * Ctrl aussi bien que ⌘ : rien n'oblige à supposer un Mac.
   */
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
        setPanneau(true);
      }
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, []);

  /*
   * On ferme en cliquant à côté, et surtout pas au `blur` du champ : le
   * `blur` part avant le clic, la suggestion visée n'existerait plus au
   * moment où le clic arrive. Voir `BrandDirectory`, qui a payé ce bug.
   */
  useEffect(() => {
    if (!panneau) return;
    const dehors = (e: MouseEvent) => {
      if (!bloc.current?.contains(e.target as Node)) setPanneau(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [panneau]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MINIMUM) {
      setSuggestions(null);
      return;
    }

    const halte = new AbortController();
    const minuteur = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: halte.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((json: Recherche) => {
          setSuggestions(json);
          setSurligne(0);
        })
        .catch(() => {
          /* Frappe suivante, ou réseau : le panneau garde ce qu'il a. */
        });
    }, REPOS);

    return () => {
      clearTimeout(minuteur);
      halte.abort();
    };
  }, [query]);

  const proposees = suggestions?.marques ?? [];
  const pieces = suggestions?.pieces ?? [];

  /** La sortie de secours : l'annuaire, qui sait tout faire de plus. */
  function versLAnnuaire() {
    setPanneau(false);
    router.push("/marques");
  }

  function toucheDansLeChamp(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setPanneau(false);
      champ.current?.blur();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      // Entrée ouvre la marque surlignée ; sans marque sous la main, on
      // renvoie vers l'annuaire plutôt que de ne rien faire du tout —
      // une touche Entrée qui ne produit rien passe pour une panne.
      const cible = panneau ? proposees[surligne] : undefined;
      if (cible) router.push(`/marques/${cible.slug}`);
      else versLAnnuaire();
      return;
    }

    if (!panneau || proposees.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSurligne((i) => (i + 1) % proposees.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSurligne((i) => (i - 1 + proposees.length) % proposees.length);
    }
  }

  const ouvrable =
    panneau && query.trim().length >= MINIMUM && (proposees.length > 0 || pieces.length > 0);

  return (
    <div ref={bloc} className="relative w-full text-left">
      <input
        ref={champ}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPanneau(true);
        }}
        onFocus={() => setPanneau(true)}
        onKeyDown={toucheDansLeChamp}
        placeholder="Chercher une marque, une pièce…"
        aria-label="Chercher une marque, une pièce"
        autoComplete="off"
        /* `champ` seule : la classe pose sa taille, son verre et son
           halo de mise au point hors de toute couche Tailwind, donc une
           utilitaire de padding ou d'ombre posée ici ne servirait à
           rien. Le gabarit demandait un champ un peu plus grand pour le
           manifeste ; ce serait à `globals.css` de le dire, pas à ce
           fichier de le contourner. */
        className="champ"
      />

      {/* Le raccourci s'efface dès qu'on tape : il rappelle un geste, il
          n'a plus rien à dire une fois le curseur dedans. Et il ne
          s'affiche pas au doigt : un téléphone n'a ni ⌘ ni Ctrl, et le
          badge mangerait la place du texte d'invite. */}
      {!query && (
        <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-[10.5px] font-extrabold tracking-[0.06em] text-white/40 sm:block">
          ⌘ K
        </span>
      )}

      {/*
       * LE PANNEAU FLOTTE AU LIEU DE POUSSER.
       *
       * Le manifeste est centré verticalement sur tout le premier écran.
       * Un panneau posé dans le flux aurait recentré le bloc entier à
       * chaque lettre tapée : le logo, la baseline et les boutons
       * remonteraient sous les doigts. Il est donc en surimpression,
       * ancré au champ, et il descend avec lui.
       */}
      {ouvrable && (
        <div className="glass absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto p-3">
          {proposees.length > 0 && (
            <>
              <p className="eyebrow m-0 mb-2">
                Marques · {proposees.length} résultat{proposees.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-col gap-0.5">
                {proposees.map((m, i) => (
                  <Link
                    key={m.slug}
                    href={`/marques/${m.slug}`}
                    onMouseEnter={() => setSurligne(i)}
                    className={`flex items-center gap-3 rounded-[12px] px-2 py-2 transition ${
                      i === surligne ? "bg-white/14" : "hover:bg-white/8"
                    }`}
                  >
                    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white/10">
                      {m.visuel ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={vignette(m.visuel, 160, { logo: true })}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-[11px] font-black text-white/60">
                          {m.name.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-white">
                      <Surligne texte={m.name} motif={query.trim()} />
                    </span>

                    <span className="hidden shrink-0 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white/50 sm:block">
                      {[m.categorie, m.ville].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {pieces.length > 0 && (
            <>
              <p
                className={`eyebrow m-0 mb-2 ${proposees.length > 0 ? "mt-4" : ""}`}
              >
                Pièces · {suggestions?.totalPieces ?? pieces.length} résultat
                {(suggestions?.totalPieces ?? pieces.length) > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {pieces.map((p) => (
                  <Link
                    key={p.id}
                    href={p.adresse}
                    title={p.name}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-white/10 transition hover:scale-105"
                  >
                    {p.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={vignette(p.image, 160)}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* La ligne qui rend le champ honnête : ce qu'il ne sait pas
              faire, l'annuaire le fait, et on le dit plutôt que de
              laisser chercher. */}
          <button
            type="button"
            onClick={versLAnnuaire}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-[12px] border-t border-white/16 px-2 pb-1 pt-3 text-left transition hover:bg-white/8"
          >
            <span className="text-[13px] font-bold text-white/85">
              Chercher dans l&apos;annuaire complet
            </span>
            <span className="shrink-0 text-[15px] font-black text-white/60">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Le préfixe tapé, mis en évidence dans le nom.
 *
 * ON N'ÉCRIT PAS DE HTML À LA MAIN ICI : le texte surligné vient de ce
 * que quelqu'un a tapé, et le fabriquer en chaîne de balises serait
 * exactement l'endroit où l'on ouvre une faille. On découpe, React
 * échappe chaque morceau.
 */
function Surligne({ texte, motif }: { texte: string; motif: string }) {
  if (!motif) return <>{texte}</>;

  const i = texte.toLowerCase().indexOf(motif.toLowerCase());
  if (i < 0) return <>{texte}</>;

  return (
    <>
      {texte.slice(0, i)}
      <mark className="rounded-[3px] bg-[rgba(var(--accent-1),0.45)] px-0.5 text-white">
        {texte.slice(i, i + motif.length)}
      </mark>
      {texte.slice(i + motif.length)}
    </>
  );
}
