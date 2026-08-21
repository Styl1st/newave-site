"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allegerImage, poids } from "@/lib/alleger-image";
import { estUneVideo } from "@/lib/medias";
import { Label } from "./fields";

/**
 * Envoie une ou plusieurs images dans le bucket "media" et garde
 * l'ordre choisi. Chaque image devient un champ cache portant le meme
 * nom, que l'action serveur relit avec formData.getAll().
 *
 * La premiere image sert de vignette dans les listes et d'apercu au
 * partage : d'ou les fleches pour la choisir.
 */
export default function MultiImageUploader({
  name = "images",
  label = "Visuels",
  defaultValue,
  folder = "posts",
}: {
  name?: string;
  label?: string;
  defaultValue?: string[] | null;
  folder?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue ?? []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const supabase = createClient();
    if (!supabase) {
      setNote("Supabase n'est pas configuré.");
      return;
    }

    setBusy(true);
    setNote(null);
    const added: string[] = [];
    let avant = 0;
    let apres = 0;

    for (const file of files) {
      /*
       * Une vidéo passe telle quelle.
       *
       * On ne sait pas la ré-encoder dans un navigateur, et personne ne
       * veut attendre qu'on essaie. La limite est donc plus basse que
       * pour une photo : une vidéo de post se rejoue à chaque ouverture,
       * et au-delà de vingt mégaoctets c'est la page qui traîne.
       */
      const video = file.type.startsWith("video/") || estUneVideo(file.name);
      const plafond = video ? 20 : 25;

      if (file.size > plafond * 1024 * 1024) {
        setNote(
          `« ${file.name} » dépasse ${plafond} Mo, ${video ? "elle a été ignorée. Ré-exporte-la en 1080p." : "elle a été ignorée."}`
        );
        continue;
      }

      // Redimensionnée et convertie dans le navigateur avant l'envoi.
      // Sur une série de huit photos de téléphone, c'est la différence
      // entre trente mégaoctets et un et demi.
      const allege = video
        ? { fichier: file, avant: file.size, apres: file.size, modifie: false }
        : await allegerImage(file, { maxCote: 1800, qualite: 0.82 });
      avant += allege.avant;
      apres += allege.apres;

      const ext = allege.modifie
        ? "webp"
        : file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from("media")
        .upload(path, allege.fichier, {
          cacheControl: "31536000",
          upsert: false,
          contentType: allege.fichier.type,
        });

      if (error) {
        setNote(`Envoi refusé : ${error.message}`);
        continue;
      }
      added.push(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
    }

    setUrls((prev) => [...prev, ...added]);
    setBusy(false);
    if (added.length > 0 && apres < avant) {
      setNote(`${added.length} image${added.length > 1 ? "s" : ""} allégée${added.length > 1 ? "s" : ""} : ${poids(avant)} → ${poids(apres)}.`);
    }
    e.target.value = "";
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= urls.length) return;
    setUrls((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (i: number) => setUrls((prev) => prev.filter((_, n) => n !== i));

  /*
   * RÉORDONNER EN GLISSANT, EN PLUS DES FLÈCHES.
   *
   * Les flèches restent, et ce n'est pas de la redondance : pour
   * corriger un seul écart, un clic vaut mieux qu'un geste, et elles
   * fonctionnent au clavier. Mais remonter la huitième photo en tête
   * demandait sept clics, et personne ne le fait — on renvoie tout.
   *
   * POURQUOI PAS LE GLISSER-DÉPOSER DU NAVIGATEUR. Celui d'origine ne
   * répond pas au doigt : il est né avec la souris et les téléphones ne
   * l'ont jamais implémenté. Or une créatrice qui prépare une fiche le
   * fait souvent depuis son téléphone, avec ses photos dessus. On passe
   * donc par les évènements de POINTEUR, qui traitent la souris, le
   * doigt et le stylet de la même façon.
   *
   * Une poignée dédiée plutôt que la vignette entière : sur téléphone,
   * pouvoir saisir n'importe où empêcherait de faire défiler la page,
   * puisqu'il faut refuser le geste au navigateur pour le traiter
   * nous-mêmes.
   */
  const grille = useRef<HTMLDivElement>(null);
  const [saisi, setSaisi] = useState<number | null>(null);

  /*
   * LA VIGNETTE SUIT LE DOIGT, PAR-DESSUS LES AUTRES.
   *
   * Sans ça, on déplace une image sans jamais la voir bouger : elle
   * reste à sa place et saute d'un coup à la suivante. On ne sait pas
   * si le geste est pris en compte, et l'on relâche trop tôt.
   *
   * On garde donc l'élément sous la main et on lui écrit sa position
   * directement, image par image. Écrire dans le DOM plutôt que de
   * passer par un état React n'est pas un raccourci : un rendu complet
   * de la planche à chaque mouvement de souris ferait exactement la
   * saccade qu'on cherche à éviter.
   *
   * L'origine est reprise à CHAQUE échange. Au moment où deux vignettes
   * permutent, celle qu'on tient change de case : si l'on continuait de
   * compter depuis le point de départ, elle ferait un bond de la
   * largeur d'une case. En repartant de la position du pointeur, elle
   * reste sous lui.
   */
  const porteur = useRef<HTMLElement | null>(null);
  const depart = useRef({ x: 0, y: 0 });
  const image = useRef(0);
  const dernier = useRef({ x: 0, y: 0 });

  /**
   * La vignette la plus proche du pointeur.
   *
   * ON CHERCHE LE CENTRE LE PLUS PROCHE, ET NON LA CASE SURVOLÉE. La
   * première version demandait « dans quel rectangle est le pointeur ».
   * Ça paraît plus juste, et c'est ce qui faisait sauter le glisser :
   * la vignette attrapée est légèrement agrandie, donc son rectangle
   * déborde sur ses voisines. Dès qu'on approchait d'une frontière,
   * deux cases se disputaient le pointeur et les images s'échangeaient
   * en boucle.
   *
   * Le centre le plus proche ne peut pas osciller : une fois la
   * vignette déposée à sa nouvelle place, c'est le centre de CETTE
   * place qui est le plus proche, et plus rien ne bouge tant qu'on ne
   * s'est pas franchement dirigé vers une autre.
   */
  function vignetteSous(x: number, y: number): number | null {
    const boite = grille.current;
    if (!boite) return null;

    let meilleure: number | null = null;
    let distance = Infinity;

    const cartes = Array.from(boite.children) as HTMLElement[];
    for (let i = 0; i < cartes.length; i++) {
      const r = cartes[i].getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const d = dx * dx + dy * dy;
      if (d < distance) {
        distance = d;
        meilleure = i;
      }
    }
    return meilleure;
  }

  /** La carte de rang `i`, dans le DOM. */
  function carte(i: number): HTMLElement | null {
    return (grille.current?.children[i] as HTMLElement | undefined) ?? null;
  }

  function poser(el: HTMLElement | null, x: number, y: number) {
    if (!el) return;
    el.style.transition = "none";
    /*
     * Une inclinaison proportionnelle au déplacement horizontal, très
     * faible. C'est ce qui donne l'impression de SOULEVER l'image
     * plutôt que de la faire glisser à plat, et trois degrés suffisent :
     * au-delà, on ne vise plus rien.
     */
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.06) rotate(${Math.max(-3, Math.min(3, x * 0.03))}deg)`;
  }

  function reposer(el: HTMLElement | null) {
    if (!el) return;
    // Elle retombe dans sa case au lieu d'y sauter.
    el.style.transition = "transform .24s cubic-bezier(.2,.9,.25,1)";
    el.style.transform = "";
  }

  function attraper(e: React.PointerEvent, i: number) {
    // Le bouton principal seulement : un clic droit ne déplace rien.
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    porteur.current = carte(i);
    depart.current = { x: e.clientX, y: e.clientY };
    dernier.current = { x: 0, y: 0 };
    setSaisi(i);
  }

  /**
   * Attraper en cliquant l'image elle-même, à la souris.
   *
   * C'est le geste qu'on essaie d'instinct, et la poignée en haut à
   * droite demandait de viser un carré de sept pixels avant de pouvoir
   * commencer.
   *
   * AU DOIGT, ON GARDE LA POIGNÉE, et ce n'est pas un oubli. Pour
   * traiter un glissement nous-mêmes, il faut refuser le geste au
   * navigateur ; si toute la vignette le refusait, on ne pourrait plus
   * faire défiler la page en posant le doigt sur une photo, c'est-à-dire
   * sur la moitié de l'écran. La poignée, elle, est assez petite pour
   * qu'on ne la touche jamais par hasard.
   */
  function attraperDepuisLImage(e: React.PointerEvent, i: number) {
    if (e.pointerType === "touch") return;
    attraper(e, i);
  }

  function deplacer(e: React.PointerEvent) {
    if (saisi === null) return;

    dernier.current = {
      x: e.clientX - depart.current.x,
      y: e.clientY - depart.current.y,
    };

    // Une seule écriture par image : la souris en envoie bien plus.
    if (!image.current) {
      image.current = requestAnimationFrame(() => {
        image.current = 0;
        poser(porteur.current, dernier.current.x, dernier.current.y);
      });
    }

    const cible = vignetteSous(e.clientX, e.clientY);
    if (cible === null || cible === saisi) return;

    /*
     * On réordonne EN CONTINU plutôt qu'au lâcher. La vignette suit le
     * doigt de case en case, donc on voit le résultat pendant le geste
     * au lieu de le découvrir après coup.
     */
    move(saisi, cible);
    setSaisi(cible);

    // Elle vient de changer de case : on repart d'ici, sinon elle
    // ferait un bond de la largeur d'une case.
    depart.current = { x: e.clientX, y: e.clientY };
    dernier.current = { x: 0, y: 0 };
    poser(porteur.current, 0, 0);
  }

  function lacher() {
    if (image.current) {
      cancelAnimationFrame(image.current);
      image.current = 0;
    }
    reposer(porteur.current);
    porteur.current = null;
    setSaisi(null);
  }

  const iconBtn =
    "grid h-7 w-7 place-items-center rounded-full bg-black/55 text-[13px] font-black text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-30";

  return (
    <div>
      <Label
        htmlFor={`${name}-file`}
        hint="Photos et vidéos, dans l'ordre que tu veux. Les images sont compressées automatiquement. La première PHOTO sert de vignette : une vidéo ne peut pas jouer ce rôle dans les listes ni dans l'aperçu d'un lien partagé."
      >
        {label}
      </Label>

      {urls.length > 1 && (
        <p className="m-0 mb-2 text-[12px] font-medium text-white/55">
          Attrape une vignette pour la déplacer. Au doigt, sers-toi de la poignée en haut
          à droite, ou des flèches.
        </p>
      )}

      {urls.length > 0 && (
        <div ref={grille} className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, i) => (
            <div
              key={url}
              onPointerDown={(e) => attraperDepuisLImage(e, i)}
              onPointerMove={deplacer}
              onPointerUp={lacher}
              onPointerCancel={lacher}
              /* Le curseur du site s'occupe de la main ouverte et du
                 poing : cet attribut est ce qui le lui dit. */
              data-saisissable=""
              className={`relative overflow-hidden rounded-[13px] border select-none ${
                saisi === i
                  ? "vignette-portee z-20 border-white"
                  : "border-white/25 transition"
              }`}
            >
              {estUneVideo(url) ? (
                <video
                  src={url}
                  muted
                  loop
                  playsInline
                  /* Sinon le navigateur lance SON glisser-déposer natif
                     dès qu'on tire sur l'image, et le nôtre n'est jamais
                     prévenu du mouvement. */
                  draggable={false}
                  /* Aucune lecture automatique ici : une planche de
                     huit vignettes qui s'animent toutes en même temps
                     rend le choix impossible. Au survol, suffit. */
                  preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                  className="block aspect-square w-full object-cover"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={url}
                  alt=""
                  draggable={false}
                  className="block aspect-square w-full object-cover"
                />
              )}
              <input type="hidden" name={name} value={url} />

              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)]">
                  Vignette
                </span>
              )}

              {/* La poignée. `touchAction: none` est la ligne qui rend
                  le geste possible au doigt : sans elle, le navigateur
                  garde le mouvement pour faire défiler la page et ne
                  nous transmet plus rien. */}
              <button
                type="button"
                aria-label={`Déplacer la position ${i + 1}`}
                onPointerDown={(e) => attraper(e, i)}
                onPointerMove={deplacer}
                onPointerUp={lacher}
                onPointerCancel={lacher}
                style={{ touchAction: "none" }}
                className={`${iconBtn} absolute right-2 top-2 cursor-grab active:cursor-grabbing`}
              >
                <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
                  {[4, 8, 12].map((y) =>
                    [5, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" />)
                  )}
                </svg>
              </button>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/60 to-transparent p-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className={iconBtn} aria-label="Reculer">‹</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === urls.length - 1} className={iconBtn} aria-label="Avancer">›</button>
                </div>
                <button type="button" onClick={() => remove(i)} className={iconBtn} aria-label="Retirer">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        id={`${name}-file`}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        onChange={onFiles}
        disabled={busy}
        className="w-full text-[13px] font-semibold text-white/85 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-[12px] file:font-extrabold file:uppercase file:tracking-[0.08em] file:text-[var(--color-ink)]"
      />

      {busy && <p className="m-0 mt-2 text-[12.5px] font-bold text-white/80">Envoi en cours…</p>}
      {note && <p className="m-0 mt-2 text-[12.5px] text-white">{note}</p>}
      {urls.length === 0 && <input type="hidden" name={name} value="" />}
    </div>
  );
}
