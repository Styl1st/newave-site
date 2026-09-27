import Link from "next/link";
import {
  ilYA,
  libelleRemuneration,
  lienAnnonce,
  signature,
  type Annonce,
} from "@/lib/forum";
import BoutonVote from "./BoutonVote";
import PastilleRubrique from "./PastilleRubrique";
import { IconBulle } from "./icones";

/**
 * Une annonce dans le fil.
 *
 * DEUX FORMES SELON QU'IL Y A UNE PHOTO. Avec : l'image d'abord, en
 * 4:3, la rubrique posée dessus, comme les cartes de l'annuaire. Sans :
 * la rubrique en tête et deux ou trois lignes du texte. C'est cet
 * extrait qui empêche une carte sans image d'avoir l'air vide, et qui
 * donne aux « Idées » et aux « Discussions » (rarement illustrées) de
 * quoi se lire d'un coup d'œil.
 *
 * TOUTE LA CARTE EST UN LIEN, SAUF LE VOTE. Le lien est posé en calque
 * sous le contenu (`data-calque`, comme les lignes de l'annuaire) et le
 * pied passe au-dessus : voter ne doit pas ouvrir l'annonce.
 *
 * `apercu` : la carte telle qu'elle apparaîtra, dans le formulaire de
 * publication. Ni lien ni vote actif.
 */
export default function CarteAnnonce({
  annonce: a,
  moiId = null,
  apercu = false,
}: {
  annonce: Annonce;
  moiId?: string | null;
  apercu?: boolean;
}) {
  const photo = a.images[0];
  const remuneration = a.details.remuneration;
  const payee = remuneration && remuneration !== "benevole" ? libelleRemuneration(remuneration) : null;

  return (
    <article className="card-light flex flex-col">
      {!apercu && (
        <Link
          href={lienAnnonce(a)}
          data-calque
          aria-label={a.titre}
          className="absolute inset-0 z-[3] rounded-[inherit]"
        />
      )}

      {photo && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[rgba(123,82,232,0.12)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <PastilleRubrique cle={a.rubrique} habit="photo" className="absolute left-3 top-3" />
          {a.cloturee && <Cloturee className="absolute right-3 top-3" />}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4 sm:p-[18px]">
        {!photo && (
          <div className="mb-3 flex items-center gap-2">
            <PastilleRubrique cle={a.rubrique} habit="carte" />
            {a.cloturee && <Cloturee />}
          </div>
        )}

        <h3 className="m-0 text-[16px] font-extrabold leading-snug tracking-[-0.02em] text-[var(--color-ink)] [overflow-wrap:anywhere] sm:text-[16.5px]">
          {a.titre || "Votre titre apparaîtra ici"}
        </h3>

        {!photo && a.texte && (
          <p className="m-0 mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-[#4a3a78] [overflow-wrap:anywhere]">
            {a.texte}
          </p>
        )}

        <p className="m-0 mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-[#6a5a92]">
          <span className="font-extrabold text-[var(--color-ink)]">{signature(a)}</span>
          {a.marque && <BadgeMarque />}
          {a.ville && <span>· {a.ville}</span>}
          <span suppressHydrationWarning>· {ilYA(a.created_at)}</span>
        </p>

        {/* Au-dessus du calque : le vote reste un bouton. */}
        <div className="pointer-events-none relative z-[4] mt-3.5 flex items-center gap-3">
          <span className="pointer-events-auto">
            <BoutonVote
              cible="annonce"
              id={a.id}
              votes={a.votes}
              aVote={a.aVote}
              estAuteur={Boolean(moiId) && moiId === a.auteur.id}
              apercu={apercu}
            />
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold tabular-nums text-[#6a5a92]">
            <IconBulle />
            {a.commentaires}
            <span className="sr-only"> réponse{a.commentaires > 1 ? "s" : ""}</span>
          </span>
          {payee && (
            <span className="ml-auto rounded-full bg-[#dff5e8] px-2.5 py-1 text-[10.5px] font-extrabold text-[#1f7a45]">
              {payee}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** « MARQUE » : l'annonce est publiée au nom d'une marque gérée sur le site. */
export function BadgeMarque({ sombre = false }: { sombre?: boolean }) {
  return (
    <span
      className={`rounded-[5px] px-1.5 py-[3px] text-[8.5px] font-black uppercase leading-none tracking-[0.12em] ${
        sombre ? "bg-white text-[var(--color-ink)]" : "bg-[var(--color-ink)] text-white"
      }`}
    >
      Marque
    </span>
  );
}

function Cloturee({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-full bg-[var(--color-ink)] px-2.5 py-[5px] text-[10px] font-black uppercase leading-none tracking-[0.1em] text-white ${className}`}
    >
      Clôturée
    </span>
  );
}
