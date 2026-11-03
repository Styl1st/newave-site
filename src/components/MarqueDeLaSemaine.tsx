"use client";

import Link from "next/link";
import { useState } from "react";
import BrandPreview from "./BrandPreview";
import CouvertureAnimee from "./CouvertureAnimee";
import FavoriteButton from "./FavoriteButton";
import IllustrationMarque from "./IllustrationMarque";
import { vignette } from "@/lib/vignette";
import { ACCES_ETIQUETTE, unAcces } from "@/lib/acces";
import type { FicheDAnnuaire } from "@/lib/fiche-annuaire";

/**
 * La marque mise en avant sur l'accueil, en grand.
 *
 * POSÉE À MÊME LE FOND, COMME LES PIÈCES. Elle était dans une grande
 * carte claire, avec une pastille « À la une », le logo en plaque sur
 * l'image, « Voir la boutique » en pilule sombre, un bouton noir à œil
 * et un cœur dans un rond. Juste en dessous, « Un aperçu, tiré au sort »
 * montre déjà ses pièces nues : la page passait d'une matière à l'autre
 * d'une section à la suivante. Elle prend donc l'habit de la vitrine
 * (`ProductCard`, variante `nue`) : l'image en rayon 4 avec son ombre
 * portée, le texte dessous, sur le fond, sans conteneur.
 *
 * CE QUI EST PARTI, ET POURQUOI ÇA NE MANQUE PAS :
 *   - « À la une » : le titre de la section dit déjà « La marque de la
 *     semaine » ;
 *   - le logo en plaque : le visuel EST le logo dès que la marque en a
 *     un, on le voyait donc deux fois, le petit posé sur le grand ;
 *   - les pilules et l'œil : trois sorties écrites en mots, comme le
 *     lien « Toutes les marques » juste au-dessus.
 *
 * LE VISUEL PASSE PAR `IllustrationMarque`, comme dans l'annuaire :
 * l'illustration d'abord, puis les pièces qui défilent. C'est ce qui
 * évite le pire cas d'une mise en avant, une grande image vide pour une
 * marque qui n'a pas de couverture alors que ses pièces sont belles.
 *
 * TROIS SORTIES, ET ELLES NE SE MARCHENT PAS DESSUS : l'aperçu de ses
 * pièces (sans quitter la page), sa fiche (l'image et le nom y mènent
 * aussi) et sa boutique (hors du site). Le cœur garde son propre clic.
 */
