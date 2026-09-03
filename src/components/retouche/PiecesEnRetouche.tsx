"use client";

import Link from "next/link";
import { useRetouche } from "./ContexteRetouche";
import { AMBRE } from "./apparence";

/**
 * Le catalogue vide, dit comme une étape et non comme un trou.
 *
 * LA PAGE PUBLIQUE EXPLIQUE DÉJÀ CE VIDE au visiteur — « les pièces
 * sont sur Vinted », « notre lecture n'a pas su récupérer le
 * catalogue ». Ces phrases sont justes pour lui et inutiles pour la
 * marque, qui, elle, n'a pas besoin d'une explication : elle a besoin du
 * geste suivant.
 *
 * ET ELLE N'APPARAÎT QUE SI ELLE BLOQUE. Une boutique fermée ou un
 * profil Vinted n'auront jamais de catalogue chez nous, et
 * `doitAvoirDesPieces` le sait : leur montrer « il te manque une pièce »
 * serait leur demander de faire une chose impossible pour lever un
 * obstacle qui n'existe pas.
 */
export default function PiecesEnRetouche() {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { actif, pieces, exigeDesPieces, slug, mots } = retouche;
  if (!actif || pieces > 0) return null;

  return (
    <section className="mt-8 sm:mt-11">
      <div className="mb-4 flex items-baseline gap-2.5">
        <h2 className="m-0 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
          {mots.piecesTitre}
        </h2>
        <span className="text-[17px] font-black tabular-nums text-white/45">0</span>
      </div>

      <div className="rounded-[var(--radius)] border border-dashed border-white/30 bg-white/6 p-5 sm:p-6">
        {exigeDesPieces && (
          <p
            className="m-0 text-[13.5px] font-bold"
            style={{ color: AMBRE }}
          >
            {mots.piecesManque}
          </p>
        )}

        <p className="m-0 mt-2 max-w-xl text-[13px] leading-relaxed text-white/70">
          Une fiche sans une seule pièce laisse le visiteur repartir après trois lignes. La
          lecture automatique va chercher tout ce que la boutique expose, et ce qu&apos;elle
          rapporte arrive en brouillon : rien ne s&apos;affiche avant relecture.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href={`/espace-marque/${slug}/import`}
            className="rounded-full bg-white px-4 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_16px_-4px_rgba(var(--accent-1),0.6)] transition active:scale-[.97]"
          >
            {mots.importer}
          </Link>
          <Link
            href={`/espace-marque/${slug}/pieces/ajouter`}
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:bg-white/18 hover:text-white active:scale-[.97]"
          >
            {mots.ajouterAlaMain}
          </Link>
        </div>
      </div>
    </section>
  );
}
