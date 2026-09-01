"use client";

import { useEffect, useRef, useState } from "react";

/**
 * La forme d'un parcours guidé, sans son issue.
 *
 *   1. Qui es-tu par rapport à cette marque.
 *   2. On lit son site, ou tu remplis à la main.
 *   3. Tu relis ce qu'on a trouvé, tu corriges.
 *   4. C'est parti.
 *
 * Cette forme sert deux fois, à deux personnes qui n'ont rien à voir :
 * un créateur qui propose sa marque et repart avec une candidature en
 * attente d'examen, un administrateur qui ajoute une fiche et repart
 * avec une marque. Le chemin est le même, la porte de sortie non.
 *
 * CE FICHIER NE CONNAÎT QUE CE QUI EST COMMUN : l'enchaînement des
 * écrans, le premier écran, le cadre du deuxième et du troisième, le
 * lien qui ramène en arrière, la matière des boutons. Ce qu'on relit à
 * l'écran 3 et ce qui arrive à l'écran 4 restent chez chaque parcours,
 * parce que c'est exactement ce qui les distingue — les poser ici
 * demanderait un `if` par différence, et deux parcours cousus dans le
 * même composant divergent de toute façon, un `if` à la fois.
 *
 * Tout le reste tient dans un seul composant côté appelant, et c'est
 * voulu : une saisie à moitié remplie ne survit pas à un changement de
 * page, et rien n'est plus décourageant que de tout retaper parce
 * qu'on a cliqué sur « précédent ».
 */

export type Etape = "choix" | "source" | "relecture" | "fin";

// La matière des champs vit dans `globals.css`. Voir `.champ`.
export const CHAMP = "champ";
export const LABEL = "eyebrow mb-2 block";
export const PRINCIPAL =
  "rounded-full bg-white px-7 py-3.5 text-[14px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-55";
export const SECONDAIRE =
  "rounded-full border border-white/40 bg-white/8 px-5 py-3 text-[13.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/18 active:scale-[.97] disabled:opacity-55";

/**
 * L'écran courant, et le retour en haut de page qui va avec.
 *
 * Sans ce dernier, on change d'écran et l'on reste au milieu, devant un
 * contenu qui n'a plus de sens.
 */
export function useEtapes(depart: Etape = "choix") {
  const [etape, aller] = useState<Etape>(depart);
  const haut = useRef<HTMLDivElement>(null);

  useEffect(() => {
    haut.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [etape]);

  return { etape, aller, haut };
}

/**
 * Le pas en arrière.
 *
 * Discret et toujours au même endroit : c'est ce qui permet de cliquer
 * sans crainte sur le premier écran, puisqu'on sait qu'on peut revenir.
 */
export function LienRetour({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-[13px] font-bold text-white/65 underline underline-offset-2 transition hover:text-white"
    >
      {children}
    </button>
  );
}

/* ==================== 1. le choix ==================== */

export type Choix<T extends string> = { valeur: T; titre: string; texte: string };

/**
 * Deux cartes, une question.
 *
 * Le premier écran ne demandait rien avant, il demandait tout : le
 * choix, le nom, le contact, l'email, l'Instagram, le site et un
 * paragraphe. Une page pareille se referme avant d'être lue.
 */
export function EcranChoix<T extends string>({
  choix,
  onChoisir,
}: {
  choix: readonly Choix<T>[];
  onChoisir: (valeur: T) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {choix.map((c) => (
        <button
          key={c.valeur}
          type="button"
          onClick={() => onChoisir(c.valeur)}
          data-reveal
          className="card-light group flex flex-col items-start gap-3 p-6 text-left sm:p-7"
        >
          <span className="relative z-3 flex flex-col gap-2.5">
            <span className="text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
              {c.titre}
            </span>
            <span className="text-[13.5px] leading-relaxed text-[#4a3a78]">{c.texte}</span>
            <span className="mt-1 inline-flex items-center gap-2 text-[13px] font-black text-[#3a2470]">
              Continuer <span className="transition group-hover:translate-x-1">→</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ==================== 2. la source ==================== */

/**
 * Le cadre de la lecture du site.
 *
 * L'appareil qui lit la boutique n'est pas le même des deux côtés — le
 * public a le sien, l'administration en a un autre, plus bavard — et il
 * arrive donc en `children`. Ce qui l'entoure, lui, est identique : le
 * retour en arrière, et surtout la sortie de secours pour qui n'a pas
 * de site. C'est le message qui compte le plus de cet écran.
 */
export function CadreSource({
  onRetour,
  retour = "← Changer de choix",
  sansSite,
  onManuel,
  manuel = "Remplir à la main",
  children,
}: {
  onRetour: () => void;
  retour?: string;
  sansSite: { titre: string; texte: string };
  onManuel: () => void;
  manuel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <LienRetour onClick={onRetour}>{retour}</LienRetour>

      {children}

      <section className="glass p-4 sm:px-7 sm:py-6">
        <h2 className="m-0 text-[15.5px] font-extrabold text-white">{sansSite.titre}</h2>
        <p className="m-0 mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/72">
          {sansSite.texte}
        </p>
        <button type="button" onClick={onManuel} className={`${SECONDAIRE} mt-4`}>
          {manuel}
        </button>
      </section>
    </div>
  );
}

/* ==================== 3. la relecture ==================== */

/**
 * Le cadre de l'écran de relecture.
 *
 * Le formulaire arrive en `children` : celui d'une candidature et celui
 * d'une fiche d'annuaire ne demandent pas les mêmes choses et ne
 * partent pas au même endroit. Ce qui les entoure ne change pas : on
 * peut revenir, et une phrase rappelle que rien n'est définitif.
 */
export function CadreRelecture({
  onRetour,
  retour = "← Revenir",
  avis,
  children,
}: {
  onRetour: () => void;
  retour?: string;
  avis?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <LienRetour onClick={onRetour}>{retour}</LienRetour>

      {avis && (
        <p className="glass m-0 px-5 py-3.5 text-[13.5px] leading-relaxed text-white">{avis}</p>
      )}

      {children}
    </div>
  );
}
