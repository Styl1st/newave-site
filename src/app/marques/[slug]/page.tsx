import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogueNotice from "@/components/CatalogueNotice";
import FavoriteButton from "@/components/FavoriteButton";
import SectionAvis from "@/components/SectionAvis";
import BoutonSignaler from "@/components/BoutonSignaler";
import TexteRiche from "@/components/TexteRiche";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import PostCard from "@/components/PostCard";
import RayonsPieces from "@/components/RayonsPieces";
import { getBrand, getBrandBrouillon, getPostsByBrand, getProductsByBrand } from "@/lib/queries";
import { isFavorite } from "@/lib/favorites";
import { getCatalogueInsight } from "@/lib/brand-space";
import { getLikeCounts, getMyLikes } from "@/lib/likes";
import { getNotesPieces } from "@/lib/avis";
import { mesSignalements } from "@/lib/moderation";
import { getProfile } from "@/lib/auth";
import { PRICE_TIER_LABEL } from "@/lib/types";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import BarreGerant from "@/components/BarreGerant";

type Props = { params: Promise<{ slug: string }> };

/**
 * Page rendue a la demande, pas figee a la compilation.
 * Elle affiche l'etat "en favori" de la personne connectee, donc elle
 * depend de la session : la pre-generer n'aurait aucun sens, et les
 * marques ajoutees depuis /admin apparaissent immediatement.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return { title: "Marque introuvable" };
  return {
    title: brand.name,
    description: brand.tagline,
    openGraph: { title: brand.name, description: brand.tagline },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;

  // Publiée pour tout le monde, sinon en brouillon pour qui en a le
  // droit — ce sont les règles RLS qui décident, pas ce fichier.
  const brand = (await getBrand(slug)) ?? (await getBrandBrouillon(slug));
  if (!brand) notFound();

  const enApercu = brand.status !== "published";

  const [products, posts, favorited, insight] = await Promise.all([
    getProductsByBrand(brand.id),
    getPostsByBrand(brand.id),
    isFavorite(brand.id),
    getCatalogueInsight(brand.id),
  ]);

  const ids = products.map((p) => p.id);
  const profil = await getProfile();
  // Déjà signalée par cette personne ? Le bouton doit le dire, plutôt
  // que de proposer de recommencer pour se faire refuser par la base.
  const dejaSignalee = profil
    ? (await mesSignalements("marque", [brand.id])).length > 0
    : false;

  const [likeCounts, myLikes, notesPieces] = await Promise.all([
    getLikeCounts(ids),
    getMyLikes(ids),
    getNotesPieces(ids),
  ]);

  const facts: [string, string | null][] = [
    ["Origine", [brand.city, brand.country].filter(Boolean).join(", ") || null],
    ["Fondée en", brand.founded_year ? String(brand.founded_year) : null],
    ["Gamme de prix", PRICE_TIER_LABEL[brand.price_tier]],
    ["Instagram", brand.instagram ? `@${brand.instagram}` : null],
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-7 sm:py-11">
      {enApercu && (
        <div className="glass mb-6 p-4 sm:px-5">
          <p className="m-0 text-[13.5px] leading-relaxed text-white/88">
            <strong className="font-extrabold text-white">Aperçu.</strong> Voici ce que
            verra la communauté. Cette page n&apos;est pas encore publique. Personne
            d&apos;autre que toi ne peut y accéder.
          </p>
        </div>
      )}

      <BackLink href="/marques">Toutes les marques</BackLink>

      {/*
        La page publique est le poste de commande.

        Un gérant ne quitte pas sa page pour la modifier : il voit ce
        que voient les autres, et il agit depuis là. La barre est
        exactement la même sur ses écrans de gestion, pour que passer
        de l'un à l'autre ne ressemble jamais à un changement de site.
      */}
      {insight && (
        <div className="mt-4">
          <BarreGerant brand={brand} />
        </div>
      )}

      <header className="rise mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[clamp(24px,5.6vw,39px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            {brand.name}
          </h1>
          {brand.featured && <span className="badge">À la une</span>}
        </div>
        <p className="m-0 mt-3 max-w-2xl text-[clamp(15px,4vw,19px)] leading-relaxed text-white/88">
          {brand.tagline}
        </p>
        <div className="mt-5">
          <FavoriteButton brandId={brand.id} initial={favorited} />
        </div>
      </header>

      {brand.cover_url && (
        /*
         * L'illustration mène à la boutique.
         *
         * C'est le premier élément qu'on regarde, et le seul sur lequel
         * on tapait sans que rien n'arrive. Or l'intention de quelqu'un
         * qui touche la photo d'une marque est claire : il veut voir
         * chez elle. Autant le lui donner là plutôt que de le faire
         * descendre jusqu'au bouton.
         *
         * Le clic passe par /api/go, comme tous les liens sortants :
         * l'adresse de destination est lue en base et jamais dans
         * l'URL, et le départ est compté comme les autres.
         */
        <a
          href={`/api/go/marque/${brand.id}`}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`Voir la boutique ${brand.name}`}
          className="card-light group rise rise-1 mt-8 block overflow-hidden"
        >
          <div className="relative z-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vignette(brand.cover_url, 1200)}
              srcSet={jeuDeVignettes(brand.cover_url, 1200)}
              sizes="(max-width: 1024px) 100vw, 900px"
              alt=""
              className="block aspect-16/9 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />

            {/* Discret, et seulement au survol sur ordinateur : la
                photo doit rester une photo. Sur téléphone il est
                toujours visible, faute de survol pour le révéler. */}
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(14,5,38,0.72)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] transition sm:opacity-0 sm:group-hover:opacity-100">
              Voir la boutique
              <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </span>
          </div>
        </a>
      )}

      <div className="glass rise rise-1 mt-6 p-4 sm:p-7">
        {/* Une description peut manquer : une marque tout juste importée
            n'en a pas encore, et son site n'en donnait peut-être aucune.
            Mieux vaut passer directement aux faits que réserver une
            place blanche à un texte absent. */}
        {brand.description.trim() && (
          <p className="m-0 text-[15.5px] leading-[1.7] text-white/92">
            <TexteRiche texte={brand.description} />
          </p>
        )}

        <dl
          className={`grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 ${
            brand.description.trim() ? "mt-7 border-t border-white/15 pt-6" : ""
          }`}
        >
          {facts.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="eyebrow m-0">{label}</dt>
                <dd className="m-0 mt-1.5 text-[14px] font-bold text-white">{value}</dd>
              </div>
            ) : null
          )}
        </dl>

        <div className="mt-7 flex flex-wrap gap-1.5">
          {brand.categories.map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {insight && (
        <CatalogueNotice
          slug={brand.slug}
          brandName={brand.name}
          brandPublished={brand.status === "published"}
          insight={insight}
        />
      )}

      {/* Aucune pièce : on l'explique, au lieu de laisser un trou.
          Une fiche sans catalogue ne veut pas dire que la marque n'a
          rien à vendre — le plus souvent, sa boutique n'expose pas de
          liste que l'on puisse lire automatiquement. Sans un mot, le
          visiteur en conclut que la marque est vide et s'en va, ce qui
          est faux et injuste pour elle. */}
      {products.length === 0 && (
        <section className="glass rise rise-2 mt-8 p-5 sm:mt-11 sm:p-7">
          <p className="eyebrow m-0">Le catalogue</p>
          {/* Deux causes, deux messages. Une boutique fermée pour un
              drop n'a rien à se reprocher, et le dire ainsi donne même
              envie de revenir — alors qu'un « on n'a pas su lire »
              laisserait croire que la marque est mal fichue. */}
          <h2 className="m-0 mt-2 text-[clamp(16px,3.6vw,20px)] font-extrabold tracking-[-0.02em] text-white">
            {brand.catalogue_verrouille
              ? "La boutique prépare quelque chose"
              : "Les pièces ne sont pas encore listées ici"}
          </h2>
          <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
            {brand.catalogue_verrouille ? (
              <>
                {brand.name} a fermé sa boutique le temps d&apos;un drop : elle est
                protégée par un mot de passe et ses pièces ne sont pas visibles pour
                l&apos;instant. Elles réapparaîtront ici toutes seules à la réouverture —
                en attendant, le bouton ci-dessous mène à leur site.
              </>
            ) : (
              <>
                Notre lecture automatique n&apos;a pas réussi à récupérer le catalogue de{" "}
                {brand.name} — certaines boutiques ne l&apos;exposent tout simplement pas.
                Ça ne veut pas dire qu&apos;il n&apos;y a rien : tout se trouve sur leur
                site, par le bouton juste en dessous.
              </>
            )}
          </p>
        </section>
      )}

      {/* ---------- les pieces, juste apres la presentation ----------
          C'est ce que le visiteur est venu voir. La sortie vers la
          boutique arrive apres, une fois qu'il a vu de quoi il s'agit. */}
      {products.length > 0 && (
        <section className="rise rise-2 mt-8 sm:mt-11">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow m-0">Le catalogue</p>
              <h2 className="m-0 mt-2 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
                Les pièces
              </h2>
            </div>
          </div>

          {/* Le filtre par rayon vit dans un composant client : c'est
              lui qui garde le rayon choisi pendant qu'on parcourt, sans
              recharger la page ni perdre sa place. */}
          <RayonsPieces
            produits={products}
            brandSlug={brand.slug}
            canManage={Boolean(insight)}
            notes={Object.fromEntries(notesPieces)}
            likes={Object.fromEntries(
              products.map((p) => [
                p.id,
                { count: likeCounts.get(p.id) ?? 0, liked: myLikes.has(p.id) },
              ])
            )}
          />

          <p className="m-0 mt-5 text-[12.5px] leading-relaxed text-white/55">
            L&apos;achat se fait directement chez {brand.name}. NEWAVE SPHERE ne vend rien.
          </p>
        </section>
      )}

      {(brand.shop_url || brand.website_url) && (
        <a
          href={`/api/go/marque/${brand.id}`}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          data-reveal
          className="card-light mt-8 flex items-center justify-between gap-4 px-6 py-5"
        >
          <span className="relative z-3">
            <span className="block text-[15px] font-extrabold tracking-[-0.01em]">
              {products.length > 0
                ? `Voir toute la boutique ${brand.name}`
                : `Découvrir la boutique ${brand.name}`}
            </span>
            <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
              Tu quittes NEWAVE SPHERE
            </span>
          </span>
          <span className="relative z-3 text-[20px] font-black text-[#3a2470]">→</span>
        </a>
      )}

      {/* ---------- revendication ----------
          Visible seulement pour qui ne gère pas déjà la marque : le
          fondateur qui découvre sa page doit pouvoir la réclamer sans
          chercher notre adresse email. */}
      {!insight && (
        <section className="glass mt-10 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
          <p className="m-0 max-w-xl text-[13.5px] leading-relaxed text-white/72">
            Tu es à la tête de {brand.name} ? Reprends la main sur cette page :
            présentation, visuels, catalogue.
          </p>
          <Link
            href={`/marques/${brand.slug}/revendiquer`}
            className="shrink-0 rounded-full border border-white/40 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
          >
            C&apos;est ma marque
          </Link>
        </section>
      )}

      <SectionAvis
        cible="marque"
        cibleId={brand.id}
        nom={brand.name}
        chemin={`/marques/${brand.slug}`}
      />

      {/* Discret, et tout en bas : un lien de signalement bien visible
          sous chaque fiche transformerait l'annuaire en tribunal, et
          donnerait l'idée à des gens qui n'y pensaient pas. Il faut
          qu'il soit trouvable, pas qu'il saute aux yeux. */}
      <div className="mt-9 border-t border-white/10 pt-5">
        <BoutonSignaler
          cible="marque"
          cibleId={brand.id}
          chemin={`/marques/${brand.slug}`}
          connecte={Boolean(profil)}
          dejaFait={dejaSignalee}
        />
      </div>

      {/* ---------- posts lies ---------- */}
      {posts.length > 0 && (
        <section className="mt-9 sm:mt-12">
          <h2 className="m-0 mb-5 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
            Nos posts sur {brand.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
