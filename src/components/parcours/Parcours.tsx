"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconBack } from "@/components/Icons";

/**
 * La forme d'un parcours guidé, sans son issue.
 *
 *   1. Qui es-tu par rapport à cette marque.
 *   2. La fiche : on lit son site (ou tu remplis à la main), et tu vois
 *      tout de suite ce que ça donne, à côté des champs.
 *   3. C'est parti.
 *
 * Cette forme sert deux fois, à deux personnes qui n'ont rien à voir :
 * un créateur qui propose sa marque et repart avec une candidature en
 * attente d'examen, un administrateur qui ajoute une fiche et repart
 * avec une marque. Le chemin est le même, la porte de sortie non.
 *
 * IL N'Y A PLUS D'ÉCRAN « VÉRIFIER LES INFORMATIONS ». Lire le site
 * aboutissait à une phrase (« 42 pièces lues, repris : le nom, la
 * description… »), puis à un bouton, puis à un second écran de champs.
 * On lisait un compte rendu au lieu de voir le résultat. La lecture
 * remplit maintenant la fiche SUR LE MÊME ÉCRAN, et l'aperçu (la vraie
 * carte de l'annuaire, le haut de la page, les pièces trouvées) se met
 * à jour à mesure qu'on corrige.
 *
 * CE FICHIER NE CONNAÎT QUE CE QUI EST COMMUN : l'enchaînement des
 * écrans, le premier écran, le cadre du second, le bouton qui ramène en
 * arrière, la matière des boutons. Ce qu'on remplit et ce qui arrive à
 * la fin restent chez chaque parcours, parce que c'est exactement ce qui
 * les distingue.
 *
 * Tout le reste tient dans un seul composant côté appelant, et c'est
 * voulu : une saisie à moitié remplie ne survit pas à un changement de
 * page, et rien n'est plus décourageant que de tout retaper parce
 * qu'on a cliqué sur « précédent ».
 */

export type Etape = "choix" | "fiche" | "fin";

const ETAPES: readonly Etape[] = ["choix", "fiche", "fin"];

/** Le paramètre d'adresse qui porte l'écran courant. */
const PARAMETRE = "etape";

// La matière des champs vit dans `globals.css`. Voir `.champ`.
export const CHAMP = "champ";
export const LABEL = "eyebrow mb-2 block";
export const PRINCIPAL =
  "rounded-full bg-white px-7 py-3.5 text-[14px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(var(--voile),0.3)] transition hover:shadow-[0_8px_22px_rgba(var(--voile),0.45)] active:scale-[.97] disabled:opacity-55";
export const SECONDAIRE =
  "rounded-full border border-white/40 bg-white/8 px-5 py-3 text-[13.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/18 active:scale-[.97] disabled:opacity-55";

/** L'écran que porte l'adresse, s'il y en a un. */
function etapeDeLAdresse(): Etape | null {
  const valeur = new URLSearchParams(window.location.search).get(PARAMETRE);
  return ETAPES.includes(valeur as Etape) ? (valeur as Etape) : null;
}

/** L'adresse courante, avec ou sans l'écran. */
function adresseAvec(etape: Etape | null): string {
  const url = new URL(window.location.href);
  if (etape) url.searchParams.set(PARAMETRE, etape);
  else url.searchParams.delete(PARAMETRE);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * L'écran courant, le retour en haut de page, et l'historique.
 *
 * LE BOUTON « PRÉCÉDENT » DU NAVIGATEUR RAMÈNE À L'ÉCRAN D'AVANT. Les
 * écrans n'étaient qu'un état React : l'adresse ne bougeait pas, et
 * « précédent » quittait tout le parcours, fiche remplie comprise. Il
 * fallait revenir, recharger, tout reprendre. Chaque écran pousse donc
 * maintenant une entrée dans l'historique (`?etape=fiche`), et c'est
 * l'adresse qui dit où l'on est.
 *
 * `history.pushState` et non `router.push` : Next 15 relaie les appels
 * directs à l'historique sans redemander la page au serveur. Le
 * formulaire, monté une fois, garde donc ce qu'on y a écrit d'un écran
 * à l'autre, dans un sens comme dans l'autre.
 *
 * Une adresse qui arrive AVEC un écran (page rechargée, lien copié) est
 * ramenée au premier : ce qui avait été saisi n'existe plus, et
 * l'écran d'avant, lui, n'est pas dans l'historique.
 */
export function useEtapes(depart: Etape = "choix") {
  const [etape, poser] = useState<Etape>(depart);
  const haut = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (etapeDeLAdresse()) window.history.replaceState(null, "", adresseAvec(null));

    const surPrecedent = () => {
      const lue = etapeDeLAdresse();
      // « fin » ne se rejoue pas : on ne renvoie pas deux fois un dossier.
      poser(lue && lue !== "fin" ? lue : depart);
    };

    window.addEventListener("popstate", surPrecedent);
    return () => window.removeEventListener("popstate", surPrecedent);
  }, [depart]);

  useEffect(() => {
    haut.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [etape]);

  /**
   * Passer à un écran. `remplacer` pour la fin : une fois le dossier
   * parti, « précédent » ne doit pas rouvrir le formulaire rempli.
   */
  const aller = useCallback((suivante: Etape, { remplacer = false } = {}) => {
    poser(suivante);
    const adresse = adresseAvec(suivante === depart ? null : suivante);
    if (remplacer) window.history.replaceState(null, "", adresse);
    else window.history.pushState(null, "", adresse);
  }, [depart]);

  /**
   * Revenir d'un écran, comme le ferait « précédent ».
   *
   * Si l'écran courant a été poussé dans l'historique, on RECULE dans
   * l'historique plutôt que d'en empiler un de plus : sans ça, chaque
   * aller-retour laissait une entrée, et « précédent » du navigateur
   * faisait ensuite défiler tous ces écrans un par un.
   */
  const revenir = useCallback(
    (vers: Etape = depart) => {
      if (etapeDeLAdresse()) window.history.back();
      else poser(vers);
    },
    [depart]
  );

  return { etape, aller, revenir, haut };
}

