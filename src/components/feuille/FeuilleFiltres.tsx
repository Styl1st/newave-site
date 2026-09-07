"use client";

import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";

/**
 * La feuille de filtres qui monte du bas, et le geste qui la referme.
 *
 * POURQUOI CE FICHIER EXISTE. Elle a d'abord été écrite dans
 * `PieceDirectory`, où elle remplaçait la colonne de 222px qui ne tient
 * pas à 402px (voir `13e` du gabarit). L'annuaire, lui, dépliait ses
 * filtres en accordéon : on ouvrait, la liste qu'on venait de réduire
 * partait deux écrans plus bas, et le geste qu'on essaie sans y penser —
 * tirer vers le bas — ne faisait rien du tout, puisqu'il n'y avait pas de
 * feuille à tirer.
 *
 * La réponse évidente était de recopier la feuille dans l'annuaire. Deux
 * copies d'un geste tactile ne restent pas d'accord longtemps : le seuil
 * change d'un côté, la capture du pointeur de l'autre, et six mois plus
 * tard les deux écrans se referment différemment sans que personne ne
 * l'ait décidé. C'est exactement ce qu'on a évité pour les suggestions de
 * recherche, partagées entre le bloc et la feuille plein écran.
 *
 * CE QUE LE COMPOSANT NE FAIT PAS. Il ne décide ni quand il s'ouvre, ni
 * ce qu'il contient, ni ce que dit son pied. Chaque écran garde ses
 * filtres et son compte — l'annuaire dit « Voir les 136 marques », la
 * vitrine « Voir les 214 pièces » — parce que ce compte est la seule
 * chose qui remplace le retour immédiat qu'on avait sur grand écran.
 */
