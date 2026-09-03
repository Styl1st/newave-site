import Link from "next/link";
import ColonneAccueil from "@/components/ColonneAccueil";
import Decouverte from "@/components/Decouverte";
import MarqueDeLaSemaine from "@/components/MarqueDeLaSemaine";
import PiecesAuHasard from "@/components/PiecesAuHasard";
import PostCard from "@/components/PostCard";
import RechercheAccueil from "@/components/RechercheAccueil";
import { enChiffres } from "@/components/chiffres";
import { IconChevron } from "@/components/Icons";
import { getBrands, getPosts, getVitrine } from "@/lib/queries";
import type { Brand } from "@/lib/types";
import { getMyFavorites } from "@/lib/favorites";
import { aUneIllustration } from "@/lib/medias";
import { repartirParMarque } from "@/lib/melange";
import { enSlugDeCategorie } from "@/lib/taxonomy";

/**
 * L'accueil : dire ce qu'est le site en trois secondes, puis ouvrir
 * trois portes — chercher, suivre la marque mise en avant, découvrir au
 * hasard.
 *
 * DEUX TEMPS, ET ILS N'ONT PAS LA MÊME FONCTION. Le manifeste occupe le
 * premier écran à lui seul : logo, phrase, champ de recherche, deux
 * boutons. Le corps qui suit est une page de magazine à deux colonnes,
 * où l'on entre volontairement, d'un coup de pouce.
 *
 * AUCUN COMPTEUR N'EST ÉCRIT EN DUR. Le gabarit en portait quatre
 * (136 marques, 1 284 pièces, 78 posts, 3 412 cœurs) : ce sont des
 * ordres de grandeur de maquette. Ceux qu'on peut compter honnêtement
 * ici — les marques, les posts — sont comptés ; le catalogue de pièces
 * ne descend pas jusqu'à cette page, donc son total n'est écrit nulle
 * part plutôt qu'approché.
 */

/** Le pas de rotation de la mise en avant, en millisecondes. */
const SEMAINE = 7 * 24 * 60 * 60 * 1000;