/**
 * Le pas en arrière.
 *
 * Il était un lien souligné de treize pixels, qu'on ne voyait pas : on
 * finissait par utiliser le « précédent » du navigateur, qui quittait
 * le parcours. C'est désormais la même pastille que `BackLink`, au même
 * endroit sur chaque écran.
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
      className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-full border border-white/30 bg-white/8 py-2.5 pl-3.5 pr-4.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97]"
    >
      <IconBack />
      <span className="truncate">{children}</span>
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

/* ==================== 2. la fiche ==================== */

/**
 * L'écran de la fiche : lire le site, remplir, voir.
 *
 *   - `lecture` : l'appareil qui lit la boutique. Il n'est pas le même
 *     des deux côtés (le public a le sien, l'administration un autre,
 *     plus bavard), il arrive donc de l'appelant.
 *   - `children` : le formulaire. TOUJOURS MONTÉ, même replié : côté
 *     administration, la lecture du site écrit directement dans ses
 *     champs et doit les trouver, et ce qui y est saisi doit survivre à
 *     un aller-retour vers le premier écran.
 *   - `apercu` : ce que la saisie donne, collé à droite sur grand écran,
 *     au-dessus des champs au doigt (c'est ce qu'on veut voir d'abord).
 *
 * `ouverte` : la fiche ne se déplie qu'après une lecture, ou sur
 * « Remplir à la main ». Trente champs vides d'emblée, c'est une page
 * qu'on ne sait pas par où prendre ; le lien du site, lui, se colle en
 * un geste.
 */
export function CadreFiche({
  onRetour,
  retour = "Changer de choix",
  lecture,
  ouverte,
  sansSite,
  onManuel,
  manuel = "Remplir à la main",
  avis,
  apercu,
  refFiche,
  children,
}: {
  onRetour: () => void;
  retour?: string;
  lecture: React.ReactNode;
  ouverte: boolean;
  sansSite: { titre: string; texte: string };
  onManuel: () => void;
  manuel?: string;
  avis?: React.ReactNode;
  apercu: React.ReactNode;
  /** Pour y faire défiler l'écran une fois la lecture faite. */
  refFiche?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <LienRetour onClick={onRetour}>{retour}</LienRetour>

      {lecture}

      {!ouverte && (
        <section className="glass p-4 sm:px-7 sm:py-6">
          <h2 className="m-0 text-[15.5px] font-extrabold text-white">{sansSite.titre}</h2>
          <p className="m-0 mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/72">
            {sansSite.texte}
          </p>
          <button type="button" onClick={onManuel} className={`${SECONDAIRE} mt-4`}>
            {manuel}
          </button>
        </section>
      )}

      {/* La structure ne change jamais, seule la classe bascule : le
          formulaire garde ainsi son identité, et ce qu'il contient. */}
      <div
        ref={refFiche}
        className={
          ouverte
            ? "grid scroll-mt-28 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]"
            : "hidden"
        }
      >
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[86px] lg:order-2">
          {apercu}
        </aside>

        <div className="flex min-w-0 flex-col gap-5 lg:order-1">
          {avis && (
            <p className="glass m-0 px-5 py-3.5 text-[13.5px] leading-relaxed text-white">{avis}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
