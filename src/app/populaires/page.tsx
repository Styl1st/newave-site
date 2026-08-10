import type { Metadata } from "next";
import Link from "next/link";
import BrandCard from "@/components/BrandCard";
import Grille from "@/components/Grille";
import ProductCard from "@/components/ProductCard";
import Rang from "@/components/Rang";
import SelecteurClassement from "@/components/SelecteurClassement";
import { enEtoiles } from "@/components/Etoiles";
import { getMostLiked, getMyLikes } from "@/lib/likes";
import { getMostFavorited } from "@/lib/favorites";
import { avisMinimum, getMieuxNoteesMarques, getMieuxNoteesPieces } from "@/lib/avis";

export const metadata: Metadata = {
  title: "Coups de cœur",
  description:
    "Les pièces les plus aimées et les marques les plus suivies par la communauté NEWAVE SPHERE.",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ vue?: string }> };

/*
 * Trois gestes, trois classements, et surtout : jamais mélangés.
 *
 *   Le coup de cœur part en un clic et n'engage à rien. Il dit ce qui
 *   plaît, pas ce qui est bon.
 *   Le favori est un signet posé sur une marque qu'on veut suivre.
 *   L'avis, lui, est une note argumentée. C'est le seul des trois qui
 *   prétend juger.
 *
 * Les additionner donnerait un chiffre qui ne voudrait plus rien dire.
 */
const ONGLETS = [
  { id: "semaine", court: "Du moment", label: "Coups de cœur du moment" },
  { id: "toujours", court: "Tout temps", label: "Coups de cœur, tout temps" },
  { id: "marques", court: "Plus suivies", label: "Marques les plus suivies" },
  { id: "notes-pieces", court: "Pièces notées", label: "Pièces les mieux notées" },
  { id: "notes-marques", court: "Marques notées", label: "Marques les mieux notées" },
] as const;

