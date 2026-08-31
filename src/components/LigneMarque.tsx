"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import FavoriteButton from "./FavoriteButton";
import { IconEye } from "./Icons";
import { enChiffres } from "./chiffres";
import { vignette } from "@/lib/vignette";
import { ACCES_ETIQUETTE, unAcces } from "@/lib/acces";
import type { Brand } from "@/lib/types";

/**
 * Une marque sur une seule ligne, avec ce qu'elle fabrique posé dedans.
 *
 * POURQUOI CETTE FORME EXISTE À CÔTÉ DE LA CARTE. Une grille de cartes
 * est faite pour flâner : de grandes images, peu d'entrées à l'écran,
 * et l'on descend jusqu'à ce que quelque chose accroche. Passé une
 * centaine de marques, ce n'est plus flâner, c'est chercher — et l'on
 * cherche mal en faisant défiler des vignettes de trois cents pixels.
 * La ligne met dix marques là où la grille en met trois, en gardant le
 * nom lisible.
 *
 * ET SURTOUT ELLE MONTRE LES PIÈCES. C'est la vraie idée de cet écran :
 * quatre photos posées DANS la ligne répondent à la question qu'on se
 * pose devant un annuaire — « ils font quoi, au juste ? » — sans ouvrir
 * la fiche, donc sans perdre sa place dans la liste. Un aller-retour
 * évité par marque, sur cent trente-six marques.
 *
 * ON NE CHARGE RIEN TANT QUE LA LIGNE EST LOIN. Même mécanique que
 * `VitrineMarque` et pour la même raison : cent trente-six requêtes
 * lancées d'un coup pour des photos qu'on ne verra pas, c'est la page
 * qui rame avant d'avoir rien montré.
 *
 * ELLE SERT AUSSI AUX CLASSEMENTS ET AUX FAVORIS. Ces deux écrans
 * demandent exactement la même ligne — logo, identité, quatre pièces,
 * action, cœur — plus, pour le classement, deux colonnes de chiffres.
 * D'où `rang` et `coeurs`, tous deux facultatifs : une ligne
 * d'annuaire ne les passe pas et ne change pas d'un pixel.
 */

/** Quatre : ça tient dans la ligne, et ça suffit à dire le style. */
const CASES = 4;

type Reponse = { images?: string[]; total?: number };

/**
 * Le cœur plein, celui des compteurs.
 *
 * Il est exporté parce que le podium du classement et l'état vide des
 * favoris affichent le même geste : deux dessins de cœur légèrement
 * différents sur une même page se remarquent tout de suite.
 */
export function CoeurPlein({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className ?? "h-3.5 w-3.5"}
    >
      <path d="M12 20.5 4.3 13a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9A4.8 4.8 0 0 1 19.7 13Z" />
    </svg>
  );
}

