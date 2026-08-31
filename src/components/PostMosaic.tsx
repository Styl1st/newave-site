"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LignePost, { dateCourte } from "./LignePost";
import PostCard, { couverture, porteUneVideo } from "./PostCard";
import { IconChevron, IconFiltre } from "./Icons";
import { vignette } from "@/lib/vignette";
import { sansMarquage } from "./TexteRiche";
import type { Post } from "@/lib/types";

/**
 * Les publications.
 *
 * CE FICHIER S'APPELLE ENCORE « MOSAÏQUE » ET N'EN EST PLUS UNE. Le nom
 * reste parce que l'accueil l'importe sous ce nom-là et que l'accueil
 * n'est pas de ce chantier ; le renommer casserait une page qu'on n'a
 * pas le droit d'ouvrir ici.
 *
 * Ce qui a changé : on ne fouille pas des posts, on les lit. Le mur en
 * colonnes était fait pour l'œil — de belles images de hauteurs
 * inégales — et il coupait chaque titre en trois lignes de six
 * caractères. Le fil rend la largeur au texte, met le dernier post en
 * bandeau, et pose au-dessus de quoi retrouver un sujet : une
 * recherche, une ligne de thèmes à compteurs qui reste sous la main
 * pendant qu'on descend, et un tri.
 *
 * DEUX FORMES, UNE SEULE PORTE. `variante="fil"` est la page `/posts`
 * complète. La variante par défaut, « aperçu », ne rend que trois ou
 * quatre cartes : c'est ce que demande une section d'accueil, où un
 * champ de recherche et une barre collante n'auraient aucun sens.
 */

/** Combien de posts d'un coup. Une ligne est haute : douze font déjà
    trois écrans de défilement. */
const LOT = 12;

/** Au-delà, la barre collante déborde sur trois lignes. Le reste se
    déplie à la demande. */
const THEMES_EN_VUE = 8;

type Format = "photo" | "carrousel" | "video";
type Source = "instagram" | "tiktok";
type Tri = "recents" | "anciens" | "hasard";

const FORMATS: { cle: Format; label: string }[] = [
  { cle: "photo", label: "Photo" },
  { cle: "carrousel", label: "Carrousel" },
  { cle: "video", label: "Vidéo" },
];

const SOURCES: { cle: Source; label: string }[] = [
  { cle: "instagram", label: "Instagram" },
  { cle: "tiktok", label: "TikTok" },
];

/** Un post n'a qu'un format : vidéo, plusieurs images, ou une seule. */
function formatDe(post: Post): Format {
  if (porteUneVideo(post)) return "video";
  return (post.images?.length ?? 0) > 1 ? "carrousel" : "photo";
}

function aLaSource(post: Post, s: Source): boolean {
  return Boolean(s === "instagram" ? post.instagram_url : post.tiktok_url);
}

/*
 * DEUX FAMILLES DE FILTRES NE SE COMBINENT PAS COMME DEUX FILTRES DE LA
 * MÊME FAMILLE. Dedans, c'est un OU — « photo ou vidéo » ; entre elles,
 * un ET — « une vidéo, ET de cette marque ». C'est la règle de
 * `PieceDirectory`, et la seule qui puisse rendre quelque chose : un
 * post n'a qu'un format et qu'une marque, demander les deux à la fois
 * ne ramènerait jamais rien.
 */
const bonTheme = (p: Post, theme: string | null) =>
  !theme || p.keywords.includes(theme);
const bonFormat = (p: Post, formats: Format[]) =>
  formats.length === 0 || formats.includes(formatDe(p));
const bonneMarque = (p: Post, marques: string[]) =>
  marques.length === 0 || (p.brand ? marques.includes(p.brand.slug) : false);
const bonneSource = (p: Post, sources: Source[]) =>
  sources.length === 0 || sources.some((s) => aLaSource(p, s));

