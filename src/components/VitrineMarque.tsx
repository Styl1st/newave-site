"use client";

import { useEffect, useRef, useState } from "react";
import { vignette } from "@/lib/vignette";

/**
 * L'illustration d'une marque, puis ses pièces qui défilent derrière.
 *
 * L'ILLUSTRATION ARRIVE EN PREMIER, comme une couverture. C'est elle
 * qu'on doit voir en arrivant sur l'annuaire : c'est l'identité de la
 * marque, et c'est ce qui permet de la reconnaître d'une visite à
 * l'autre. Les pièces prennent le relais ensuite, et donnent à voir ce
 * qu'elle fabrique — la question qu'on se pose juste après.
 *
 * SAUF SI ELLE EST ILLISIBLE. Beaucoup de marques n'ont qu'un logotype
 * de cent cinquante pixels, parfois l'icône d'onglet de leur site.
 * Agrandi à la taille d'une carte, il en ressort en bouillie, et c'est
 * la marque qui a l'air négligée alors qu'elle n'y est pour rien. On la
 * mesure au chargement, et si elle est trop petite on la retire du tour :
 * les pièces sont photographiées pour être vendues, elles font deux
 * mille pixels et elles sont belles.
 *
 * ON NE CHARGE RIEN TANT QUE LA CARTE EST LOIN, et le défilé s'arrête
 * dès qu'elle quitte l'écran. Sur un annuaire de cent trente-cinq
 * marques, faire tourner cent trente-cinq diaporamas en même temps
 * ferait chauffer la machine pour des images que personne ne regarde.
 *
 * L'ORDRE DES PIÈCES EST TIRÉ AU SORT. Sans ça, toutes les cartes
 * changeraient d'image à la même seconde, ce qui donne une page qui
 * clignote au lieu d'une page qui respire.
 */

/** Combien de temps chaque image reste affichée. */
const DUREE = 5000;

/** Au-delà, on n'en garde pas plus : c'est une vitrine, pas un catalogue. */
const MAX = 6;

/**
 * En deçà, l'illustration est trop petite pour servir de couverture.
 *
 * On mesure le plus GRAND côté : beaucoup de logos sont des bandeaux
 * larges et bas, parfaitement nets malgré leurs quatre-vingts pixels de
 * hauteur.
 */
const TROP_PETITE = 340;

/** En deçà, un geste horizontal n'est pas un balayage mais un tremblement. */
const BALAYAGE = 45;

type Reponse = { images?: string[] };

