"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconChevron } from "../Icons";
import { enChiffres } from "../chiffres";

/**
 * LA BARRE DE FILTRES DE LA VITRINE : LE RAIL DES RAYONS.
 *
 * Elle remplace la colonne de verre de gauche et la feuille du
 * téléphone. Le reproche fait à l'ancienne : des cases posées sur la
 * page, lourdes à l'œil, et une grille privée de deux cent vingt pixels
 * pour une colonne qu'on ne regardait qu'une fois.
 *
 * LE PARTI PRIS : PLUS DE BOÎTE. Les rayons s'écrivent en grand, en
 * lettres creuses, avec leur compte en exposant ; celui qu'on a choisi
 * se remplit et s'allume. Dessous, une seule ligne d'outils. Un outil
 * ne fait pas surgir de panneau : son volet se DÉPLIE dans la page, à
 * même le fond, et pousse doucement ce qui suit.
 *
 * EN DÉFILANT. Sur ordinateur, la ligne colle sous l'en-tête, posée sur
 * un voile qui se fond dans la page vers le bas plutôt qu'une bande à
 * bord franc. Au téléphone, elle remonte du BAS de l'écran, sous le
 * pouce, avec ses propres volets qui s'ouvrent vers le haut.
 *
 * TOUT L'ÉTAT RESTE DANS `PieceDirectory`. Ce fichier ne fait que
 * dessiner ce qu'on lui donne et rendre les gestes : la requête, l'URL
 * et le recalage de la page ne bougent pas.
 */

export type Tri = "hasard" | "croissant" | "decroissant";
type Volet = "rayon" | "taille" | "prix" | "marque" | "tri" | "plus";

const TRIS: [Tri, string][] = [
  ["hasard", "au hasard"],
  ["croissant", "prix croissant"],
  ["decroissant", "prix décroissant"],
];

type Bornes = { min: number; max: number; pas: number; auDela?: boolean };

export type EtatFiltres = {
  total: number;
  enCours: boolean;
  /** Les comptes du catalogue : arrivés, attendus, ou en panne. */
  chargement: "pret" | "attente" | "panne";
  reessayer: () => void;

  /**
   * `total` vaut `null` tant que les comptes ne sont pas arrivés : les
   * mots s'affichent tout de suite, leur chiffre les rejoint ensuite.
   */
  rayons: { rayon: string; total: number | null }[];
  rayon: string | null;
  /** `null` revient à tout ; le rayon déjà posé se retire. */
  choisirRayon: (r: string | null) => void;
  types: { tag: string; total: number }[];
  tags: string[];
  basculerTag: (t: string) => void;

  tailles: { taille: string; total: number }[];
  taille: string | null;
  choisirTaille: (t: string | null) => void;

  /** Le rail. `auDela` : des pièces coûtent plus que son bout, qui veut alors dire « et plus ». */
  bornes: Bornes | null;
  prix: [number, number];
  choisirPrix: (p: [number, number]) => void;
  prixActif: boolean;
  /** D'où viennent les barres au-dessus du rail. `null` : pas de barres. */
  adresseDesPrix: string | null;
  euros: (centimes: number) => string;

  marques: { slug: string; nom: string; total: number }[];
  marque: string | null;
  nomDeLaMarque: string | null;
  choisirMarque: (slug: string | null) => void;

  etats: { stock: boolean; promo: boolean };
  stock: boolean;
  setStock: (v: boolean) => void;
  promo: boolean;
  setPromo: (v: boolean) => void;

  tri: Tri;
  setTri: (t: Tri) => void;

  actifs: number;
  reinitialiser: () => void;

  /** Le rail de densité, tel que la page le construit. */
  densite: React.ReactNode;
};

/**
 * La section entière : rayons, types, ligne d'outils, puis la grille.
 *
 * LA GRILLE VIT DEDANS, et ce n'est pas un détail : un élément collant
 * ne colle que dans son parent. Posée après la section, la barre
 * décollerait au bout des filtres, avant la première pièce.
 */
