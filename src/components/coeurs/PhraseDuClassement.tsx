"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Le réglage du classement, écrit comme une phrase.
 *
 * IL Y AVAIT CINQ ONGLETS, ET C'ÉTAIT LA MAUVAISE FORME. « Plus
 * suivies » et « marques notées » y voisinaient comme deux classements
 * différents, alors que c'est le même classement lu avec deux règles ;
 * « du moment » et « tout temps » étaient la même mesure sur deux
 * fenêtres. Une barre d'onglets range côte à côte des choses qui ne sont
 * pas de même nature, et cache que trois questions se posent :
 *
 *   Les [marques] classées par [cœurs] sur [7 jours]
 *      quoi              par quoi        sur quand
 *
 * Trois mots réglables, trois menus, et la phrase se lit à voix haute :
 * on sait ce qu'on regarde avant d'avoir lu un seul chiffre.
 *
 * DES LIENS, PAS UN ÉTAT. Chaque option est une adresse complète, comme
 * les onglets qu'elle remplace. La page reste rendue sur le serveur, un
 * classement se partage en collant son adresse, et le bouton Retour
 * revient au réglage d'avant. Un `useState` qui remplacerait `?mesure=`
 * ferait perdre les trois.
 *
 * CE COMPOSANT NE CONNAÎT AUCUNE RÈGLE. Quelles mesures sont possibles,
 * quelles fenêtres, laquelle disparaît quand : tout cela est décidé sur
 * le serveur, dans la page, où vivent déjà les seuils. Ici on ne fait
 * qu'afficher des listes toutes prêtes — sans quoi la même règle serait
 * écrite à deux endroits et l'un des deux finirait par mentir.
 */

export type OptionDeMenu = {
  /** Ce qui se lit dans la liste, et dans la phrase une fois choisi. */
  mot: string;
  /** La glose à droite, en petites capitales : « volume », « min. 3 avis ». */
  glose?: string;
  /** L'adresse complète du réglage. */
  href: string;
  actif: boolean;
};

export type MenuDeLaPhrase = {
  /** Ce qui s'écrit dans la phrase quand le menu est fermé. */
  mot: string;
  /**
   * Le mot qui précède, quand il dépend de l'option choisie.
   *
   * « sur 7 jours » mais « depuis toujours » : le connecteur appartient
   * à la fenêtre. Écrit en dur dans la phrase, il donnait « sur depuis
   * toujours ».
   */
  lien?: string;
  /** Ce qu'annonce un lecteur d'écran : « Classer par… ». */
  libelle: string;
  options: OptionDeMenu[];
};

