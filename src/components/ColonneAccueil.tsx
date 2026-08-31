import Link from "next/link";
import { couverture } from "./PostCard";
import TirerUneMarque from "./TirerUneMarque";
import { vignette } from "@/lib/vignette";
import type { Brand, Post } from "@/lib/types";

/**
 * La colonne de droite de l'accueil : quatre petits blocs.
 *
 * ELLE NE RÉPÈTE PAS LA COLONNE PRINCIPALE, ELLE L'ALLONGE. Le corps de
 * page montre UNE marque, TROIS pièces et TROIS posts, en grand ; la
 * colonne dit qu'il y en a d'autres, en petit, et donne le geste pour y
 * aller. C'est la raison d'être d'un rail : élargir sans rallonger.
 *
 * Elle reste un composant serveur — rien ici n'a d'état, sauf le
 * bouton de tirage, qui a son propre fichier.
 *
 * Sous 1024 pixels, la grille de la page la range SOUS le contenu
 * principal plutôt qu'à côté : trois cent trente pixels de large sur un
 * téléphone, cela n'existe pas.
 */
export default function ColonneAccueil({
  marques,
  slugs,
  posts,
}: {
  /** Les autres marques à la une. Vide = le bloc disparaît. */
  marques: Brand[];
  /** Toutes les marques publiées, pour le tirage au sort. */
  slugs: string[];
  /** Les derniers posts, déjà coupés à la bonne longueur. */
  posts: Post[];
}) {
  return (
    <aside className="flex flex-col gap-4">
      {marques.length > 0 && (
        <section className="glass p-4">
          <p className="eyebrow m-0 mb-3">Aussi à la une</p>
          <div className="flex flex-col gap-1">
            {marques.map((b) => {
              const visuel = b.logo_url ?? b.cover_url;
              const origine =
                [b.city, b.country].filter(Boolean).join(" · ") || b.categories[0] || "";

              return (
                <Link
                  key={b.id}
                  href={`/marques/${b.slug}`}
                  className="flex items-center gap-3 rounded-[14px] p-2 transition hover:bg-white/10"
                >
                  <span className="grid h-[46px] w-[46px] shrink-0 place-items-center overflow-hidden rounded-[12px] bg-white/10">
                    {visuel ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={vignette(visuel, 160, { logo: Boolean(b.logo_url) })}
                        alt=""
                        loading="lazy"
                        className={
                          b.logo_url
                            ? "h-full w-full object-contain p-1"
                            : "h-full w-full object-cover"
                        }
                      />
                    ) : (
                      <span className="text-[13px] font-black text-white/60">
                        {b.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-extrabold text-white">
                      {b.name}
                    </span>
                    {origine && (
                      <span className="mt-0.5 block truncate text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/55">
                        {origine}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="glass p-4">
        <p className="eyebrow m-0 mb-2">Au hasard</p>
        <p className="m-0 mb-3 text-[13px] leading-[1.55] text-white/78">
          Une marque au hasard, sans filtre ni classement. C&apos;est la seule porte du
          site où personne n&apos;est favorisé.
        </p>
        <TirerUneMarque slugs={slugs} />
      </section>

      {posts.length > 0 && (
        <section className="glass p-4">
          <p className="eyebrow m-0 mb-3">Derniers posts</p>
          <div className="flex flex-col gap-1">
            {posts.map((p) => {
              /* La même lecture des médias que la carte et que la ligne
                 du fil : une seule réponse à « quelle image ? », sinon
                 le même post n'a pas la même vignette d'un endroit à
                 l'autre du site. Voir `PostCard`. */
              const cover = couverture(p);

              return (
                <Link
                  key={p.id}
                  href={`/posts/${p.slug}`}
                  className="flex items-center gap-3 rounded-[14px] p-2 transition hover:bg-white/10"
                >
                  <span className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[12px] bg-white/10">
                    {cover && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={vignette(cover, 160)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    {p.brand && (
                      <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
                        {p.brand.name}
                      </span>
                    )}
                    <span className="mt-0.5 line-clamp-2 block text-[13px] font-extrabold leading-snug text-white">
                      {p.title}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Le seul bloc en carte claire de la colonne : c'est le seul qui
          demande quelque chose, et il doit se distinguer des trois qui
          proposent. */}
      <section className="card-light p-5">
        <div className="relative z-3">
          <h2 className="m-0 text-[17px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
            Tu crées une marque ?
          </h2>
          <p className="m-0 mt-2 text-[13px] leading-[1.6] text-[#4a3d6e]">
            On lit chaque dossier. Si ton travail a du sens, on lui donne une place,
            gratuitement, sans commission à l&apos;entrée.
          </p>
          <Link
            href="/candidature"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[var(--color-ink)] px-5 text-[12.5px] font-extrabold text-white transition hover:opacity-90 active:scale-[.97]"
          >
            Proposer ma marque
          </Link>
        </div>
      </section>
    </aside>
  );
}
