import Link from "next/link";
import { BadgeMedia, couverture } from "./PostCard";
import { IconArrow } from "./Icons";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import type { Post } from "@/lib/types";

/**
 * Un post sur une ligne : la vignette à gauche, tout le texte à droite.
 *
 * POURQUOI CETTE FORME REMPLACE LA MOSAÏQUE. Un post se lit, il ne se
 * fouille pas. La mosaïque en colonnes donnait à chaque post une
 * colonne de trois cents pixels : le titre y passait sur trois lignes,
 * le chapô était coupé au deuxième mot utile, et il fallait cliquer
 * pour savoir de quoi ça parlait. La ligne rend au titre sa largeur et
 * au chapô ses deux phrases — c'est-à-dire de quoi décider si on ouvre.
 *
 * On y perd la hauteur libre des images, qui faisait le charme du mur.
 * C'est assumé : le mur était joli en haut de page et illisible au
 * bout de vingt entrées.
 */

const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/**
 * La date d'un post, écrite en clair — et surtout SANS « il y a deux
 * jours ».
 *
 * Le gabarit demande une date relative, et c'est plus vivant. Mais un
 * écart relatif se calcule à l'instant du rendu : le serveur écrit
 * « il y a 2 jours », le navigateur rejoue le même calcul quelques
 * secondes plus tard, et si l'on a franchi minuit entre les deux, React
 * trouve deux textes différents et signale une erreur d'hydratation sur
 * une page entière — pour un mot. La date absolue, elle, dit la même
 * chose des deux côtés.
 *
 * Les lectures se font en UTC pour la même raison : les posts portent
 * souvent une date sans heure (`2026-07-28`), que le navigateur place à
 * minuit UTC. Lue à l'heure locale d'un fuseau en retard, elle
 * reculerait d'un jour.
 */
export function dateCourte(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function LignePost({
  post,
  accroche,
}: {
  post: Post;
  /** Le chapô déjà déblayé de sa mise en forme. Voir `PostCard`. */
  accroche?: string;
}) {
  const cover = couverture(post);
  const date = dateCourte(post.published_at);
  const meta = [post.brand?.name, date].filter(Boolean).join(" · ");

  /* Les blocs laissent passer le clic vers le lien étalé sous la ligne ;
     seul le renvoi vers la marque le reprend. Même procédé que
     `LigneMarque`. */
  const bloc = "pointer-events-none relative z-3";

  return (
    /* La colonne du premier palier est écrite et non implicite : une
       colonne implicite se dimensionne en `auto`, donc à la largeur de
       son contenu le plus large, et un mot-clé un peu long suffirait à
       pousser la carte hors de l'écran. Voir `CompteEcran`. */
    <article className="card-light group relative grid grid-cols-[minmax(0,1fr)] gap-3.5 p-3.5 sm:gap-4 sm:p-4 md:grid-cols-[240px_minmax(0,1fr)] md:items-center md:gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-[26px] lg:p-[18px]">
      {/*
       * Le lien passe DERRIÈRE la ligne, en calque : « Voir la marque »
       * est un lien lui aussi, et un <a> ne peut pas en contenir un
       * autre. Le calque doit rester un enfant direct de la carte,
       * sinon `.card-light:has(> a[data-calque]:hover)` ne s'allume plus.
       */}
      <Link
        href={`/posts/${post.slug}`}
        aria-label={post.title}
        data-calque=""
        className="absolute inset-0 z-2"
      />

      {/* La vignette. Elle passe en bandeau au-dessus du texte sous
          768px : une colonne de 280px et un paragraphe côte à côte sur
          un téléphone ne laissent au titre que cinq caractères. */}
      <div
        className={`${bloc} aspect-[16/10] overflow-hidden rounded-[14px] bg-[rgba(23,10,51,0.06)] md:aspect-[4/3]`}
      >
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vignette(cover, 360)}
              srcSet={jeuDeVignettes(cover, 360)}
              sizes="(max-width: 767px) 100vw, 280px"
              alt={post.image_alt || post.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            <BadgeMedia post={post} />
          </>
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8a7bab]">
              Visuel à venir
            </span>
          </div>
        )}
      </div>

      <div className={`${bloc} flex min-w-0 flex-col`}>
        {meta && (
          <p className="m-0 truncate text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
            {meta}
          </p>
        )}

        <h3 className="m-0 mt-1.5 text-[17px] font-extrabold leading-tight tracking-[-0.025em] text-[var(--color-ink)] sm:text-[19px] lg:text-[21px]">
          {post.title}
        </h3>

        {accroche && (
          <p className="m-0 mt-2 line-clamp-3 text-[13.5px] font-medium leading-relaxed text-[#4a3a78] sm:text-[14px] md:line-clamp-2 lg:line-clamp-3">
            {accroche}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {post.keywords.slice(0, 3).map((k) => (
            <span
              key={k}
              className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#4a3a78]"
            >
              {k}
            </span>
          ))}

          {/*
           * Le renvoi vers la marque est le seul endroit de la ligne où
           * l'on va ailleurs que dans le post. Sans marque rattachée, on
           * n'affiche rien plutôt qu'un lien mort : la ligne entière mène
           * déjà au post, et le répéter en petit ne l'ouvre pas mieux.
           */}
          {post.brand && (
            <Link
              href={`/marques/${post.brand.slug}`}
              className="pointer-events-auto ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.07)] active:scale-95"
            >
              <span className="hidden sm:inline">Voir la marque</span>
              <span className="sm:hidden">La marque</span>
              <IconArrow className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
