"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LienNav, { estActif } from "./LienNav";
import { IconChevron } from "./Icons";

type Lien = { href: string; label: string };

/** L'identifiant que le bouton « Plus » désigne par `aria-controls`. */
const PANNEAU = "liens-replies";

/**
 * Les liens de pages de la barre, et ce qu'on fait de ceux qui n'y
 * tiennent pas.
 *
 * LE PROBLÈME. La barre se chargeait selon qui la regardait : un
 * visiteur voit sept liens et un appel, un compte connecté gagne le
 * cœur, les messages et l'avatar, un créateur « Ma marque », un admin
 * « Admin ». Les liens se cachaient à des largeurs fixes (`lg`, `xl`),
 * réglées pour la barre d'un visiteur. Pour un admin qui a une marque,
 * il manquait trente pixels même sur le plus grand écran, et l'avatar
 * sortait de la pilule.
 *
 * Régler d'autres seuils n'aurait fait que déplacer le problème : il y
 * a autant de barres que de combinaisons de rôles, et la largeur d'un
 * mot change avec la police, le zoom du navigateur, la langue.
 *
 * ON NE DEVINE PLUS, ON LAISSE LA PLACE DÉCIDER. Les liens sont posés
 * dans une rangée qui a le droit de passer à la ligne, mais qui ne
 * montre que sa première ligne. Ce qui ne tient pas descend sur la
 * deuxième, donc hors de vue, PAR LE CSS SEUL : la barre est juste dès
 * le premier affichage, avant même que le JavaScript arrive. Les liens
 * partent par la fin : « Admin », puis « À propos », puis « Forum »…
 * les moins utiles d'abord, comme avant.
 *
 * Le script ne fait que compter ceux qui sont descendus, et les range
 * dans un menu « Plus ». Avant, un lien caché à 1024 pixels n'existait
 * tout simplement plus sur une tablette en paysage : le menu des trois
 * traits ne s'affiche qu'en dessous de 768. Il reste maintenant à un
 * clic, à toutes les largeurs.
 */