export default function PhraseDuClassement({
  quoi,
  mesure,
  periode,
}: {
  quoi: MenuDeLaPhrase;
  mesure: MenuDeLaPhrase;
  /**
   * Absent quand la mesure ne dépend pas du temps.
   *
   * La clause « sur … » DISPARAÎT alors, elle ne se grise pas : une
   * phrase qui annonce une fenêtre sans l'utiliser est un mensonge
   * d'interface. Même règle que le sélecteur de période d'avant, qui
   * n'existait pas du tout sous son seuil.
   */
  periode?: MenuDeLaPhrase;
}) {
  /* Un seul menu ouvert à la fois : deux listes déployées l'une à côté
     de l'autre se recouvrent, et l'on ne sait plus laquelle on lit. */
  const [ouvert, setOuvert] = useState<string | null>(null);
  const phrase = useRef<HTMLHeadingElement>(null);

  /*
   * Fermer en cliquant à côté, et sur Échap.
   *
   * `mousedown` et non `click` : le clic part APRÈS le relâchement, donc
   * après qu'un lien du menu a déjà été suivi. C'est la même raison qui
   * gouverne le panneau de suggestions de l'annuaire.
   */
  useEffect(() => {
    if (!ouvert) return;

    const dehors = (e: MouseEvent) => {
      if (!phrase.current?.contains(e.target as Node)) setOuvert(null);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(null);
    };

    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  return (
    <h2
      ref={phrase}
      className="rise m-0 flex max-w-4xl flex-wrap items-baseline gap-x-[11px] gap-y-0.5 text-[clamp(21px,4.6vw,34px)] font-extrabold leading-[1.25] tracking-[-0.032em] text-white"
    >
      <span>Les</span>
      <Mot id="quoi" menu={quoi} ouvert={ouvert} setOuvert={setOuvert} />
      <span>classées par</span>
      <Mot id="mesure" menu={mesure} ouvert={ouvert} setOuvert={setOuvert} />
      {periode && (
        <>
          <span>{periode.lien ?? "sur"}</span>
          {/*
            UN SEUL CHOIX N'EST PAS UN CHOIX : LE MOT S'ÉCRIT, SANS TRAIT.

            C'est le cas de l'élan sur les pièces, qui n'ont qu'une
            fenêtre bornée en base. Retirer la clause entière serait pire
            que la figer : « classées par élan », sans dire sur quoi,
            laisse croire à une part calculée sur toute la vie du site.
            On garde donc l'information et l'on retire le réglage, plutôt
            que d'ouvrir un menu à une ligne.
          */}
          {periode.options.length > 1 ? (
            <Mot id="periode" menu={periode} ouvert={ouvert} setOuvert={setOuvert} />
          ) : (
            <span>{periode.mot}</span>
          )}
        </>
      )}
    </h2>
  );
}

/**
 * Un mot réglable : le mot souligné, et sa liste.
 *
 * Le déclencheur est un vrai `<button aria-expanded>` et les options de
 * vrais liens : au clavier, la tabulation les atteint, Entrée les suit,
 * et les flèches parcourent la liste sans quitter le menu. Un `<div>`
 * cliquable aurait eu la même apparence et rien de tout ça.
 */
function Mot({
  id,
  menu,
  ouvert,
  setOuvert,
}: {
  id: string;
  menu: MenuDeLaPhrase;
  ouvert: string | null;
  setOuvert: (v: string | null) => void;
}) {
  const deploye = ouvert === id;
  const declencheur = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLDivElement>(null);

  /* À l'ouverture, le focus descend sur l'option active : c'est de là
     qu'on veut partir en flèche du bas, pas du haut de la liste. */
  useEffect(() => {
    if (!deploye) return;
    const items = liste.current?.querySelectorAll<HTMLElement>("[data-option]");
    if (!items?.length) return;
    const actif = [...items].findIndex((el) => el.dataset.actif === "1");
    items[actif < 0 ? 0 : actif].focus();
  }, [deploye]);

  const auClavier = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = liste.current?.querySelectorAll<HTMLElement>("[data-option]");
    if (!items?.length) return;
    e.preventDefault();
    const ici = [...items].indexOf(document.activeElement as HTMLElement);
    const pas = e.key === "ArrowDown" ? 1 : -1;
    items[(ici + pas + items.length) % items.length].focus();
  };

  return (
    <span className="relative inline-block">
      <button
        ref={declencheur}
        type="button"
        onClick={() => setOuvert(deploye ? null : id)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !deploye) {
            e.preventDefault();
            setOuvert(id);
          }
        }}
        aria-expanded={deploye}
        aria-haspopup="menu"
        aria-label={`${menu.libelle} : ${menu.mot}`}
        /* Le trait rose sous le mot est le seul signe qu'il se règle.
           Il est plus épais qu'un soulignement de lien pour qu'on le
           voie à trente-quatre pixels de corps. */
        className="inline-flex items-baseline gap-2 border-b-2 border-[rgb(var(--accent-1))] pb-[3px] font-[inherit] tracking-[inherit] text-white transition hover:border-white"
      >
        {menu.mot}
        <IconChevronBas />
      </button>

      {deploye && (
        <div
          ref={liste}
          role="menu"
          aria-label={menu.libelle}
          onKeyDown={auClavier}
          className="menu-phrase absolute left-0 top-[calc(100%+12px)] z-30 flex w-[250px] max-w-[80vw] flex-col gap-0.5 p-1.5"
        >
          {menu.options.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              role="menuitem"
              data-option
              data-actif={o.actif ? "1" : undefined}
              onClick={() => setOuvert(null)}
              className={`flex items-baseline justify-between gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-bold transition ${
                o.actif
                  ? "bg-white text-[var(--color-ink)]"
                  : "text-white hover:bg-white/12"
              }`}
            >
              {o.mot}
              {o.glose && (
                <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.12em] opacity-60">
                  {o.glose}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </span>
  );
}

/** Le chevron du mot réglable, à la couleur de son trait. */
function IconChevronBas() {
  return (
    <svg
      viewBox="0 0 10 6"
      aria-hidden
      className="h-[7px] w-[11px] shrink-0"
      fill="none"
      stroke="rgb(var(--accent-1))"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 1 L5 5 L9 1" />
    </svg>
  );
}
