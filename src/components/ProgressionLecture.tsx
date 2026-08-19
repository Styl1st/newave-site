"use client";

import { useEffect, useRef } from "react";

/**
 * Où l'on en est dans la page, en bas de l'écran.
 *
 * Une ligne qui se remplit, et à sa pointe le sigle de la marque qui
 * avance avec elle. Sur les longues pages — une fiche de marque avec
 * son catalogue, l'annuaire complet — on ne sait jamais s'il reste
 * trois écrans ou trente. Cette ligne le dit sans rien demander.
 *
 * TOUT PASSE PAR UNE SEULE VARIABLE, `--lecture`, posée sur <html> et
 * valant de 0 à 1. Le reste est du CSS : le remplissage est un
 * `scaleX`, la pointe une position calculée. Aucun style n'est écrit
 * élément par élément depuis le JavaScript, ce qui évite de refaire
 * travailler le navigateur à chaque image.
 *
 * La mesure est calée sur `requestAnimationFrame` : un évènement de
 * défilement peut se produire cent fois par seconde, l'écran ne se
 * rafraîchit que soixante. Mesurer plus souvent que l'on n'affiche est
 * du travail perdu, et sur un téléphone ce travail perdu se voit.
 */
export default function ProgressionLecture() {
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const racine = document.documentElement;
    let image = 0;

    /*
     * LA HAUTEUR DE LA PAGE EST MISE EN CACHE, ET C'EST TOUT LE SUJET.
     *
     * Elle était relue à chaque image pendant le défilement. Or lire
     * `scrollHeight` force le navigateur à recalculer la mise en page
     * de tout le document AVANT de répondre : c'est une opération qui
     * parcourt chaque élément de la page. Sur une fiche de marque
     * chargée de cent pièces, ça se fait soixante fois par seconde
     * pendant qu'on défile, et c'est exactement la saccade qu'on sent.
     *
     * La hauteur, elle, ne change pas quand on défile. Elle change
     * quand une image arrive, quand un panneau s'ouvre, quand on
     * redimensionne : autant d'évènements déjà surveillés plus bas.
     * On la relit à ces moments-là, et jamais entre deux.
     */
    let hauteur = 0;

    const remesurerLaPage = () => {
      hauteur = document.body.scrollHeight - window.innerHeight;
    };

    const mesurer = () => {
      image = 0;

      /*
       * En dessous de six cents pixels à parcourir, la ligne ne
       * s'affiche pas du tout. Sur une page courte elle serait déjà
       * pleine avant qu'on ait bougé : elle n'apprendrait rien et
       * occuperait le bas de l'écran pour le plaisir.
       */
      const utile = hauteur > 600;
      if (!utile) {
        delete racine.dataset.lecture;
        racine.style.setProperty("--lecture", "0");
        return;
      }

      racine.dataset.lecture = "1";

      const part = Math.min(1, Math.max(0, window.scrollY / hauteur));
      racine.style.setProperty("--lecture", String(part));
    };

    const planifier = () => {
      if (!image) image = requestAnimationFrame(mesurer);
    };

    /** Quand la page a pu changer de hauteur : on relit, puis on cale. */
    const replanifier = () => {
      remesurerLaPage();
      planifier();
    };

    replanifier();
    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", replanifier);

    /*
     * La hauteur de la page bouge sans que l'on défile : les images se
     * chargent, un panneau s'ouvre, on change de page. Sans cette
     * observation, la ligne resterait calée sur l'ancienne hauteur et
     * n'atteindrait jamais le bout — ou l'atteindrait trop tôt.
     */
    const observateur = new ResizeObserver(replanifier);
    observateur.observe(document.body);

    return () => {
      if (image) cancelAnimationFrame(image);
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", replanifier);
      observateur.disconnect();
      delete racine.dataset.lecture;
    };
  }, []);

  /*
   * On peut l'attraper, comme une barre de défilement.
   *
   * C'est ce qui autorise à masquer celle du navigateur : on ne retire
   * pas une commande sans en donner une autre. Sur une fiche de marque
   * de trente écrans, atteindre le bas d'un seul geste doit rester
   * possible.
   *
   * `setPointerCapture` est le point technique : sans lui, le curseur
   * qui sort de la bande de quatorze pixels — ce qui arrive à la
   * première seconde — cesse d'envoyer ses mouvements, et le glissement
   * s'interrompt tout seul.
   */
  function suivreLePointeur(e: React.PointerEvent<HTMLDivElement>) {
    const bande = zone.current;
    if (!bande) return;

    const largeur = bande.clientWidth;
    const hauteur = document.body.scrollHeight - window.innerHeight;
    if (largeur <= 0 || hauteur <= 0) return;

    bande.setPointerCapture(e.pointerId);
    bande.dataset.prise = "1";

    const aller = (x: number) => {
      const part = Math.min(1, Math.max(0, x / largeur));
      window.scrollTo({ top: part * hauteur, behavior: "auto" });
    };

    aller(e.clientX - bande.getBoundingClientRect().left);

    const bouger = (ev: PointerEvent) =>
      aller(ev.clientX - bande.getBoundingClientRect().left);

    const finir = () => {
      delete bande.dataset.prise;
      bande.removeEventListener("pointermove", bouger);
      bande.removeEventListener("pointerup", finir);
      bande.removeEventListener("pointercancel", finir);
    };

    bande.addEventListener("pointermove", bouger);
    bande.addEventListener("pointerup", finir);
    bande.addEventListener("pointercancel", finir);
  }

  return (
    <div
      ref={zone}
      className="progression-zone"
      onPointerDown={suivreLePointeur}
      role="presentation"
    >
      <div className="progression-lecture" aria-hidden="true">
        <span className="progression-remplie" />
        <span className="progression-tete">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-white.webp" alt="" />
        </span>
      </div>
    </div>
  );
}
