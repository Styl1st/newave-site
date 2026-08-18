"use client";

import { useEffect, useState } from "react";
import BrandCard from "./BrandCard";
import BrandPreview from "./BrandPreview";
import Grille from "./Grille";
import type { Brand } from "@/lib/types";

/**
 * Grille de marques avec aperçu des pièces.
 *
 * L'aperçu s'ouvre uniquement au clic sur le bouton, jamais au survol :
 * un panneau qui surgit tout seul pendant qu'on parcourt la liste
 * interrompt plus qu'il n'aide.
 */

/**
 * Combien de marques d'un coup.
 *
 * CE N'EST PAS UNE QUESTION DE CONFORT DE LECTURE, c'est ce qui empêche
 * le téléphone de recharger la page en boucle. Une couverture pèse
 * quelques centaines de kilo-octets sur le réseau, mais une fois
 * décodée pour être affichée elle occupe largeur × hauteur × 4 octets
 * en mémoire vive : plusieurs mégaoctets par carte. Le navigateur les
 * garde toutes tant qu'elles sont dans la page, même sorties de
 * l'écran, et `loading="lazy"` n'y change rien puisqu'il ne retarde que
 * le téléchargement.
 *
 * Passé une soixantaine de marques, l'onglet dépasse ce qu'iOS accorde
 * à une page et Safari le relance. De l'extérieur, ça ressemble
 * exactement à une page qui se rafraîchit toute seule sans fin.
 *
 * Vingt-quatre, c'est huit lignes de trois sur un écran large et déjà
 * beaucoup à faire défiler. Le même remède que pour les pièces d'une
 * marque, qui avait réglé le problème la première fois.
 */
const LOT = 24;
export default function BrandGrid({
  brands,
  memoire = "marques",
  aside,
  favoris,
  notes,
}: {
  brands: Brand[];
  /** Sous quel nom retenir la densité choisie pour cette liste. */
  memoire?: string;
  aside?: React.ReactNode;
  /** Les marques déjà suivies. Absent = on n'affiche pas l'étoile. */
  favoris?: string[];
  /**
   * Les moyennes, par identifiant de marque.
   *
   * Un objet simple et non une Map : ces données traversent la
   * frontière du serveur vers le navigateur, et un objet est ce qui
   * passe le plus sûrement.
   */
  notes?: Record<string, { moyenne: number; avis: number }>;
}) {
  const suivies = new Set(favoris ?? []);
  const [open, setOpen] = useState<string | null>(null);
  const [combien, setCombien] = useState(LOT);

  /*
   * Filtrer repart du début.
   *
   * Sans ça, quelqu'un qui a déroulé cent marques puis coche
   * « Bijoux » verrait la page essayer d'en afficher cent d'un coup,
   * ce qui est précisément la situation qu'on cherche à éviter. Le
   * tableau reçu change de référence à chaque filtre, ce qui suffit à
   * déclencher la remise à zéro.
   */
  useEffect(() => setCombien(LOT), [brands]);

  const visibles = brands.slice(0, combien);
  const reste = brands.length - visibles.length;

  return (
    <>
      {/* Les cartes du dessous remontent combler le vide laissé par
          celles du dessus. Une marque sans accroche est plus courte, et
          il n'y a aucune raison que sa voisine du dessous attende la
          fin de la rangée pour commencer. */}
      <Grille variante="marques" memoire={memoire} aside={aside} mosaique>
        {visibles.map((b) => (
          /* `data-reveal` déplace l'animation de défilement sur
             l'ensemble carte + bouton. Quand seule la carte bougeait,
             le bouton restait en place et venait flotter au-dessus de
             la carte de la ligne du dessus. */
          <div key={b.id} data-reveal className="relative">
            <BrandCard
              brand={b}
              note={notes?.[b.id]}
              favori={favoris ? { initial: suivies.has(b.id) } : undefined}
              apercu={
                <button
                  type="button"
                  onClick={() => setOpen(b.slug)}
                  aria-label={`Aperçu des pièces de ${b.name}`}
                  className="puce-apercu inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white transition duration-200 active:scale-95"
                >
                  {/* Un œil : le mot seul ne disait pas qu'on allait
                      regarder sans quitter la page. */}
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  Aperçu
                </button>
              }
            />
          </div>
        ))}
      </Grille>

      {reste > 0 && (
        <div className="mt-7 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setCombien((n) => n + LOT)}
            className="card-light px-7 py-3.5"
          >
            <span className="relative z-3 text-[14px] font-extrabold">
              Voir {Math.min(reste, LOT)} marque{Math.min(reste, LOT) > 1 ? "s" : ""} de plus
            </span>
          </button>
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">
            {visibles.length} sur {brands.length}
          </p>
        </div>
      )}

      {open && <BrandPreview slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}
