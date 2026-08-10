"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Portal from "./Portal";

type Entree = { href: string; label: string };

/** Les trois traits, qui se croisent en X une fois le menu ouvert. */
function Barres({ ouvert }: { ouvert: boolean }) {
  return (
    <span className="relative block h-[13px] w-[18px]">
      <span className={`absolute left-0 block h-[2.2px] w-full rounded-full bg-white transition-all duration-300 ${ouvert ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`} />
      <span className={`absolute left-0 top-1/2 block h-[2.2px] w-full -translate-y-1/2 rounded-full bg-white transition-all duration-200 ${ouvert ? "scale-x-0 opacity-0" : "opacity-100"}`} />
      <span className={`absolute left-0 block h-[2.2px] w-full rounded-full bg-white transition-all duration-300 ${ouvert ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`} />
    </span>
  );
}

/**
 * Le menu de téléphone.
 *
 * Le décor ne bouge pas. Ce qui change, c'est ce qu'il y a dessus : le
 * contenu de la page s'efface, les liens du menu montent un par un.
 *
 * C'est la troisième version. La première glissait depuis la droite,
 * la deuxième s'ouvrait en cercle depuis le bouton. Cette dernière
 * était la plus jolie, mais elle dépendait d'une transition de
 * découpe que le navigateur laissait parfois passer : le menu
 * apparaissait alors d'un coup. Une animation qui marche trois fois
 * sur quatre est pire qu'une animation simple qui marche toujours.
 *
 * Reste ce qui plaisait vraiment, et qui ne peut pas rater.
 */
