"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Brand } from "@/lib/types";
import { melanger } from "@/lib/melange";
import { logoBlanc } from "@/lib/vignette";
import { tailleOptique } from "@/lib/logo-blanc";

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
 *
 * SA PLACE A CHANGÉ AVEC LA REFONTE DE L'ACCUEIL. Elle était au milieu
 * d'une pile de blocs ; elle est maintenant la charnière entre le
 * manifeste et le corps à deux colonnes. C'est la première chose qu'on
 * voit en passant le pli, et il faut que ce soit des marques : une
 * phrase, aussi juste soit-elle, ne prouve rien.
 *
 * DES LOGOS EN BLANC, ET PLUS DE BLOC. La bande était un panneau sombre
 * rempli de cartes claires, un logo dans un carré blanc pour chaque
 * marque. Elle est maintenant posée sur la page, d'un bord de l'écran à
 * l'autre, et ne montre que les logos, détourés et passés en blanc par
 * `/api/img` (voir `lib/logo-blanc`). Une marque sans logo net (une
 * photo, un fond coloré, une icône minuscule, ou pas de logo du tout)
 * a son nom écrit avec la police du site : la bande se lit comme une
 * affiche de festival, où les noms et les logos se suivent.
 */

/** Plus que les quatorze cartes d'avant : un logo prend moins de place,
    et la bande doit rester plus longue que l'écran le plus large pour
    pouvoir boucler. */
const COMBIEN = 20;

/** Pixels par seconde. Assez vif pour vivre, assez lent pour lire un nom. */
const VITESSE = 52;

/** Temps d'immobilité avant que la dérive ne reprenne la main. */
const REPRISE_MS = 1800;


/**
 * Une marque dans la bande : son logo en blanc, ou son nom.
 *
 * LE NOM D'ABORD, LE LOGO ENSUITE. Le nom est écrit dès le premier
 * rendu, celui du serveur : la bande n'est jamais vide, et un moteur de
 * recherche lit des noms de marques plutôt que des images muettes.
 * L'image se charge en même temps, invisible. Quand elle arrive, le logo
 * prend la place du nom, à sa taille optique (voir `tailleOptique`).
 *
 * `/api/img` répond un pixel vide quand le logo ne se prête pas au
 * blanc. Le nom reste alors, et c'est voulu : c'est ce pixel qui dit
 * « écris plutôt le nom ».
 */