export default function LigneMarque({
  brand,
  favori,
  onApercu,
  rang,
  coeurs,
}: {
  brand: Brand;
  /** Présent = on affiche le cœur, avec son état de départ. */
  favori?: { initial: boolean };
  /** Ouvre le panneau d'aperçu. Absent = le bouton mène à la fiche. */
  onApercu?: () => void;
  /** Place au classement, posée avant le logo. Absent = pas de rang. */
  rang?: number;
  /** Cœurs reçus, à droite. Absent = la ligne ne classe rien. */
  coeurs?: number;
}) {
  const ancre = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  /*
   * « Pas encore de réponse » et « rien à montrer » ne sont pas la même
   * chose, et les confondre affiche « pas encore de pièces » sur une
   * marque qui en a quarante, le temps que la requête revienne.
   */
  const [cherche, setCherche] = useState(true);

  useEffect(() => {
    const el = ancre.current;
    if (!el) return;
    let vivant = true;

    const guetteur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        guetteur.disconnect();

        fetch(`/api/marques/${brand.slug}/pieces?images=1`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((json: Reponse) => {
            if (!vivant) return;
            // Deux pièces partagent souvent la même photo — une taille,
            // un coloris. Quatre fois la même dans une ligne de quatre,
            // c'est une ligne qui ne dit rien.
            const images = [...new Set(json.images ?? [])];
            setPieces(images.slice(0, CASES));
            setTotal(json.total ?? images.length);
            setCherche(false);
          })
          .catch(() => {
            if (vivant) setCherche(false);
          });
      },
      { rootMargin: "300px" }
    );

    guetteur.observe(el);
    return () => {
      vivant = false;
      guetteur.disconnect();
    };
  }, [brand.slug]);

  const visuel = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  const acces = unAcces(brand.acces);
  const etiquetteAcces = acces === "ouvert" ? null : ACCES_ETIQUETTE[acces];

  /*
   * La sous-ligne : d'où, puis quoi. L'origine d'abord parce que c'est
   * ce qu'on cherche le plus souvent dans un annuaire de marques
   * indépendantes, et deux catégories au plus — la troisième déborde sur
   * une ligne de mille pixels comme sur un téléphone.
   */
  const sousLigne = [
    [brand.city, brand.country].filter(Boolean).join(" · "),
    ...brand.categories.slice(0, 2),
  ]
    .filter(Boolean)
    .join(" · ");

  const vide = !cherche && pieces.length === 0;

  /* Les blocs laissent passer le clic vers le lien étalé sous la ligne ;
     seuls les boutons le reprennent. Même procédé que `BrandCard`. */
  const bloc = "pointer-events-none relative z-3";

  /*
   * UNE LIGNE DE CLASSEMENT PORTE DEUX COLONNES DE PLUS, ET IL FAUT LES
   * LOGER QUELQUE PART.
   *
   * Le rang et le total de cœurs prennent à eux deux la centaine de
   * pixels qu'il restait à la bande de vignettes sur une tablette : la
   * ligne dépassait alors de sa carte, sans que rien ne le rattrape
   * puisqu'elle est en `flex-nowrap` dès 640 pixels.
   *
   * La ligne de classement recule donc son repli d'un cran : la bande
   * garde sa propre ligne jusqu'à 1024 pixels, comme elle le fait sur
   * téléphone, et ne remonte à côté de l'identité que lorsqu'il y a
   * vraiment la place. Une ligne d'annuaire, qui n'a pas ces colonnes,
   * ne change pas d'un pixel.
   *
   * Les classes sont écrites en toutes lettres et non composées à la
   * volée : Tailwind lit le fichier tel quel, un préfixe calculé ne
   * produirait aucune règle.
   */
  const serree = rang !== undefined || coeurs !== undefined;

  const rangee = serree
    ? "card-light group relative flex flex-wrap items-center gap-3 overflow-hidden p-3.5 sm:gap-4 sm:p-4 lg:flex-nowrap"
    : "card-light group relative flex flex-wrap items-center gap-3 overflow-hidden p-3.5 sm:flex-nowrap sm:gap-4 sm:p-4";

  const identite = serree
    ? `${bloc} min-w-0 flex-1 lg:w-[240px] lg:flex-none`
    : `${bloc} min-w-0 flex-1 sm:w-[240px] sm:flex-none`;

  const bande = serree
    ? `${bloc} order-last w-full lg:order-none lg:w-auto lg:min-w-0 lg:flex-1`
    : `${bloc} order-last w-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1`;

  const actions = serree
    ? `${bloc} ml-auto flex shrink-0 items-center gap-2 lg:ml-0`
    : `${bloc} ml-auto flex shrink-0 items-center gap-2 sm:ml-0`;

  return (
    <div ref={ancre} className={rangee}>
      {/*
       * Le lien passe DERRIÈRE la ligne, en calque. Un <button> ne peut
       * pas vivre dans un <a> — le navigateur refuse cette imbrication —
       * et le cœur comme l'aperçu doivent garder leur propre clic.
       */}
      <Link
        href={`/marques/${brand.slug}`}
        aria-label={brand.name}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      {/* 0. Le rang, quand la ligne sert un classement.
             En chiffres nus et non en médaille : une médaille par ligne
             sur cinquante lignes ne hiérarchise plus rien, et le podium
             juste au-dessus s'est déjà chargé de distinguer les trois
             premières. Il passe avant le logo parce que c'est la
             colonne qu'on suit du regard en descendant. */}
      {rang !== undefined && (
        <div
          className={`${bloc} w-[18px] shrink-0 text-[15px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#8a7bab] sm:w-[26px] sm:text-[17px] lg:w-[46px] lg:text-[20px]`}
        >
          {/* Un chiffre nu, lu à voix haute, ne dit pas ce qu'il compte. */}
          <span className="sr-only">
            {rang === 1 ? "Première" : `${rang}ᵉ`} place du classement
          </span>
          <span aria-hidden="true">{rang}</span>
        </div>
      )}

      {/* 1. Le logo. Un logo se montre en entier, une photo peut remplir
             son cadre : lui couper le nom serait lui retirer ce qui
             sert justement à la reconnaître. */}
      <div
        className={`${bloc} grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[rgba(23,10,51,0.06)] sm:h-[62px] sm:w-[62px]`}
      >
        {visuel ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vignette(visuel, 160, { logo: estUnLogo })}
            alt=""
            loading="lazy"
            decoding="async"
            className={`h-full w-full ${estUnLogo ? "object-contain p-1.5" : "object-cover"}`}
          />
        ) : (
          <span className="text-[20px] font-black text-[#a795c9]">
            {brand.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      {/* 2. L'identité. */}
      <div className={identite}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="m-0 min-w-0 truncate text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)] sm:text-[16px]">
            {brand.name}
          </h3>
          {brand.featured && <span className="badge shrink-0">À la une</span>}
          {etiquetteAcces && (
            <span className="shrink-0 rounded-full bg-[var(--color-ink)] px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-white">
              {etiquetteAcces}
            </span>
          )}
        </div>
        {sousLigne && (
          <p className="m-0 mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
            {sousLigne}
          </p>
        )}
      </div>

      {/* 3. Ce qu'elle fabrique. Sur téléphone la bande passe à la ligne
             et prend toute la largeur : quatre vignettes serrées entre
             un logo et deux boutons ne montreraient plus rien. */}
      <div className={bande}>
        {vide ? (
          <div className="grid h-[52px] place-items-center rounded-[10px] bg-[rgba(23,10,51,0.05)] sm:h-[58px]">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8a7bab]">
              Pas encore de pièces
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: CASES }).map((_, i) => {
              const source = pieces[i];
              const reste = total - CASES;
              const derniere = i === CASES - 1 && reste > 0;

              return (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-[10px] bg-[rgba(23,10,51,0.05)]"
                >
                  {source && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={vignette(source, 160)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {derniere && source && (
                    /*
                     * Le compte par-dessus la photo, pas à sa place. Une
                     * case « +8 » vide, c'est une photo de moins montrée
                     * pour un chiffre qui tient dans un coin.
                     */
                    <span className="absolute inset-0 grid place-items-center bg-[rgba(23,10,51,0.62)] text-[11px] font-extrabold text-white">
                      +{reste}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4, 5 et 6. Le total, l'aperçu et le cœur. Sur téléphone ils
             remontent au bout de la première ligne, à droite du nom. */}
      <div className={actions}>
        {coeurs !== undefined && (
          /*
           * Le chiffre porte son cœur, et c'est ce qui le rend lisible
           * sans en-tête de colonne : la ligne est une bande souple, pas
           * une grille, et un intitulé posé au-dessus se décalerait de sa
           * colonne dès que la largeur change.
           */
          <span
            title={`${enChiffres(coeurs)} ${coeurs > 1 ? "personnes suivent" : "personne suit"} cette marque`}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-extrabold tabular-nums text-[var(--color-ink)] sm:mr-1 sm:text-[17px]"
          >
            <CoeurPlein className="h-3 w-3 text-[#8a7bab] sm:h-3.5 sm:w-3.5" />
            {enChiffres(coeurs)}
          </span>
        )}

        {vide || !onApercu ? (
          /*
           * Rien à prévisualiser : le bouton dit alors ce qu'il fait
           * vraiment. Ouvrir un panneau vide sur « Aperçu » est la
           * façon la plus sûre de faire croire à une page cassée.
           */
          <Link
            href={`/marques/${brand.slug}`}
            className="pointer-events-auto hidden shrink-0 rounded-full bg-[rgba(23,10,51,0.1)] px-3.5 py-2 text-[10.5px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)] transition hover:bg-[rgba(23,10,51,0.18)] active:scale-95 sm:inline-block"
          >
            Voir la fiche
          </Link>
        ) : (
          <button
            type="button"
            onClick={onApercu}
            aria-label={`Aperçu des pièces de ${brand.name}`}
            className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-3 py-2 text-[10.5px] font-black uppercase tracking-[0.1em] text-white transition hover:opacity-90 active:scale-95 sm:px-3.5"
          >
            <IconEye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Aperçu</span>
          </button>
        )}

        {favori && (
          <div className="pointer-events-auto">
            <FavoriteButton
              brandId={brand.id}
              initial={favori.initial}
              etiquette={brand.name}
              taille="claire"
            />
          </div>
        )}
      </div>
    </div>
  );
}