export default function FiltresPieces({
  f,
  children,
  collant,
  calme,
}: {
  f: EtatFiltres;
  children: React.ReactNode;
  /** La ligne collante, que la page mesure pour se reposer dessous. */
  collant: React.RefObject<HTMLDivElement | null>;
  /**
   * Jusqu'à quand le défilement est celui de la page et non de la main
   * (un recalage après un filtre). Il ne doit pas refermer de volet.
   */
  calme: React.RefObject<number>;
}) {
  const [volet, setVolet] = useState<Volet | null>(null);
  const basculer = (v: Volet) => setVolet((x) => (x === v ? null : v));

  /* LA BARRE EST-ELLE COLLÉE ? Un repère d'un pixel juste avant elle :
     quand il passe sous l'en-tête, elle colle. Le voile s'allume alors,
     et le rayon entre dans la ligne puisque les grands mots sont partis. */
  const repere = useRef<HTMLDivElement>(null);
  const [colle, setColle] = useState(false);
  useEffect(() => {
    const el = repere.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setColle(!e.isIntersecting && e.boundingClientRect.top < 120),
      { rootMargin: "-90px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* AU TÉLÉPHONE, LA BARRE REVIENT EN BAS dès que celle de la page est
     passée sous l'en-tête. Elle a ses propres volets : ceux d'en haut
     sont hors de l'écran, les ouvrir ne montrerait rien. */
  const apres = useRef<HTMLDivElement>(null);
  const [enBas, setEnBas] = useState(false);
  const [voletBas, setVoletBas] = useState<Volet | null>(null);
  const basculerBas = (v: Volet) => setVoletBas((x) => (x === v ? null : v));
  useEffect(() => {
    const el = apres.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        const dessous = !e.isIntersecting && e.boundingClientRect.top < 80;
        setEnBas(dessous);
        if (!dessous) setVoletBas(null);
      },
      { rootMargin: "-70px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* EN DÉFILANT, UN VOLET OUVERT SE REFERME : on est reparti regarder
     les pièces. Pas au premier pixel — on corrige souvent sa position
     d'un coup de molette en réglant un prix — mais au bout d'un écran.
     Le défilement que la page fait elle-même ne compte pas. */
  const ouvertA = useRef(0);
  useEffect(() => {
    if (!volet && !voletBas) return;
    ouvertA.current = window.scrollY;
    const guetter = () => {
      if (Date.now() < (calme.current ?? 0)) {
        ouvertA.current = window.scrollY;
        return;
      }
      if (Math.abs(window.scrollY - ouvertA.current) > window.innerHeight * 0.8) {
        setVolet(null);
        setVoletBas(null);
      }
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVolet(null);
        setVoletBas(null);
      }
    };
    window.addEventListener("scroll", guetter, { passive: true });
    window.addEventListener("keydown", echap);
    return () => {
      window.removeEventListener("scroll", guetter);
      window.removeEventListener("keydown", echap);
    };
  }, [volet, voletBas, calme]);

  /* Au téléphone, trois types et le reste en un mot : la rangée tient
     sur une ligne tant qu'on ne demande pas la suite. */
  const [tousLesTypes, setTousLesTypes] = useState(false);
  useEffect(() => setTousLesTypes(false), [f.rayon]);

  const toutCompte = f.rayons.every((r) => r.total !== null)
    ? f.rayons.reduce((n, r) => n + (r.total ?? 0), 0)
    : null;

  return (
    <section aria-label="Filtres" className="relative">
      {/* LES MOTS N'ATTENDENT PLUS LES COMPTES. Les noms des rayons sont
          connus d'avance ; seuls leurs chiffres viennent de la base. Ils
          s'affichaient en barres grises le temps qu'elle réponde, et
          c'était tout le haut de la page qui avait l'air de charger. */}
      {f.chargement === "panne" && (
        <p className="m-0 text-[13px] text-white/70">
          Les filtres n&apos;ont pas répondu.{" "}
          <button type="button" onClick={f.reessayer} className="bf-lien">
            Réessayer
          </button>
        </p>
      )}

      {/* Les rayons en grand : sur ordinateur. Au téléphone, neuf mots
          de trente pixels font trois lignes ; ils passent dans la barre. */}
      {f.rayons.length > 1 && (
        <div className="bf-mots bf-mots-grand" role="group" aria-label="Rayon">
          <button
            type="button"
            className="bf-mot"
            aria-pressed={f.rayon === null}
            onClick={() => f.choisirRayon(null)}
          >
            Tout
            <Compte n={toutCompte} />
          </button>
          {f.rayons.map(({ rayon: r, total }) => (
            <button
              key={r}
              type="button"
              className="bf-mot"
              aria-pressed={f.rayon === r}
              onClick={() => f.choisirRayon(r)}
            >
              {r}
              <Compte n={total} />
            </button>
          ))}
        </div>
      )}

      {f.rayon && f.types.length > 0 && (
        <Types f={f} tous={tousLesTypes} montrerTout={() => setTousLesTypes(true)} className="mt-1 sm:mt-4" />
      )}

      <div ref={repere} className="h-px" aria-hidden="true" />

      <div ref={collant} className="bf-collant mt-3" data-colle={colle ? "" : undefined}>
        <Barre f={f} volet={volet} basculer={basculer} fermer={() => setVolet(null)} colle={colle} />
      </div>
      <div ref={apres} className="h-px" aria-hidden="true" />

      {/* Au téléphone, la ligne n'a pas la place du compte : il passe
          dessous, avec la densité à droite, sous le pouce. */}
      <div className="bf-compte-tel">
        <p className="m-0 min-w-0 text-[13px] font-semibold text-white/70">
          <b className="font-extrabold text-white">{enChiffres(f.total)}</b> pièce{f.total > 1 ? "s" : ""}
          {f.actifs > 0 && (
            <button type="button" onClick={f.reinitialiser} className="bf-lien ml-3">
              Effacer
            </button>
          )}
        </p>
        {f.densite}
      </div>

      {children}

      <div className="bf-bas" data-visible={enBas ? "" : undefined} inert={!enBas}>
        <Barre f={f} volet={voletBas} basculer={basculerBas} fermer={() => setVoletBas(null)} enBas />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** Le compte d'un mot, en exposant ; il arrive en fondu s'il était attendu. */
function Compte({ n }: { n: number | null }) {
  return n === null ? null : <sup className="bf-compte-mot">{enChiffres(n)}</sup>;
}

/** Un volet sans boîte : il se déplie dans la page, il ne s'y pose pas. */
function Depli({ id, ouvert, children }: { id: string; ouvert: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className="bf-depli" data-ouvert={ouvert ? "" : undefined} aria-hidden={!ouvert} inert={!ouvert}>
      <div>{children}</div>
    </div>
  );
}

function Types({
  f,
  tous,
  montrerTout,
  className = "",
}: {
  f: EtatFiltres;
  tous: boolean;
  montrerTout: () => void;
  className?: string;
}) {
  /* Ceux qu'on a cochés restent visibles même repliés : un filtre posé
     qu'on ne voit plus est un filtre qu'on oublie. */
  const reste = f.types.filter((t, i) => i >= 3 && !f.tags.includes(t.tag)).length;
  return (
    <div className={`bf-types ${className}`} role="group" aria-label={`Types de ${f.rayon?.toLowerCase()}`}>
      {f.types.map((t, i) => (
        <button
          key={t.tag}
          type="button"
          className="bf-type"
          data-replie={!tous && i >= 3 && !f.tags.includes(t.tag) ? "" : undefined}
          aria-pressed={f.tags.includes(t.tag)}
          onClick={() => f.basculerTag(t.tag)}
        >
          {t.tag}
          <small>{enChiffres(t.total)}</small>
        </button>
      ))}
      {!tous && reste > 0 && (
        <button type="button" className="bf-type bf-type-reste" onClick={montrerTout}>
          + {reste} autre{reste > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

/** La ligne d'outils et ses volets. En bas de l'écran, les volets passent AU-DESSUS de la ligne. */
function Barre({
  f,
  volet,
  basculer,
  fermer,
  enBas = false,
  colle = false,
}: {
  f: EtatFiltres;
  volet: Volet | null;
  basculer: (v: Volet) => void;
  fermer: () => void;
  enBas?: boolean;
  /** Collée sous l'en-tête : les types de la page sont hors de vue. */
  colle?: boolean;
}) {
  const base = useId();
  const id = (v: Volet) => `${base}-${v}`;

  const outil = (v: Volet, contenu: React.ReactNode, classe = "") => (
    <button
      type="button"
      className={`bf-outil ${classe}`}
      aria-expanded={volet === v}
      aria-controls={id(v)}
      onClick={() => basculer(v)}
    >
      {contenu}
      <IconChevron className="bf-chevron h-3.5 w-3.5" />
    </button>
  );

  const plusPoses = (f.marque ? 1 : 0) + (f.stock ? 1 : 0) + (f.promo ? 1 : 0) + (f.tri !== "hasard" ? 1 : 0);
  const triLibelle = TRIS.find(([k]) => k === f.tri)?.[1] ?? "au hasard";
  const montrerStock = f.etats.stock || f.stock;
  const montrerPromo = f.etats.promo || f.promo;

  const ligne = (
    <div className="bf-outils" role="toolbar" aria-label="Filtres">
      {f.rayons.length > 1 &&
        outil(
          "rayon",
          <>
            <span className="bf-etiquette">Rayon</span> <b>{f.rayon ?? "Tout"}</b>
            {f.tags.length > 0 && <b className="bf-nombre">{f.tags.length}</b>}
          </>,
          "bf-outil-rayon"
        )}
      {f.tailles.length > 0 &&
        outil(
          "taille",
          <>
            <span className={f.taille ? "bf-etiquette" : ""}>Taille</span> {f.taille && <b>{f.taille}</b>}
          </>
        )}
      {f.bornes &&
        outil(
          "prix",
          <>
            <span className={f.prixActif ? "bf-etiquette" : ""}>Prix</span>{" "}
            {f.prixActif && (
              <b>
                {sansEuro(f.euros(f.prix[0]))} – {f.euros(f.prix[1])}
              </b>
            )}
          </>
        )}
      {outil(
        "plus",
        <>
          Plus {plusPoses > 0 && <b className="bf-nombre">{plusPoses}</b>}
        </>,
        "bf-seul-tel"
      )}

      <span className="bf-seul-grand">
        {f.marques.length > 1 &&
          outil(
            "marque",
            <>
              <span className={f.nomDeLaMarque ? "bf-etiquette" : ""}>Marque</span>{" "}
              {f.nomDeLaMarque && <b className="bf-tronque">{f.nomDeLaMarque}</b>}
            </>
          )}
        {montrerStock && <Bascule libelle="En stock" coche={f.stock} onChange={f.setStock} />}
        {montrerPromo && <Bascule libelle="En promo" coche={f.promo} onChange={f.setPromo} />}
        {f.actifs > 0 && (
          <button type="button" onClick={f.reinitialiser} className="bf-lien">
            Effacer
          </button>
        )}
      </span>

      <span className="bf-seul-grand bf-droite">
        <span className="bf-compte" data-en-cours={f.enCours ? "" : undefined} aria-live="polite">
          <b>{enChiffres(f.total)}</b> pièce{f.total > 1 ? "s" : ""}
        </span>
        {outil(
          "tri",
          <>
            Trier <b>{triLibelle}</b>
          </>
        )}
        {f.densite}
      </span>
    </div>
  );

  const plis = (
    <>
      <Depli id={id("rayon")} ouvert={volet === "rayon"}>
        <div className="pb-4 pt-5">
          <div className="bf-mots bf-mots-plies">
            <button
              type="button"
              className="bf-mot bf-entre"
              aria-pressed={f.rayon === null}
              onClick={() => f.choisirRayon(null)}
              style={{ "--i": 0 } as React.CSSProperties}
            >
              Tout
            </button>
            {f.rayons.map(({ rayon: r, total }, k) => (
              <button
                key={r}
                type="button"
                className="bf-mot bf-entre"
                aria-pressed={f.rayon === r}
                onClick={() => f.choisirRayon(r)}
                style={{ "--i": k + 1 } as React.CSSProperties}
              >
                {r}
                <Compte n={total} />
              </button>
            ))}
          </div>
          {/* Les types suivent ici quand la barre a perdu de vue ceux de la
              page : collée, ou en bas de l'écran. À sa place, ils sont
              juste au-dessus, les répéter ferait deux rangées identiques. */}
          {(enBas || colle) && f.rayon && f.types.length > 0 && <Types f={f} tous montrerTout={() => {}} className="mt-4" />}
        </div>
      </Depli>

      <Depli id={id("taille")} ouvert={volet === "taille"}>
        <div className="pb-4 pt-5">
          <div className="bf-mots bf-mots-tailles" role="group" aria-label="Taille">
            {f.tailles.map(({ taille: t, total }, k) => (
              <button
                key={t}
                type="button"
                className="bf-mot bf-entre"
                aria-pressed={f.taille === t}
                onClick={() => f.choisirTaille(f.taille === t ? null : t)}
                style={{ "--i": k } as React.CSSProperties}
              >
                {t}
                <sup>{enChiffres(total)}</sup>
              </button>
            ))}
          </div>
        </div>
      </Depli>

      {f.bornes && (
        <Depli id={id("prix")} ouvert={volet === "prix"}>
          <div className="pb-5 pt-5">
            <RailPrix f={f} bornes={f.bornes} ouvert={volet === "prix"} />
          </div>
        </Depli>
      )}

      <Depli id={id("marque")} ouvert={volet === "marque"}>
        <div className="pb-4 pt-4">
          <ListeMarques f={f} apres={fermer} ouvert={volet === "marque"} />
        </div>
      </Depli>

      <Depli id={id("tri")} ouvert={volet === "tri"}>
        <div className="pb-4 pt-3">
          <ChoixTri f={f} apres={fermer} />
        </div>
      </Depli>

      <Depli id={id("plus")} ouvert={volet === "plus"}>
        <div className="flex flex-col items-start gap-1 pb-4 pt-3">
          {f.marques.length > 1 && (
            <label className="bf-outil w-full">
              Marque
              <select
                value={f.marque ?? ""}
                onChange={(e) => f.choisirMarque(e.target.value || null)}
                className="bf-select"
              >
                <option value="">toutes ({f.marques.length})</option>
                {f.marques.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.nom} ({m.total})
                  </option>
                ))}
              </select>
            </label>
          )}
          {(montrerStock || montrerPromo) && (
            <div className="flex gap-x-6">
              {montrerStock && <Bascule libelle="En stock" coche={f.stock} onChange={f.setStock} />}
              {montrerPromo && <Bascule libelle="En promo" coche={f.promo} onChange={f.setPromo} />}
            </div>
          )}
          <p className="m-0 mt-1 text-[13px] font-bold text-white/60">Trier</p>
          <ChoixTri f={f} />
        </div>
      </Depli>
    </>
  );

  return enBas ? (
    <>
      {plis}
      {ligne}
    </>
  ) : (
    <>
      {ligne}
      {plis}
    </>
  );
}

/** « 20 € » devient « 20 » devant un tiret : l'euro n'a pas à être dit deux fois. */
function sansEuro(s: string): string {
  return s.replace(/\s*€$/, "");
}

/** Un interrupteur sans boîte : une case dessinée et un mot. */
function Bascule({ libelle, coche, onChange }: { libelle: string; coche: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="bf-outil" aria-pressed={coche} onClick={() => onChange(!coche)}>
      <span className="bf-case" aria-hidden="true" />
      {libelle}
    </button>
  );
}

function ChoixTri({ f, apres }: { f: EtatFiltres; apres?: () => void }) {
  return (
    <div className="bf-types" role="group" aria-label="Trier">
      {TRIS.map(([k, libelle]) => (
        <button
          key={k}
          type="button"
          className="bf-type"
          aria-pressed={f.tri === k}
          onClick={() => {
            f.setTri(k);
            apres?.();
          }}
        >
          {libelle.charAt(0).toUpperCase() + libelle.slice(1)}
        </button>
      ))}
    </div>
  );
}

/**
 * Les marques, en colonnes de mots, avec un champ pour les trouver.
 *
 * Cent soixante noms dans un `<select>` se parcourent à la molette, un
 * par un. Posés en colonnes, on les balaie d'un coup d'œil ; le champ
 * réduit la liste dès la première lettre.
 */
function ListeMarques({ f, apres, ouvert }: { f: EtatFiltres; apres: () => void; ouvert: boolean }) {
  const [filtre, setFiltre] = useState("");
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!ouvert) {
      setFiltre("");
      return;
    }
    /* Après le dépli : un focus immédiat ferait sauter la page vers un
       champ encore à hauteur nulle. */
    const t = setTimeout(() => champ.current?.focus({ preventScroll: true }), 260);
    return () => clearTimeout(t);
  }, [ouvert]);

  const q = plat(filtre.trim());
  const liste = q ? f.marques.filter((m) => plat(m.nom).includes(q)) : f.marques;
  const choisir = (slug: string | null) => {
    f.choisirMarque(slug);
    apres();
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <input
          ref={champ}
          type="text"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && liste.length === 1) choisir(liste[0].slug);
          }}
          placeholder={`Chercher parmi ${f.marques.length} marques`}
          aria-label="Chercher une marque"
          autoComplete="off"
          spellCheck={false}
          className="bf-champ w-[min(100%,300px)]"
        />
        {f.marque && (
          <button type="button" className="bf-lien" onClick={() => choisir(null)}>
            Toutes les marques
          </button>
        )}
      </div>
      <div className="bf-marques" role="group" aria-label="Marque">
        {liste.map((m) => (
          <button
            key={m.slug}
            type="button"
            className="bf-marque"
            aria-pressed={f.marque === m.slug}
            onClick={() => choisir(f.marque === m.slug ? null : m.slug)}
          >
            <span className="truncate">{m.nom}</span>
            <small>{enChiffres(m.total)}</small>
          </button>
        ))}
        {liste.length === 0 && <p className="m-0 text-[13px] text-white/60">Aucune marque à ce nom.</p>}
      </div>
    </div>
  );
}

function plat(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/* ------------------------------------------------------------------ */

/**
 * Les barres du rail, gardées le temps de la visite : rouvrir le volet
 * ou revenir à un filtre déjà vu ne redemande rien.
 */
const formesConnues = new Map<string, Promise<number[] | null>>();

function chargerFormes(url: string): Promise<number[] | null> {
  let promesse = formesConnues.get(url);
  if (!promesse) {
    promesse = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tranches?: number[] } | null) => (Array.isArray(d?.tranches) ? d.tranches : null))
      .catch(() => null);
    formesConnues.set(url, promesse);
    /* Un raté ne reste pas en mémoire : la fois suivante retentera. */
    promesse.then((v) => {
      if (v === null) formesConnues.delete(url);
    });
  }
  return promesse;
}