function MarqueDuRuban({ brand, copie = false }: { brand: Brand; copie?: boolean }) {
  const src = logoBlanc(brand.logo_url);
  const [taille, setTaille] = useState<{ largeur: number; hauteur: number } | null>(null);
  const image = useRef<HTMLImageElement>(null);

  const lire = useCallback((img: HTMLImageElement) => {
    if (img.naturalWidth > 2 && img.naturalHeight > 2) {
      setTaille(tailleOptique(img.naturalWidth, img.naturalHeight));
    }
  }, []);

  /* Une image déjà en cache a pu finir de charger avant que React ne
     branche `onLoad` : on la lit au montage. */
  useEffect(() => {
    const img = image.current;
    if (img?.complete) lire(img);
  }, [lire]);

  return (
    <Link
      href={`/marques/${brand.slug}`}
      data-no-reveal
      aria-label={brand.name}
      /* Dans la copie, hors du parcours au clavier : on n'y refait pas
         le tour des mêmes marques. Voir plus bas, sur la copie. */
      tabIndex={copie ? -1 : undefined}
      className="marque-ruban"
    >
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={image}
          src={src}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={(e) => lire(e.currentTarget)}
          className={taille ? "logo-ruban" : "logo-ruban logo-ruban-attente"}
          style={
            taille
              ? ({ "--l": taille.largeur, "--h": taille.hauteur } as CSSProperties)
              : undefined
          }
        />
      )}
      {taille ? (
        /* Le nom sous le logo, au survol ou au clavier : un symbole seul
           (un m dans un rond) ne dit pas toujours de qui il s'agit. */
        <span className="legende-ruban" aria-hidden="true">
          {brand.name}
        </span>
      ) : (
        <span className="nom-ruban">{brand.name}</span>
      )}
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

  useEffect(() => {
    setTirage(melanger(brands).slice(0, COMBIEN));
  }, [brands]);

  /*
   * Toute intervention humaine met la dérive en pause, pour un temps.
   *
   * C'est un simple délai, et non plus un drapeau « la souris est
   * dessus » qu'on levait à l'entrée et baissait à la sortie. Ce
   * drapeau était l'autre cause des arrêts définitifs : il suffisait
   * qu'un événement de sortie se perde — la souris qui quitte la
   * fenêtre, un onglet qu'on change, la page qui défile sous le
   * curseur — pour qu'il reste levé et que la bande ne reparte jamais.
   *
   * Un délai ne peut pas rester coincé : au pire il expire. Et comme
   * le moindre mouvement de souris sur la bande le repousse, elle
   * reste bien à l'arrêt tant qu'on s'en occupe.
   */
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

    /*
     * La position est tenue à part, en nombre à virgule.
     *
     * C'est la correction de l'arrêt intempestif, et elle mérite une
     * explication. Le code faisait `el.scrollLeft += vitesse * dt`.
     * À soixante images par seconde, cela ajoute moins d'un demi-pixel
     * à chaque passage — et selon le navigateur, le niveau de zoom et
     * la densité de l'écran, la lecture de `scrollLeft` renvoie un
     * entier. La fraction ajoutée était alors perdue à chaque tour, la
     * somme restait indéfiniment à zéro, et la bande semblait figée
     * sans raison apparente. D'où le « des fois ça s'arrête ».
     *
     * On tient donc le compte nous-mêmes, et on l'écrit d'un coup.
     */
    let position = el.scrollLeft;

    const avancer = (maintenant: number) => {
      const dt = Math.min(maintenant - precedent, 64) / 1000;
      precedent = maintenant;

      const moitie = el.scrollWidth / 2;

      // Quelqu'un a fait glisser la bande : on repart d'où elle est,
      // sinon elle sauterait à notre position au premier tour suivant.
      if (Math.abs(el.scrollLeft - position) > 2) position = el.scrollLeft;

      if (maintenant >= repriseA.current && moitie > 0) {
        position += vitesse * dt;
        /*
         * Le retour invisible.
         *
         * La bande contient deux copies identiques. Passé la première,
         * on recule d'exactement sa largeur : le contenu sous les yeux
         * est le même au pixel près, personne ne voit la couture.
         */
        if (position >= moitie) position -= moitie;
        el.scrollLeft = position;
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
    "hidden h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/10 text-[15px] font-black text-white transition hover:bg-white/22 active:scale-95 sm:grid";

  return (
    <section aria-labelledby="titre-ruban" className="py-6 sm:py-8">
      {/* Plus de panneau autour : le titre se pose sur la page, aligné
          sur la colonne comme les autres sections de l'accueil. */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="eyebrow m-0">Au fil de l&apos;annuaire</p>
          <h2
            id="titre-ruban"
            className="m-0 mt-1.5 text-[clamp(18px,4vw,26px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-white"
          >
            Découvre de nouvelles marques !
          </h2>
        </div>

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
            className="ml-1 text-[13px] font-bold text-white/88 underline decoration-white/45 underline-offset-4 transition hover:text-white hover:decoration-white"
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
        onPointerMove={(e) => {
          suspendre();
          trainer(e);
        }}
        onPointerUp={lacher}
        onPointerCancel={lacher}
        onPointerEnter={suspendre}
        onPointerLeave={lacher}
        onWheel={suspendre}
        onTouchStart={suspendre}
        onFocusCapture={suspendre}
        /* Les deux axes déclarés : le navigateur reconnaît la
           direction dominante du geste, fait glisser la bande à
           l'horizontale et laisse la page défiler à la verticale.
           N'en déclarer qu'un seul revient à interdire l'autre. */
        style={{ touchAction: "pan-x pan-y" }}
        /* D'UN BORD DE L'ÉCRAN À L'AUTRE. La bande sort de la colonne :
           `w-screen` et une marge négative de la moitié de ce qui
           dépasse. Le débord éventuel (la barre de défilement de la
           page, sur ordinateur) est coupé par `main`, qui ne laisse
           rien dépasser à l'horizontale. Les bords s'effacent en fondu,
           voir `.ruban-logos`. */
        className="ruban ruban-logos ml-[calc(50%-50vw)] mt-4 flex w-screen overflow-x-auto overscroll-x-contain sm:mt-5"
      >
        {/* Deux moitiés STRICTEMENT identiques : c'est la condition
            du retour invisible expliqué plus haut. L'espace entre deux
            marques est une marge à DROITE de chacune, et non un `gap` :
            la seconde copie commence ainsi exactement une largeur de
            copie plus loin, au pixel près.

            LA COPIE EST CACHÉE AUX LECTEURS D'ÉCRAN ET AU CLAVIER, PAS
            À LA SOURIS. `aria-hidden` la retire de ce qu'on annonce, et
            chacun de ses liens sort du parcours à la tabulation
            (`tabIndex={-1}`) : on ne refait pas le tour des mêmes
            marques avec des liens muets, ce que l'audit relevait du
            temps où seul `aria-hidden` était posé.

            Elle était `inert`, ce qui réglait le clavier mais la rendait
            aussi sourde au pointeur. Or la bande montre la copie une
            bonne partie du temps, dès qu'elle a dérivé de plus d'un
            écran : ses logos ne réagissaient alors ni au survol ni au
            clic. */}
        {[0, 1].map((copie) => (
          <div key={copie} aria-hidden={copie === 1 ? true : undefined} className="flex shrink-0">
            {tirage.map((b) => (
              <MarqueDuRuban key={`${copie}-${b.id}`} brand={b} copie={copie === 1} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
