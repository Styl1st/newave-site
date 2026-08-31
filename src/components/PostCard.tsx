import Link from "next/link";
import { contientUneVideo, premiereImage } from "@/lib/medias";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import type { Post } from "@/lib/types";

/**
 * Un post en carte 4/5, pour les endroits où l'on n'en montre que
 * trois : l'accueil, une colonne de côté.
 *
 * LE FIL DE `/posts` NE S'EN SERT PLUS — voir `LignePost`. Un post est
 * d'abord du texte, et une carte étroite en donne trois mots ; c'est
 * l'aveu de la mosaïque qu'on remplace. La carte garde en revanche tout
 * son sens là où il n'y a que trois entrées à poser côte à côte : la
 * photo fait alors le travail d'appel que le titre ne peut pas faire
 * dans si peu de place.
 *
 * Ce fichier tient aussi les trois façons de lire les MÉDIAS d'un post,
 * parce que la carte et la ligne du fil doivent répondre pareil à
 * « quelle image ? » et « est-ce une vidéo ? ». Deux réponses
 * différentes pour le même post, c'est la pastille « Vidéo » qui
 * apparaît sur l'accueil et disparaît sur `/posts`.
 */

/**
 * La première PHOTO, et non le premier média.
 *
 * Un post peut mêler photos et vidéos ; si la vidéo arrive en tête, la
 * carte afficherait une balise image pointant sur un fichier `.mp4`,
 * donc une vignette cassée. L'affiche de la vidéo ne sert donc qu'en
 * second, quand il n'y a aucune photo. Voir `premiereImage`.
 */
export function couverture(post: Post): string | null {
  return premiereImage(post.images) ?? post.video_poster ?? post.image_url;
}

/**
 * Ce post mène-t-il à une vidéo ?
 *
 * La case cochée dans l'administration reste la source principale, mais
 * un média qui EST un `.mp4` en est une aussi — ça, ce n'est pas une
 * déduction, c'est le fichier lui-même. On ne regarde toujours pas les
 * liens Instagram ou TikTok : les coller ici reviendrait à marquer
 * « Vidéo » tous les carrousels, qui ont eux aussi leur lien.
 */
export function porteUneVideo(post: Post): boolean {
  return (
    Boolean(post.est_video) || Boolean(post.video_url) || contientUneVideo(post.images)
  );
}

/**
 * La pastille posée en haut à droite du visuel : « Vidéo », ou « +3 ».
 *
 * Jamais les deux. Elles répondent à la même question — qu'y a-t-il de
 * plus derrière cette image ? — et deux pastilles côte à côte dans un
 * angle de vignette se lisent comme un badge de notification.
 *
 * Pour la vidéo, une pastille et non un grand bouton de lecture : rien
 * ne se lit ici, et promettre une lecture qui n'arrive pas est le plus
 * sûr moyen de décevoir.
 */
export function BadgeMedia({ post }: { post: Post }) {
  const video = porteUneVideo(post);
  const reste = Math.max((post.images?.length ?? 0) - 1, 0);
  if (!video && reste === 0) return null;

  return (
    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[0.08em] text-white backdrop-blur-sm">
      {video ? (
        <>
          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Vidéo
        </>
      ) : (
        `+${reste}`
      )}
    </span>
  );
}

export default function PostCard({
  post,
  accroche,
}: {
  post: Post;
  /**
   * Le chapô, DÉJÀ DÉBARRASSÉ de sa mise en forme.
   *
   * C'est l'appelant qui l'épluche, et non la carte : le texte riche se
   * lit avec `sansMarquage`, qui vit dans un module de rendu, et la
   * carte doit pouvoir être posée dans une page serveur sans traîner ce
   * module derrière elle.
   */
  accroche?: string;
}) {
  const cover = couverture(post);

  return (
    <Link href={`/posts/${post.slug}`} className="card-light group block overflow-hidden">
      <div className="relative z-3">
        {/* Format 4:5, celui d'Instagram : tes visuels tombent juste. */}
        <div className="relative aspect-4/5 w-full overflow-hidden bg-[#e6dcfb]">
          {cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vignette(cover, 480)}
                srcSet={jeuDeVignettes(cover, 480)}
                sizes="(max-width: 640px) 100vw, 360px"
                alt={post.image_alt || post.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <BadgeMedia post={post} />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a7bab]">
                Visuel à venir
              </span>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {post.brand && (
            <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92]">
              {post.brand.name}
            </p>
          )}
          <h3 className="m-0 mt-1.5 text-[15px] font-extrabold leading-snug tracking-[-0.02em] text-[var(--color-ink)]">
            {post.title}
          </h3>

          {accroche && (
            <p className="m-0 mt-2 line-clamp-2 text-[12.5px] font-medium leading-relaxed text-[#4a3a78]">
              {accroche}
            </p>
          )}

          {post.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-[rgba(23,10,51,0.07)] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#4a3a78]"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
