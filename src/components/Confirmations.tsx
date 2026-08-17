"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PARAMETRES_MESSAGE, type TonDuMessage } from "@/lib/flash";

/**
 * Le bandeau qui confirme, en bas à droite.
 *
 * Jusqu'ici, enregistrer quelque chose ne produisait rien de visible :
 * la page se rechargeait, à l'identique, et l'on restait à se demander
 * si le clic était passé. Le doute pousse à re-cliquer, et re-cliquer
 * sur « enregistrer » est le meilleur moyen de créer un doublon.
 *
 * Deux façons d'y écrire, parce qu'il y a deux sortes d'actions.
 * Celles qui redirigent passent par l'adresse (voir `flash.ts`) ;
 * celles qui restent sur place appellent `annoncer()`, qui envoie un
 * événement au document. Pas de contexte React à traverser : ce
 * composant est monté une fois pour tout le site, et n'importe quel
 * bouton peut lui parler sans que rien ne les relie.
 *
 * Il disparaît tout seul, et il montre le temps qu'il lui reste. Un
 * message qu'il faut fermer à la main est un travail de plus ; un
 * message qui s'évapore sans prévenir se perd. La jauge du bas règle
 * les deux, et s'arrête quand on pose le curseur dessus.
 *
 * Sa matière est celle du FOND DU SITE en miniature, et non le verre
 * des panneaux : même dégradé, mêmes nappes d'accents qui dérivent,
 * même liseré chromé. Tout est dans `globals.css`, sous
 * `.confirmation`, et se règle donc sur l'ambiance choisie sans qu'une
 * seule couleur soit écrite ici.
 */

type Confirmation = {
  id: number;
  texte: string;
  ton: TonDuMessage;
  /** Vrai pendant les trois dixièmes de seconde de la sortie. */
  sortant?: boolean;
};

const EVENEMENT = "newave:confirmation";

/** Combien de temps le message reste. Assez pour être lu deux fois. */
const DUREE = 4800;

/** La durée de l'animation de sortie, en accord avec globals.css. */
const SORTIE = 300;

/** Depuis n'importe quel composant client : `annoncer("Avis publié.")` */
export function annoncer(texte: string, ton: TonDuMessage = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: { texte, ton } }));
}