/** Où tombe le quantile `q` (0 à 1), en centimes, d'après les tranches. */
function quantile(tranches: number[], q: number, bas: number, pas: number): number {
  const total = tranches.reduce((n, x) => n + x, 0);
  const vise = total * q;
  let cumul = 0;
  for (let k = 0; k < tranches.length; k++) {
    if (cumul + tranches[k] >= vise && tranches[k] > 0) {
      return bas + (k + (vise - cumul) / tranches[k]) * pas;
    }
    cumul += tranches[k];
  }
  return bas + tranches.length * pas;
}

/** Les fourchettes toutes faites, en centimes. */
const FOURCHETTES: [string, number | null, number | null][] = [
  ["Moins de 30 €", null, 3000],
  ["30 à 60 €", 3000, 6000],
  ["60 à 100 €", 6000, 10000],
  ["Plus de 100 €", 10000, null],
];

/**
 * LE RAIL DE PRIX, AMINCI, ET LA FORME DU CATALOGUE AU-DESSUS.
 *
 * Toujours deux `input[type=range]` natifs superposés : le clavier, le
 * doigt et les lecteurs d'écran viennent avec. Mais sans piste creusée
 * ni pastilles de champ : un trait d'un pixel et demi, deux poignées
 * blanches, les deux prix écrits sous elles.
 *
 * AU-DESSUS, LES BARRES : combien de pièces à chaque prix, pour les
 * filtres posés. Celles qui tombent entre les poignées s'allument. On
 * voit où est le gros du catalogue avant de couper, et ce qu'on laisse
 * en dehors. Elles montent une à une quand le volet s'ouvre : le seul
 * mouvement orchestré de la barre, et il dit quelque chose.
 *
 * Sans la migration 47, pas de barres : le rail reste, seul.
 */