export default async function PopulairesPage({ searchParams }: Props) {
  const { vue } = await searchParams;
  const onglet = ONGLETS.some((o) => o.id === vue) ? (vue as string) : "semaine";

  const seuil = await avisMinimum();

  const marques = onglet === "marques" ? await getMostFavorited() : [];
  const marquesNotees = onglet === "notes-marques" ? await getMieuxNoteesMarques() : [];
  const piecesNotees = onglet === "notes-pieces" ? await getMieuxNoteesPieces() : [];
  const classement =
    onglet === "semaine" || onglet === "toujours"
      ? await getMostLiked(120, onglet === "toujours" ? "toujours" : "semaine")
      : [];

  const idsAimes = [
    ...classement.map((c) => c.product.id),
    ...piecesNotees.map((c) => c.product.id),
  ];
  const myLikes = await getMyLikes(idsAimes);

  const explication =
    onglet === "notes-pieces" || onglet === "notes-marques" ? (
      <>
        Ici, ce ne sont pas des cœurs mais des <strong className="font-extrabold text-white">
        notes</strong> : quelqu&apos;un a pris le temps de mettre cinq étoiles ou deux, et
        souvent d&apos;expliquer pourquoi. Il faut au moins {seuil} avis pour apparaître,
        sans quoi une seule opinion suffirait à occuper la première place.
      </>
    ) : onglet === "marques" ? (
      <>
        Les maisons que la communauté suit. Un favori ne s&apos;efface pas avec le temps :
        suivre une marque n&apos;est pas un geste d&apos;humeur.
      </>
    ) : onglet === "toujours" ? (
      <>
        Le total des coups de cœur depuis l&apos;ouverture du site :{" "}
        <strong className="font-extrabold text-white">rien n&apos;est jamais effacé</strong>.
        L&apos;onglet « du moment » ne fait que compter les plus récents.
      </>
    ) : (
      <>
        Ce que la communauté préfère en ce moment : seuls les coups de cœur des{" "}
        <strong className="font-extrabold text-white">sept derniers jours</strong> sont
        comptés ici. Les anciens ne disparaissent pas pour autant, ils vivent dans
        l&apos;onglet « depuis toujours ». Rien ne s&apos;achète pour figurer dans ces
        classements.
      </>
    );


  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-6">
        <p className="eyebrow m-0">Le classement</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Coups de cœur
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          {explication}
        </p>
      </header>

      <SelecteurClassement onglets={ONGLETS} actif={onglet} base="/populaires" defaut="semaine" />


      {onglet === "notes-pieces" ? (
        piecesNotees.length === 0 ? (
          <Vide>Aucune pièce n&apos;a encore reçu assez d&apos;avis.</Vide>
        ) : (
          <div className="rise rise-1">
            <Grille variante="pieces" memoire="notes-pieces" aside={<Compte n={piecesNotees.length} mot="pièce" />}>
              {piecesNotees.map(({ product, note }, i) => (
                <div key={product.id} data-reveal className="relative h-full">
                  <Rang place={i + 1} />
                  <Badge note={note.moyenne} />
                  <ProductCard
                    product={product}
                    showBrand
                    likes={{ count: 0, liked: myLikes.has(product.id) }}
                  />
                </div>
              ))}
            </Grille>
          </div>
        )
      ) : onglet === "notes-marques" ? (
        marquesNotees.length === 0 ? (
          <Vide>Aucune marque n&apos;a encore reçu assez d&apos;avis.</Vide>
        ) : (
          <div className="rise rise-1">
            <Grille variante="marques" memoire="notes-marques" aside={<Compte n={marquesNotees.length} mot="marque" />}>
              {marquesNotees.map(({ brand, note }, i) => (
                <div key={brand.id} data-reveal className="relative h-full">
                  <Rang place={i + 1} />
                  <Badge note={note.moyenne} />
                  <BrandCard brand={brand} />
                </div>
              ))}
            </Grille>
          </div>
        )
      ) : onglet === "marques" ? (
        marques.length === 0 ? (
          <Vide>Aucune marque n&apos;a encore été mise en favori.</Vide>
        ) : (
          <div className="rise rise-1">
            <Grille
              variante="marques"
              memoire="classement-marques"
              aside={
                <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                  {marques.length} marque{marques.length > 1 ? "s" : ""} suivie
                  {marques.length > 1 ? "s" : ""}
                </p>
              }
            >
              {marques.map(({ brand, favoris }, i) => (
                <div key={brand.id} data-reveal className="relative h-full">
                  <Rang place={i + 1} />
                  <span className="absolute right-3 top-3 z-20 rounded-full bg-[rgba(20,8,50,0.78)] px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm">
                    {favoris} ♥
                  </span>
                  <BrandCard brand={brand} />
                </div>
              ))}
            </Grille>
          </div>
        )
      ) : classement.length === 0 ? (
        <Vide>Personne n&apos;a encore donné de coup de cœur.</Vide>
      ) : (
        <div className="rise rise-1">
          <Grille
            variante="pieces"
            memoire="populaires"
            aside={
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                {classement.length} pièce{classement.length > 1 ? "s" : ""} classée
                {classement.length > 1 ? "s" : ""}
              </p>
            }
          >
            {classement.map(({ product, likes }, i) => (
              /* La médaille doit bouger avec sa carte, pas rester
                 accrochée à la grille : d'où le data-reveal ici. */
              <div key={product.id} data-reveal className="relative h-full">
                <Rang place={i + 1} />
                <ProductCard
                  product={product}
                  showBrand
                  likes={{ count: likes, liked: myLikes.has(product.id) }}
                />
              </div>
            ))}
          </Grille>
        </div>
      )}
    </div>
  );
}

/**
 * La note, en haut à droite d'une carte de classement.
 *
 * Une seule étoile suivie du chiffre, pas cinq : sur une carte de
 * cent soixante pixels de large, cinq étoiles plus un nombre venaient
 * buter contre la médaille du rang, à gauche.
 */
function Badge({ note }: { note: number }) {
  return (
    <span
      aria-label={`Noté ${enEtoiles(note)} sur 5`}
      className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-[rgba(20,8,50,0.82)] px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm"
    >
      <span aria-hidden="true" className="text-[#f5c73c]">★</span>
      {enEtoiles(note)}
    </span>
  );
}

function Compte({ n, mot }: { n: number; mot: string }) {
  return (
    <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
      {n} {mot}
      {n > 1 ? "s" : ""} classée{n > 1 ? "s" : ""}
    </p>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rise rise-1 p-8 text-center">
      <p className="m-0 text-[15px] leading-relaxed text-white/85">
        {children}{" "}
        <Link href="/marques" className="font-bold text-white underline underline-offset-2">
          Parcours les marques
        </Link>{" "}
        et lance le mouvement.
      </p>
    </div>
  );
}