export default function Confirmations() {
  const [messages, setMessages] = useState<Confirmation[]>([]);
  const chemin = usePathname();
  const parametres = useSearchParams();

  /*
   * Les minuteries en cours, par message.
   *
   * On les garde pour pouvoir les annuler : le bandeau s'efface au
   * bout de quelques secondes, mais s'arrête d'attendre quand on le
   * survole. Sans ce registre, la jauge se figerait à l'écran pendant
   * que le message partirait quand même, ce qui serait pire que de ne
   * rien mettre en pause du tout.
   */
  const minuteries = useRef(new Map<number, number>());

  const retirer = useCallback((id: number) => {
    // En deux temps : on marque la sortie, l'animation se joue, puis on
    // enlève. Retirer directement du tableau ferait disparaître le
    // bandeau d'un coup, et une apparition soignée suivie d'une
    // disparition brutale se remarque tout de suite.
    setMessages((liste) => liste.map((m) => (m.id === id ? { ...m, sortant: true } : m)));
    window.setTimeout(() => {
      setMessages((liste) => liste.filter((m) => m.id !== id));
    }, SORTIE);
  }, []);

  const armer = useCallback(
    (id: number, delai = DUREE) => {
      window.clearTimeout(minuteries.current.get(id));
      minuteries.current.set(id, window.setTimeout(() => retirer(id), delai));
    },
    [retirer]
  );

  const ajouter = useCallback(
    (texte: string, ton: TonDuMessage) => {
      const id = Date.now() + Math.random();
      setMessages((liste) => {
        // Trois à l'écran au maximum : au-delà, la pile masque la page
        // et l'on ne lit plus rien du tout.
        const suivante = [...liste, { id, texte, ton }];
        return suivante.slice(-3);
      });
      armer(id);
    },
    [armer]
  );

  // Les minuteries encore en vol quand le composant s'en va.
  useEffect(() => {
    const enCours = minuteries.current;
    return () => {
      enCours.forEach((t) => window.clearTimeout(t));
      enCours.clear();
    };
  }, []);

  // Les actions qui restent sur place.
  useEffect(() => {
    const surEvenement = (e: Event) => {
      const detail = (e as CustomEvent<{ texte: string; ton: TonDuMessage }>).detail;
      if (detail?.texte) ajouter(detail.texte, detail.ton ?? "ok");
    };
    window.addEventListener(EVENEMENT, surEvenement);
    return () => window.removeEventListener(EVENEMENT, surEvenement);
  }, [ajouter]);

  // Celles qui redirigent, et déposent leur message dans l'adresse.
  useEffect(() => {
    let trouve = false;

    for (const [ton, cle] of Object.entries(PARAMETRES_MESSAGE) as [TonDuMessage, string][]) {
      const texte = parametres.get(cle);
      if (texte) {
        ajouter(texte, ton);
        trouve = true;
      }
    }
    if (!trouve) return;

    /*
     * On efface le paramètre derrière soi, sinon rafraîchir la page
     * — ou revenir en arrière — remontrerait un « c'est enregistré »
     * qui ne correspond plus à rien.
     *
     * `replaceState` plutôt que le routeur : il ne provoque aucun
     * nouveau rendu, et l'on ne veut surtout pas recharger la page
     * pour effacer une décoration.
     */
    const propre = new URLSearchParams(parametres.toString());
    for (const cle of Object.values(PARAMETRES_MESSAGE)) propre.delete(cle);
    const reste = propre.toString();
    window.history.replaceState(null, "", `${chemin}${reste ? `?${reste}` : ""}`);
  }, [parametres, chemin, ajouter]);

  if (messages.length === 0) return null;

  return (
    <div
      // `polite` : le lecteur d'écran finit sa phrase avant d'annoncer,
      // au lieu de couper la parole pour un message de confort.
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(23rem,calc(100vw-2rem))] flex-col gap-2.5 sm:bottom-6 sm:right-6"
    >
      {messages.map((m) => (
        <div
          key={m.id}
          data-sortant={m.sortant ? "1" : undefined}
          // La pause n'est pas un gadget : on pose le curseur dessus
          // justement quand on n'a pas fini de lire.
          onMouseEnter={() => window.clearTimeout(minuteries.current.get(m.id))}
          onMouseLeave={() => !m.sortant && armer(m.id)}
          className={`confirmation pointer-events-auto flex items-start gap-3 px-4 pt-3.5 ${
            m.ton === "erreur" ? "confirmation-erreur" : ""
          }`}
        >
          {/* L'éclat est un calque à part plutôt qu'un pseudo-élément :
              les deux de la boîte servent déjà, l'un aux nappes de
              couleur, l'autre au contour chromé. */}
          <span className="confirmation-eclat" aria-hidden />

          <span className="confirmation-pastille" aria-hidden>
            {m.ton === "erreur" ? (
              <span className="text-[12px] font-black leading-none">!</span>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  className="confirmation-trait"
                  d="M4 12.5 9.5 18 20 6.5"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>

          <p className="confirmation-texte m-0 flex-1 pt-px text-[13.5px] font-semibold leading-snug text-white">
            {m.texte}
          </p>

          <button
            type="button"
            onClick={() => retirer(m.id)}
            aria-label="Fermer"
            className="confirmation-fermer -mr-1 -mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-[15px] font-bold leading-none text-white hover:bg-white/15 hover:!opacity-100"
          >
            ×
          </button>

          <span
            className="confirmation-jauge"
            aria-hidden
            // La durée vit dans le composant, pas dans la feuille de
            // style : les deux doivent rester d'accord, et une seule
            // des deux peut faire foi.
            style={{ animationDuration: `${DUREE}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
