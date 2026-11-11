"use client";

import LienPatient from "../LienPatient";
import { useEffect, useRef } from "react";
import LikeButton from "../LikeButton";
import { enChiffres } from "../chiffres";
import { enEtoiles } from "../Etoiles";
import type { Elan } from "./classement";
import type { NoteAffichee } from "./classement";
import { estUneVideo } from "@/lib/medias";
import { vignette } from "@/lib/vignette";
import type { Product } from "@/lib/types";
import { discountPercent, formatPrice, prixAffiche } from "@/lib/types";

/**
 * Une pièce du classement, sous le podium.
 *
 * ELLE A QUITTÉ SA CARTE BLANCHE POUR L'HABIT DE L'ANNUAIRE DE A À Z.
 * Une pile de cartes claires sous un podium posé à même le fond
 * coupait la page en deux matières. La ligne est maintenant celle de la
 * liste des marques (`LigneMarque`, variante `halo`) : posée sur le
 * fond, entre deux filets qui s'éteignent en fondu sur les côtés, et
 * éclairée par un halo aux couleurs de l'ambiance sous la souris — au
 * doigt, c'est la ligne au milieu de l'écran qui s'allume. Le décor vit
 * dans `globals.css` (`.ligne-halo`), le suivi de la souris dans `Halo`.
 *
 * CE QU'ELLE MONTRE, ET RIEN DE PLUS : le rang en chiffres détourés
 * (comme les lettres de l'annuaire), la photo, le nom, la marque et le
 * prix sur une seule sous-ligne, puis le cœur, qui porte le compte. Le
 * rayon, la pastille sombre et le rond du bouton sont partis.
 *
 * ⚠️ UNE SEULE MESURE PAR LIGNE. `coeurs`, `elan` ou `note`, jamais
 * deux : le coup de cœur dit ce qui plaît, l'avis dit ce qui est bon,
 * et les afficher côte à côte inviterait à les additionner.
 */
