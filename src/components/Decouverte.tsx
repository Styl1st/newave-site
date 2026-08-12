"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Brand } from "@/lib/types";

/**
 * « Découvre de nouvelles marques ! »
 *
 * Une bande qui dérive toute seule, et qu'on peut prendre à la main.
 *
 * La version précédente faisait glisser une piste avec `transform`,
 * dans un cadre en `overflow: hidden`. C'était joli et c'était une
 * impasse : un cadre coupé ne se fait pas défiler, ni au doigt, ni à la
 * molette, ni au pavé tactile. On voyait une carte à moitié sortie du
 * bord droit, on tirait dessus, et rien ne se passait. Pire, toute
 * règle qui neutralise les animations — un système réglé sur « réduire
 * le mouvement », par exemple — figeait la bande pour de bon.
 *
 * C'est donc une vraie zone de défilement, que le navigateur gère
 * nativement. La dérive automatique n'est plus qu'un supplément : on
 * pousse le défilement d'un cheveu à chaque image. Elle s'interrompt
 * dès qu'on touche la bande et reprend quand on la lâche. Si elle
 * échoue, on garde une bande qui défile ; l'inverse n'était pas vrai.
 *
 * L'ordre est tiré au sort. La mise en avant est éditoriale et assumée
 * ailleurs sur la page ; ici personne n'est favorisé, c'est le seul
 * endroit du site où une marque arrivée hier a exactement les mêmes
 * chances d'être vue qu'une autre.
 */

const COMBIEN = 14;

/** Pixels par seconde. Assez lent pour lire un nom au passage. */
const VITESSE = 26;

/** Temps d'immobilité avant que la dérive ne reprenne la main. */
const REPRISE_MS = 2600;

function melanger<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function Vignette({ brand }: { brand: Brand }) {
  const visuel = brand.cover_url ?? brand.logo_url;
  // Un logo se montre en entier, une photo se recadre. Voir BrandCard.
  const estUnLogo = !brand.cover_url && Boolean(brand.logo_url);

  return (
    <Link
      href={`/marques/${brand.slug}`}
      data-no-reveal
      className="card-light w-[38vw] max-w-[190px] shrink-0 overflow-hidden sm:w-[190px]"
    >
      <span className="relative z-3 block">
        <span className="visuel block aspect-4/3 w-full overflow-hidden rounded-t-[var(--radius)]">
          {visuel ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={visuel}
              alt={estUnLogo ? brand.name : ""}
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`h-full w-full ${estUnLogo ? "object-contain p-4" : "object-cover"}`}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#a795c9]">
              {brand.name}
            </span>
          )}
        </span>
        <span className="block p-3">
          <span className="block truncate text-[13px] font-extrabold text-[var(--color-ink)]">
            {brand.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-bold uppercase tracking-[0.1em] text-[#6a5a92]">
            {[brand.city, brand.country].filter(Boolean).join(" · ") || "Indépendante"}
          </span>
        </span>
      </span>
    </Link>
  );
}