function compter<T>(valeurs: T[]): Map<T, number> {
  const compte = new Map<T, number>();
  for (const v of valeurs) compte.set(v, (compte.get(v) ?? 0) + 1);
  return compte;
}

/** Un rang tiré au sort, puis un tri dessus. C'est l'ENDROIT où on
    l'appelle qui compte, pas la méthode : voir `Fil`. */
function melanger<T>(liste: T[]): T[] {
  return liste
    .map((valeur) => ({ valeur, rang: Math.random() }))
    .sort((a, b) => a.rang - b.rang)
    .map(({ valeur }) => valeur);
}

export default function PostMosaic({
  posts,
  variante = "apercu",
}: {
  posts: Post[];
  /** « fil » = la page `/posts` entière ; « aperçu » = trois cartes. */
  variante?: "fil" | "apercu";
}) {
  /* Un aiguillage sans état : les crochets vivent dans l'une ou l'autre
     forme, jamais derrière une condition. */
  return variante === "fil" ? <Fil posts={posts} /> : <Apercu posts={posts} />;
}

function Apercu({ posts }: { posts: Post[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} accroche={sansMarquage(p.caption)} />
      ))}
    </div>
  );
}

function Fil({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [formats, setFormats] = useState<Format[]>([]);
  const [marques, setMarques] = useState<string[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [tousLesThemes, setTousLesThemes] = useState(false);
  const [tri, setTri] = useState<Tri>("recents");
  const [ordre, setOrdre] = useState<string[]>([]);
  const [combien, setCombien] = useState(LOT);

  const actifs = formats.length + marques.length + sources.length;

  function reinitialiser() {
    setFormats([]);
    setMarques([]);
    setSources([]);
  }

  const basculerFormat = (f: Format) =>
    setFormats((l) => (l.includes(f) ? l.filter((x) => x !== f) : [...l, f]));
  const basculerMarque = (m: string) =>
    setMarques((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  const basculerSource = (s: Source) =>
    setSources((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));

  /*
   * La recherche d'abord, les filtres ensuite, et chaque famille se
   * compte SANS ELLE-MÊME : sinon choisir « Vidéo » ferait disparaître
   * « Carrousel » de l'écran, et l'on ne pourrait plus changer d'avis
   * sans tout effacer. Un chiffre affiché est donc toujours le nombre
   * de posts qu'on obtiendra en cliquant.
   */
  const parRecherche = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.caption.toLowerCase().includes(q) ||
        (p.brand?.name ?? "").toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [posts, query]);

  /* Tout sauf le thème : c'est à la fois la base des compteurs de la
     barre collante et le compte de sa pastille « Tout ». */
  const sansTheme = useMemo(
    () =>
      parRecherche.filter(
        (p) => bonFormat(p, formats) && bonneMarque(p, marques) && bonneSource(p, sources)
      ),
    [parRecherche, formats, marques, sources]
  );

  const themes = useMemo(() => {
    const compte = compter(sansTheme.flatMap((p) => p.keywords));
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [sansTheme]);

  const formatsDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) => bonTheme(p, theme) && bonneMarque(p, marques) && bonneSource(p, sources)
    );
    const compte = compter(dedans.map(formatDe));
    return FORMATS.filter((f) => compte.has(f.cle)).map((f) => ({
      ...f,
      total: compte.get(f.cle) ?? 0,
    }));
  }, [parRecherche, theme, marques, sources]);

  const marquesDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) => bonTheme(p, theme) && bonFormat(p, formats) && bonneSource(p, sources)
    );
    const noms = new Map<string, string>();
    for (const p of dedans) if (p.brand) noms.set(p.brand.slug, p.brand.name);
    const compte = compter(dedans.flatMap((p) => (p.brand ? [p.brand.slug] : [])));
    return [...compte.entries()]
      .map(([slug, total]) => ({ slug, nom: noms.get(slug) ?? slug, total }))
      .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom));
  }, [parRecherche, theme, formats, sources]);

  const sourcesDispo = useMemo(() => {
    const dedans = parRecherche.filter(
      (p) => bonTheme(p, theme) && bonFormat(p, formats) && bonneMarque(p, marques)
    );
    return SOURCES.map((s) => ({
      ...s,
      total: dedans.filter((p) => aLaSource(p, s.cle)).length,
    })).filter((s) => s.total > 0);
  }, [parRecherche, theme, formats, marques]);

  /* Un filtre devenu sans objet s'efface tout seul. Aucune boucle
     possible : ces listes se calculent sans le filtre qu'elles
     vérifient. */
  useEffect(() => {
    if (theme && !themes.some(([t]) => t === theme)) setTheme(null);
  }, [themes, theme]);

  useEffect(() => {
    const dispo = new Set(formatsDispo.map((f) => f.cle));
    setFormats((l) => (l.every((f) => dispo.has(f)) ? l : l.filter((f) => dispo.has(f))));
  }, [formatsDispo]);

  useEffect(() => {
    const dispo = new Set(marquesDispo.map((m) => m.slug));
    setMarques((l) => (l.every((m) => dispo.has(m)) ? l : l.filter((m) => dispo.has(m))));
  }, [marquesDispo]);

  useEffect(() => {
    const dispo = new Set(sourcesDispo.map((s) => s.cle));
    setSources((l) => (l.every((s) => dispo.has(s)) ? l : l.filter((s) => dispo.has(s))));
  }, [sourcesDispo]);

  const resultats = useMemo(
    () => sansTheme.filter((p) => bonTheme(p, theme)),
    [sansTheme, theme]
  );

  /*
   * LE TIRAGE AU SORT SE FAIT APRÈS LE MONTAGE, JAMAIS PENDANT LE RENDU.
   *
   * Un `Math.random()` appelé en rendant la page donne un ordre sur le
   * serveur et un autre dans le navigateur : React compare les deux,
   * n'y retrouve pas ses petits et repeint la liste entière en signalant
   * une erreur. Le tri part donc de « récents », et l'ordre au hasard
   * n'est tiré qu'ici, une fois la page vivante — c'est-à-dire jamais
   * avant que quelqu'un l'ait demandé.
   */
  useEffect(() => {
    if (tri !== "hasard") return;
    setOrdre(melanger(resultats.map((p) => p.id)));
  }, [tri, resultats]);

  const ordonnes = useMemo(() => {
    // La requête rend déjà les posts du plus récent au plus ancien.
    if (tri === "recents") return resultats;
    if (tri === "anciens") return [...resultats].reverse();
    const rang = new Map(ordre.map((id, i) => [id, i] as const));
    return [...resultats].sort(
      (a, b) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0)
    );
  }, [resultats, tri, ordre]);

  /*
   * LE BANDEAU DU HAUT NE S'AFFICHE QUE S'IL EST VRAI.
   *
   * « Le post de la semaine » désigne le dernier publié. Dès qu'un
   * filtre, une recherche ou un autre tri est en jeu, le premier de la
   * liste n'est plus le dernier publié : le bandeau mentirait, et
   * surtout il volerait un demi-écran à la réponse qu'on vient de
   * demander. On saute aussi les posts sans visuel — un bandeau en
   * 21/9 sans image n'est qu'une bande vide.
   */
  const aLaUne = useMemo(() => {
    if (tri !== "recents") return null;
    if (query.trim() || theme || actifs > 0) return null;
    return ordonnes.find((p) => couverture(p)) ?? null;
  }, [ordonnes, tri, query, theme, actifs]);

  const fil = useMemo(
    () => (aLaUne ? ordonnes.filter((p) => p.id !== aLaUne.id) : ordonnes),
    [ordonnes, aLaUne]
  );

  // Changer de filtre repart du début, sinon on demanderait à la page
  // d'afficher d'un coup tout ce qu'on avait déroulé avant.
  useEffect(() => setCombien(LOT), [fil]);

  const visibles = fil.slice(0, combien);
  const reste = fil.length - visibles.length;

  const chip =
    "shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition";
  const chipOff = "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white";
  const chipOn = "bg-white font-extrabold text-[var(--color-ink)]";

  const themesEnVue = tousLesThemes ? themes : themes.slice(0, THEMES_EN_VUE);
  const themesCaches = themes.length - themesEnVue.length;

  /* Un bouton qui ouvre un panneau vide vaut moins que pas de bouton :
     avec deux marques et une seule source, il n'y a rien à trancher. */
  const filtrable =
    actifs > 0 ||
    formatsDispo.length > 1 ||
    marquesDispo.length > 1 ||
    sourcesDispo.length > 1;

  return (
    <>
      {/* ---------------- la recherche ---------------- */}
      <div className="glass rise rise-1 mb-4 p-3.5 sm:p-4">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un post, une marque, un thème…"
            aria-label="Chercher un post"
            className="champ min-w-0 flex-1 rounded-[15px] px-[18px] py-3.5"
          />

          {filtrable && (
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              aria-expanded={ouvert}
              aria-controls="filtres-posts"
              className={`inline-flex shrink-0 items-center gap-2 rounded-[15px] px-4 py-3 text-[13px] font-extrabold transition active:scale-[.97] ${
                actifs > 0 || ouvert
                  ? "bg-white text-[var(--color-ink)]"
                  : "border border-white/40 bg-white/8 text-white hover:bg-white/18"
              }`}
            >
              <IconFiltre />
              {/* Le libellé long dit ce qu'il y a derrière le bouton, ce
                  qu'« Filtres » ne dit pas. Il ne tient qu'en grand :
                  plus bas, il ne laisserait rien au champ de recherche. */}
              <span className="hidden lg:inline">Format, marque, source</span>
              <span className="hidden sm:inline lg:hidden">Filtres</span>
              {actifs > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink)] px-1 text-[10.5px] font-black text-white">
                  {actifs}
                </span>
              )}
              <IconChevron
                className={`h-3.5 w-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {ouvert && filtrable && (
          <div id="filtres-posts" className="mt-4 border-t border-white/15 pt-4">
            {formatsDispo.length > 1 && (
              <>
                <p className="eyebrow m-0 mb-2">
                  Format
                  {formats.length > 0 && (
                    <span className="ml-2 font-medium normal-case tracking-normal text-white/45">
                      plusieurs possibles
                    </span>
                  )}
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormats([])}
                    className={`${chip} ${formats.length === 0 ? chipOn : chipOff}`}
                  >
                    Tout
                  </button>
                  {formatsDispo.map((f) => (
                    <button
                      key={f.cle}
                      type="button"
                      onClick={() => basculerFormat(f.cle)}
                      aria-pressed={formats.includes(f.cle)}
                      className={`${chip} ${formats.includes(f.cle) ? chipOn : chipOff}`}
                    >
                      {f.label}
                      <span className="ml-1.5 opacity-55 tabular-nums">{f.total}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {marquesDispo.length > 1 && (
              <>
                <p className="eyebrow m-0 mb-2">Marque</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMarques([])}
                    className={`${chip} ${marques.length === 0 ? chipOn : chipOff}`}
                  >
                    Toutes
                  </button>
                  {marquesDispo.map((m) => (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => basculerMarque(m.slug)}
                      aria-pressed={marques.includes(m.slug)}
                      className={`${chip} ${marques.includes(m.slug) ? chipOn : chipOff}`}
                    >
                      {m.nom}
                      <span className="ml-1.5 opacity-55 tabular-nums">{m.total}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {sourcesDispo.length > 1 && (
              <>
                <p className="eyebrow m-0 mb-2">Source</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSources([])}
                    className={`${chip} ${sources.length === 0 ? chipOn : chipOff}`}
                  >
                    Toutes
                  </button>
                  {sourcesDispo.map((s) => (
                    <button
                      key={s.cle}
                      type="button"
                      onClick={() => basculerSource(s.cle)}
                      aria-pressed={sources.includes(s.cle)}
                      className={`${chip} ${sources.includes(s.cle) ? chipOn : chipOff}`}
                    >
                      {s.label}
                      <span className="ml-1.5 opacity-55 tabular-nums">{s.total}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {actifs > 0 && (
              <button
                type="button"
                onClick={reinitialiser}
                className="mt-4 text-[12.5px] font-bold text-white/75 underline underline-offset-2 hover:text-white"
              >
                Tout effacer
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---------------- les thèmes, collants ----------------

          ILS RESTENT SOUS LA MAIN PENDANT QU'ON DESCEND. Sur une page
          qui se lit, l'envie de changer de sujet arrive au milieu du
          fil, pas en haut : il fallait remonter, donc perdre l'endroit
          où l'on en était.

          La barre se cale sous la navigation, elle-même collante : les
          deux hauteurs sont accordées à la main faute de pouvoir les
          mesurer en CSS. Mêmes valeurs que l'annuaire. */}
      {themes.length > 0 && (
        <div className="sticky top-[70px] z-30 mb-3 sm:top-[86px]">
          <div className="flex flex-wrap items-center gap-1.5 rounded-[24px] border border-white/20 bg-[rgba(8,2,30,0.44)] p-2.5 backdrop-blur-[20px] sm:rounded-full">
            <button
              type="button"
              onClick={() => setTheme(null)}
              className={`${chip} ${theme === null ? chipOn : chipOff}`}
            >
              Tout
              <span className="ml-1.5 opacity-55 tabular-nums">{sansTheme.length}</span>
            </button>

            {/* Les mots-clés restent en minuscules dans la base — c'est
                ainsi qu'on les tape à l'administration. Les majuscules
                sont une affaire d'affichage, et le CSS s'en charge. */}
            {themesEnVue.map(([t, n]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(theme === t ? null : t)}
                aria-pressed={theme === t}
                className={`${chip} ${theme === t ? chipOn : chipOff}`}
              >
                {t}
                <span className="ml-1.5 opacity-55 tabular-nums">{n}</span>
              </button>
            ))}

            {themesCaches > 0 && (
              <button
                type="button"
                onClick={() => setTousLesThemes(true)}
                className={`${chip} ${chipOff}`}
              >
                +{themesCaches} thèmes
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------------- le compte et le tri ---------------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <p className="m-0 text-[12px] font-bold uppercase tracking-[0.16em] text-white/65">
          {resultats.length} post{resultats.length > 1 ? "s" : ""} ·{" "}
          {theme ?? "tous thèmes"}
        </p>

        {/*
         * Le tri en texte souligné, pas en pastilles : les pastilles
         * sont déjà prises par les thèmes juste au-dessus, et deux
         * rangées de pastilles superposées ne se distinguent plus.
         *
         * Le rembourrage du bouton donne au doigt de quoi viser ; le
         * soulignement, lui, reste porté par le texte, sinon il
         * flotterait huit pixels plus bas et ne désignerait plus rien.
         */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {(
            [
              ["recents", "Récents"],
              ["anciens", "Les plus anciens"],
              ["hasard", "Au hasard"],
            ] as const
          ).map(([cle, label]) => (
            <button
              key={cle}
              type="button"
              onClick={() => setTri(cle)}
              aria-pressed={tri === cle}
              className={`py-2 text-[12.5px] font-bold transition ${
                tri === cle ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <span className={tri === cle ? "border-b-[1.5px] border-white pb-[3px]" : ""}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {resultats.length === 0 ? (
        <div className="glass p-8 text-center">
          {/* « Rien ne correspond » et « rien n'existe » n'appellent pas
              la même réponse : conseiller d'enlever des filtres à
              quelqu'un qui n'en a mis aucun le renvoie à un bouton qui
              n'existe pas. */}
          <p className="m-0 text-[15px] text-white/90">
            {posts.length === 0 ? (
              <>Rien n&apos;est encore publié ici. Ça ne saurait tarder.</>
            ) : (
              <>
                Aucun post ne correspond. Essaie avec moins de filtres, ou{" "}
                <Link
                  href="/marques"
                  className="font-bold text-white underline underline-offset-2"
                >
                  va voir les marques
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          {aLaUne && <ALaUne post={aLaUne} />}

          <div className="flex flex-col gap-4">
            {visibles.map((p) => (
              <LignePost key={p.id} post={p} accroche={sansMarquage(p.caption)} />
            ))}
          </div>

          {reste > 0 && (
            <div className="mt-7 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setCombien((n) => n + LOT)}
                className="card-light px-7 py-3.5"
              >
                <span className="relative z-3 text-[14px] font-extrabold">
                  Voir {Math.min(reste, LOT)} post{Math.min(reste, LOT) > 1 ? "s" : ""} de
                  plus
                </span>
              </button>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">
                {visibles.length} sur {fil.length}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

/**
 * Le dernier post, en bandeau.
 *
 * Il ne dit rien de plus que sa ligne du fil ; il dit la même chose en
 * grand. C'est tout ce qu'on demande à une une : donner un point
 * d'entrée à qui arrive sans idée précise, et un repère de fraîcheur —
 * on voit du premier coup d'œil de quand date la dernière publication.
 */
function ALaUne({ post }: { post: Post }) {
  const cover = couverture(post);
  const surtitre = ["Le post de la semaine", post.brand?.name]
    .filter(Boolean)
    .join(" · ");

  /*
   * DEUX VOILES, PARCE QUE LE CADRE CHANGE DE FORME.
   *
   * En 21/9 le texte est posé à gauche d'une image très large : le
   * dégradé va de la gauche vers la droite et laisse la photo
   * respirer. Sur un téléphone, le bandeau devient presque un portrait
   * et le texte passe en bas ; le même dégradé oblique y assombrirait
   * le mauvais côté. On en pose donc un par cas plutôt qu'un compromis
   * qui ne rendrait bien nulle part.
   */
  const voileHaut =
    "linear-gradient(0deg, rgba(var(--voile),0.94) 0%, rgba(var(--voile),0.62) 38%, rgba(var(--voile),0.05) 78%)";
  const voileLarge =
    "linear-gradient(74deg, rgba(var(--voile),0.92) 0%, rgba(var(--voile),0.5) 54%, rgba(var(--voile),0) 82%)";

  return (
    <article className="rise rise-2 relative mb-4 overflow-hidden rounded-[22px] shadow-[0_24px_60px_-26px_rgba(20,6,50,0.9)]">
      <Link href={`/posts/${post.slug}`} className="group block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[rgba(var(--voile),0.5)] sm:aspect-[16/9] lg:aspect-[21/9]">
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vignette(cover, 1400)}
              alt={post.image_alt || post.title}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          )}

          <div
            aria-hidden
            className="absolute inset-0 sm:hidden"
            style={{ backgroundImage: voileHaut }}
          />
          <div
            aria-hidden
            className="absolute inset-0 hidden sm:block"
            style={{ backgroundImage: voileLarge }}
          />

          <div className="absolute inset-x-0 bottom-0 max-w-[560px] p-5 sm:p-7 lg:p-10">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.24em] text-white/78">
              {surtitre}
            </p>

            <h2 className="m-0 mt-2.5 text-[clamp(22px,5.6vw,40px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-white">
              {post.title}
            </h2>

            {post.caption && (
              <p className="m-0 mt-3 line-clamp-2 text-[14px] font-medium leading-relaxed text-white/84 sm:text-[15px]">
                {sansMarquage(post.caption)}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {post.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-white/14 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-white/90"
                >
                  {k}
                </span>
              ))}
              {post.published_at && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-white/60">
                  {dateCourte(post.published_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
