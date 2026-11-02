import Link from "next/link";
import {
  ilYA,
  libelleRemuneration,
  lienAnnonce,
  lienAuteur,
  signature,
  type Annonce,
} from "@/lib/forum";
import BoutonVote from "./BoutonVote";
import PastilleRubrique from "./PastilleRubrique";
import { IconBulle } from "./icones";

/**
 * Une annonce dans le fil.
 *
 * POSÉE À MÊME LE FOND, COMME LES PIÈCES. Le fil était une mosaïque de
 * cartes blanches couvertes de pastilles (rubrique, vote, rémunération,
 * marque) : chaque annonce était une petite interface. Elle prend
 * maintenant le parti de la vitrine des pièces (`ProductCard`, variante
 * `nue`) : la photo en rayon 4 avec son ombre portée, et le texte
 * dessous, sur le fond, sans conteneur. Les pastilles sont devenues du
 * texte : la rubrique et la rémunération sur une petite ligne au-dessus
 * du titre, le vote en flèche et chiffre, les réponses à côté.
 *
 * SANS PHOTO, UN FILET MARQUE LE DÉBUT. Une annonce de texte seule
 * (« Idées », « Discussions ») n'a pas d'image pour dire où elle
 * commence : un trait fin au-dessus de sa rubrique s'en charge, et
 * l'extrait de deux ou trois lignes lui donne de quoi se lire d'un coup
 * d'œil.
 *
 * TOUTE L'ANNONCE EST UN LIEN, SAUF LE VOTE ET LE NOM DE L'AUTEUR. Le
 * lien est posé en calque sous le contenu (`data-calque`) et ces deux-là
 * passent au-dessus : voter ne doit pas ouvrir l'annonce.
 *
 * `apercu` : l'annonce telle qu'elle apparaîtra, dans le formulaire de
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
  const versAuteur = apercu ? null : lienAuteur(a);

  return (
    <article className="group relative flex flex-col">
      {!apercu && (
        <Link
          href={lienAnnonce(a)}
          data-calque
          aria-label={a.titre}
          className="absolute inset-0 z-[3]"
        />
      )}

      {photo && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[4px] bg-white/8 shadow-[0_18px_40px_-22px_rgba(20,6,50,0.9)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          {/* « Clôturée » reste sur la photo, comme « Épuisé » sur une
              pièce : c'est un état qu'on doit lire avant tout le reste. */}
          {a.cloturee && <Cloturee className="absolute left-2.5 top-2.5" />}
        </div>
      )}

      <div className={photo ? "mt-3" : "border-t border-white/20 pt-3.5"}>
        {/* La rubrique et ce qui la précise, en une ligne de texte. */}
        <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/65">
          <PastilleRubrique cle={a.rubrique} habit="texte" />
          {payee && <span>· {payee}</span>}
          {!photo && a.cloturee && <span>· Clôturée</span>}
        </p>

        <h3 className="m-0 mt-1.5 text-[15.5px] font-bold leading-snug tracking-[-0.01em] text-white [overflow-wrap:anywhere] sm:text-[16px]">
          {a.titre || "Votre titre apparaîtra ici"}
        </h3>

        {!photo && a.texte && (
          <p className="m-0 mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-white/72 [overflow-wrap:anywhere]">
            {a.texte}
          </p>
        )}

        <p className="m-0 mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold text-white/55">
          {/* Au-dessus du calque, comme le vote : le nom mène à l'auteur. */}
          {versAuteur ? (
            <Link
              href={versAuteur}
              className="relative z-[4] font-bold text-white/85 underline-offset-4 transition hover:text-white hover:underline"
            >
              {signature(a)}
            </Link>
          ) : (
            <span className="font-bold text-white/85">{signature(a)}</span>
          )}
          {a.marque && <BadgeMarque sombre />}
          {a.ville && <span>· {a.ville}</span>}
          <span suppressHydrationWarning>· {ilYA(a.created_at)}</span>
        </p>

        {/* Au-dessus du calque : le vote reste un bouton. */}
        <div className="pointer-events-none relative z-[4] mt-1.5 flex items-center gap-3">
          <span className="pointer-events-auto">
            <BoutonVote
              cible="annonce"
              id={a.id}
              votes={a.votes}
              aVote={a.aVote}
              estAuteur={Boolean(moiId) && moiId === a.auteur.id}
              habit="trait"
              apercu={apercu}
            />
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold tabular-nums text-white/60">
            <IconBulle />
            {a.commentaires}
            <span className="sr-only"> réponse{a.commentaires > 1 ? "s" : ""}</span>
          </span>
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