export default function Decouverte({ brands }: { brands: Brand[] }) {
  /*
   * Le premier rendu est volontairement dans l'ordre reçu, identique
   * sur le serveur et dans le navigateur. Le tirage vient juste après,
   * une fois la page adoptée par React : un Math.random() joué des
   * deux côtés donnerait deux ordres différents.
   */
  const [tirage, setTirage] = useState<Brand[]>(() => brands.slice(0, COMBIEN));
  const bande = useRef<HTMLDivElement>(null);
  /** Instant après lequel la dérive a le droit de reprendre. */
  const repriseA = useRef(0);
  /** Tant que la souris est dessus, rien ne bouge tout seul. */
  const survol = useRef(false);

  useEffect(() => {
    setTirage(melanger(brands).slice(0, COMBIEN));
  }, [brands]);

  /** Toute intervention humaine met la dérive en pause. */
  const suspendre = useCallback(() => {
    repriseA.current = performance.now() + REPRISE_MS;
  }, []);

  /*
   * Prendre la bande à la main, à la souris.
   *
   * Un doigt fait glisser une zone de défilement sans qu'on ait rien à
   * écrire. Une souris, non : la molette ne défile qu'à la verticale,
   * et rien n'invite à tirer. On ajoute donc la prise, celle qu'on
   * attend d'un plan ou d'une galerie.
   *
   * Le seuil de six pixels n'est pas un détail : sans lui, le moindre
   * frémissement de la main pendant un clic serait pris pour un
   * glissement, et le lien de la carte ne s'ouvrirait jamais.
   */
  const tire = useRef<{ x: number; depart: number; bouge: boolean } | null>(null);

  function prendre(e: React.PointerEvent<HTMLDivElement>) {
    // Souris uniquement : le tactile est déjà géré par le navigateur,
    // et s'en mêler lui retirerait son inertie.
    if (e.pointerType !== "mouse" || !bande.current) return;
    tire.current = { x: e.clientX, depart: bande.current.scrollLeft, bouge: false };
  }

  function trainer(e: React.PointerEvent<HTMLDivElement>) {
    const t = tire.current;
    const el = bande.current;
    if (!t || !el) return;

    const ecart = e.clientX - t.x;
    if (!t.bouge && Math.abs(ecart) < 6) return;

    if (!t.bouge) {
      t.bouge = true;
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = t.depart - ecart;
  }

  function lacher(e: React.PointerEvent<HTMLDivElement>) {
    const t = tire.current;
    tire.current = null;
    if (!t?.bouge) return;

    bande.current?.releasePointerCapture?.(e.pointerId);
    // On vient de tirer : le relâchement ne doit pas ouvrir la carte
    // qui se trouve sous le curseur.
    const tuerLeClic = (clic: MouseEvent) => {
      clic.preventDefault();
      clic.stopPropagation();
    };
    window.addEventListener("click", tuerLeClic, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", tuerLeClic, { capture: true }), 0);
  }

  useEffect(() => {
    const el = bande.current;
    if (!el) return;

    /*
     * La bande dérive pour tout le monde, et c'est un choix révisé.
     *
     * Elle s'arrêtait complètement sous « réduire les animations ».
     * C'était défendable en théorie et faux en pratique : sur un
     * ordinateur où ce réglage est actif — ce qui est courant, par
     * économie de batterie autant que par gêne — le présentoir
     * paraissait cassé, et la moitié des visiteurs ne voyaient jamais
     * les marques défiler.
     *
     * On la ralentit plutôt que de la couper. Le mouvement reste lent,
     * horizontal, cantonné à sa bande, et surtout il s'arrête au
     * moindre contact : c'est ce qui compte vraiment pour qui préfère
     * que rien ne bouge, et c'est aussi ce qu'exige la règle
     * d'accessibilité sur les contenus animés — pouvoir les arrêter.
     */
    const sobre = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const vitesse =
      sobre?.matches && document.documentElement.dataset.animChoisi !== "1"
        ? VITESSE * 0.55
        : VITESSE;

    let image = 0;
    let precedent = performance.now();

    const avancer = (maintenant: number) => {
      const dt = Math.min(maintenant - precedent, 64) / 1000;
      precedent = maintenant;

      const moitie = el.scrollWidth / 2;

      /*
       * Rien ne dérive tant que la souris est posée dessus.
       *
       * C'est un confort, et c'est aussi ce qui rend la barre de
       * défilement lisible : sans cela, son curseur repartirait à
       * gauche au bouclage pendant qu'on essaie de l'attraper.
       */
      if (!survol.current && maintenant >= repriseA.current && moitie > 0) {
        el.scrollLeft += vitesse * dt;
        /*
         * Le retour invisible.
         *
         * La bande contient deux copies identiques. Passé la première,
         * on recule d'exactement sa largeur : le contenu sous les yeux
         * est le même au pixel près, personne ne voit la couture.
         */
        if (el.scrollLeft >= moitie) el.scrollLeft -= moitie;
      }

      image = requestAnimationFrame(avancer);
    };

    image = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image);
  }, [tirage]);

  if (brands.length === 0) return null;

  /** Un peu moins qu'une carte, pour garder un repère à l'écran. */
  function pousser(sens: -1 | 1) {
    const el = bande.current;
    if (!el) return;
    suspendre();
    el.scrollBy({ left: sens * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" });
  }

  const bouton =
    "hidden h-8 w-8 place-items-center rounded-full border border-white/30 bg-white/10 text-[15px] font-black text-white transition hover:bg-white/22 active:scale-95 sm:grid";

  return (
    <section className="py-6">
      <div className="glass overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 pb-3 sm:px-6 sm:pt-5">
          <p className="m-0 text-[clamp(15px,3.6vw,19px)] font-extrabold tracking-[-0.01em] text-white">
            Découvre de nouvelles marques !
          </p>

          <div className="flex items-center gap-2">
            {/* Deux flèches, sur ordinateur seulement : au doigt on fait
                simplement glisser, et un bouton de plus n'apprend rien. */}
            <button type="button" onClick={() => pousser(-1)} aria-label="Marques précédentes" className={bouton}>
              ‹
            </button>
            <button type="button" onClick={() => pousser(1)} aria-label="Marques suivantes" className={bouton}>
              ›
            </button>
            <Link
              href="/marques"
              className="text-[12.5px] font-bold text-white/75 underline underline-offset-4 transition hover:text-white"
            >
              Tout l&apos;annuaire
            </Link>
          </div>
        </div>

        <div
          ref={bande}
          onPointerDown={(e) => {
            suspendre();
            prendre(e);
          }}
          onPointerMove={trainer}
          onPointerUp={lacher}
          onPointerCancel={lacher}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") survol.current = true;
            suspendre();
          }}
          onPointerLeave={(e) => {
            survol.current = false;
            lacher(e);
          }}
          onWheel={suspendre}
          onTouchStart={suspendre}
          onFocusCapture={suspendre}
          /* Les deux axes déclarés : le navigateur reconnaît la
             direction dominante du geste, fait glisser la bande à
             l'horizontale et laisse la page défiler à la verticale.
             N'en déclarer qu'un seul revient à interdire l'autre. */
          style={{ touchAction: "pan-x pan-y" }}
          className="ruban flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 sm:px-6 sm:pb-5"
        >
          {/* Deux moitiés STRICTEMENT identiques : c'est la condition
              du retour invisible expliqué plus haut. */}
          {[0, 1].map((copie) => (
            <div key={copie} aria-hidden={copie === 1} className="flex shrink-0 gap-3">
              {tirage.map((b) => (
                <Vignette key={`${copie}-${b.id}`} brand={b} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