export default function LignePiece({
  product,
  rang,
  coeurs,
  elan,
  note,
  aimee,
}: {
  product: Product;
  /**
   * Place au classement, posée avant la photo. Seulement sous le podium :
   * les trois premières y sont déjà, en grand. Absent = pas de rang.
   */
  rang?: number;
  /** Coups de cœur reçus. Absent sur les autres mesures, et sous le seuil. */
  coeurs?: number;
  /** La part reçue sur la fenêtre, À LA PLACE des cœurs. Jamais avec. */
  elan?: Elan;
  /** La note moyenne et son nombre d'avis. Absent sur les onglets de cœurs. */
  note?: NoteAffichee;
  /** Le geste de la personne connectée, et rien que le sien. */
  aimee: boolean;
}) {
  const ancre = useRef<HTMLDivElement>(null);

  /*
   * AU DOIGT, LA LUMIÈRE SUIT LE DÉFILEMENT. Même procédé que
   * `LigneMarque` : la ligne qui traverse le milieu de l'écran s'allume,
   * guettée par un `IntersectionObserver`, sans écouteur de défilement
   * ni rendu React.
   */
  useEffect(() => {
    const el = ancre.current;
    if (!el || !window.matchMedia("(hover: none)").matches) return;

    const guetteur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) el.dataset.centre = "1";
          else delete el.dataset.centre;
        }
      },
      { rootMargin: "-46% 0px -46% 0px" }
    );
    guetteur.observe(el);
    return () => guetteur.disconnect();
  }, []);

  const prix = prixAffiche(product);
  const barre = formatPrice(product.compare_at_cents, product.currency);
  const remise = discountPercent(product);

  /*
   * La première PHOTO, et pas le premier média : une vidéo en tête de
   * carrousel donnerait un cadre cassé dans une balise `img`.
   */
  const visuel =
    (product.images ?? []).find((m) => Boolean(m) && !estUneVideo(m)) ??
    (product.image_url && !estUneVideo(product.image_url) ? product.image_url : null);

  const slug = product.brand?.slug;
  const interne = Boolean(slug && product.slug);
  /* Sans fiche interne, on sort par le compteur de clics plutôt que de
     fabriquer un lien mort. Même règle que `ProductCard`. */
  const href = interne ? `/marques/${slug}/${product.slug}` : `/api/go/piece/${product.id}`;

  /* Retirée l'emporte sur épuisée : une pièce qui n'est plus sur la
     boutique ne reviendra pas en stock. */
  const etat = product.retired_at ? "Retirée" : product.available ? null : "Épuisé";

  /* Les blocs laissent passer le clic vers le lien étalé sous la ligne ;
     seul le cœur le reprend. */
  const bloc = "pointer-events-none relative z-3";

  /*
   * Le lien passe DERRIÈRE la ligne, en calque : un <button> ne peut pas
   * vivre dans un <a>, et le cœur doit garder son propre clic.
   */
  const calque = interne ? (
    <LienPatient href={href} aria-label={product.name} data-calque="" className="absolute inset-0 z-2" />
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={product.name}
      data-calque=""
      className="absolute inset-0 z-2"
    />
  );

  return (
    <div
      ref={ancre}
      data-halo=""
      className="ligne-halo group relative flex items-center gap-3 sm:gap-5"
    >
      {/* Les deux filets, le halo et les traits qu'il allume. */}
      <span className="ligne-halo-decor" aria-hidden="true">
        <span className="ligne-halo-trait" />
      </span>

      {calque}

      {/* 0. Le rang, détouré comme les lettres de l'annuaire : on le
             voit passer en descendant sans qu'il pèse plus que la pièce. */}
      {rang !== undefined && (
        <div className={`${bloc} rang-contour w-[30px] shrink-0 text-center sm:w-[46px]`}>
          <span className="sr-only">{`${rang}ᵉ`} place du classement</span>
          <span aria-hidden="true">{rang}</span>
        </div>
      )}

      {/* 1. La photo, demandée à la taille où on l'affiche. */}
      <div
        className={`${bloc} ligne-halo-logo grid h-[54px] w-[54px] shrink-0 place-items-center overflow-hidden rounded-[16px] sm:h-[64px] sm:w-[64px]`}
      >
        {visuel ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vignette(visuel, 160)}
            alt=""
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover ${
              product.retired_at ? "opacity-70 grayscale-[.35]" : ""
            }`}
          />
        ) : (
          <span className="text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-[#a795c9]">
            À venir
          </span>
        )}
      </div>

      {/* 2. Le nom, puis la marque et le prix sur une seule ligne. */}
      <div className={`${bloc} ligne-halo-identite min-w-0 flex-1`}>
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="m-0 min-w-0 truncate text-[16px] font-black leading-[1.1] tracking-[-0.03em] text-white sm:text-[20px]">
            {product.name}
          </h3>
          {etat && (
            <span className="shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-white ring-1 ring-white/25">
              {etat}
            </span>
          )}
        </div>
        <p className="m-0 mt-1.5 flex min-w-0 items-baseline gap-x-2 text-[12.5px] font-semibold text-white/72 sm:text-[13px]">
          {product.brand?.name && <span className="min-w-0 truncate">{product.brand.name}</span>}
          {product.brand?.name && (
            <span aria-hidden="true" className="text-white/35">
              ·
            </span>
          )}
          <span className="shrink-0 font-extrabold text-white">
            {prix.principal ?? "Prix sur la boutique"}
          </span>
          {/* Le prix réellement demandé, quand il n'est pas en euros. */}
          {prix.origine && <span className="hidden shrink-0 sm:inline">{prix.origine}</span>}
          {barre && remise !== null && (
            <span className="shrink-0 text-white/50 line-through">{barre}</span>
          )}
        </p>
      </div>

      {/* 3. La mesure quand ce n'est pas un compte de cœurs, puis le
             cœur, qui porte le compte. Sous le seuil des chiffres, il
             reste muet : voir `chiffresAffiches`. */}
      <div
        className={`${bloc} flex shrink-0 items-center gap-1 text-[13px] font-extrabold text-white sm:text-[15px]`}
      >
        {elan && (
          <span
            title={`${enChiffres(elan.fenetre)} sur ${enChiffres(elan.total)} cœurs`}
            className="tabular-nums"
          >
            {elan.part} %
          </span>
        )}
        {note && (
          <span
            title={`Noté ${enEtoiles(note.moyenne)} sur 5 par ${note.avis} personne${note.avis > 1 ? "s" : ""}`}
            className="inline-flex items-baseline gap-1 tabular-nums"
          >
            <span aria-hidden="true" className="text-[#f5c73c]">
              ★
            </span>
            {enEtoiles(note.moyenne)}
            <span className="text-[11px] font-bold text-white/60">({note.avis})</span>
          </span>
        )}
        <div className="pointer-events-auto">
          <LikeButton
            productId={product.id}
            initialLiked={aimee}
            initialCount={coeurs ?? 0}
            taille="trait"
            muet={coeurs === undefined}
          />
        </div>
      </div>
    </div>
  );
}