export default function LiensBarre({ liens }: { liens: Lien[] }) {
  const chemin = usePathname();
  const rangee = useRef<HTMLDivElement>(null);
  const coin = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);

  /** Combien de liens, comptés depuis la fin, ne tiennent pas. */
  const [replies, setReplies] = useState(0);
  const [ouvert, setOuvert] = useState(false);

  /*
   * ON COMPTE CE QUI EST DESCENDU. Un lien est replié s'il est passé
   * sous la première ligne, ou s'il dépasse à gauche — le cas d'une
   * rangée si étroite que même le premier lien n'y entre plus.
   *
   * On surveille la rangée ET chaque lien : la fenêtre qui change de
   * taille modifie la rangée, mais la police qui finit de charger
   * élargit les mots sans toucher à la rangée.
   *
   * LE BOUTON « PLUS » PREND LUI-MÊME DE LA PLACE, et c'est le piège.
   * Une fois affiché, il peut suffire à faire descendre le dernier lien
   * — qui tiendrait très bien sans lui. Les deux états se justifieraient
   * l'un l'autre, et une fenêtre rétrécie puis rélargie garderait un
   * « Plus » pour rien. Avant de compter, on se demande donc si TOUT
   * tiendrait une fois le bouton retiré ; les liens descendus gardent
   * leur largeur, invisibles, on peut les additionner.
   *
   * `useLayoutEffect` pour que le premier compte tombe avant que la
   * page ne se peigne : le bouton « Plus » apparaît avec la barre, et
   * non une image plus tard.
   */
  useLayoutEffect(() => {
    const boite = rangee.current;
    if (!boite) return;

    const compter = () => {
      const enfants = Array.from(boite.children) as HTMLElement[];
      if (!enfants.length) return;
      const style = getComputedStyle(boite);

      const ecart = parseFloat(style.columnGap) || 0;
      const total =
        enfants.reduce((somme, el) => somme + el.getBoundingClientRect().width, 0) +
        ecart * (enfants.length - 1);
      const place =
        boite.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const plus = coin.current;
      const rendue = plus
        ? plus.getBoundingClientRect().width +
          (parseFloat(getComputedStyle(plus.parentElement ?? plus).columnGap) || 0)
        : 0;
      if (total <= place + rendue + 0.5) {
        setReplies(0);
        return;
      }

      const bord = boite.getBoundingClientRect().left + parseFloat(style.paddingLeft);
      const haut = enfants[0].offsetTop;
      const premier = enfants.findIndex(
        (el) => el.offsetTop > haut + 1 || el.getBoundingClientRect().left < bord - 1
      );
      setReplies(premier === -1 ? 0 : enfants.length - premier);
    };

    const veille = new ResizeObserver(compter);
    veille.observe(boite);
    for (const el of Array.from(boite.children)) veille.observe(el);
    compter();
    return () => veille.disconnect();
  }, [liens.length]);

  /* Un menu ouvert qui n'a plus rien à montrer — la fenêtre s'est
     élargie pendant qu'il était ouvert — se referme de lui-même. */
  const montre = ouvert && replies > 0;

  /* Fermer au clic dehors et à Échap. Échap rend le focus au bouton :
     sans ça, il retomberait en haut de la page. */
  useEffect(() => {
    if (!montre) return;
    const dehors = (e: PointerEvent) => {
      if (!coin.current?.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOuvert(false);
      bouton.current?.focus();
    };
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", touche);
    };
  }, [montre]);

  const caches = replies > 0 ? liens.slice(liens.length - replies) : [];

  /* Si la page où l'on se trouve est rangée dans le menu, c'est le
     bouton qui porte le repère : on doit toujours voir où l'on est. */
  const iciDedans = caches.some((l) => estActif(l.href, chemin));

  return (
    <>
      <div ref={rangee} className="barre-liens">
        {liens.map((lien, i) => (
          <LienNav
            key={lien.href}
            href={lien.href}
            /* `invisible` et pas seulement hors de vue : un lien
               descendu resterait atteignable à la touche Tab, et le
               focus disparaîtrait sous la barre. */
            className={i >= liens.length - replies ? "invisible" : ""}
          >
            {lien.label}
          </LienNav>
        ))}
      </div>

      {replies > 0 && (
        <div
          ref={coin}
          className="relative shrink-0"
          /* Le menu se referme aussi quand le focus le quitte au
             clavier : un panneau resté ouvert derrière soi masquerait
             la page qu'on est en train de parcourir. */
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOuvert(false);
          }}
        >
          <button
            ref={bouton}
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={montre}
            aria-controls={PANNEAU}
            className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full py-[9px] pl-3.5 pr-3 text-[13px] font-bold transition ${
              iciDedans || montre ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            } ${iciDedans ? "nav-actif" : montre ? "bg-white/12" : ""}`}
          >
            Plus
            <IconChevron
              className={`h-3.5 w-3.5 transition-transform duration-200 ${montre ? "rotate-180" : ""}`}
            />
          </button>

          {montre && (
            <div
              id={PANNEAU}
              className="plus-panneau absolute left-0 top-[calc(100%+18px)] min-w-[200px] rounded-[20px] border border-white/20 bg-[var(--surface-sombre)] p-1.5 shadow-[0_24px_60px_rgba(6,1,18,0.55)]"
            >
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {caches.map((lien) => {
                  const actif = estActif(lien.href, chemin);
                  return (
                    <li key={lien.href}>
                      <Link
                        href={lien.href}
                        onClick={() => setOuvert(false)}
                        aria-current={actif ? "page" : undefined}
                        className={`block whitespace-nowrap rounded-[14px] px-3.5 py-2.5 text-[13.5px] font-bold transition ${
                          actif ? "nav-actif text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {lien.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
