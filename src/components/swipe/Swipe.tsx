"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { COULEURS } from "@/lib/couleurs";
import { formatPrice } from "@/lib/types";
import { vignette } from "@/lib/vignette";
import { PROFIL_VIDE, apprendre, traitsDuProfil, type Carte, type Profil } from "@/lib/swipe";

/**
 * LE SWIPE.
 *
 * Une pile de pièces, une à la fois. On garde ou on passe, au doigt, à
 * la souris ou aux flèches du clavier. Chaque geste nourrit le profil
 * (`lib/swipe`), et la pile suivante en tient compte.
 *
 * TOUT RESTE DANS LE NAVIGATEUR. Le profil, la sélection et les pièces
 * déjà vues sont rangés dans le stockage local : pas besoin de compte,
 * et rien de ce qu'on aime ne part ailleurs que dans la demande de la
 * pile suivante.
 *
 * LA CARTE BOUGE SANS QUE REACT NE REDESSINE. Pendant le glissé, seul un
 * `transform` est écrit sur l'élément, à chaque image : c'est ce qui
 * reste fluide sur un vieux téléphone. React ne reprend la main qu'au
 * lâcher.
 */

const CLE = "newave-swipe-v1";
const VUS_MAX = 300;
const SEUIL_PX = 110;
const NOMS_COULEURS = Object.fromEntries(COULEURS.map((c) => [c.cle, c.nom]));

type Gardee = Pick<Carte, "id" | "slug" | "nom" | "image" | "prix" | "devise" | "marque" | "marqueNom">;

type Memoire = { profil: Profil; selection: Gardee[]; vus: string[] };

function lire(): Memoire {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "null");
    if (brut && typeof brut === "object") {
      return {
        profil: { ...PROFIL_VIDE, ...brut.profil },
        selection: Array.isArray(brut.selection) ? brut.selection.slice(0, 200) : [],
        vus: Array.isArray(brut.vus) ? brut.vus.slice(-VUS_MAX) : [],
      };
    }
  } catch {
    // Stockage indisponible (navigation privée stricte) : on repart de zéro.
  }
  return { profil: PROFIL_VIDE, selection: [], vus: [] };
}

function ecrire(m: Memoire) {
  try {
    localStorage.setItem(CLE, JSON.stringify(m));
  } catch {
    // Plein ou interdit : le swipe marche quand même, il oubliera.
  }
}

const adresse = (c: Pick<Carte, "marque" | "slug" | "id">) => `/marques/${c.marque}/${c.slug ?? c.id}`;
const photo = (url: string | null) => (url ? vignette(url, 720) : undefined);

