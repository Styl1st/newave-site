"use client";

import { useEffect, useRef, useState } from "react";
import { enregistrerApparence } from "@/app/apparence-actions";
import { IconBack, IconCheck, IconChevron, IconPlus, IconTrash } from "./Icons";
import {
  FOND_DEFAUT,
  MOUVEMENT_DEFAUT,
  PREFERENCES_DEFAUT,
  PRESETS,
  PRESETS_MOUVEMENT,
  THEME_DEFAUT,
  appliquerClarte,
  appliquerFond,
  appliquerMouvement,
  appliquerTheme,
  decrire,
  decrireApparence,
  ecrire,
  lire,
  memeTheme,
  type Ambiance,
  type Fond,
  type Mouvement,
  type Preferences,
  type PresetMouvement,
  type Theme,
} from "@/lib/theme";

const LABELS = ["Départ", "Transition", "Cœur", "Pic", "Retour", "Fin"];


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
  const [nomMouvement, setNomMouvement] = useState<string | null>(null);
  const [systemeReduit, setSystemeReduit] = useState(false);
  const [etat, setEtat] = useState<"repos" | "envoi" | "garde">("repos");

  /*
   * LE CURSEUR N'APPLIQUE RIEN TANT QU'ON LE TIENT.
   *
   * `--vit` et `--amp` entrent dans la durée et l'amplitude de toutes
   * les animations du décor. Les changer pendant qu'on fait glisser le
   * curseur obligeait le navigateur à recalculer, dix fois par seconde,
   * la position courante de chaque animation : chacune sautait, et
   * l'ensemble donnait un clignotement franc — sur le fond, sur les
   * boutons, sur le liseré de la barre du haut.
   *
   * Ce n'est pas qu'une question de confort. Un clignotement rapide et
   * répété est exactement ce qu'il faut éviter sur un écran : c'est un
   * risque réel pour les personnes photosensibles, et ça ne se discute
   * pas.
   *
   * On garde donc la valeur en cours ICI, pour que le curseur et le
   * chiffre suivent le doigt, et on ne la pose sur la page qu'au
   * relâchement. Le décor est mis en pause pendant ce temps : figé, il
   * ne peut pas sauter.
   */
  const [reglage, setReglage] = useState<Mouvement | null>(null);
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

  useEffect(() => {
    // Le compte fait foi : c'est le réglage de la personne, pas celui
    // de la machine sur laquelle elle se trouve. Le stockage local ne
    // reprend la main que pour un visiteur sans compte.
    setPrefs(duCompte ?? lire());
    setSystemeReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCharge(true);
  }, [duCompte]);

  useEffect(() => () => { if (differe.current) clearTimeout(differe.current); }, []);

  /** Enregistre et applique d'un même geste : l'aperçu doit être immédiat. */
  function poser(next: Preferences) {
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
    differe.current = setTimeout(async () => {
      const res = await enregistrerApparence(next);
      setEtat(res.ok ? "garde" : "repos");
    }, 700);
  }

  /** Pendant le glissement : rien ne bouge, on retient seulement. */
  function ajuster(m: Mouvement) {
    setReglage(m);
    document.documentElement.dataset.reglage = "1";
  }

  /** Au relâchement : on applique, on enregistre, le décor repart. */
  function relacher() {
    delete document.documentElement.dataset.reglage;
    if (!reglage) return;
    poser({ ...prefs, mouvement: reglage });
    setReglage(null);
  }

  function enregistrerAmbiance(nom: string) {
    const propre = nom.trim().slice(0, 30);
    if (!propre) return;
    // Deux ambiances du même nom ne se distinguent plus dans la liste :
    // on refuse plutôt que de laisser créer un doublon inutilisable.
    if ([...PRESETS, ...prefs.ambiances].some((a) => a.nom.toLowerCase() === propre.toLowerCase())) {
      setNomEnCours(null);
      return;
    }
    const ambiance: Ambiance = {
      id: `perso-${Date.now()}`,
      nom: propre,
      theme: prefs.theme,
    };
    poser({ ...prefs, ambiances: [...prefs.ambiances, ambiance] });
    setNomEnCours(null);
  }

  function enregistrerMouvement(nom: string) {
    const propre = nom.trim().slice(0, 24);
    if (!propre) return;
    if (
      [...PRESETS_MOUVEMENT, ...prefs.mouvements].some(
        (m) => m.nom.toLowerCase() === propre.toLowerCase()
      )
    ) {
      setNomMouvement(null);
      return;
    }
    const preset: PresetMouvement = {
      id: `mvt-${Date.now()}`,
      nom: propre,
      mouvement: prefs.mouvement,
    };
    poser({ ...prefs, mouvements: [...prefs.mouvements, preset] });
    setNomMouvement(null);
  }

  if (!charge) return <div className="skeleton h-64 w-full" />;

  const toutes = [...PRESETS, ...prefs.ambiances];

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
          {/* ---- clair ou sombre ---- */}
          <section className={`glass p-4 sm:p-5 ${niveau1}`}>
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
          </section>

          {/* ---- ambiances ---- */}
          <section className={`glass p-4 sm:p-5 ${niveau1}`}>
            <p className="eyebrow m-0 mb-3">Ambiances</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {toutes.map((a) => {
                const actif = memeTheme(a.theme, prefs.theme);
                const perso = a.id.startsWith("perso-");
                return (
                  <div key={a.id} className="relative">
                    <button
                      type="button"
                      onClick={() => poser({ ...prefs, theme: a.theme })}
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
                          poser({
                            ...prefs,
                            ambiances: prefs.ambiances.filter((x) => x.id !== a.id),
                          })
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
            <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-white/60">
              Six teintes de fond, trois accents.
            </p>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {prefs.theme.bg.map((couleur, i) => (
                <label key={i} className="flex flex-col items-center gap-1.5">
                  <input
                    type="color"
                    value={couleur}
                    onChange={(e) => {
                      const bg = [...prefs.theme.bg] as Theme["bg"];
                      bg[i] = e.target.value;
                      poser({ ...prefs, theme: { ...prefs.theme, bg } });
                    }}
                    className="h-11 w-full cursor-pointer rounded-[11px] border border-white/25 bg-transparent"
                  />
                  <span className={etiquette}>{LABELS[i]}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {prefs.theme.accents.map((couleur, i) => (
                <label key={i} className="flex flex-col items-center gap-1.5">
                  <input
                    type="color"
                    value={couleur}
                    onChange={(e) => {
                      const accents = [...prefs.theme.accents] as Theme["accents"];
                      accents[i] = e.target.value;
                      poser({ ...prefs, theme: { ...prefs.theme, accents } });
                    }}
                    className="h-11 w-full cursor-pointer rounded-[11px] border border-white/25 bg-transparent"
                  />
                  <span className={etiquette}>Nappe {i + 1}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* ================= l'aperçu et le mouvement ================= */}
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          {/*
           * L'APERÇU MONTRE LA PAGE, PAS LE CURSEUR QU'ON TIENT.
           *
           * Il peint les variables réelles du document. Elles ne bougent
           * qu'au relâchement : pendant le glissement, ce cadre reste
           * donc aussi immobile que le fond, et pour la même raison. Le
           * `animationPlayState` ci-dessous le gèle en plus, exactement
           * comme `data-reglage` gèle le décor — sans quoi on aurait
           * remplacé un grand scintillement par un petit.
           */}
          {/*
           * L'APERÇU PASSE EN TÊTE AU DOIGT, ET IL Y RESTE.
           *
           * `-order-1` le remonte avant les réglages alors qu'il
           * appartient, dans le document, à la colonne de droite — ce
           * qui évite de le rendre deux fois. Collé sous la barre du
           * haut, il reste sous les yeux pendant qu'on choisit : on juge
           * une couleur en la voyant, pas en s'en souvenant.
           *
           * À `xl`, la colonne de droite existe pour de bon : il reprend
           * sa place et son ordre, et ne colle plus à rien.
           */}
          <div className="-order-1 sticky top-[70px] z-20 xl:static xl:order-none">
            <div
              className="relative h-[150px] overflow-hidden rounded-[22px] border border-white/20 shadow-[0_14px_34px_-10px_rgba(45,15,100,0.55)] xl:h-[210px] xl:rounded-[20px] xl:shadow-[0_10px_30px_rgba(45,15,100,0.26)]"
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
                  animationPlayState: reglage ? "paused" : "running",
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
                  animationPlayState: reglage ? "paused" : "running",
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

          {/* Elle décrit le mouvement : elle appartient donc au second
              niveau, et reste collée à l'aperçu par le même `order`. */}
          <p
            className={`${niveau2} -order-1 m-0 rounded-[13px] bg-[rgba(8,2,30,0.42)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white/70 xl:-mt-2 xl:order-none`}
          >
            {decrire(prefs.mouvement)}
          </p>

          {/* ---- mouvement ---- */}
          <section className={`glass p-4 sm:p-5 ${niveau2}`}>
            <p className="eyebrow m-0 mb-3">Mouvement du fond</p>

            {/* ---- il bouge, ou il ne bouge pas ----

                C'EST L'INTERRUPTEUR, ET LE RESTE N'EST QUE DU RÉGLAGE.
                Les pastilles et les curseurs en dessous décrivent COMMENT
                le décor dérive ; celui-ci décide S'IL dérive. On le met
                donc en tête, parce que régler la vitesse d'un fond qu'on
                a laissé fixe est le genre de manipulation dont on ne
                comprend le silence qu'au bout de trois essais. */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(
                [
                  ["fixe", "Fond fixe"],
                  ["anime", "Fond animé"],
                ] as const
              ).map(([valeur, libelle]) => {
                const actif = connecte
                  ? (prefs.fond ?? FOND_DEFAUT) === valeur
                  : valeur === FOND_DEFAUT;
                return (
                  <button
                    key={valeur}
                    type="button"
                    disabled={!connecte}
                    aria-pressed={actif}
                    onClick={() => poser({ ...prefs, fond: valeur as Fond })}
                    className={`min-h-[44px] rounded-full px-4 py-1.5 text-[11.5px] font-bold transition sm:min-h-0 ${
                      connecte ? "active:scale-[.97]" : "cursor-not-allowed opacity-45"
                    } ${
                      actif
                        ? "bg-white text-[var(--color-ink)]"
                        : "border border-white/30 bg-white/8 text-white/80" +
                          (connecte ? " hover:border-white/60 hover:text-white" : "")
                    }`}
                  >
                    {libelle}
                  </button>
                );
              })}
            </div>

            <p className="m-0 mb-4 text-[12.5px] leading-relaxed text-white/55">
              Le fond est <strong className="font-bold text-white/75">fixe par défaut</strong>,
              pour tout le monde. C&apos;est la seule chose du site qui tourne en
              permanence, même sur une page où personne ne touche à rien, et
              elle se paie en batterie et en ventilateur.{" "}
              {connecte
                ? "Les réglages ci-dessous ne s'appliquent qu'au fond animé."
                : "Le mouvement se rallume depuis un compte : c'est une préférence de personne, pas de machine."}
            </p>

            {/* `items-start` : sans lui, les pastilles d'une même ligne
                s'étirent à la hauteur de la plus haute, et une ligne
                contenant un nom long laissait des trous sous les autres. */}
            <div className="flex flex-wrap items-start gap-2">
              {(() => {
                const liste = [...PRESETS_MOUVEMENT, ...prefs.mouvements];
                // On ne marque QUE LE PREMIER réglage qui correspond. Deux
                // enregistrements identiques s'allumaient tous les deux, et
                // l'on croyait à un bug d'affichage — c'en était un.
                const rangActif = liste.findIndex(
                  (p) =>
                    Math.abs(p.mouvement.vitesse - prefs.mouvement.vitesse) < 0.02 &&
                    Math.abs(p.mouvement.amplitude - prefs.mouvement.amplitude) < 0.02
                );
                return liste.map((p, rang) => {
                const actif = rang === rangActif;
                const perso = p.id.startsWith("mvt-");
                return (
                  <span key={p.id} className="relative">
                    <button
                      type="button"
                      onClick={() => poser({ ...prefs, mouvement: p.mouvement })}
                      className={`${chip} ${
                        actif
                          ? "bg-white text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)]"
                          : "border border-white/30 bg-white/8 text-white/85 hover:border-white/60 hover:bg-white/18"
                      } ${perso ? "pr-8" : ""}`}
                    >
                      {p.nom}
                    </button>
                    {perso && (
                      <button
                        type="button"
                        onClick={() =>
                          poser({ ...prefs, mouvements: prefs.mouvements.filter((x) => x.id !== p.id) })
                        }
                        aria-label={`Supprimer le réglage ${p.nom}`}
                        className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white transition hover:bg-[#c2273f]"
                      >
                        <IconTrash className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
                });
              })()}
            </div>

            {/* ---- réglage fin du mouvement ---- */}
            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="flex items-baseline justify-between text-[12.5px] font-bold text-white/85">
                  Vitesse
                  <span className="text-[11.5px] font-semibold text-white/50">
                    ×{(reglage ?? prefs.mouvement).vitesse.toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={(reglage ?? prefs.mouvement).vitesse}
                  onPointerUp={relacher}
                  onPointerCancel={relacher}
                  onKeyUp={relacher}
                  onBlur={relacher}
                  onChange={(e) =>
                    ajuster({
                      ...(reglage ?? prefs.mouvement),
                      vitesse: Number(e.target.value),
                    })
                  }
                  className="curseur-doigt w-full accent-white"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="flex items-baseline justify-between text-[12.5px] font-bold text-white/85">
                  Ampleur
                  <span className="text-[11.5px] font-semibold text-white/50">
                    ×{(reglage ?? prefs.mouvement).amplitude.toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={(reglage ?? prefs.mouvement).amplitude}
                  onPointerUp={relacher}
                  onPointerCancel={relacher}
                  onKeyUp={relacher}
                  onBlur={relacher}
                  onChange={(e) =>
                    ajuster({
                      ...(reglage ?? prefs.mouvement),
                      amplitude: Number(e.target.value),
                    })
                  }
                  className="curseur-doigt w-full accent-white"
                />
              </label>
            </div>

            {/* Vitesse et ampleur ne se comprennent pas seules : plusieurs
                personnes ont réglé la vitesse au maximum sans rien voir
                bouger, parce que l'ampleur était à zéro. */}
            <p className="m-0 mt-3 text-[12.5px] leading-relaxed text-white/55">
              Une <strong className="font-bold text-white/75">ampleur</strong> à zéro fige
              tout, quelle que soit la vitesse.
            </p>

            <div className="mt-3">
              {nomMouvement === null ? (
                <button
                  type="button"
                  onClick={() => setNomMouvement("")}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-dashed border-white/35 px-3.5 py-1.5 text-[11.5px] font-bold text-white/75 transition hover:border-white/70 hover:text-white active:scale-[.97] sm:min-h-0"
                >
                  <IconPlus className="h-3.5 w-3.5" /> Enregistrer ce réglage
                </button>
              ) : (
                <span className="flex flex-wrap items-center gap-1.5">
                  <input
                    autoFocus
                    value={nomMouvement}
                    onChange={(e) => setNomMouvement(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") enregistrerMouvement(nomMouvement);
                      if (e.key === "Escape") setNomMouvement(null);
                    }}
                    placeholder="Son nom…"
                    maxLength={24}
                    className="champ champ-petit w-36"
                  />
                  <button
                    type="button"
                    onClick={() => enregistrerMouvement(nomMouvement)}
                    className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[var(--color-ink)]"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setNomMouvement(null)}
                    className="rounded-full border border-white/40 px-3 py-1.5 text-[11px] font-bold text-white/80"
                  >
                    Annuler
                  </button>
                </span>
              )}
            </div>
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
            onClick={() => poser({ ...prefs, theme: THEME_DEFAUT, mouvement: MOUVEMENT_DEFAUT })}
            className={`${niveau2} min-h-[44px] w-full rounded-full border border-white/30 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97] sm:min-h-0`}
          >
            Revenir aux réglages par défaut
          </button>
        </div>
      </div>
    </div>
  );
}