export default function MarqueDeLaSemaine({
  brand,
  favori,
}: {
  /** Allégée pour le navigateur : voir `pourLAnnuaire`. */
  brand: FicheDAnnuaire;
  /** Présent = on affiche le cœur, avec son état de départ. */
  favori?: { initial: boolean };
}) {
  const [apercu, setApercu] = useState(false);

  /* Même règle que dans l'annuaire : le logo EST l'identité, la
     couverture n'est souvent que la photo d'une pièce prise au hasard
     du catalogue. Voir `BrandCard`. */
  const visuel = brand.logo_url ?? brand.cover_url;
  const estUnLogo = Boolean(brand.logo_url);

  const acces = unAcces(brand.acces);
  const etiquetteAcces = acces === "ouvert" ? null : ACCES_ETIQUETTE[acces];
  const boutique = brand.shop_url ?? brand.website_url;
  const fiche = `/marques/${brand.slug}`;

  const meta = [
    [brand.city, brand.country].filter(Boolean).join(" · "),
    brand.categories.slice(0, 2).join(" · "),
  ]
    .filter(Boolean)
    .join(" · ");

  /* Le même habit que « Toutes les marques », au-dessus de la carte :
     des mots soulignés, pas des boutons. 44 px de haut pour le doigt. */
  const lien =
    "inline-flex min-h-[44px] items-center text-[13px] font-bold text-white/80 transition hover:text-white";
  const sortie = `${lien} underline decoration-white/40 underline-offset-4 hover:decoration-white`;

  return (
    <div>
      {/* ---------- l'image ----------
          `group` pour les flèches du défilé et le léger zoom au survol,
          comme sur une vignette de pièce.

          LE LIEN VERS LA FICHE EST SOUS L'IMAGE, PAS DESSUS. Posé
          par-dessus, il recouvrait aussi les flèches dès le survol : le
          zoom de la vitrine (`scale`) en fait une couche à part, et son
          `z-index` interne ne compte plus face au lien. Un clic sur une
          flèche ouvrait donc la fiche au lieu de tourner l'image. L'image
          passe maintenant devant, en laissant filer les clics vers le
          lien (`pointer-events-none`), sauf sur les flèches, qui les
          reprennent dans `globals.css`. C'est le montage des cartes de
          l'annuaire. */}
      <div className="cadre-nu group relative aspect-16/9 w-full overflow-hidden rounded-[4px] bg-linear-to-br from-[#efe6ff] to-[#d9c9f7] shadow-[0_26px_60px_-24px_rgba(20,6,50,0.95)]">
        <Link href={fiche} aria-label={brand.name} className="absolute inset-0 z-1" />

        <div className="pointer-events-none absolute inset-0 z-2">
          {brand.cover_video_url ? (
            <CouvertureAnimee
              video={brand.cover_video_url}
              affiche={vignette(brand.cover_url, 900)}
              className="h-full w-full object-cover"
            />
          ) : (
            <IllustrationMarque
              source={visuel}
              estUnLogo={estUnLogo}
              slug={brand.slug}
              nom={brand.name}
            />
          )}
        </div>
      </div>

      {/* ---------- le texte, à même le fond ----------
          Rien ne l'encadre, donc rien ne le rembourre : c'est
          l'alignement sur le bord gauche de l'image qui dit à quoi il
          appartient. Le cœur se range à droite du nom. */}
      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link href={fiche} className="block">
            <h3 className="m-0 text-[clamp(20px,4.6vw,26px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
              {brand.name}
            </h3>
          </Link>

          {meta && (
            <p className="m-0 mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60">
              {meta}
            </p>
          )}
        </div>

        {/* La marge négative recale la cible de 40 px du cœur sur la
            ligne du nom. */}
        {favori && (
          <div className="-mr-2 -mt-2 shrink-0">
            <FavoriteButton
              brandId={brand.id}
              initial={favori.initial}
              etiquette={brand.name}
              taille="trait"
            />
          </div>
        )}
      </div>

      {/* L'ACCROCHE SAUTE AU DOIGT. Le nom et la méta suffisent à donner
          envie d'ouvrir la fiche, où l'accroche est écrite en plus grand ;
          au téléphone, chaque ligne de plus repousse le reste de la page. */}
      {brand.tagline && (
        <p className="m-0 mt-3 hidden max-w-[56ch] text-[14.5px] leading-[1.65] text-white/80 sm:block">
          {brand.tagline}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-6">
        <button
          type="button"
          onClick={() => setApercu(true)}
          aria-label={`Aperçu des pièces de ${brand.name}`}
          className={sortie}
        >
          Voir ses pièces
        </button>

        <Link href={fiche} className={sortie}>
          La fiche complète
        </Link>

        {/* La boutique est chez la marque, jamais chez nous : le lien
            sort du site. Une boutique fermée ne donne pas de lien, elle
            dit pourquoi, en mots. */}
        {boutique && acces === "ouvert" ? (
          <a
            href={boutique}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`${lien} group/boutique`}
          >
            {/* Le soulignement sur le mot seul : posé sur le lien, il
                passerait aussi sous la flèche, qui ne peut pas s'en
                défaire. */}
            <span className="underline decoration-white/40 underline-offset-4 transition group-hover/boutique:decoration-white">
              La boutique
            </span>
            <span aria-hidden="true" className="ml-1.5">
              ↗
            </span>
          </a>
        ) : (
          etiquetteAcces && (
            <span className="inline-flex min-h-[44px] items-center text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/60">
              {etiquetteAcces}
            </span>
          )
        )}
      </div>

      {apercu && <BrandPreview slug={brand.slug} onClose={() => setApercu(false)} />}
    </div>
  );
}