export default function Swipe() {
  const [memoire, setMemoire] = useState<Memoire>({ profil: PROFIL_VIDE, selection: [], vus: [] });
  const [pile, setPile] = useState<Carte[]>([]);
  const [rang, setRang] = useState(0);
  const [chargement, setChargement] = useState<"attente" | "pret" | "panne">("attente");
  const [dernier, setDernier] = useState<{ carte: Carte; garde: boolean; avant: Memoire } | null>(null);
  const [sortie, setSortie] = useState<"gauche" | "droite" | null>(null);

  const memoireRef = useRef(memoire);
  memoireRef.current = memoire;
  const enRoute = useRef(false);

  /* ---------- la mémoire du navigateur ---------- */
  useEffect(() => {
    const m = lire();
    setMemoire(m);
    memoireRef.current = m;
  }, []);

  const memoriser = useCallback((m: Memoire) => {
    setMemoire(m);
    memoireRef.current = m;
    ecrire(m);
  }, []);

  /* ---------- les piles ---------- */
  const piocher = useCallback(async (dejaEnMain: string[]) => {
    if (enRoute.current) return;
    enRoute.current = true;
    try {
      const m = memoireRef.current;
      const r = await fetch("/api/swipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profil: m.profil, exclus: [...m.vus, ...dejaEnMain] }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const { cartes } = (await r.json()) as { cartes: Carte[] };
      setPile((p) => {
        const ids = new Set(p.map((c) => c.id));
        return [...p, ...cartes.filter((c) => !ids.has(c.id))];
      });
      setChargement("pret");
    } catch {
      setChargement((e) => (e === "attente" ? "panne" : e));
    } finally {
      enRoute.current = false;
    }
  }, []);

  // La première pile, une fois la mémoire relue.
  const premiere = useRef(false);
  useEffect(() => {
    if (premiere.current) return;
    premiere.current = true;
    // Un tour de boucle : laisse l'effet de lecture poser la mémoire.
    const t = setTimeout(() => piocher([]), 0);
    return () => clearTimeout(t);
  }, [piocher]);

  // La suivante, avant d'arriver au bout.
  const restantes = pile.length - rang;
  useEffect(() => {
    if (chargement === "pret" && restantes <= 5) piocher(pile.slice(rang).map((c) => c.id));
  }, [restantes, chargement, piocher, pile, rang]);

  // Les trois photos d'après, prêtes avant d'être vues.
  useEffect(() => {
    for (const c of pile.slice(rang + 1, rang + 4)) {
      const src = photo(c.image);
      if (src) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    }
  }, [pile, rang]);

  const carte = pile[rang];
  const suivante = pile[rang + 1];

  /* ---------- décider ---------- */
  const decider = useCallback(
    (garde: boolean) => {
      const c = pile[rang];
      if (!c || sortie) return;
      setSortie(garde ? "droite" : "gauche");
      window.setTimeout(() => {
        const avant = memoireRef.current;
        const selection = garde
          ? [
              {
                id: c.id,
                slug: c.slug,
                nom: c.nom,
                image: c.image,
                prix: c.prix,
                devise: c.devise,
                marque: c.marque,
                marqueNom: c.marqueNom,
              },
              ...avant.selection.filter((g) => g.id !== c.id),
            ].slice(0, 200)
          : avant.selection;
        memoriser({
          profil: apprendre(avant.profil, c, garde),
          selection,
          vus: [...avant.vus.filter((id) => id !== c.id), c.id].slice(-VUS_MAX),
        });
        setDernier({ carte: c, garde, avant });
        setRang((r) => r + 1);
        setSortie(null);
      }, 220);
    },
    [pile, rang, sortie, memoriser]
  );

  const annuler = () => {
    if (!dernier || sortie) return;
    memoriser(dernier.avant);
    setRang((r) => Math.max(0, r - 1));
    setDernier(null);
  };

  /* ---------- le clavier ---------- */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") decider(true);
      else if (e.key === "ArrowLeft") decider(false);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [decider]);

  /* ---------- le glissé ---------- */
  const carteRef = useRef<HTMLDivElement>(null);
  const glisse = useRef<{ x0: number; y0: number; t0: number; dx: number; image: number } | null>(null);

  const poser = (dx: number) => {
    const el = carteRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx / 22}deg)`;
    el.style.setProperty("--garde", String(Math.max(0, Math.min(1, dx / SEUIL_PX))));
    el.style.setProperty("--passe", String(Math.max(0, Math.min(1, -dx / SEUIL_PX))));
  };

  const auPose = (e: React.PointerEvent) => {
    if (sortie || (e.target as HTMLElement).closest("a, button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    glisse.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, image: 0 };
    carteRef.current?.setAttribute("data-glisse", "");
  };

  const auMouvement = (e: React.PointerEvent) => {
    const g = glisse.current;
    if (!g) return;
    g.dx = e.clientX - g.x0;
    if (!g.image) {
      g.image = requestAnimationFrame(() => {
        if (glisse.current) {
          poser(glisse.current.dx);
          glisse.current.image = 0;
        }
      });
    }
  };

  const auLacher = () => {
    const g = glisse.current;
    glisse.current = null;
    const el = carteRef.current;
    el?.removeAttribute("data-glisse");
    if (!g || !el) return;
    if (g.image) cancelAnimationFrame(g.image);
    const vitesse = g.dx / Math.max(1, performance.now() - g.t0);
    if (Math.abs(g.dx) > SEUIL_PX || Math.abs(vitesse) > 0.6) {
      decider(g.dx > 0);
    } else {
      poser(0);
    }
  };

  // Une nouvelle carte part toujours d'aplomb.
  useEffect(() => {
    const el = carteRef.current;
    if (el) {
      el.style.transform = "";
      el.style.removeProperty("--garde");
      el.style.removeProperty("--passe");
    }
  }, [rang]);

  const traits = traitsDuProfil(memoire.profil, NOMS_COULEURS);

  return (
    <div className="sw">
      {/* ---------- la pile ---------- */}
      <div className="sw-scene">
        {chargement === "panne" && !carte && (
          <p className="sw-vide">
            La pile n&apos;a pas pu venir.{" "}
            <button type="button" className="bf-lien" onClick={() => { setChargement("attente"); piocher([]); }}>
              Réessayer
            </button>
          </p>
        )}
        {chargement !== "panne" && !carte && (
          <div className="sw-vide" role="status">
            <span className="vitrine-anneau" aria-hidden="true" />
            <span className="vitrine-attente-mot">Ça arrive…</span>
          </div>
        )}

        {suivante && (
          <div className="sw-carte sw-dessous" aria-hidden="true">
            <div className="sw-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo(suivante.image)} alt="" decoding="async" />
            </div>
          </div>
        )}

        {carte && (
          <div
            key={carte.id}
            ref={carteRef}
            className="sw-carte"
            data-sortie={sortie ?? undefined}
            onPointerDown={auPose}
            onPointerMove={auMouvement}
            onPointerUp={auLacher}
            onPointerCancel={auLacher}
          >
            <div className="sw-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo(carte.image)} alt={carte.nom} decoding="async" draggable={false} />
              <span className="sw-verdict sw-verdict-garde" aria-hidden="true">Je garde</span>
              <span className="sw-verdict sw-verdict-passe" aria-hidden="true">Pas pour moi</span>
              {carte.decouverte && <span className="sw-ailleurs">Pour changer</span>}
            </div>
            <div className="sw-texte" aria-live="polite">
              <p className="sw-marque">{carte.marqueNom}</p>
              <p className="sw-nom">{carte.nom}</p>
              <p className="sw-prix">
                {formatPrice(carte.prix, carte.devise)}
                {!carte.disponible && <span> · épuisée</span>}
                <Link href={adresse(carte)} className="bf-lien sw-voir">
                  Voir la pièce
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---------- les gestes ---------- */}
      <div className="sw-gestes">
        <button type="button" className="sw-bouton" onClick={() => decider(false)} disabled={!carte || !!sortie}>
          Pas pour moi
        </button>
        <button type="button" className="sw-bouton sw-bouton-garde" onClick={() => decider(true)} disabled={!carte || !!sortie}>
          Je garde
        </button>
      </div>
      <p className="sw-aide">
        Glisse la carte, ou utilise les flèches ← →.
        {dernier && (
          <>
            {" "}
            <button type="button" className="bf-lien" onClick={annuler}>
              Annuler « {dernier.garde ? "je garde" : "pas pour moi"} »
            </button>
          </>
        )}
      </p>

      {/* ---------- ce qu'on a compris ---------- */}
      {traits.length > 0 && (
        <p className="sw-profil">
          Ce qu&apos;on a compris : <b>{traits.join(" · ")}</b>. La pile suivante en tient
          compte, avec une carte sur cinq tirée exprès ailleurs.
        </p>
      )}

      {/* ---------- la sélection ---------- */}
      <section className="sw-selection" aria-label="Ta sélection">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow m-0">Ta sélection · {memoire.selection.length}</p>
          {(memoire.selection.length > 0 || memoire.profil.gardees + memoire.profil.passees > 0) && (
            <button
              type="button"
              className="bf-lien"
              onClick={() => {
                memoriser({ profil: PROFIL_VIDE, selection: [], vus: [] });
                setDernier(null);
              }}
            >
              Repartir de zéro
            </button>
          )}
        </div>
        {memoire.selection.length === 0 ? (
          <p className="m-0 mt-3 text-[13.5px] text-white/65">
            Ce que tu gardes s&apos;affiche ici, et reste dans ce navigateur.
          </p>
        ) : (
          <div className="sw-grille">
            {memoire.selection.map((g) => (
              <Link key={g.id} href={adresse(g)} className="sw-tuile" title={`${g.nom} · ${g.marqueNom}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image ? vignette(g.image, 240) : undefined} alt={g.nom} loading="lazy" decoding="async" />
                <span>{g.marqueNom}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