export default function VitrineMarque({
  slug,
  nom,
  couverture,
  estUnLogo = false,
  onVide,
}: {
  slug: string;
  nom: string;
  /** L'illustration de la marque, montrée en premier. */
  couverture?: string | null;
  /** Un logo se montre en entier ; une photo peut remplir le cadre. */
  estUnLogo?: boolean;
  /**
   * Prévenir qu'il n'y a rien du tout à montrer : ni illustration
   * lisible, ni pièce. L'appelant affiche alors le nom de la marque.
   */
  onVide?: () => void;
}) {
  const ancre = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<string[]>([]);
  /*
   * A-t-on FINI de chercher ?
   *
   * Sans cette distinction, une marque sans illustration se déclarait
   * vide dès le premier affichage : il n'y avait ni couverture ni pièce,
   * puisque les pièces n'étaient pas encore arrivées. La carte se
   * rabattait aussitôt sur le nom, la vitrine disparaissait, et la
   * requête ne partait jamais. C'est ce qui donnait « MINUS TWØ » écrit
   * sur un aplat.
   *
   * « Rien à montrer » et « pas encore de réponse » ne sont pas la même
   * chose.
   */
  const [cherche, setCherche] = useState(true);
  const [illisible, setIllisible] = useState(false);
  const [rang, setRang] = useState(0);

  // Charger, mais seulement quand la carte approche.
  useEffect(() => {
    const el = ancre.current;
    if (!el) return;
    let vivant = true;

    const guetteur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        guetteur.disconnect();

        // Le mode léger : rien que des adresses d'images, et une réponse
        // gardée par le cache partagé. Voir la route.
        fetch(`/api/marques/${slug}/pieces?images=1`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((json: Reponse) => {
            if (!vivant) return;
            /*
             * ON DÉDOUBLONNE, ET C'EST UNE CORRECTION DE BOGUE.
             *
             * Deux pièces d'une même marque partagent souvent la même
             * photo : une déclinaison de taille, un coloris, une pièce
             * saisie deux fois. React se plaignait alors de deux enfants
             * portant la même clé, et pouvait en escamoter un.
             *
             * Au-delà de l'avertissement, montrer deux fois la même
             * photo dans un tour de six n'a aucun intérêt.
             */
            const images = [...new Set(json.images ?? [])];

            // Mélange de Fisher-Yates, comme partout ailleurs sur le
            // site : deux marques voisines ne montrent pas les mêmes
            // pièces dans le même ordre.
            for (let i = images.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [images[i], images[j]] = [images[j], images[i]];
            }
            setPieces(images.slice(0, MAX));
            setCherche(false);
          })
          .catch(() => {
            if (vivant) setCherche(false);
            // Pas de pièces : l'illustration reste seule, et c'est très
            // bien. Si elle est illisible aussi, l'effet plus bas
            // préviendra l'appelant.
          });
      },
      { rootMargin: "300px" }
    );

    guetteur.observe(el);
    return () => {
      vivant = false;
      guetteur.disconnect();
    };
  }, [slug]);

  /*
   * L'illustration compte comme une vue, sauf si elle est trop petite.
   * `null` marque sa place dans la liste : c'est ce qui permet de la
   * retirer sans renuméroter les pièces.
   */
  const vues: (string | null)[] = [
    ...(couverture && !illisible ? [null] : []),
    ...pieces,
  ];
  const total = vues.length;

  // Rien du tout : ni illustration lisible, ni pièce, ET la recherche
  // est terminée.
  useEffect(() => {
    if (!cherche && total === 0) onVide?.();
  }, [cherche, total, onVide]);

  // Faire défiler, et seulement tant que la carte est à l'écran.
  useEffect(() => {
    if (total < 2) return;

    const el = ancre.current;
    if (!el) return;

    /*
     * Quelqu'un qui a demandé moins de mouvement ne veut pas d'un
     * diaporama qui tourne tout seul dans chaque carte. Le réglage du
     * site l'emporte sur celui du système, comme partout.
     */
    const racine = document.documentElement;
    if (
      // Machine trop lente : plusieurs fondus simultanés sur une grille
      // de cartes est exactement ce qu'elle ne sait pas faire. La
      // première image reste affichée. Voir `Menagement`.
      racine.dataset.allege === "1" ||
      racine.dataset.fige === "1" ||
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        racine.dataset.animChoisi !== "1")
    ) {
      return;
    }

    let minuteur: ReturnType<typeof setInterval> | null = null;

    const demarrer = () => {
      if (minuteur) return;
      minuteur = setInterval(() => setRang((r) => r + 1), DUREE);
    };
    const arreter = () => {
      if (!minuteur) return;
      clearInterval(minuteur);
      minuteur = null;
    };

    const guetteur = new IntersectionObserver(
      (entrees) => (entrees.some((e) => e.isIntersecting) ? demarrer() : arreter()),
      { rootMargin: "80px" }
    );
    guetteur.observe(el);

    return () => {
      arreter();
      guetteur.disconnect();
    };
  }, [total]);

  /*
   * LE BALAYAGE AU DOIGT, ÉCOUTÉ SUR LA CARTE ET NON SUR LA VITRINE.
   *
   * La vitrine est posée dans un bloc qui ne reçoit aucun clic : c'est
   * ce qui laisse passer le lien vers la fiche, étalé sous elle. Lui
   * rendre les évènements rendrait la carte incliquable, ce qui est
   * exactement l'inverse de ce qu'on veut.
   *
   * On écoute donc au niveau de la CARTE. Les gestes y remontent
   * naturellement, et l'on peut décider après coup s'il s'agissait d'un
   * clic ou d'un balayage.
   *
   * ET ON AVALE LE CLIC QUI SUIT UN BALAYAGE. Sans ça, faire glisser la
   * photo d'un pouce ouvrirait la fiche de la marque au relâchement : on
   * quitterait la page en croyant tourner une image.
   */
  useEffect(() => {
    if (total < 2) return;

    const carte = ancre.current?.closest(".card-light") as HTMLElement | null;
    if (!carte) return;

    let depart: { x: number; y: number } | null = null;
    let balayeA = 0;

    const appui = (e: PointerEvent) => {
      depart = { x: e.clientX, y: e.clientY };
    };

    const relache = (e: PointerEvent) => {
      const d = depart;
      depart = null;
      if (!d) return;

      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      // Plus horizontal que vertical, sinon c'est un défilement de page.
      if (Math.abs(dx) < BALAYAGE || Math.abs(dx) < Math.abs(dy)) return;

      balayeA = Date.now();
      setRang((r) => (r + (dx < 0 ? 1 : -1) + total) % total);
    };

    // En phase de capture : on passe avant le lien, donc avant qu'il ne
    // décide de naviguer.
    const clic = (e: MouseEvent) => {
      if (Date.now() - balayeA > 400) return;
      e.preventDefault();
      e.stopPropagation();
    };

    carte.addEventListener("pointerdown", appui);
    carte.addEventListener("pointerup", relache);
    carte.addEventListener("click", clic, true);

    return () => {
      carte.removeEventListener("pointerdown", appui);
      carte.removeEventListener("pointerup", relache);
      carte.removeEventListener("click", clic, true);
    };
  }, [total]);

  const aller = (pas: number) => (e: React.MouseEvent) => {
    // Les flèches sont posées sur le lien de la carte : sans ça, tourner
    // une image ouvrirait aussi la fiche.
    e.preventDefault();
    e.stopPropagation();
    setRang((r) => (r + pas + total) % total);
  };

  const actuelle = total > 0 ? rang % total : 0;

  return (
    <div ref={ancre} className="vitrine-marque">
      {vues.map((vue, i) => {
        const source = vue ?? couverture ?? "";
        const estLaCouverture = vue === null;
        if (!source) return null;

        return (
          /*
           * DEUX FOIS LA MÊME IMAGE, ET C'EST VOULU.
           *
           * Une photo de vêtement est verticale, le cadre d'une carte
           * est horizontal. La remplir de force revenait à n'en garder
           * que la bande centrale : sur un pantalon, on voyait les
           * cuisses et rien d'autre. C'est précisément la pièce qu'on
           * cherchait à montrer qu'on perdait.
           *
           * Elle est donc affichée entière, et le vide sur les côtés est
           * comblé par la même image agrandie et floutée. C'est le
           * procédé des lecteurs vidéo, et il ne coûte rien de plus :
           * c'est la même adresse, donc la même image déjà décodée.
           */
          <div
            key={`${i}-${estLaCouverture ? "couverture" : source}`}
            className="vitrine-photo"
            data-visible={i === actuelle ? "1" : undefined}
            aria-hidden={i !== actuelle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="vitrine-flou"
              src={vignette(source, 400, { logo: estLaCouverture && estUnLogo })}
              alt=""
              aria-hidden
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="vitrine-nette"
              src={vignette(source, 400, { logo: estLaCouverture && estUnLogo })}
              alt={i === actuelle ? (estLaCouverture ? nom : `Une pièce de ${nom}`) : ""}
              /*
               * La première est demandée tout de suite, les autres quand
               * leur tour approche. `loading="lazy"` ne suffirait pas :
               * une image superposée aux autres est considérée comme
               * visible par le navigateur, qui les chargerait donc
               * toutes d'un coup.
               */
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              /* Une photo de marque a le droit de remplir le cadre ; un
                 logo, jamais : on lui couperait le nom. */
              data-remplit={estLaCouverture && !estUnLogo ? "1" : undefined}
              onLoad={
                estLaCouverture
                  ? (e) => {
                      const img = e.currentTarget;
                      if (!img.naturalWidth) return;
                      if (Math.max(img.naturalWidth, img.naturalHeight) < TROP_PETITE) {
                        setIllisible(true);
                      }
                    }
                  : undefined
              }
            />
          </div>
        );
      })}

      {/* Les mêmes commandes que sur une vignette de pièce, et les mêmes
          classes : flèches au survol sur ordinateur, points pour dire
          combien il reste. Voir `.defile` dans globals.css. */}
      {total > 1 && (
        <div className="defile">
          <button
            type="button"
            onClick={aller(-1)}
            aria-label="Image précédente"
            className="defile-fleche defile-gauche"
          >
            <Chevron />
          </button>

          <button
            type="button"
            onClick={aller(1)}
            aria-label="Image suivante"
            className="defile-fleche defile-droite"
          >
            <Chevron sens="droite" />
          </button>

          <div className="defile-points">
            {vues.map((_, i) => (
              <span key={i} data-actif={i === actuelle ? "1" : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chevron({ sens = "gauche" }: { sens?: "gauche" | "droite" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
      style={sens === "droite" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