export default function FeuilleFiltres({
  ouvert,
  onFermer,
  id,
  children,
  pied,
}: {
  ouvert: boolean;
  onFermer: () => void;
  /** Celui que porte l'`aria-controls` du bouton qui l'ouvre. */
  id: string;
  children: React.ReactNode;
  /** Le bouton de validation, qui compte ce qui attend derrière. */
  pied: React.ReactNode;
}) {
  /* ==================================================================
     ELLE SE REFERME EN LA TIRANT VERS LE BAS.

     Une poignée dessinée en haut d'une feuille est une promesse : tout le
     monde essaie de la tirer. Sans ce geste, il ne se passait rien et il
     fallait redescendre chercher le bouton du pied — soit exactement le
     trajet que la feuille était censée éviter.

     ------------------------------------------------------------------
     POURQUOI CECI EST ÉCRIT EN ÉVÉNEMENTS TACTILES ET NON EN
     `onPointerMove`, QUI SERAIT PLUS COURT.
     ------------------------------------------------------------------

     La première version l'était. Elle marchait à la souris, elle passait
     les tests, et elle ne marchait sur aucun téléphone.

     La raison tient en un mot : `pointercancel`. Quand un doigt part vers
     le bas, le navigateur décide LUI-MÊME, au bout d'un ou deux
     déplacements, si le geste lui revient — parce qu'il ressemble à un
     défilement — ou s'il revient à la page. S'il se l'attribue, il envoie
     `pointercancel` et cesse d'émettre `pointermove` : le code ne voit
     plus rien, la feuille reste en place, et rien dans la console ne dit
     qu'il s'est passé quelque chose. Mesuré ici : `pointerdown`, UN seul
     `pointermove`, puis `pointercancel`, pour dix `touchmove` bien
     arrivés.

     On ne peut pas refuser cette décision depuis un gestionnaire de
     pointeur : React pose ses écouteurs en mode passif, où
     `preventDefault()` est sans effet. Il faut donc écouter `touchmove`
     soi-même, en `{ passive: false }`, et appeler `preventDefault()` au
     moment où l'on prend le geste. C'est la seule façon de dire au
     navigateur « celui-là est à moi ».

     LA SOURIS RESTE SUR LE CHEMIN DES POINTEURS. Elle n'a jamais souffert
     du problème — rien ne lui dispute un geste — et un `pointerdown` de
     souris est plus simple à suivre qu'un `mousedown` global. Les deux
     chemins ne se marchent pas dessus : celui des pointeurs ignore tout
     ce qui n'est pas `pointerType === "mouse"`.
     ================================================================== */

  /*
   * LA FEUILLE EST TENUE EN ÉTAT, PAS EN RÉFÉRENCE, ET C'EST OBLIGÉ.
   *
   * `Portal` ne rend rien à son premier passage : il attend son propre
   * effet pour se déclarer monté. Au moment où `ouvert` passe à vrai,
   * l'effet ci-dessous s'exécute donc AVANT que la feuille n'existe dans
   * le document — une référence y vaut `null`, l'effet ressort aussitôt,
   * et comme `ouvert` n'a plus de raison de changer, il ne se relance
   * jamais. Aucun écouteur n'est posé, et le glissement ne fait rien.
   *
   * Une référence de rappel, elle, déclenche un rendu au moment exact où
   * le nœud apparaît : l'effet le prend en dépendance et s'exécute quand
   * il y a quelque chose à écouter.
   *
   * Les gestionnaires de React n'avaient pas ce problème — ils sont posés
   * avec l'élément — d'où une panne qui ne se voyait qu'après être passé
   * aux écouteurs natifs.
   */
  const [panneau, setPanneau] = useState<HTMLDivElement | null>(null);
  const corps = useRef<HTMLDivElement>(null);
  const depart = useRef<number | null>(null);
  const [glisse, setGlisse] = useState(0);
  const [tire, setTire] = useState(false);

  /* `lacher` est appelé depuis un écouteur natif, dont la fermeture est
     figée au moment où on l'attache : il y lirait un `glisse` d'il y a
     dix images. Le miroir en référence dit la valeur du moment. */
  const glisseRef = useRef(0);
  function poser(dy: number) {
    glisseRef.current = dy;
    setGlisse(dy);
  }

  /*
   * `onFermer` EN RÉFÉRENCE, ET C'EST TOUT SAUF UN DÉTAIL.
   *
   * L'appelant écrit `onFermer={() => setOuvert(false)}` : une fonction
   * neuve à chaque rendu. Mise en dépendance de l'effet plus bas, elle le
   * fait se démonter et se remonter à CHAQUE rendu — donc à chaque image
   * du glissement, puisque bouger la feuille appelle `setGlisse`.
   *
   * Retirer un écouteur `touchmove` non passif au milieu d'un geste
   * revient à dire au navigateur qu'on n'en veut plus : il reprend la
   * main, et la feuille se fige à mi-course. La panne était là, pas dans
   * le calcul du glissement.
   *
   * La référence garde l'effet monté du début à la fin du geste, tout en
   * appelant toujours la dernière version de la fonction.
   */
  const fermer = useRef(onFermer);
  fermer.current = onFermer;

  /** Au-delà, on lâche et la feuille s'en va. En deçà, elle revient. */
  const SEUIL = 110;

  /** Ce qu'on touche pour régler, et non pour refermer. */
  function surUnReglage(cible: EventTarget | null) {
    return !!(cible as HTMLElement | null)?.closest?.("input, select, button, label");
  }

  /* Une feuille rouverte doit repartir en haut : sans ça, elle
     réapparaîtrait à la hauteur où le doigt l'avait laissée. */
  useEffect(() => {
    if (!ouvert) {
      depart.current = null;
      glisseRef.current = 0;
      setGlisse(0);
      setTire(false);
    }
  }, [ouvert]);

  /* ---------------- le doigt ---------------- */
  useEffect(() => {
    const feuille = panneau;
    if (!ouvert || !feuille) return;

    let engage = false;

    function debut(e: TouchEvent) {
      /* À deux doigts, on pince ou l'on fait défiler : ce n'est pas un
         geste de fermeture. */
      if (e.touches.length !== 1) return;
      if (surUnReglage(e.target)) return;
      /* Le contenu doit être en haut de son défilement, sinon on ne
         pourrait plus le faire défiler du tout : chaque glissement vers
         le bas emporterait la feuille entière. C'est la règle de toutes
         les feuilles du téléphone, et celle qu'on essaie sans y penser. */
      if ((corps.current?.scrollTop ?? 0) > 0) return;
      depart.current = e.touches[0].clientY;
      engage = false;
    }

    function bouge(e: TouchEvent) {
      if (depart.current === null || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - depart.current;

      /* Le doigt remonte : il veut lire le bas de la feuille, pas la
         refermer. On rend le geste au navigateur, définitivement pour
         ce contact — sinon un aller-retour reprendrait la main au
         milieu d'un défilement. */
      if (dy <= 0) {
        if (!engage) depart.current = null;
        return;
      }

      /* Quelques pixels de tolérance : un appui un peu tremblant ne doit
         pas faire sauter la feuille. */
      if (!engage && dy < 6) return;

      if (!engage) {
        engage = true;
        setTire(true);
      }
      /* LA LIGNE QUI MANQUAIT. Sans elle, le navigateur garde le geste
         et le code ne reçoit plus rien. */
      if (e.cancelable) e.preventDefault();
      poser(dy);
    }

    function fin() {
      if (depart.current === null) return;
      const assez = glisseRef.current > SEUIL;
      depart.current = null;
      engage = false;
      setTire(false);
      poser(0);
      if (assez) fermer.current();
    }

    feuille.addEventListener("touchstart", debut, { passive: true });
    feuille.addEventListener("touchmove", bouge, { passive: false });
    feuille.addEventListener("touchend", fin);
    feuille.addEventListener("touchcancel", fin);
    return () => {
      feuille.removeEventListener("touchstart", debut);
      feuille.removeEventListener("touchmove", bouge);
      feuille.removeEventListener("touchend", fin);
      feuille.removeEventListener("touchcancel", fin);
    };
  }, [ouvert, panneau]);

  /* ---------------- la souris ---------------- */

  function prendre(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    if (surUnReglage(e.target)) return;
    if ((corps.current?.scrollTop ?? 0) > 0) return;
    depart.current = e.clientY;
  }

  function deplacer(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || depart.current === null) return;
    const dy = e.clientY - depart.current;
    if (!tire && dy < 6) return;
    if (!tire) {
      setTire(true);
      /* Garde le curseur rattaché à la feuille même s'il sort de ses
         bords en chemin : sans lui, le mouvement se coupe au milieu. */
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    poser(Math.max(0, dy));
  }

  function lacher(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || depart.current === null) return;
    const assez = glisseRef.current > SEUIL;
    depart.current = null;
    setTire(false);
    poser(0);
    if (assez) fermer.current();
  }

  /* La page dessous ne défile plus, et Échap referme. */
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && fermer.current();
    document.addEventListener("keydown", surTouche);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = precedent;
    };
  }, [ouvert]);

  if (!ouvert) return null;

  return (
    /* Rendue dans un portail, hors de la page : posée dedans, elle
       hériterait du plan d'empilement de la grille et passerait sous la
       barre du haut. Même mécanique que `FeuilleRetouche`. */
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end">
        {/* Le voile. Toucher à côté referme, comme partout ailleurs.
            Il s'éclaircit à mesure qu'on tire la feuille vers le bas :
            c'est ce qui fait sentir qu'on est en train de la refermer et
            non de la déplacer. */}
        <button
          type="button"
          aria-label="Fermer les filtres"
          onClick={onFermer}
          className="absolute inset-0 bg-[rgba(12,4,32,0.58)]"
          style={{ opacity: 1 - Math.min(glisse / 420, 0.55) }}
        />

        {/*
         * L'ENVELOPPE PORTE LE GLISSEMENT, ET LA FEUILLE SON DESSIN.
         *
         * `panneau-edition` anime son entrée par une `transform`, en
         * `animation-fill-mode: both` : la dernière image du mouvement
         * continue de s'appliquer une fois l'animation finie, et une
         * `transform` posée en style en ligne sur le même élément serait
         * purement et simplement ignorée. Le glissement vit donc un cran
         * au-dessus.
         */}
        <div
          className="relative w-full"
          style={{
            transform: glisse ? `translateY(${glisse}px)` : undefined,
            transition: tire ? "none" : "transform .28s cubic-bezier(.2,.8,.3,1)",
          }}
        >
          <div
            ref={setPanneau}
            role="dialog"
            aria-modal
            aria-label="Filtres"
            id={id}
            onPointerDown={prendre}
            onPointerMove={deplacer}
            onPointerUp={lacher}
            onPointerCancel={lacher}
            className="panneau-edition relative flex max-h-[86svh] w-full flex-col rounded-t-[26px] border-t border-white/20 shadow-[0_-18px_44px_-8px_rgba(12,3,36,0.8)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* La poignée. Elle disait « ceci se ferme en tirant vers le
                bas » sans que ce soit vrai : on l'essayait, il ne se
                passait rien, et il fallait redescendre chercher le
                bouton. Elle tient maintenant sa promesse — et le geste
                marche depuis toute la feuille, pas seulement depuis
                elle. */}
            <span
              aria-hidden
              className="mx-auto mt-2.5 h-[5px] w-11 shrink-0 rounded-full bg-white/30"
            />

            <div ref={corps} className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {children}
            </div>

            {/*
             * LE PIED COMPTE, ET C'EST LUI QUI REMPLACE LE RETOUR
             * IMMÉDIAT.
             *
             * Sur grand écran, ce qu'on filtre est visible pendant qu'on
             * coche. Ici la feuille recouvre ce qu'elle filtre, et l'on
             * cocherait à l'aveugle. Le compte se recalcule à chaque
             * changement — c'est la même valeur que la page affichera en
             * dessous, pas une estimation.
             */}
            <div className="shrink-0 border-t border-white/15 px-5 py-3.5">{pied}</div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
