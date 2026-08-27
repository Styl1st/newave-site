"use client";

import { useEffect, useRef, useState } from "react";
import { enregistrerApparence } from "@/app/apparence-actions";
import { IconCheck, IconPlus, IconTrash } from "./Icons";
import {
  MOUVEMENT_DEFAUT,
  PREFERENCES_DEFAUT,
  PRESETS,
  PRESETS_MOUVEMENT,
  THEME_DEFAUT,
  appliquerClarte,
  appliquerMouvement,
  appliquerTheme,
  decrire,
  ecrire,
  lire,
  type Ambiance,
  type Mouvement,
  type Preferences,
  type PresetMouvement,
  type Theme,
} from "@/lib/theme";

const LABELS = ["Départ", "Transition", "Cœur", "Pic", "Retour", "Fin"];


function memeTheme(a: Theme, b: Theme) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function Vignette({ theme }: { theme: Theme }) {
  return (
    <span
      className="block h-14 w-full"
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
  const dejaEnregistre = toutes.some((a) => memeTheme(a.theme, prefs.theme));

  const chip =
    "rounded-full px-4 py-2 text-[12px] font-bold transition active:scale-[.97]";

  return (
    <div className="flex flex-col gap-7">
      {/* Dire où va le réglage évite de le refaire sur chaque appareil
          en croyant qu'il ne s'enregistre pas. */}
      <p className="m-0 rounded-[13px] bg-white/10 px-4 py-3 text-[12.5px] leading-relaxed text-white/80">
        {connecte ? (
          <>
            Ces réglages sont liés à ton compte : tu les retrouveras sur ton téléphone
            comme sur ton ordinateur.{" "}
            {etat === "envoi" && <span className="text-white/55">Enregistrement…</span>}
            {etat === "garde" && <span className="font-bold text-white">Enregistré.</span>}
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

      {/* ---- clair ou sombre ---- */}
      <div>
        <p className="eyebrow m-0 mb-3">Fond</p>
        <div className="flex flex-wrap gap-2">
          {[
            { clair: false, label: "Sombre" },
            { clair: true, label: "Clair" },
          ].map((o) => {
            const actif = Boolean(prefs.clair) === o.clair;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => poser({ ...prefs, clair: o.clair })}
                className={`${chip} ${
                  actif
                    ? "bg-white text-[var(--color-ink)]"
                    : "border border-white/25 text-white/80 hover:bg-white/12 hover:text-white"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-2.5 text-[12.5px] leading-relaxed text-white/60">
          La palette que tu choisis plus bas s&apos;applique dans les deux cas : en
          clair, elle est simplement diluée. Ton ambiance reste reconnaissable.
        </p>
      </div>

      {/* ---- mouvement ---- */}
      <div>
        <p className="eyebrow m-0 mb-3">Mouvement du fond</p>

        {systemeReduit && (
          <p className="m-0 mb-3 rounded-[13px] bg-white/12 px-4 py-3 text-[12.5px] leading-relaxed text-white">
            Ton système demande de réduire les animations. On respecte ce réglage par
            défaut. Mais si tu choisis un mouvement ici, c&apos;est le tien qui
            s&apos;applique.
          </p>
        )}

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

        {/* Vitesse et ampleur ne se comprennent pas seules : plusieurs
            personnes ont réglé la vitesse au maximum sans rien voir
            bouger, parce que l'ampleur était à zéro. */}
        <p className="m-0 mt-3 text-[12.5px] leading-relaxed text-white/55">
          L&apos;<strong className="font-bold text-white/75">ampleur</strong> dit de
          combien le décor se déplace, la{" "}
          <strong className="font-bold text-white/75">vitesse</strong> à quel rythme il le
          fait. Une ampleur à zéro fige tout, quelle que soit la vitesse.
        </p>

        {/* ---- réglage fin du mouvement ---- */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
              className="w-full accent-white"
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
              className="w-full accent-white"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[12.5px] text-white/55">{decrire(prefs.mouvement)}</p>

          {nomMouvement === null ? (
            <button
              type="button"
              onClick={() => setNomMouvement("")}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/35 px-3.5 py-1.5 text-[11.5px] font-bold text-white/75 transition hover:border-white/70 hover:text-white active:scale-[.97]"
            >
              <IconPlus className="h-3.5 w-3.5" /> Enregistrer ce réglage
            </button>
          ) : (
            <span className="flex items-center gap-1.5">
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
      </div>

      {/* ---- ambiances ---- */}
      <div>
        <p className="eyebrow m-0 mb-3">Ambiances</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {toutes.map((a) => {
            const actif = memeTheme(a.theme, prefs.theme);
            const perso = a.id.startsWith("perso-");
            return (
              <div key={a.id} className="relative">
                <button
                  type="button"
                  onClick={() => poser({ ...prefs, theme: a.theme })}
                  className={`w-full overflow-hidden rounded-[14px] border transition active:scale-[.97] ${
                    actif ? "border-white ring-2 ring-white/50" : "border-white/25 hover:border-white/60"
                  }`}
                >
                  <Vignette theme={a.theme} />
                  <span className="flex items-center justify-center gap-1.5 bg-white/8 py-2 text-[11.5px] font-bold text-white">
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
              className="flex h-[86px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-white/35 text-white/70 transition hover:border-white/70 hover:bg-white/8 hover:text-white active:scale-[.97]"
            >
              <IconPlus className="h-5 w-5" />
              <span className="text-center text-[11.5px] font-bold leading-tight">
                Enregistrer
                <br />
                ces couleurs
              </span>
            </button>
          ) : (
            <div className="flex h-[86px] flex-col justify-center gap-2 rounded-[14px] border border-white/45 bg-white/10 p-2">
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
        <p className="m-0 mt-3 min-h-[3.2em] text-[12.5px] leading-relaxed text-white/55">
          Les couleurs se composent <strong className="font-bold text-white/75">plus
          bas</strong>, puis s&apos;enregistrent sous un nom : elles rejoignent alors
          cette liste, à côté des nôtres.
          {dejaEnregistre &&
            " Celles-ci correspondent déjà à une ambiance existante, mais rien n'empêche de les garder sous un autre nom."}
        </p>
      </div>

      {/* ---- réglage fin ---- */}
      <div>
        <p className="eyebrow m-0 mb-1">Composer</p>
        <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-white/60">
          Six teintes qui se fondent de haut en bas, puis trois accents pour les nappes
          qui dérivent par-dessus.
        </p>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
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
                className="h-12 w-full cursor-pointer rounded-[11px] border border-white/25 bg-transparent"
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">
                {LABELS[i]}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
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
                className="h-12 w-full cursor-pointer rounded-[11px] border border-white/25 bg-transparent"
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">
                Nappe {i + 1}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => poser({ ...prefs, theme: THEME_DEFAUT, mouvement: MOUVEMENT_DEFAUT })}
        className="self-start rounded-full border border-white/30 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97]"
      >
        Revenir aux réglages par défaut
      </button>
    </div>
  );
}
