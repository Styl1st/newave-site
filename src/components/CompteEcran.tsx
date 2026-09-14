"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IconBack,
  IconChevron,
  IconClock,
  IconCoeur,
  IconGrid,
  IconImage,
  IconTag,
  IconUser,
} from "./Icons";
import { LogoutButton } from "./AccountForms";
import { decrireApparence, lire } from "@/lib/theme";

/**
 * Le dessin d'une tuile ne traverse pas la frontière serveur.
 *
 * `compte/page.tsx` s'exécute sur le serveur : il peut envoyer du texte
 * et des nombres, pas une fonction. Il envoie donc une clé, et la
 * correspondance vit ici. Elles sont celles du README : favoris →
 * cœur, espace marque → étiquette, administration → grille.
 */
const ICONES = {
  favoris: IconCoeur,
  marque: IconTag,
  admin: IconGrid,
} as const;

/** Une entrée du groupe « Mes espaces » : un lien, et ce qu'il contient. */
export type Espace = {
  href: string;
  label: string;
  /** Ce que la tuile écrit sous le libellé : « 3 marques ». */
  note: string;
  /** `null` pour une entrée qui n'a rien à compter, comme l'administration. */
  compte: number | null;
  icone: keyof typeof ICONES;
};

/** Ce que le bandeau du hub a besoin de savoir de la personne. */
export type Identite = {
  nom: string;
  email: string | null;
  initiale: string;
  /** Le rôle écrit, ou `null` pour un membre — on ne badge pas l'ordinaire. */
  role: string | null;
};

type Onglet = "profil" | "apparence";

/*
 * Deux onglets, et pas quatre.
 *
 * Le gabarit dessine aussi « Sécurité » et « Notifications ». Le mot de
 * passe vit dans la page « Mon compte », où le gabarit le range
 * lui-même : une ligne « Sécurité » n'aurait donc rien à ouvrir. Quant
 * aux notifications, rien ne les enregistre encore — la ligne reste,
 * mais inerte et marquée, parce qu'annoncer une suite est honnête et
 * faire mine de la régler ne l'est pas.
 */
const REGLAGES = [
  { id: "profil" as const, label: "Profil", Icone: IconUser },
  { id: "apparence" as const, label: "Apparence", Icone: IconImage },
];

