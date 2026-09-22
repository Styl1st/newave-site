"use client";

import { useEffect, useRef, useState } from "react";
import { enregistrerApparence } from "@/app/apparence-actions";
import { IconBack, IconCheck, IconChevron, IconPlus, IconTrash } from "./Icons";
import {
  FOND_DEFAUT,
  MOUVEMENT_DEFAUT,
  PREFERENCES_DEFAUT,
  PRESETS,
  THEME_DEFAUT,
  appliquerClarte,
  appliquerFond,
  appliquerMouvement,
  appliquerTheme,
  decrireApparence,
  ecrire,
  lire,
  PALIERS_MOUVEMENT,
  barreDepuisMouvement,
  memeTheme,
  mouvementDepuisBarre,
  nomDuMouvement,
  sixDepuisTrois,
  troisDepuisSix,
  type Ambiance,
  type Preferences,
  type Theme,
  type TroisTeintes,
} from "@/lib/theme";



function Vignette({ theme }: { theme: Theme }) {
  return (
    <span
      className="block h-[52px] w-full"
      style={{ background: `linear-gradient(140deg, ${theme.bg.join(", ")})` }}
    />
  );
}

export default function ThemePicker({
  /** Ce qui est enregistré sur le compte, s'il y en a un. */
  duCompte = null,
  connecte = false,
}: {
  duCompte?: Preferences | null;
  connecte?: boolean;
}) {
  const [prefs, setPrefs] = useState<Preferences>(duCompte ?? PREFERENCES_DEFAUT);
  const [charge, setCharge] = useState(false);
  const [nomEnCours, setNomEnCours] = useState<string | null>(null);
  /* Pourquoi un enregistrement n'a pas eu lieu. Se tait dès qu'on
     touche à une couleur : le refus ne vaut que pour le thème qui l'a
     provoqué. */
  const [refus, setRefus] = useState<string | null>(null);
  const [systemeReduit, setSystemeReduit] = useState(false);
  const [etat, setEtat] = useState<"repos" | "envoi" | "garde" | "panne">("repos");

  const differe = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * DEUX NIVEAUX, ET SEULEMENT AU DOIGT.
   *
   * Tout tenait sur un seul écran : le fond, les ambiances, les six
   * teintes, les trois nappes, les pastilles de mouvement, deux
   * curseurs, deux champs de nom et un retour aux réglages par défaut.
   * Quatre écrans de téléphone empilés pour une page où la plupart des
   * gens viennent choisir une ambiance et repartir.
   *
   * Le premier niveau garde donc ce qu'on vient chercher — l'aperçu,
   * clair ou sombre, les ambiances toutes prêtes — et « Composer »
   * ouvre le reste. À partir de `lg`, où la place existe, les deux
   * niveaux redeviennent une seule page : c'est exactement ce qu'elle
   * est aujourd'hui, et elle ne bouge pas.
   */
  const [composer, setComposer] = useState(false);

  /* Le repli des six teintes calculées. Fermé par défaut : c'est une
     vérification, pas une étape du réglage. */
  const [sixOuvertes, setSixOuvertes] = useState(false);

  /*
   * ON NE RÉÉCRIT JAMAIS UN THÈME QUE LA PERSONNE N'A PAS TOUCHÉ.
   *
   * Un thème composé avec l'ancien écran a six couleurs libres, qui ne
   * sont pas forcément l'interpolation de trois d'entre elles. À
   * `null`, cet état veut dire « les six enregistrées font foi » : on
   * montre leurs rangs 0, 2 et 5 dans les trois sélecteurs, et la page
   * continue d'afficher le dégradé d'origine, au pixel près.
   *
   * ⚠️ SEULE UNE DES TROIS TEINTES LE REMPLIT. Changer un Halo, le
   * mouvement ou le mode clair écrit aussi dans `prefs`, et ne doit
   * surtout pas recalculer le dégradé : la personne n'y a pas touché.
   * C'est pour ça que le déclencheur est ici, dans `poserTeinte`, et
   * pas dans `poser`.
   */
  const [troisTeintes, setTroisTeintes] = useState<TroisTeintes | null>(null);

  useEffect(() => {
    // Le compte fait foi : c'est le réglage de la personne, pas celui
    // de la machine sur laquelle elle se trouve. Le stockage local ne
    // reprend la main que pour un visiteur sans compte.
    setPrefs(duCompte ?? lire());
    setSystemeReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCharge(true);
  }, [duCompte]);

  useEffect(() => () => { if (differe.current) clearTimeout(differe.current); }, []);

  /**
   * Enregistre et applique d'un même geste : l'aperçu doit être
   * immédiat.
   *
   * `immediat` SAUTE LE DIFFÉRÉ, et ce n'est pas un raccourci de
   * confort. Les sept cents millisecondes existent pour les rails : un
   * curseur envoie une douzaine de valeurs par seconde, et sans elles
   * chaque frémissement du doigt deviendrait une écriture en base.
   * Enregistrer une ambiance ou en supprimer une n'est pas ça : c'est
   * un geste unique, décidé, qu'on ne refait pas deux fois de suite. Le
   * différer ouvrait une fenêtre de sept cents millisecondes pendant
   * laquelle un rechargement, une fermeture d'onglet ou une navigation
   * perdait l'enregistrement — et comme le compte fait foi au
   * chargement suivant, l'ambiance disparaissait sans rien dire.
   */
  function poser(next: Preferences, immediat = false) {
    setPrefs(next);
    appliquerTheme(next.theme, document.documentElement);
    appliquerMouvement(next.mouvement, document.documentElement, true);
    /*
     * SANS COMPTE, LE FOND RESTE FIXE, QUOI QUE DISE LE NAVIGATEUR.
     *
     * `lire()` peut très bien rendre un `fond: "anime"` laissé dans le
     * stockage local par une session connectée précédente, sur un
     * ordinateur partagé ou après une déconnexion. Sans cette garde, un
     * simple changement de couleur rallumerait le décor pour quelqu'un
     * qui n'a pas de compte, ce qui est exactement ce que le réglage
     * cherche à empêcher.
     */
    appliquerFond(connecte ? next.fond : FOND_DEFAUT, document.documentElement);
    appliquerClarte(Boolean(next.clair), document.documentElement);

    // On garde toujours une copie locale : c'est elle qui peint les
    // bonnes couleurs avant même que le JavaScript démarre.
    ecrire(next);

    if (!connecte) return;

    /*
     * Vers le compte, on temporise. Un curseur de vitesse envoie une
     * douzaine de valeurs par seconde : sans ce délai, chaque petit
     * mouvement du doigt deviendrait une écriture en base.
     */
    if (differe.current) clearTimeout(differe.current);
    setEtat("envoi");

    const envoyer = async () => {
      /*
       * L'APPEL PEUT ÉCHOUER AVANT MÊME D'ARRIVER, et il faut le
       * rattraper ici.
       *
       * `enregistrerApparence` est une action serveur : le navigateur
       * la joint par le réseau. Une coupure, un onglet qui s'endort, un
       * serveur de développement qui recompile pendant que la requête
       * vole, et `fetch` rejette — `TypeError: Failed to fetch`. Dans
       * un `setTimeout` asynchrone, personne n'attend cette promesse :
       * le rejet remontait donc en erreur non rattrapée, et Next
       * l'affichait en plein écran pour un réglage de couleur.
       *
       * CE QU'ON PERD EST PETIT, ET IL FAUT LE DIRE QUAND MÊME. La
       * copie locale est déjà écrite quelques lignes plus haut, donc
       * l'apparence tient sur cet appareil et survit au rechargement.
       * C'est la synchronisation vers le compte qui n'a pas eu lieu, et
       * se taire laisserait croire que le réglage suivra sur le
       * téléphone alors qu'il ne suivra pas.
       */
      try {
        const res = await enregistrerApparence(next);
        setEtat(res.ok ? "garde" : "panne");
      } catch {
        setEtat("panne");
      }
    };

    /* `void` et non `await` : `poser` n'est pas asynchrone, et
       `envoyer` rattrape déjà tout ce qui peut échouer. */
    if (immediat) void envoyer();
    else differe.current = setTimeout(envoyer, 700);
  }


  /** Les trois teintes à montrer : celles qu'on a posées, ou les rangs
      0, 2 et 5 du thème enregistré tant qu'on n'a touché à rien. */
  const teintes = troisTeintes ?? troisDepuisSix(prefs.theme.bg);

  /** Poser une des trois, et recalculer les six à partir de là. */
  function poserTeinte(cle: keyof TroisTeintes, valeur: string) {
    /* Le refus ne valait que pour le thème qui l'a provoqué. */
    setRefus(null);
    const suite = { ...teintes, [cle]: valeur };
    setTroisTeintes(suite);
    poser({ ...prefs, theme: { ...prefs.theme, bg: sixDepuisTrois(suite) } });
  }

  /*
   * LA BARRE LIT LE FOND D'ABORD.
   *
   * Un compte neuf a `fond: "fixe"` — par défaut, pour tout le monde,
   * voir le type `Fond` — et un mouvement à ses valeurs de départ. Sans
   * cette lecture dans cet ordre, la barre s'ouvrirait sur « Animé »
   * alors que le décor ne bouge pas, ce qui est le genre de
   * contradiction qu'on est justement venu supprimer.
   *
   * `reglage` a disparu avec les deux curseurs : la barre n'applique
   * qu'au `change`, et un `input[type=range]` n'en émet un qu'à chaque
   * cran, pas à chaque pixel. Le thème n'est donc pas recomposé pendant
   * le glissement, ce qui était la raison d'être de l'ancien différé.
   */
  const barre = barreDepuisMouvement(connecte ? prefs.fond : FOND_DEFAUT, prefs.mouvement);

  function reglerBarre(v: number) {
    const { fond, mouvement } = mouvementDepuisBarre(v, prefs.mouvement);
    poser({ ...prefs, fond, mouvement });
  }

  function enregistrerAmbiance(nom: string) {
    const propre = nom.trim().slice(0, 30);
    if (!propre) return;

    const existantes = [...PRESETS, ...prefs.ambiances];

    // Deux ambiances du même nom ne se distinguent plus dans la liste :
    // on refuse plutôt que de laisser créer un doublon inutilisable.
    if (existantes.some((a) => a.nom.toLowerCase() === propre.toLowerCase())) {
      setRefus(`« ${propre} » existe déjà.`);
      setNomEnCours(null);
      return;
    }

    /*
     * DEUX AMBIANCES AUX MÊMES COULEURS, C'EST LE MÊME PROBLÈME QU'AUX
     * MÊMES NOMS, et il se refusait moins bien.
     *
     * On tombe dessus en enregistrant sans avoir rien changé depuis le
     * dernier choix : on clique « Forêt », on clique « Enregistrer ces
     * couleurs », et l'on obtient une vignette identique à Forêt, au
     * même dégradé, avec deux coches allumées puisque les deux
     * correspondent. Ça se lit comme un bug d'affichage, et le nom
     * qu'on vient de taper n'aide pas : il désigne des couleurs qui
     * portent déjà un nom.
     *
     * On le dit donc avant de créer quoi que ce soit, en nommant
     * l'ambiance qui les porte déjà.
     */
    const jumelle = existantes.find((a) => memeTheme(a.theme, prefs.theme));
    if (jumelle) {
      setRefus(`Ces couleurs sont déjà enregistrées sous « ${jumelle.nom} ».`);
      setNomEnCours(null);
      return;
    }

    const ambiance: Ambiance = {
      id: `perso-${Date.now()}`,
      nom: propre,
      theme: prefs.theme,
    };
    setRefus(null);
    /* Un geste décidé : il part tout de suite. Voir `poser`. */
    poser({ ...prefs, ambiances: [...prefs.ambiances, ambiance] }, true);
    setNomEnCours(null);
  }

  if (!charge) return <div className="skeleton h-64 w-full" />;

  const toutes = [...PRESETS, ...prefs.ambiances];

  /* Le rang de la PREMIÈRE ambiance qui porte les couleurs en cours,
     ou -1 quand elles ont été composées à la main. */
  const rangActif = toutes.findIndex((a) => memeTheme(a.theme, prefs.theme));

  // `min-h-11` seulement au doigt : ces pastilles font trente-quatre
  // pixels de haut, et une cible tactile en fait quarante-quatre.
  const chip =
    "min-h-11 rounded-full px-4 py-2 text-[12px] font-bold transition active:scale-[.97] sm:min-h-0";

  const etiquette =
    "text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/50";

  /* Ce qui se voit au premier niveau, ce qui attend au second. Les deux
     s'annulent à partir de `lg` : la page y est entière. */
  const niveau1 = composer ? "hidden lg:block" : "";
  const niveau2 = composer ? "" : "hidden lg:block";

  return (
    /*
     * `data-no-reveal` : les panneaux de réglage ne s'inclinent pas au
     * défilement. C'est une table de travail, pas une vitrine — et un
     * bloc qui bascule pendant qu'on vise une pastille de couleur se
     * manque.
     */
    <div data-no-reveal className="flex flex-col gap-5">
      {/* Dire où va le réglage évite de le refaire sur chaque appareil
          en croyant qu'il ne s'enregistre pas. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[13px] bg-white/10 px-4 py-3">
        <p className="m-0 min-w-0 text-[12.5px] leading-relaxed text-white/80">
          {connecte ? (
            <>
              Ces réglages te suivent sur tous tes appareils.
            </>
          ) : (
            <>
              Ces réglages ne valent que pour ce navigateur.{" "}
              <a href="/connexion" className="font-bold text-white underline underline-offset-2">
                Connecte-toi
              </a>{" "}
              pour les retrouver sur tous tes appareils.
            </>
          )}
        </p>

        {connecte && etat === "envoi" && (
          <span className="shrink-0 text-[11.5px] font-semibold text-white/55">
            Enregistrement…
          </span>
        )}
        {connecte && etat === "panne" && (
          <span className="flex shrink-0 items-center gap-2 text-[11.5px] font-extrabold text-white">
            <span
              aria-hidden
              className="h-[7px] w-[7px] rounded-full bg-[rgb(var(--accent-1))] shadow-[0_0_0_3px_rgba(var(--accent-1),0.22)]"
            />
            Gardé ici, pas sur ton compte
          </span>
        )}
        {connecte && etat === "garde" && (
          <span className="flex shrink-0 items-center gap-2 text-[11.5px] font-extrabold text-white">
            <span
              aria-hidden
              className="h-[7px] w-[7px] rounded-full bg-[#57d99a] shadow-[0_0_0_3px_rgba(87,217,154,0.22)]"
            />
            Enregistré
          </span>
        )}
      </div>

      {/*
       * Deux colonnes seulement à partir de `xl` : en dessous, la
       * colonne de droite tomberait sous les trois cent quarante
       * pixels qu'il lui faut pour que l'aperçu reste lisible.
       *
       * ⚠️ EN DESSOUS, CE N'EST PLUS UNE GRILLE MAIS UNE COLONNE
       * SOUPLE, et les deux enveloppes passent en `contents` : leurs
       * blocs deviennent alors les enfants directs de cette colonne,
       * et l'aperçu peut remonter en tête par `order` alors qu'il
       * appartient à l'autre enveloppe.
       *
       * C'est aussi ce qui rend l'aperçu COLLANT possible. Un élément
       * collé est borné par sa zone de grille ; dans une grille à une
       * seule colonne, cette zone est exactement sa propre boîte, et il
       * ne colle à rien. Dans une colonne souple, il est borné par
       * toute la colonne — donc par toute la page de réglages.
       *
       * Le template explicite reste écrit pour `xl` : une colonne de
       * grille implicite est dimensionnée en `auto`, donc à la largeur
       * de son contenu le plus large — ici les rangées de pastilles de
       * couleur, qui déborderaient l'écran et emmèneraient tout le
       * reste avec elles. Voir `CompteEcran`. Une colonne souple, elle,
       * ne prend jamais la largeur de son contenu : c'est son parent
       * qui la lui donne.
       */}
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        {/* ================= les réglages ================= */}
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">

          {/* ---- ambiances ---- */}
          <section className={`glass p-4 sm:p-5 ${niveau1}`}>
            <p className="eyebrow m-0 mb-3">Ambiances</p>
            {/*
             * UNE SEULE COCHE, ET C'EST LE PREMIER QUI CORRESPOND.
             *
             * `memeTheme` compare des couleurs, pas des identités : deux
             * ambiances aux mêmes six teintes se reconnaissent toutes
             * les deux dans le thème courant, et s'allumaient donc
             * ensemble. On croit à un bug d'affichage, et c'en est un.
             * C'est exactement la correction qu'avaient reçue les
             * réglages de mouvement avant qu'ils ne disparaissent.
             *
             * Enregistrer une ambiance identique à une autre est
             * maintenant refusé (voir `enregistrerAmbiance`), donc le
             * cas ne devrait plus se créer. Mais les doublons déjà
             * enregistrés, eux, existent encore.
             */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {toutes.map((a, rang) => {
                const actif = rang === rangActif;
                const perso = a.id.startsWith("perso-");
                return (
                  <div key={a.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        /* Une ambiance toute prête a ses six teintes,
                           choisies à la main et pas interpolées. On
                           repasse donc à `null` : ce sont ses valeurs
                           qui font foi, et les trois sélecteurs
                           montreront ses rangs 0, 2 et 5. */
                        setTroisTeintes(null);
                        poser({ ...prefs, theme: a.theme });
                      }}
                      className={`w-full overflow-hidden rounded-[14px] border transition active:scale-[.97] ${
                        actif
                          ? "border-white shadow-[0_0_0_3px_rgba(255,255,255,0.34)]"
                          : "border-white/25 hover:border-white/60"
                      }`}
                    >
                      <Vignette theme={a.theme} />
                      <span className="flex items-center justify-center gap-1.5 bg-white/8 py-[9px] text-[11.5px] font-bold text-white">
                        {actif && <IconCheck className="h-3 w-3" />}
                        <span className="truncate px-1">{a.nom}</span>
                      </span>
                    </button>

                    {perso && (
                      <button
                        type="button"
                        onClick={() =>
                          poser(
                            {
                              ...prefs,
                              ambiances: prefs.ambiances.filter((x) => x.id !== a.id),
                            },
                            true
                          )
                        }
                        aria-label={`Supprimer l'ambiance ${a.nom}`}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-[rgba(20,8,50,0.7)] text-white backdrop-blur-sm transition hover:bg-[#c2273f]"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* ---- créer la sienne ---- */}
              {nomEnCours === null ? (
                <button
                  type="button"
                  onClick={() => setNomEnCours("")}
                  title="Enregistrer les couleurs actuelles sous un nom"
                  className="flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-white/35 text-white/70 transition hover:border-white/70 hover:bg-white/8 hover:text-white active:scale-[.97]"
                >
                  <IconPlus className="h-5 w-5" />
                  <span className="text-center text-[11.5px] font-bold leading-tight">
                    Enregistrer
                    <br />
                    ces couleurs
                  </span>
                </button>
              ) : (
                <div className="flex h-[84px] flex-col justify-center gap-2 rounded-[14px] border border-white/45 bg-white/10 p-2">
                  <input
                    autoFocus
                    value={nomEnCours}
                    onChange={(e) => setNomEnCours(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") enregistrerAmbiance(nomEnCours);
                      if (e.key === "Escape") setNomEnCours(null);
                    }}
                    placeholder="Son nom…"
                    maxLength={30}
                    className="champ champ-petit"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => enregistrerAmbiance(nomEnCours)}
                      className="flex-1 rounded-full bg-white py-1.5 text-[11px] font-black text-[var(--color-ink)]"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setNomEnCours(null)}
                      className="rounded-full border border-white/40 px-3 py-1.5 text-[11px] font-bold text-white/80"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ce texte occupe la même place quoi qu'il arrive : sa seconde
                phrase apparaissait et disparaissait selon l'ambiance
                choisie, et poussait toute la page vers le bas avant de la
                laisser remonter. C'était le saut constaté en bêta. */}
            <p className="m-0 mt-3 min-h-[2.4em] text-[12.5px] leading-relaxed text-white/55">
              Compose tes couleurs{" "}
              <strong className="font-bold text-white/75">
                {/* Au doigt elles ne sont plus « plus bas » mais derrière
                    un bouton : une indication de place qui ne mène nulle
                    part se cherche deux fois avant qu'on renonce. */}
                <span className="lg:hidden">dans « Composer »</span>
                <span className="hidden lg:inline">plus bas</span>
              </strong>
              , puis enregistre-les sous un nom.
            </p>

            {/* Pourquoi le dernier enregistrement n'a pas eu lieu. En
                accent plutôt qu'en rouge : ce n'est pas une panne, c'est
                un doublon qu'on refuse. */}
            {refus && (
              <p className="m-0 mt-1.5 text-[12.5px] font-bold leading-relaxed text-[rgb(var(--accent-1))]">
                {refus}
              </p>
            )}
          </section>

          {/* ---- l'entrée du second niveau ----
              En tirets, comme la tuile « enregistrer ces couleurs » : sur
              cette page, le tiret dit « ici on fabrique », par opposition
              aux ambiances toutes prêtes. */}
          <button
            type="button"
            onClick={() => setComposer(true)}
            className={`${
              composer ? "hidden" : "flex lg:hidden"
            } min-h-[56px] w-full items-center justify-between gap-3 rounded-[16px] border border-dashed border-white/35 px-4 text-left transition active:scale-[.98]`}
          >
            <span className="min-w-0">
              <span className="block text-[14.5px] font-bold text-white">
                Composer la mienne
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-semibold text-white/55">
                Teintes, nappes et mouvement
              </span>
            </span>
            <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-white/45" />
          </button>

          {/* ---- réglage fin des couleurs ---- */}
          <section className={`glass p-4 sm:p-5 ${niveau2}`}>
            {/* Le retour au premier niveau. Celui de la page, au-dessus,
                ramène au hub du compte : deux gestes différents, deux
                boutons différents, et celui-ci dit où il va. */}
            <button
              type="button"
              onClick={() => setComposer(false)}
              className="mb-3 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-bold text-white/75 transition active:scale-[.97] lg:hidden"
            >
              <IconBack className="h-4 w-4" />
              Ambiances
            </button>

            <p className="eyebrow m-0 mb-1">Composer</p>
            {/*
             * TROIS TEINTES, NOMMÉES PAR LEUR PLACE DANS LA PAGE.
             *
             * L'écran en demandait six, appelées Départ, Transition,
             * Cœur, Pic, Retour, Fin. Personne ne savait ce que voulait
             * dire « Pic », ni où il tombait : on les poussait au hasard
             * jusqu'à ce que la bande disparaisse. Haut, Cœur et Bas
             * disent où la couleur se pose, et les trois intermédiaires
             * se calculent — voir `sixDepuisTrois`.
             */}
            <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-white/60">
              Trois teintes suffisent : le reste du dégradé se calcule.
            </p>

            <div className="grid grid-cols-3 gap-[11px]">
              {(
                [
                  ["haut", "Haut"],
                  ["coeur", "Cœur"],
                  ["bas", "Bas"],
                ] as const
              ).map(([cle, libelle]) => (
                <label key={cle} className="flex flex-col items-center gap-1.5">
                  <input
                    type="color"
                    value={teintes[cle]}
                    onChange={(e) => poserTeinte(cle, e.target.value)}
                    /* `data-doigt` : c'est ce qu'on CHOISIT du doigt, et
                       le curseur le dit. Les boutons et les liens
                       gardent la flèche — voir `Curseur`. */
                    data-doigt
                    className="pastille-teinte h-[62px] w-full cursor-pointer rounded-[15px] border border-white/25"
                  />
                  <span className={etiquette}>{libelle}</span>
                </label>
              ))}
            </div>

            {/*
             * LE REPLI EST LÀ POUR LA CONFIANCE, PAS POUR LE RÉGLAGE.
             *
             * Il montre qu'on n'a rien caché : voilà les six teintes
             * réellement appliquées. Il affiche `prefs.theme.bg`, donc
             * ce que la page porte vraiment — et non ce que
             * l'interpolation produirait. La nuance compte pour un thème
             * composé avec l'ancien écran : tant qu'on n'a pas touché
             * une teinte, ses six valeurs d'origine sont intactes, et
             * les montrer telles quelles est la seule façon de ne pas
             * mentir sur l'état de la page.
             *
             * En lecture seule. Les rendre modifiables reviendrait à
             * remettre l'ancien écran à côté du neuf, et les deux se
             * contrediraient au premier clic.
             */}
            <button
              type="button"
              onClick={() => setSixOuvertes((v) => !v)}
              aria-expanded={sixOuvertes}
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[12px] font-bold text-white/70 transition hover:text-white"
            >
              <IconChevron
                className={`h-3.5 w-3.5 transition-transform ${sixOuvertes ? "rotate-90" : ""}`}
              />
              Voir les six teintes
            </button>

            {sixOuvertes && (
              <div className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {prefs.theme.bg.map((couleur, i) => (
                    <span
                      key={i}
                      title={couleur}
                      className="h-[34px] w-[34px] rounded-[10px] border border-white/25"
                      style={{ background: couleur }}
                    />
                  ))}
                </div>
                <p className="m-0 mt-2 text-[11.5px] leading-relaxed text-white/50">
                  Calculées depuis les trois teintes, du haut vers le bas.
                </p>
              </div>
            )}

            {/*
             * LES HALOS GARDENT LEURS TROIS PASTILLES, et c'est un choix
             * assumé. On a essayé de les dériver eux aussi : c'était
             * pire. Ce sont les lumières qu'on remarque en premier sur
             * la page ; les retirer du contrôle direct donne
             * l'impression que le thème décide à ta place.
             */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="min-w-0">
                <p className="eyebrow m-0">Halos</p>
                <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-white/60">
                  Les lumières qui dérivent.
                </p>
              </div>
              <div className="flex gap-2.5">
                {prefs.theme.accents.map((couleur, i) => (
                  <label key={i} className="block">
                    <span className="sr-only">Halo {i + 1}</span>
                    <input
                      type="color"
                      value={couleur}
                      onChange={(e) => {
                        const accents = [...prefs.theme.accents] as Theme["accents"];
                        accents[i] = e.target.value;
                        poser({ ...prefs, theme: { ...prefs.theme, accents } });
                      }}
                      data-doigt
                      className="pastille-teinte h-11 w-11 cursor-pointer rounded-full border border-white/25"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ================= l'aperçu et le mouvement ================= */}
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          {/*
           * L'APERÇU MONTRE LA PAGE, PAS LE CURSEUR QU'ON TIENT.
           *
           * Il peint les variables réelles du document, et il dérive à
           * la vitesse choisie — `calc(13s / var(--vit))`, la même
           * horloge que le décor.
           *
           * IL N'Y A PLUS DE GEL PENDANT LE GLISSEMENT, et il n'y en a
           * plus besoin. Les deux curseurs d'avant prévenaient à chaque
           * pixel, d'où le différé et le `data-reglage` qui figeait tout
           * le temps du geste. La barre unique n'applique qu'au `change`
           * d'un `input[type=range]`, c'est-à-dire une fois par cran :
           * le thème n'est plus recomposé en continu, et l'invariant
           * « ne pas appliquer pendant le glissement » tient tout seul.
           *
           * `animationPlayState` ne sert donc plus qu'à une chose, et
           * c'est la bonne : à zéro, le fond est fixe, et un aperçu qui
           * continuerait de dériver mentirait sur ce qu'on vient de
           * choisir.
           */}
          {/*
           * L'APERÇU PASSE EN TÊTE AU DOIGT, ET IL Y RESTE.
           *
           * `-order-3` le remonte avant les réglages alors qu'il
           * appartient, dans le document, à la colonne de droite — ce
           * qui évite de le rendre deux fois. Collé sous la barre du
           * haut, il reste sous les yeux pendant qu'on choisit : on juge
           * une couleur en la voyant, pas en s'en souvenant.
           *
           * À `xl`, la colonne de droite existe pour de bon : il reprend
           * sa place et son ordre, et ne colle plus à rien.
           */}
          <div className="-order-3 sticky top-[70px] z-20 xl:static xl:order-none">
            <div
              className="relative h-[168px] overflow-hidden rounded-[22px] border border-white/20 shadow-[0_14px_34px_-10px_rgba(45,15,100,0.55)] xl:h-[210px] xl:rounded-[20px] xl:shadow-[0_10px_30px_rgba(45,15,100,0.26)]"
              style={{
                background:
                  "linear-gradient(168deg, var(--bg-1) 0%, var(--bg-2) 22%, var(--bg-3) 44%, var(--bg-4) 62%, var(--bg-5) 82%, var(--bg-6) 100%)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-[26%] blur-[26px]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 26%, rgba(var(--accent-1), .8) 0%, transparent 42%)," +
                    "radial-gradient(circle at 74% 60%, rgba(var(--accent-2), .85) 0%, transparent 42%)," +
                    "radial-gradient(circle at 48% 94%, rgba(var(--accent-3), .75) 0%, transparent 40%)",
                  backgroundRepeat: "no-repeat",
                  animation: "nappe1 calc(13s / var(--vit)) ease-in-out infinite alternate",
                  animationPlayState: barre === 0 ? "paused" : "running",
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-[26%] blur-[26px]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 70% 20%, rgba(var(--accent-2), .8) 0%, transparent 40%)," +
                    "radial-gradient(circle at 20% 70%, rgba(var(--accent-1), .72) 0%, transparent 42%)," +
                    "radial-gradient(circle at 86% 86%, rgba(var(--accent-3), .78) 0%, transparent 40%)",
                  backgroundRepeat: "no-repeat",
                  animation: "nappe2 calc(17s / var(--vit)) ease-in-out infinite alternate",
                  animationPlayState: barre === 0 ? "paused" : "running",
                }}
              />

              <span className="absolute left-3 top-3 rounded-full bg-[rgba(8,2,30,0.42)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/80">
                Aperçu
              </span>

              {/* Le nom de l'ambiance sur sa propre pastille, et pas à
                  même le dégradé : le fond est choisi par la personne,
                  et une ambiance claire effacerait un libellé posé
                  dessus. Même raison que le mot « Aperçu » à gauche. */}
              <span className="absolute right-3 top-3 max-w-[58%] truncate rounded-full bg-[rgba(8,2,30,0.42)] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.12em] text-white/80">
                {decrireApparence(prefs)}
              </span>

              {/* Une barre de nav en réduction : le contraste d'un bouton
                  blanc sur l'ambiance choisie ne se juge pas sur un
                  aplat, il se juge sur un bouton. */}
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full border border-white/25 bg-[rgba(8,2,30,0.42)] px-3 py-1.5 backdrop-blur-[10px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/mark-white.webp" alt="" className="h-4 w-auto opacity-80" />
                <span className="rounded-full bg-white px-2.5 py-1 text-[9.5px] font-black text-[var(--color-ink)]">
                  Bouton
                </span>
              </span>
            </div>

          </div>

          {/* ---- clair ou sombre, et le mouvement ----

              IL VIT DANS LA COLONNE DE DROITE, SOUS L'APERÇU, et c'est
              une question de place autant que de sens.

              De place : à `xl`, la colonne de droite ne portait que
              l'aperçu, la note du système et un bouton. Elle s'arrêtait
              à mi-hauteur pendant que celle de gauche empilait trois
              panneaux, et le trou se voyait d'autant plus que le fond
              est clair à cet endroit.

              De sens : ce bloc et l'aperçu parlent de la même chose. On
              règle le mouvement, on le voit dériver juste au-dessus. Les
              ambiances et les teintes, elles, se choisissent à gauche, où
              la grille a la largeur de leurs pastilles.

              `-order-2` LE GARDE JUSTE SOUS L'APERÇU EN PILE. Sous `xl`,
              les deux colonnes sont en `contents` : tout est sœur dans
              une seule pile, et l'ordre du document mettrait ce bloc
              après les ambiances et les teintes. L'aperçu porte
              `-order-3`, celui-ci `-order-2` : ils restent en tête, dans
              cet ordre, quelle que soit la largeur. */}
          <section className={`glass -order-2 p-4 sm:p-5 xl:order-none ${niveau1}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="eyebrow m-0">Fond</p>
              <div className="flex gap-1 rounded-full border border-white/20 bg-white/8 p-1">
                {[
                  { clair: false, label: "Sombre" },
                  { clair: true, label: "Clair" },
                ].map((o) => {
                  const actif = Boolean(prefs.clair) === o.clair;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => poser({ ...prefs, clair: o.clair })}
                      className={`${chip} ${
                        actif
                          ? "bg-white text-[var(--color-ink)]"
                          : "text-white/80 hover:bg-white/12 hover:text-white"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="m-0 mt-3 text-[12.5px] leading-relaxed text-white/60">
              En clair, la palette est simplement diluée.
            </p>

            {/* ---- le mouvement du décor, sur une seule barre ----

                ELLE EST ICI, AU PREMIER NIVEAU, ET C'EST TOUT LE POINT.

                L'interrupteur Fixe/Animé était rangé avec la vitesse et
                l'ampleur, dans « Composer ». Au doigt, ce second niveau
                est derrière un bouton et trois écrans de défilement : le
                seul réglage qui décide si le site consomme en permanence
                était donc le plus difficile à atteindre, et sur
                téléphone, c'est-à-dire précisément là où la batterie
                compte. Il en est sorti, et la barre qui le remplace
                reste à sa place.

                ONZE COMMANDES SONT DEVENUES UNE. L'interrupteur, les
                quatre pastilles de mode, le curseur de vitesse et celui
                d'ampleur disaient tous la même chose sous quatre formes.
                « Figé » à gauche coupe le décor pour de bon — c'est
                `fond: "fixe"`, pas une ampleur à zéro — et tout le reste
                de la barre en dérive la vitesse et l'ampleur ensemble.
                Voir `mouvementDepuisBarre`. */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="eyebrow m-0">Mouvement</p>
                {/* Le nom de l'état courant, en gras : c'est le retour de
                    lecture d'une barre qui n'a pas de graduation. */}
                <span className="text-[12.5px] font-extrabold text-white">
                  {nomDuMouvement(barre)}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={barre}
                disabled={!connecte}
                aria-label="Mouvement du décor"
                onChange={(e) => reglerBarre(Number(e.target.value))}
                className={`rail-tactile mt-3 w-full accent-white ${
                  connecte ? "" : "cursor-not-allowed opacity-45"
                }`}
              />

              {/* Les quatre mots sont cliquables et la poignée les
                  rejoint : on choisit un mot, ou l'on glisse entre eux
                  si l'on veut affiner. */}
              <div className="mt-1 flex items-center justify-between">
                {PALIERS_MOUVEMENT.map((palier) => {
                  const actif = nomDuMouvement(barre) === palier.nom;
                  return (
                    <button
                      key={palier.nom}
                      type="button"
                      disabled={!connecte}
                      aria-pressed={actif}
                      onClick={() => reglerBarre(palier.valeur)}
                      className={`min-h-8 px-1 text-[10.5px] font-extrabold uppercase tracking-[0.12em] transition ${
                        connecte ? "" : "cursor-not-allowed opacity-45"
                      } ${actif ? "text-white" : "text-white/[.68] hover:text-white"}`}
                    >
                      {palier.nom}
                    </button>
                  );
                })}
              </div>

              <p className="m-0 mt-1.5 text-[12px] leading-relaxed text-white/55">
                Tout à gauche, le fond ne bouge plus.
              </p>
            </div>

            <p className="m-0 mt-3 text-[12.5px] leading-relaxed text-white/60">
              Le décor est <strong className="font-bold text-white/80">fixe par défaut</strong>,
              pour tout le monde. C&apos;est la seule chose du site qui tourne en
              permanence, même sur une page où personne ne touche à rien, et elle
              se paie en batterie.{" "}
              {!connecte && "Le mouvement se rallume depuis un compte."}
            </p>
          </section>


          {systemeReduit && (
            <p className={`${niveau2} m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[12.5px] leading-relaxed text-white`}>
              Ton système demande de réduire les animations. On respecte ce réglage par
              défaut. Mais si tu choisis un mouvement ici, c&apos;est le tien qui
              s&apos;applique.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setTroisTeintes(null);
              poser({ ...prefs, theme: THEME_DEFAUT, mouvement: MOUVEMENT_DEFAUT });
            }}
            className={`${niveau2} min-h-[44px] w-full rounded-full border border-white/30 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97] sm:min-h-0`}
          >
            Revenir aux réglages par défaut
          </button>
        </div>
      </div>
    </div>
  );
}
