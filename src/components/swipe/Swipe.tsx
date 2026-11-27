"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { COULEURS } from "@/lib/couleurs";
import { poserMonCoeur } from "@/lib/likes";
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
 * « JE GARDE » EST UN COUP DE CŒUR. Connecté, le geste pose le cœur de
 * la pièce, comme le bouton des fiches (`poserMonCoeur`), et « Annuler »
 * le reprend. Sans compte, le swipe marche pareil et le dit : le profil
 * apprend, mais rien n'est enregistré.
 *
 * LE PROFIL RESTE DANS LE NAVIGATEUR, avec les pièces déjà vues : il ne
 * part ailleurs que dans la demande de la pile suivante.
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

type Memoire = { profil: Profil; vus: string[] };

function lire(): Memoire {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "null");
    if (brut && typeof brut === "object") {
      return {
        profil: { ...PROFIL_VIDE, ...brut.profil },
        vus: Array.isArray(brut.vus) ? brut.vus.slice(-VUS_MAX) : [],
      };
    }
  } catch {
    // Stockage indisponible (navigation privée stricte) : on repart de zéro.
  }
  return { profil: PROFIL_VIDE, vus: [] };
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

export default function Swipe({ connecte }: { connecte: boolean }) {
  const [memoire, setMemoire] = useState<Memoire>({ profil: PROFIL_VIDE, vus: [] });
  const [coeurs, setCoeurs] = useState(0);
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

  /* ---------- décider ---------- */
  const decider = useCallback(
    (garde: boolean) => {
      const c = pile[rang];
      if (!c || sortie) return;
      setSortie(garde ? "droite" : "gauche");
      // Le cœur part tout de suite, sans attendre l'animation.
      if (garde && connecte) {
        poserMonCoeur(c.id, true).then((r) => {
          if (r.ok) setCoeurs((n) => n + 1);
        });
      }
      window.setTimeout(() => {
        const avant = memoireRef.current;
        memoriser({
          profil: apprendre(avant.profil, c, garde),
          vus: [...avant.vus.filter((id) => id !== c.id), c.id].slice(-VUS_MAX),
        });
        setDernier({ carte: c, garde, avant });
        setRang((r) => r + 1);
        setSortie(null);
      }, 220);
    },
    [pile, rang, sortie, memoriser, connecte]
  );

  const annuler = () => {
    if (!dernier || sortie) return;
    if (dernier.garde && connecte) {
      poserMonCoeur(dernier.carte.id, false).then((r) => {
        if (r.ok) setCoeurs((n) => Math.max(0, n - 1));
      });
    }
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
  const racine = useRef<HTMLDivElement>(null);
  const glisse = useRef<{ x0: number; y0: number; t0: number; dx: number; image: number } | null>(null);

  const poser = (dx: number) => {
    const el = carteRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx / 22}deg)`;
    // Sur la racine : la carte ET les boutons s'en servent.
    const r = racine.current ?? el;
    r.style.setProperty("--garde", String(Math.max(0, Math.min(1, dx / SEUIL_PX))));
    r.style.setProperty("--passe", String(Math.max(0, Math.min(1, -dx / SEUIL_PX))));
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
    if (el) el.style.transform = "";
    racine.current?.style.removeProperty("--garde");
    racine.current?.style.removeProperty("--passe");
  }, [rang]);

  const traits = traitsDuProfil(memoire.profil, NOMS_COULEURS);

  return (
    <div className="sw" ref={racine}>
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

        {/* LA SUIVANTE N'EST PLUS POSÉE DESSOUS. Une photo détourée
            (fond transparent) la laissait voir à travers la carte. Elle
            est seulement préchargée, et arrive en fondu une fois la
            carte partie (voir `.sw-carte`, animation d'entrée). */}

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
      {/* LES GESTES, À LA TINDER : la croix à gauche, le cœur à droite,
          dans le sens où part la carte, et le retour en arrière entre
          les deux. Pendant le glissé, le bouton du côté visé grossit
          avec la distance (`--garde`, `--passe`, posés sur `.sw`). */}
      <div className="sw-gestes">
        <button
          type="button"
          className="sw-rond sw-non"
          onClick={() => decider(false)}
          disabled={!carte || !!sortie}
          aria-label="Pas pour moi"
          title="Pas pour moi (←)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="sw-rond sw-retour"
          onClick={annuler}
          disabled={!dernier || !!sortie}
          aria-label={dernier ? `Annuler « ${dernier.garde ? "je garde" : "pas pour moi"} »` : "Rien à annuler"}
          title="Revenir à la carte d'avant"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 7H4V2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.6 7a8 8 0 1 1-1.1 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="sw-rond sw-oui"
          onClick={() => decider(true)}
          disabled={!carte || !!sortie}
          aria-label="Je garde"
          title="Je garde (→)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.6s-7.6-4.6-9.4-9.3C1.4 8 3.4 4.6 6.9 4.6c2.1 0 3.5 1.1 5.1 3 1.6-1.9 3-3 5.1-3 3.5 0 5.5 3.4 4.3 6.7-1.8 4.7-9.4 9.3-9.4 9.3z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <p className="sw-aide">Glisse la carte, ou utilise les flèches ← →.</p>

      {/* ---------- ce qu'on a compris ---------- */}
      {traits.length > 0 && (
        <p className="sw-profil">
          Ce qu&apos;on a compris : <b>{traits.join(" · ")}</b>. La pile suivante en tient
          compte, avec une carte sur cinq tirée exprès ailleurs.
        </p>
      )}

      {/* ---------- les cœurs ---------- */}
      <p className="sw-coeurs">
        {connecte ? (
          <>
            Chaque « Je garde » devient un coup de cœur
            {coeurs > 0 && <> · <b>{coeurs} aujourd&apos;hui</b></>}.{" "}
            <Link href="/populaires" className="bf-lien">
              Les coups de cœur
            </Link>
          </>
        ) : (
          <>
            Connecte-toi pour que tes « Je garde » deviennent des coups de cœur.{" "}
            <Link href="/connexion?suite=/swipe" className="bf-lien">
              Se connecter
            </Link>
          </>
        )}{" "}
        {memoire.profil.gardees + memoire.profil.passees > 0 && (
          <button
            type="button"
            className="bf-lien"
            onClick={() => {
              memoriser({ profil: PROFIL_VIDE, vus: [] });
              setDernier(null);
            }}
          >
            Repartir de zéro
          </button>
        )}
      </p>
    </div>
  );
}