export default function CompteEcran({
  espaces,
  identite,
  apparenceInitiale,
  profil,
  apparence,
}: {
  espaces: Espace[];
  identite: Identite;
  /**
   * « NEWAVE · Sombre », tel que le compte le sait au moment du rendu.
   *
   * Il ne peut pas être lu du navigateur ici : le serveur écrirait un
   * texte et le client un autre, et React refuserait l'hydratation. Le
   * stockage local prend le relais au retour de la page Apparence, là
   * où il est à jour.
   */
  apparenceInitiale: string;
  /** La page « Mon compte », rendue sur le serveur et passée telle quelle. */
  profil: React.ReactNode;
  /** La page « Apparence ». */
  apparence: React.ReactNode;
}) {
  const [onglet, setOnglet] = useState<Onglet>("profil");
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);

  /*
   * `ouvert` NE VAUT QUE POUR LE TÉLÉPHONE, et `onglet` vaut pour les
   * deux. À partir de `lg`, le rail et le volet sont côte à côte : il
   * y a toujours quelque chose à afficher, et `ouvert` est ignoré.
   * En dessous, le hub occupe l'écran seul tant qu'on n'a rien ouvert.
   *
   * Les deux états sont séparés exprès. Un seul état à trois valeurs
   * — hub, profil, apparence — laisserait le grand écran sans volet à
   * montrer au moment où l'on agrandit la fenêtre depuis le hub.
   */
  const [ouvert, setOuvert] = useState(false);

  /*
   * LE BOUTON RETOUR DU TÉLÉPHONE DOIT RAMENER AU HUB, PAS QUITTER LE
   * SITE. Une sous-page qui n'est pas une adresse n'existe pas pour le
   * navigateur : sans cette entrée d'historique, le geste de retour —
   * le seul que tout le monde connaisse — sortirait de `/compte`
   * depuis l'Apparence.
   *
   * On empile une entrée SANS changer l'adresse : `/compte?vue=…` ne
   * serait lue par personne au rechargement, et promettrait une page
   * qui ne s'ouvrirait pas. L'état de Next est recopié tel quel, sinon
   * son routeur perd la clé qui lui sert à restaurer le défilement.
   */
  useEffect(() => {
    const auRetour = () => setOuvert(Boolean(window.history.state?.compteVue));
    window.addEventListener("popstate", auRetour);
    return () => window.removeEventListener("popstate", auRetour);
  }, []);

  /* Le focus suit ce qu'on ouvre et revient d'où il vient : sans ça, un
     lecteur d'écran reste sur le hub caché et ne lit rien de la page
     qui vient d'apparaître. Même mécanique que la feuille de l'index
     alphabétique. */
  const volets = useRef<HTMLDivElement>(null);
  const ouvreurs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dernierOuvert = useRef<Onglet | null>(null);

  useEffect(() => {
    /*
     * `preventScroll`, ET C'EST TOUT LE SUJET. Donner le focus à un bloc
     * le fait remonter sous le haut de la fenêtre — donc sous la barre
     * du site, qui y est collée : le bouton de retour disparaissait
     * derrière elle à l'instant où la page s'ouvrait. On place donc le
     * défilement à la main, en haut, là où commence une page qu'on
     * vient d'ouvrir.
     */
    if (ouvert) {
      volets.current?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return;
    }
    if (dernierOuvert.current) {
      ouvreurs.current[dernierOuvert.current]?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }, [ouvert]);

  function ouvrir(id: Onglet) {
    dernierOuvert.current = id;
    setOnglet(id);
    setOuvert(true);
    window.history.pushState({ ...window.history.state, compteVue: id }, "");
  }

  function fermer() {
    /* On consomme notre propre entrée plutôt que d'en empiler une
       seconde : sinon deux retours seraient nécessaires pour sortir. */
    if (window.history.state?.compteVue) window.history.back();
    else setOuvert(false);
  }

  /*
   * Les flèches parcourent le rail, comme dans n'importe quel jeu
   * d'onglets. Sans elles, `role="tablist"` promet un fonctionnement
   * au clavier que la page ne tient pas : mieux vaut alors ne rien
   * promettre du tout.
   */
  function auClavier(e: React.KeyboardEvent<HTMLDivElement>) {
    const rang = REGLAGES.findIndex((r) => r.id === onglet);
    let vise = rang;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") vise = (rang + 1) % REGLAGES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      vise = (rang - 1 + REGLAGES.length) % REGLAGES.length;
    else if (e.key === "Home") vise = 0;
    else if (e.key === "End") vise = REGLAGES.length - 1;
    else return;

    e.preventDefault();
    setOnglet(REGLAGES[vise].id);
    boutons.current[vise]?.focus();
  }

  /*
   * L'ÉTAT DE L'APPARENCE SE RELIT AU RETOUR AU HUB, et seulement là.
   *
   * Le nom de l'ambiance n'est écrit nulle part dans la page : il se
   * déduit des couleurs. Le relire pendant qu'on règle demanderait à
   * `ThemePicker` de prévenir à chaque geste — donc de toucher à
   * `poser()`, qui est exactement ce qu'on ne fait pas dans ce
   * chantier. Or il n'y a qu'un seul instant où ce texte se voit :
   * celui où l'on revient. La copie locale est à jour à cet instant,
   * puisque `poser()` l'écrit avant tout le reste.
   */
  const [etatApparence, setEtatApparence] = useState(apparenceInitiale);
  useEffect(() => {
    if (!ouvert) setEtatApparence(decrireApparence(lire()));
  }, [ouvert]);

  /*
   * Une seule écriture pour les deux mises en page : pastille qui défile
   * sur téléphone, ligne pleine largeur dans le rail à partir de `lg`.
   * `min-h-11` tient la cible tactile à quarante-quatre pixels, ce que
   * la ligne de onze pixels du gabarit ne donne pas au doigt.
   */
  const ligne =
    "flex min-h-11 shrink-0 items-center gap-[11px] whitespace-nowrap rounded-full px-4 text-[13.5px] transition active:scale-[.97] lg:min-h-0 lg:w-full lg:rounded-[13px] lg:px-3 lg:py-[11px]";
  const active = "bg-white font-extrabold text-[var(--color-ink)]";
  const repos = "font-bold text-white/78 hover:bg-white/12 hover:text-white";
  const sousTitre =
    "m-0 hidden text-[9.5px] font-black uppercase tracking-[0.2em] text-white/72 lg:block";

  return (
    /*
     * `grid-cols-[minmax(0,1fr)]` DÈS LE PREMIER PALIER, ET CE N'EST PAS
     * DÉCORATIF — c'est ce qui a cassé la page sur téléphone.
     *
     * Sans template, une grille se donne une colonne IMPLICITE, et une
     * colonne implicite est dimensionnée en `auto`, c'est-à-dire à la
     * largeur du contenu le plus large qu'elle porte. Une seule rangée
     * de pastilles trop longue suffit alors à emmener toute la page
     * avec elle : les cartes, les blocs de formulaire, les champs.
     * Le débordement d'un seul enfant était payé par tous les autres.
     *
     * `minmax(0,1fr)` autorise la colonne à descendre sous la largeur de
     * son contenu. Ce qui déborde redevient ce qu'il est — une zone qui
     * défile toute seule — et ses voisins tiennent dans l'écran.
     *
     * La version `lg:` l'écrivait déjà correctement. C'est le palier
     * téléphone qui avait été laissé implicite.
     */
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-[26px]">
      {/* ---------- le rail, à partir de `lg` seulement ----------

          Il ne pouvait pas rester une colonne sur téléphone : deux cent
          cinquante pixels sur un écran qui en fait trois cent quatre-
          vingt-dix ne laissent rien au contenu. Il a longtemps été une
          rangée qui défilait à l'horizontale ; c'est le hub ci-dessous
          qui le remplace, et les deux ne coexistent jamais. */}
      <aside className="glass rise rise-1 hidden min-w-0 p-4 lg:block">
        <p className={sousTitre}>Réglages</p>

        <div
          role="tablist"
          aria-label="Réglages du compte"
          onKeyDown={auClavier}
          className="mt-2 flex flex-col items-stretch gap-1"
        >
          {REGLAGES.map(({ id, label, Icone }, rang) => {
            const choisi = onglet === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  boutons.current[rang] = el;
                }}
                type="button"
                role="tab"
                id={`onglet-${id}`}
                aria-selected={choisi}
                aria-controls={`volet-${id}`}
                tabIndex={choisi ? 0 : -1}
                onClick={() => setOnglet(id)}
                className={`${ligne} ${choisi ? active : repos}`}
              >
                <Icone className="h-[17px] w-[17px]" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Annoncée, jamais promise : rien ne l'enregistre encore. Hors
            du `tablist`, parce qu'elle n'ouvre aucun volet — l'y laisser
            ferait annoncer « onglet 3 sur 3 » pour une ligne morte. */}
        <span
          className={`${ligne} mt-1 font-bold text-white/40 lg:justify-between`}
          title="Cette section n'est pas encore en service."
        >
          <span className="flex items-center gap-[11px]">
            <IconClock className="h-[17px] w-[17px]" />
            Notifications
          </span>
          <span className="ml-2 rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/55">
            À venir
          </span>
        </span>

        <p className={`${sousTitre} lg:mt-5`}>Mes espaces</p>

        <div className="mt-2 flex flex-col items-stretch gap-1">
          {espaces.map((e) => (
            <Link key={e.href} href={e.href} className={`${ligne} ${repos} lg:justify-between`}>
              <span className="truncate">{e.label}</span>
              {e.compte !== null && (
                <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-white/45">
                  {e.compte}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-4 border-t border-white/15 pt-4">
          <LogoutButton />
        </div>
      </aside>

      {/* ---------- le hub, au doigt ----------

          Il porte les mêmes destinations que le rail, jamais en même
          temps que lui : au-dessus de `lg` il n'existe pas, en dessous
          le rail n'existe pas. C'est là toute la règle du chantier —
          un lien ne se rend qu'à un seul endroit visible. */}
      <section
        aria-label="Mon compte"
        className={`${ouvert ? "hidden" : "flex"} rise flex-col gap-6 lg:hidden`}
      >
        {/* ---- qui l'on est, en une ligne ----
            Pas de gros titre : la page est déjà nommée par la
            navigation, et les quatre-vingts pixels qu'il prenait sont
            exactement ce qui manquait pour que le hub tienne sans
            défiler. */}
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[16px] text-[19px] font-black text-white"
            style={{
              background:
                "linear-gradient(140deg, rgba(var(--accent-1), .5), rgba(var(--accent-2), .44))",
            }}
          >
            {identite.initiale}
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[17px] font-extrabold leading-tight text-white">
              {identite.nom}
            </p>
            {identite.email && (
              <p className="m-0 mt-0.5 truncate text-[12.5px] font-semibold text-white/55">
                {identite.email}
              </p>
            )}
          </div>
          {identite.role && <span className="badge shrink-0">{identite.role}</span>}
        </div>

        {/* ---- mes espaces ---- */}
        <div>
          <p className="eyebrow m-0 mb-2.5">Mes espaces</p>
          <div className="grid grid-cols-2 gap-[11px]">
            {espaces.map((e, rang) => {
              const Icone = ICONES[e.icone];
              /*
               * EN NOMBRE IMPAIR, LA DERNIÈRE TUILE PREND LES DEUX
               * COLONNES. Un membre simple n'a qu'un espace — les
               * favoris — et c'est le cas le plus fréquent du site.
               * Sans cette règle il voit une tuile et un trou, et un
               * trou dans une grille se lit comme une case qui manque.
               */
              const seule = espaces.length % 2 === 1 && rang === espaces.length - 1;
              return (
                /* Le rayon est posé en ligne : `.card-light` déclare le
                   sien hors de toute couche CSS, où une classe Tailwind
                   ne peut pas le reprendre. Le liseré `::before` en
                   hérite. */
                <Link
                  key={e.href}
                  href={e.href}
                  style={{ borderRadius: "20px" }}
                  className={`card-light flex min-h-[124px] flex-col justify-between p-4 ${
                    seule ? "col-span-2" : ""
                  }`}
                >
                  <span className="relative z-3 flex items-start justify-between gap-2">
                    <Icone className="h-[34px] w-[34px] text-[#3a2470]" />
                    {e.compte !== null && (
                      <span className="text-[26px] font-black leading-none tabular-nums text-[var(--color-ink)]">
                        {e.compte}
                      </span>
                    )}
                  </span>
                  <span className="relative z-3 mt-3 block min-w-0">
                    <span className="block text-[15.5px] font-extrabold leading-tight text-[var(--color-ink)]">
                      {e.label}
                    </span>
                    <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a5a92]">
                      {e.note}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ---- réglages ---- */}
        <div>
          <p className="eyebrow m-0 mb-2.5">Réglages</p>
          <div className="glass overflow-hidden" style={{ borderRadius: "18px" }}>
            <button
              type="button"
              ref={(el) => {
                ouvreurs.current.profil = el;
              }}
              onClick={() => ouvrir("profil")}
              aria-controls="volet-profil"
              aria-expanded={ouvert && onglet === "profil"}
              className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/10"
            >
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-white/13 text-white">
                <IconUser className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-white">Mon compte</span>
                <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-white/50">
                  Nom, email, mot de passe
                </span>
              </span>
              <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-white/42" />
            </button>

            <span aria-hidden className="block h-px bg-white/12" />

            <button
              type="button"
              ref={(el) => {
                ouvreurs.current.apparence = el;
              }}
              onClick={() => ouvrir("apparence")}
              aria-controls="volet-apparence"
              aria-expanded={ouvert && onglet === "apparence"}
              className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/10"
            >
              {/*
               * LA VIGNETTE PEINT LES VARIABLES DU DOCUMENT, PAS UN
               * ÉTAT. Le dégradé posé sur la page EST l'ambiance en
               * cours : en le reprenant tel quel, cette pastille ne
               * peut pas mentir, et elle n'a rien à relire quand les
               * couleurs changent.
               */}
              <span
                aria-hidden
                className="h-[34px] w-[34px] shrink-0 rounded-[11px] border border-white/25"
                style={{
                  background:
                    "linear-gradient(140deg, var(--bg-1), var(--bg-3) 48%, var(--bg-5))",
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-white">Apparence</span>
                <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-white/50">
                  {etatApparence}
                </span>
              </span>
              <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-white/42" />
            </button>

            <span aria-hidden className="block h-px bg-white/12" />

            {/* Annoncée, jamais promise. Ce n'est pas un bouton : rien
                ne l'enregistre encore, et un bouton qui n'ouvre rien
                s'essaie deux fois avant qu'on renonce. */}
            <div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-white/8 text-white/40">
                <IconClock className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-white/40">Notifications</span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                À venir
              </span>
            </div>
          </div>
        </div>

        <LogoutButton classe="flex min-h-[52px] w-full items-center justify-center rounded-[16px] border border-white/30 bg-white/9 px-6 text-[13px] font-extrabold text-white transition active:scale-[.98]" />
      </section>

      {/* ---------- les volets ----------

          Les deux restent montés, et l'on masque celui qu'on ne regarde
          pas — au doigt comme au grand écran. Démonter l'Apparence à
          chaque aller-retour relancerait la lecture des préférences et
          effacerait le « Enregistré » à l'instant où il vient de
          s'afficher. C'est la raison pour laquelle le hub est un état
          et non une route. */}
      <div
        ref={volets}
        tabIndex={-1}
        className={`min-w-0 outline-none ${ouvert ? "" : "hidden lg:block"}`}
      >
        {/* Le retour n'existe qu'au doigt : au grand écran, le rail est
            resté à côté et l'on n'a jamais quitté le hub. */}
        <button
          type="button"
          onClick={fermer}
          className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-white/9 pl-3.5 pr-5 text-[13px] font-bold text-white transition active:scale-[.97] lg:hidden"
        >
          <IconBack className="h-4 w-4" />
          Retour
        </button>

        <div
          role="tabpanel"
          id="volet-profil"
          aria-labelledby="onglet-profil"
          className={onglet === "profil" ? "" : "hidden"}
        >
          {profil}
        </div>
        <div
          role="tabpanel"
          id="volet-apparence"
          aria-labelledby="onglet-apparence"
          className={onglet === "apparence" ? "" : "hidden"}
        >
          {apparence}
        </div>
      </div>
    </div>
  );
}