function RailPrix({ f, bornes, ouvert }: { f: EtatFiltres; bornes: Bornes; ouvert: boolean }) {
  const { min, max, pas } = bornes;
  const [bas, haut] = f.prix;
  const etendue = max - min || 1;
  const a = ((bas - min) / etendue) * 100;
  const b = ((haut - min) / etendue) * 100;
  const etPlus = Boolean(bornes.auDela) && haut >= max;

  /* Les barres ne sont demandées qu'une fois le volet ouvert : la
     plupart des visites ne touchent jamais au prix. */
  const [formes, setFormes] = useState<{ url: string; tranches: number[] } | null>(null);
  const [demande, setDemande] = useState(false);
  useEffect(() => {
    if (ouvert) setDemande(true);
  }, [ouvert]);
  useEffect(() => {
    const url = f.adresseDesPrix;
    if (!demande || !url) return;
    let vivant = true;
    chargerFormes(url).then((t) => {
      if (vivant && t && t.length > 1) setFormes({ url, tranches: t });
    });
    return () => {
      vivant = false;
    };
  }, [demande, f.adresseDesPrix]);

  const tranches = formes?.tranches ?? null;
  const dansLeRail = tranches ? tranches.slice(0, -1) : [];
  const auDelaCompte = tranches ? tranches[tranches.length - 1] : 0;
  const tranche = dansLeRail.length ? etendue / dansLeRail.length : 0;
  const plusHaute = Math.max(1, ...dansLeRail);

  /* « La moitié de ces pièces coûtent entre 25 et 63 € » : le premier et
     le troisième quart, lus sur les barres. */
  let moitie: string | null = null;
  if (tranches && tranches.reduce((n, x) => n + x, 0) >= 8) {
    const q1 = quantile(tranches, 0.25, min, tranche);
    const q3 = quantile(tranches, 0.75, min, tranche);
    const arrondi = (c: number) => Math.max(1, Math.round(c / 100));
    moitie =
      q3 >= max && bornes.auDela
        ? `entre ${arrondi(q1)} € et plus de ${arrondi(max)} €`
        : `entre ${arrondi(q1)} et ${arrondi(q3)} €`;
  }

  /* Le navigateur promène le CENTRE de la poignée d'une demi-poignée à la
     largeur moins une demi-poignée. `--p` dit la largeur de la poignée,
     posée en CSS (plus grosse au doigt) ; la position se corrige d'après. */
  const ou = (p: number) => `calc(${p.toFixed(3)}% + var(--p) * ${(0.5 - p / 100).toFixed(4)})`;

  const bougerBas = (v: number) => f.choisirPrix([Math.min(v, haut - pas), haut]);
  const bougerHaut = (v: number) => f.choisirPrix([bas, Math.max(v, bas + pas)]);
  const saisirBas = (v: number) => f.choisirPrix([Math.max(min, Math.min(v, haut)), haut]);
  const saisirHaut = (v: number) => f.choisirPrix([bas, Math.min(max, Math.max(v, bas))]);

  const libelleHaut = etPlus ? `${f.euros(haut)} et plus` : f.euros(haut);
  /* Trop proches, les deux prix se chevauchent : on n'en écrit qu'un. */
  const proches = b - a < 24;

  return (
    <div className="grid gap-x-12 gap-y-5 sm:grid-cols-[minmax(0,560px)_1fr]">
      <div className="bf-rail">
        {tranches && (
          <div className="bf-histo" aria-hidden="true">
            {dansLeRail.map((n, k) => {
              const debut = min + k * tranche;
              const dedans = debut + tranche > bas && (debut < haut || etPlus);
              return (
                <span
                  key={k}
                  data-dedans={dedans ? "" : undefined}
                  style={{ height: `${n ? Math.max(6, (n / plusHaute) * 100) : 2}%`, "--i": k } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}
        <div className="bf-rail-piste">
          <span aria-hidden="true" className="bf-rail-plein" style={{ left: ou(a), right: `calc(100% - ${ou(b)})` }} />
          <input
            type="range"
            min={min}
            max={max}
            step={pas}
            value={bas}
            onChange={(e) => bougerBas(Number(e.target.value))}
            aria-label="Prix minimum"
            aria-valuetext={f.euros(bas)}
            data-curseur-zone="regler"
            data-curseur-mot="Ajuster"
          />
          <input
            type="range"
            min={min}
            max={max}
            step={pas}
            value={haut}
            onChange={(e) => bougerHaut(Number(e.target.value))}
            aria-label="Prix maximum"
            aria-valuetext={libelleHaut}
            data-curseur-zone="regler"
            data-curseur-mot="Ajuster"
          />
        </div>
        <div className="bf-rail-prix" aria-hidden="true">
          {proches ? (
            <span style={{ left: ou((a + b) / 2), transform: `translateX(-${(a + b) / 2}%)` }}>
              {sansEuro(f.euros(bas))} – {libelleHaut}
            </span>
          ) : (
            <>
              <span style={{ left: ou(a), transform: `translateX(-${a}%)` }}>{f.euros(bas)}</span>
              <span style={{ left: ou(b), transform: `translateX(-${b}%)` }}>{libelleHaut}</span>
            </>
          )}
        </div>
        {bornes.auDela && auDelaCompte > 0 && !etPlus && (
          <p className="m-0 mt-1 text-right text-[12px] font-semibold text-white/50">
            {enChiffres(auDelaCompte)} pièce{auDelaCompte > 1 ? "s" : ""} au-delà de {f.euros(max)}
          </p>
        )}
      </div>

      <div className="bf-prix-texte">
        {moitie && (
          <p className="m-0">
            La moitié de ces pièces coûtent <b>{moitie}</b>.
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-5">
          {FOURCHETTES.map(([libelle, de, a2]) => {
            const v: [number, number] = [Math.max(min, de ?? min), Math.min(max, a2 ?? max)];
            if (v[0] >= v[1]) return null;
            const pose = f.prixActif && bas === v[0] && haut === v[1];
            return (
              <button
                key={libelle}
                type="button"
                className="bf-lien bf-fourchette"
                aria-pressed={pose}
                onClick={() => f.choisirPrix(pose ? [min, max] : v)}
              >
                {libelle}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[13px]">
          Au prix près : de <ChampPrix libelle="Prix minimum, en euros" valeur={bas} onValider={saisirBas} /> à{" "}
          <ChampPrix libelle="Prix maximum, en euros" valeur={haut} onValider={saisirHaut} /> €
          {etPlus && " et plus"}
        </div>
      </div>
    </div>
  );
}

/** Des centimes aux euros tels qu'on les tape : « 45 », « 49,90 ». */
const enEuros = (centimes: number) =>
  centimes % 100 === 0 ? String(centimes / 100) : (centimes / 100).toFixed(2).replace(".", ",");

/**
 * Un prix tapé à la main, sur un soulignement. Il ne s'applique qu'en
 * sortant du champ ou sur Entrée : taper « 120 » passerait sinon par
 * « 1 € ».
 */
function ChampPrix({
  libelle,
  valeur,
  onValider,
}: {
  libelle: string;
  valeur: number;
  onValider: (centimes: number) => void;
}) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? enEuros(valeur);
  const valider = () => {
    if (brouillon === null) return;
    const n = Number(brouillon.replace(",", ".").replace(/[^\d.]/g, ""));
    setBrouillon(null);
    if (brouillon.trim() !== "" && Number.isFinite(n)) onValider(Math.round(n * 100));
  };
  return (
    <input
      type="text"
      aria-label={libelle}
      inputMode="decimal"
      autoComplete="off"
      value={affiche}
      size={Math.max(2, affiche.length)}
      onFocus={(e) => {
        setBrouillon(affiche);
        e.currentTarget.select();
      }}
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="bf-champ bf-champ-prix"
    />
  );
}
