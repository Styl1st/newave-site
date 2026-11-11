import Link from "next/link";
import LienPatient from "./LienPatient";
import { couverture } from "./PostCard";
import Halo from "./Halo";
import RoueDesMarques, { type FicheDeRoue } from "./RoueDesMarques";
import { vignette } from "@/lib/vignette";
import type { Brand, Post } from "@/lib/types";

/**
 * La colonne de droite de l'accueil : un panneau, pas quatre boîtes.
 *
 * ELLE NE RÉPÈTE PAS LA COLONNE PRINCIPALE, ELLE L'ALLONGE. Le corps de
 * page montre UNE marque, TROIS pièces et TROIS posts, en grand ; la
 * colonne dit qu'il y en a d'autres, en petit, et donne le geste pour y
 * aller. C'est la raison d'être d'un rail : élargir sans rallonger.
 *
 * PLUS DE CADRES. Les quatre blocs étaient chacun dans leur panneau de
 * verre, et la colonne avait l'air d'une pile de boîtes posée à côté de
 * la page. Ils sont maintenant posés à même le fond, reliés par un fil
 * lumineux qui descend le long de la colonne, avec un point par
 * partie. C'est ce fil qui dit « ces quatre choses vont ensemble », et
 * c'était le seul travail que faisaient les cadres.
 *
 *   — « Aussi à la une » : des bulles, comme les stories d'Instagram, où
 *     vit la communauté de NEWAVE. Le geste est connu de tout le monde.
 *   — « Au hasard » : une roue de noms (voir `RoueDesMarques`).
 *   — « Derniers posts » : des lignes nues, éclairées par un halo qui
 *     suit la souris (voir `Halo`).
 *   — L'appel aux marques : sans carte, sur une lueur aux couleurs de
 *     l'ambiance.
 *
 * Sous 1024 pixels, la grille de la page range ce panneau SOUS le
 * contenu principal ; les bulles y défilent alors à l'horizontale.
 */
export default function ColonneAccueil({
  marques,
  tirage,
  posts,
}: {
  /** Les autres marques à la une. Vide = la partie disparaît. */
  marques: Brand[];
  /** Toutes les marques publiées, pour la roue du hasard. */
  tirage: FicheDeRoue[];
  /** Les derniers posts, déjà coupés à la bonne longueur. */
  posts: Post[];
}) {
  return (
    <aside className="panneau-accueil">
      <Halo />
      <span className="panneau-fil" aria-hidden="true" />

      {marques.length > 0 && (
        <section className="panneau-partie">
          <span className="panneau-noeud" aria-hidden="true" />
          <div className="panneau-tete">
            <h2 className="panneau-titre">Aussi à la une</h2>
          </div>

          <div className="bulles">
            {marques.map((b) => {
              const visuel = b.logo_url ?? b.cover_url;
              return (
                <LienPatient key={b.id} href={`/marques/${b.slug}`} className="bulle">
                  <span className="bulle-anneau">
                    <span className={`bulle-rond ${b.logo_url ? "" : "bulle-photo"}`}>
                      {visuel ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={vignette(visuel, 160, { logo: Boolean(b.logo_url) })}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="bulle-initiale">{b.name.trim().charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                  </span>
                  <span className="bulle-nom">{b.name}</span>
                </LienPatient>
              );
            })}

            <Link href="/marques" className="bulle bulle-annuaire">
              <span className="bulle-anneau">
                <span className="bulle-rond">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </span>
              <span className="bulle-nom">L&apos;annuaire</span>
            </Link>
          </div>
        </section>
      )}

      <section className="panneau-partie">
        <span className="panneau-noeud" aria-hidden="true" />
        <div className="panneau-tete">
          <h2 className="panneau-titre">Au hasard</h2>
        </div>
        <p className="panneau-texte">Une marque au hasard, sans filtre ni classement.</p>
        <RoueDesMarques marques={tirage} />
      </section>

      {posts.length > 0 && (
        <section className="panneau-partie">
          <span className="panneau-noeud" aria-hidden="true" />
          <div className="panneau-tete">
            <h2 className="panneau-titre">Derniers posts</h2>
            <Link href="/posts" className="panneau-lien">
              Tout voir
            </Link>
          </div>

          <div>
            {posts.map((p) => {
              /* La même lecture des médias que la carte et que la ligne
                 du fil : une seule réponse à « quelle image ? », sinon
                 le même post n'a pas la même vignette d'un endroit à
                 l'autre du site. Voir `PostCard`. */
              const cover = couverture(p);

              return (
                <LienPatient key={p.id} href={`/posts/${p.slug}`} className="post-halo" data-halo="">
                  <span className="post-halo-vignette">
                    {cover && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={vignette(cover, 160)} alt="" loading="lazy" />
                    )}
                  </span>
                  <span className="min-w-0">
                    {p.brand && <span className="post-halo-marque">{p.brand.name}</span>}
                    <span className="post-halo-titre">{p.title}</span>
                  </span>
                </LienPatient>
              );
            })}
          </div>
        </section>
      )}

      {/* Le seul endroit de la colonne qui DEMANDE quelque chose. Il
          n'a plus de carte pour se distinguer : c'est la lueur et la
          taille du titre qui le font. */}
      <section className="panneau-partie panneau-appel">
        <span className="panneau-noeud" aria-hidden="true" />
        <h2 className="panneau-appel-titre">Tu crées une marque ?</h2>
        <p className="panneau-appel-texte">On lit chaque dossier. C&apos;est gratuit, sans commission.</p>
        <Link href="/candidature" className="panneau-appel-lien">
          <span className="panneau-appel-mot">Proposer ma marque</span>
          <span className="panneau-appel-fleche" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </span>
        </Link>
      </section>
    </aside>
  );
}