export default function MobileMenu({
  liens,
  compte,
  action,
}: {
  /** Les pages du site. */
  liens: Entree[];
  /** Tout ce qui dépend de la session. */
  compte: { titre: string; liens: Entree[] };
  /** L'action principale, mise à part parce qu'elle n'est pas une page. */
  action: Entree;
}) {
  const [monte, setMonte] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  /**
   * La position exacte du bouton, mesurée à l'ouverture, pour le
   * reposer au même endroit une fois le menu ouvert. Voir plus bas
   * pourquoi il doit déménager.
   */
  const [place, setPlace] = useState({ top: 0, left: 0, taille: 40 });
  const bouton = useRef<HTMLButtonElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const chemin = usePathname();

  const fermer = useCallback(() => {
    setOuvert(false);
    // On laisse le fondu se terminer avant de démonter, sinon le menu
    // disparaîtrait d'un coup au lieu de s'effacer.
    setTimeout(() => setMonte(false), 320);
  }, []);

  function ouvrir() {
    const r = bouton.current?.getBoundingClientRect();
    if (r) {
      setPlace({ top: r.top, left: r.left, taille: r.width });
    }
    setMonte(true);
    // Une image avant de faire apparaître : sans ce délai, le
    // navigateur peint directement l'état final et le fondu ne se voit
    // pas. Deux images plutôt qu'une, pour les appareils lents.
    requestAnimationFrame(() => requestAnimationFrame(() => setOuvert(true)));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (monte) fermer(); }, [chemin]);

  useEffect(() => {
    if (!monte) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", onKey);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Le contenu de la page s'efface, le décor reste.
    document.documentElement.dataset.menu = "1";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = precedent;
      delete document.documentElement.dataset.menu;
    };
  }, [monte, fermer]);


  return (
    <>
      {/*
        Le bouton DÉMÉNAGE quand le menu s'ouvre.
        
        Il vit normalement dans la barre du haut, qui a son propre plan
        d'empilement. Un élément ne peut pas sortir du plan de son
        parent, quel que soit son z-index : laissé là, le bouton passait
        sous le panneau et devenait impossible à toucher. On le rend
        donc à l'intérieur du menu, aux coordonnées relevées à
        l'ouverture — même endroit, même taille, même geste.

        Ici on ne garde qu'une place vide, pour que la barre ne se
        réorganise pas pendant l'absence.
      */}
      <div className="md:hidden" style={{ width: 40, height: 40 }}>
        {!monte && (
          <button
            ref={bouton}
            type="button"
            onClick={ouvrir}
            aria-label="Ouvrir le menu"
            aria-expanded={false}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/14 ring-1 ring-white/25 transition hover:bg-white/24 active:scale-95"
          >
            <Barres ouvert={false} />
          </button>
        )}
      </div>

      {monte && (
        <Portal>
          <div
            ref={panneau}
            className="menu-panneau fixed inset-0 z-[100] md:hidden"
            data-ouvert={ouvert ? "1" : undefined}
          >
            {/*
              AUCUN fond ici, et c'est tout l'enjeu.

              J'ai d'abord affiché un second exemplaire du décor animé,
              puis tenté de caler ses horloges sur celles de la page.
              La frontière du cercle restait visible, et elle le serait
              restée : deux empilements de couches translucides, chacun
              avec ses flous et sa propre couche de composition, ne
              donnent jamais exactement le même pixel.

              Le décor n'est donc pas dupliqué. C'est celui de la page,
              le seul, celui qui était déjà là — le menu est
              transparent, et ce qu'on fait disparaître, c'est le
              CONTENU de la page. Aucun écart n'est possible, puisqu'il
              n'y a plus qu'un décor.
            */}

            {/* Le même bouton, à la même place. Les barres se croisent
                pour former une croix : on voit que c'est le geste
                inverse de celui qu'on vient de faire.

                `z-10` n'est pas décoratif. La liste qui suit occupe
                toute la hauteur de l'écran, et deux éléments positionnés
                sans rang explicite se superposent dans l'ordre du
                document : la liste passait donc DEVANT la croix, qui
                restait visible mais ne recevait plus aucun appui. */}
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer le menu"
              aria-expanded
              style={{
                position: "fixed",
                top: place.top,
                left: place.left,
                width: place.taille,
                height: place.taille,
              }}
              className="z-10 grid place-items-center rounded-full bg-white/14 ring-1 ring-white/25 transition hover:bg-white/24 active:scale-95"
            >
              <Barres ouvert={ouvert} />
            </button>

            <nav className="relative z-0 flex h-full flex-col overflow-y-auto px-[var(--pad)] pb-8 pt-24">
              {/*
                Deux blocs, deux poids typographiques.

                En haut, les pages : ce qu'on vient chercher, en grand.
                En bas, ce qui dépend de qui l'on est — son compte, ses
                favoris, sa marque. Ce ne sont pas des destinations
                équivalentes, et les afficher à la même taille obligeait
                à lire les huit entrées pour trouver la bonne.
              */}
              <ul className="m-0 flex list-none flex-col p-0">
                {liens.map((l, i) => {
                  const actif = l.href === "/" ? chemin === "/" : chemin.startsWith(l.href);
                  return (
                    <li
                      key={l.href}
                      className="entree-menu border-b border-white/12"
                      style={{ animationDelay: `${140 + i * 45}ms` }}
                    >
                      <Link
                        href={l.href}
                        className="flex items-baseline gap-3 py-3.5 transition active:translate-x-1"
                      >
                        <span className="w-6 shrink-0 text-[10.5px] font-black tabular-nums text-white/35">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`text-[clamp(22px,7vw,34px)] font-extrabold uppercase leading-[1.15] tracking-[-0.02em] ${
                            actif ? "text-white" : "text-white/72"
                          }`}
                        >
                          {l.label}
                        </span>
                        {actif && (
                          <span className="ml-auto self-center text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
                            ici
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* L'action principale : elle n'est pas une page, elle ne
                  se range donc pas dans la liste. */}
              <Link
                href={action.href}
                className="entree-menu mt-6 block rounded-full bg-white px-6 py-3.5 text-center text-[13.5px] font-black text-[var(--color-ink)] shadow-[0_6px_20px_rgba(35,12,85,0.4)] active:scale-[.98]"
                style={{ animationDelay: `${140 + liens.length * 45}ms` }}
              >
                {action.label}
              </Link>

              <div
                className="entree-menu mt-7"
                style={{ animationDelay: `${170 + liens.length * 45}ms` }}
              >
                <p className="eyebrow m-0 mb-2.5">{compte.titre}</p>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {compte.liens.map((l) => {
                    const actif = chemin.startsWith(l.href);
                    return (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className={`inline-block rounded-full border px-4 py-2.5 text-[13px] font-bold transition active:scale-[.97] ${
                            actif
                              ? "border-white/60 bg-white/18 text-white"
                              : "border-white/25 text-white/78 hover:bg-white/12 hover:text-white"
                          }`}
                        >
                          {l.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div
                /* Centré, et non plus dans le coin : les blobs chromés
                   du décor occupent justement les deux angles du bas,
                   et le logo s'y perdait. Au milieu, il a de l'air des
                   deux côtés quelle que soit la largeur de l'écran. */
                className="entree-menu mt-auto flex justify-center pt-10"
                style={{ animationDelay: `${200 + liens.length * 45}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-white.webp" alt="" className="h-9 w-auto opacity-55" />
              </div>
            </nav>
          </div>
        </Portal>
      )}
    </>
  );
}