export default async function HomePage() {
  /*
   * `getPosts()` sans limite, et c'est délibéré.
   *
   * Le lien du bas dit « les N posts » : ce chiffre doit être le vrai,
   * or il n'existe pas d'autre façon de l'obtenir depuis cette page.
   * C'est exactement la requête que sert déjà `/posts`, sur un volume
   * qui se compte en dizaines. Le jour où il se comptera en milliers,
   * c'est un `count` qu'il faudra, pas trois posts de plus.
   *
   * `getVitrine(2)` plutôt que `getVitrine()` : deux pièces par marque
   * suffisent très largement pour en tirer trois au sort, et l'accueil
   * n'a aucune raison de descendre le millier de lignes que réclame la
   * page des pièces.
   */
  const [brands, posts, vitrine] = await Promise.all([
    getBrands(),
    getPosts(),
    getVitrine(2),
  ]);

  /*
   * LA MARQUE DE LA SEMAINE TOURNE TOUTE SEULE, ET ELLE TOURNE LE MÊME
   * JOUR POUR TOUT LE MONDE.
   *
   * Le rang se déduit du nombre de semaines écoulées depuis le premier
   * janvier 1970 — qui tombait un jeudi, d'où les quatre jours retirés
   * pour que le changement ait lieu le lundi. Deux conséquences qui
   * valent la ligne de calcul : la sélection ne bouge pas d'un rendu à
   * l'autre pendant sept jours, et personne n'a rien à administrer.
   *
   * À défaut de marques mises en avant, l'annuaire fait tourner les
   * siennes : une page d'accueil sans marque en tête n'aurait plus de
   * sujet.
   */
  const alaUne = brands.filter((b) => b.featured);
  const roue = alaUne.length > 0 ? alaUne : brands;
  const indice =
    roue.length > 0 ? Math.floor((Date.now() - 4 * 86400000) / SEMAINE) % roue.length : 0;
  const vedette = roue[indice];
  const suite = Array.from(
    { length: Math.min(3, Math.max(roue.length - 1, 0)) },
    (_, i) => roue[(indice + 1 + i) % roue.length]
  );

  /* Le cœur de la marque en avant, en une requête pour une seule
     marque : les autres cartes de la page n'en portent pas. */
  const favoris = await getMyFavorites(vedette ? [vedette.id] : []);

  /*
   * La réserve du tirage au sort, constituée ICI et non dans le
   * navigateur : le tirage doit être le même des deux côtés, sans quoi
   * les trois pièces changent sous les yeux au premier rendu. Voir
   * `PiecesAuHasard`.
   *
   * `repartirParMarque` alterne les marques : sans lui, celle qui a le
   * plus gros catalogue trusterait les trois cases.
   */
  const reserve = repartirParMarque(vitrine.filter(aUneIllustration)).slice(0, 18);
  const derniers = posts.slice(0, 3);

  /*
   * LES QUATRE CATÉGORIES LES PLUS FOURNIES, ET RIEN DE PLUS.
   *
   * Quatre parce qu'au-delà la ligne se replie en deux rangées sur un
   * téléphone et cesse d'être un raccourci pour devenir un menu. Les
   * plus fournies parce qu'un raccourci vers un rayon de trois marques
   * n'épargne à personne le détour par les filtres — celui-là se trouve
   * très bien dans le panneau de l'annuaire.
   *
   * Comptées à chaque rendu plutôt qu'inscrites quelque part : le
   * classement change tout seul quand l'annuaire s'étoffe, et personne
   * n'a à se souvenir de le remettre à jour.
   */
  const raccourcis = parCategorie(brands).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)]">
      {/* ---------- A · le manifeste ----------
          Il occupe le premier écran à lui seul. Ce qui vient ensuite se
          mérite d'un coup de pouce : c'est la différence entre une page
          d'accueil et une liste. */}
      <section className="premier-ecran relative flex flex-col items-center justify-center py-10 text-center sm:py-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-white.webp"
          alt="NEWAVE SPHERE"
          className="rise w-[min(70%,320px)] drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)]"
        />

        <p className="tagline rise rise-1 mt-6 text-[clamp(11px,2.9vw,13px)] leading-[1.9]">
          Média de marques
          <br />&<br />
          d&apos;artistes indépendants
        </p>

        <p className="rise rise-2 mt-7 max-w-[620px] text-[clamp(15px,4vw,18px)] leading-[1.6] text-white/92">
          On met en lumière celles et ceux qui créent en dehors des circuits classiques :
          marques naissantes, pièces uniques, démarches qui prennent le temps de bien faire.
          Un point de ralliement pour ceux qui cherchent autre chose.
        </p>

        {/* Le champ mène à une fiche ou à l'annuaire, jamais à une
            deuxième recherche maison. Voir `RechercheAccueil`. */}
        <div className="rise rise-3 mt-8 w-full max-w-[640px]">
          <RechercheAccueil />
        </div>

        {/* Ce qu'il y a à voir, et le geste pour le chercher. Aucun de
            ces deux nombres n'est écrit en dur : voir l'en-tête. */}
        <p className="rise rise-3 mt-3.5 text-[11.5px] font-semibold tracking-[0.02em] text-white/55">
          {brands.length > 0 && <>{enChiffres(brands.length)} marques</>}
          {brands.length > 0 && posts.length > 0 && " · "}
          {posts.length > 0 && <>{enChiffres(posts.length)} posts</>}
          <span className="hidden sm:inline"> · ⌘K pour chercher d&apos;où que tu sois</span>
        </p>

        {/*
         * LES PUCES DE RACCOURCI DU GABARIT, ENFIN TENABLES.
         *
         * Il en demandait quatre — « Streetwear 34 », « Denim 22 » — et
         * elles étaient restées de côté : aucune route n'acceptait
         * d'adresse filtrée, ces puces auraient donc toutes abouti au
         * même annuaire entier, c'est-à-dire à une promesse tenue nulle
         * part. `/marques?cat=` existe maintenant, et chacune mène
         * vraiment à son rayon.
         *
         * Elles ne remplacent pas le champ de recherche, elles le
         * complètent : chercher suppose de savoir quoi chercher, et ces
         * quatre mots-là sont justement pour qui n'en sait rien encore.
         */}
        {raccourcis.length > 0 && (
          <div className="rise rise-3 mt-4 flex flex-wrap items-center justify-center gap-2">
            {raccourcis.map(([nom, n]) => (
              <Link
                key={nom}
                href={`/marques?cat=${enSlugDeCategorie(nom)}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-[12px] font-extrabold text-white/88 transition hover:border-white/55 hover:bg-white/20 hover:text-white active:scale-[.97]"
              >
                {nom}
                <span className="opacity-55 tabular-nums">{enChiffres(n)}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="rise rise-4 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/marques" className="card-light px-6 py-3.5">
            <span className="relative z-3 text-[14px] font-extrabold tracking-[-0.01em]">
              {brands.length > 0
                ? `Explorer les ${enChiffres(brands.length)} marques`
                : "Explorer l'annuaire"}
            </span>
          </Link>
          <Link
            href="/posts"
            className="rounded-[var(--radius)] border border-white/40 bg-white/8 px-6 py-3.5 text-[14px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            Voir les posts
          </Link>
        </div>

        <a
          href="#la-suite"
          aria-label="Descendre vers la marque de la semaine"
          className="mt-10 inline-flex flex-col items-center gap-1 text-white/70 transition hover:text-white sm:mt-14"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.18em]">La suite</span>
          <IconChevron className="invite h-5 w-5" />
        </a>
      </section>

      {/* ---------- la transition ----------
          Le ruban de découverte tenait le milieu de l'ancienne page. Il
          garde sa place ici, entre le manifeste et le corps : c'est la
          première preuve par l'image qu'il y a des marques derrière la
          phrase, et c'est la troisième porte annoncée plus haut —
          découvrir sans rien chercher. Sur téléphone, une bande qui se
          fait glisser du doigt vaut mieux qu'une grille de plus. */}
      <div id="la-suite" className="scroll-mt-24">
        <Decouverte brands={brands} />
      </div>

      {/* ---------- B · le corps, à deux colonnes ----------
          Sous 1024 pixels la colonne de droite passe SOUS le contenu
          principal : c'est une colonne d'appoint, elle ne doit jamais
          rétrécir la lecture pour tenir à côté. */}
      <div className="grid grid-cols-1 items-start gap-7 pb-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-11 sm:gap-14">
          {vedette && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow m-0">L&apos;annuaire</p>
                  <h2 className="m-0 mt-2 text-[clamp(19px,4.4vw,26px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
                    La marque de la semaine
                  </h2>
                </div>
                <Link
                  href="/marques"
                  className="shrink-0 text-[13px] font-bold text-white/80 underline decoration-white/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                >
                  Toutes les marques
                </Link>
              </div>

              <MarqueDeLaSemaine
                brand={vedette}
                favori={{ initial: favoris.has(vedette.id) }}
              />
            </section>
          )}

          <PiecesAuHasard pieces={reserve} />

          {derniers.length > 0 && (
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow m-0">Les publications</p>
                  <h2 className="m-0 mt-2 text-[clamp(19px,4.4vw,26px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
                    Nos derniers posts
                  </h2>
                </div>
                <Link
                  href="/posts"
                  className="shrink-0 text-[13px] font-bold text-white/80 underline decoration-white/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                >
                  Les {enChiffres(posts.length)} posts
                </Link>
              </div>

              {/* Une seule colonne au téléphone : c'est la règle du
                  cahier des charges pour les posts, et c'est la même
                  que celle de la mosaïque de `/posts`. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {derniers.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}

          {/* ---------- le bandeau de sortie ----------
              La dernière chose de la colonne, et la seule qui ne montre
              rien : arrivé là, on n'a plus besoin d'être séduit, on a
              besoin d'une porte. */}
          <Link href="/marques" className="card-light block px-6 py-6 sm:px-8">
            <span className="relative z-3 flex items-center justify-between gap-5">
              <span className="min-w-0">
                <span className="block text-[clamp(16px,3.6vw,20px)] font-extrabold leading-tight tracking-[-0.02em] text-[var(--color-ink)]">
                  {brands.length > 0
                    ? `Explorer les ${enChiffres(brands.length)} marques de l'annuaire`
                    : "Explorer l'annuaire"}
                </span>
                <span className="mt-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92]">
                  Recherche, index A→Z, mode liste
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-[20px] font-black text-[#3a2470]">
                →
              </span>
            </span>
          </Link>
        </div>

        {/* La colonne reçoit les posts SUIVANTS, pas les mêmes que la
            colonne principale : un rail qui répète ce qu'on vient de
            lire n'ajoute rien et allonge la page pour rien. */}
        <ColonneAccueil
          marques={suite}
          slugs={brands.map((b) => b.slug)}
          posts={posts.slice(3, 6)}
        />
      </div>
    </div>
  );
}

/**
 * Les catégories de l'annuaire, de la plus fournie à la moins.
 *
 * On compte sur les fiches et non sur `taxonomy` : la liste de
 * référence contient des catégories que personne ne porte encore, et
 * une puce qui mène à un rayon vide est pire que pas de puce du tout.
 * À égalité, l'ordre alphabétique — pour que la ligne ne se réorganise
 * pas d'un rendu à l'autre sans raison visible.
 */
function parCategorie(brands: Brand[]): [string, number][] {
  const compte = new Map<string, number>();
  for (const b of brands) {
    for (const c of b.categories) compte.set(c, (compte.get(c) ?? 0) + 1);
  }
  return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

