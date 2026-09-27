"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { allegerImage } from "@/lib/alleger-image";
import { publierAnnonce } from "@/app/forum/actions";
import {
  IMAGES_MAX,
  REMUNERATIONS,
  RUBRIQUES,
  rubrique as laRubrique,
  TEXTE_MAX,
  TITRE_MAX,
  VILLES,
  type Annonce,
  type Details,
  type MoiForum,
  type RubriqueCle,
} from "@/lib/forum";
import CarteAnnonce from "./CarteAnnonce";
import ChoixDates from "./ChoixDates";
import ChoixPseudo from "./ChoixPseudo";

/**
 * Publier une annonce : une seule page, pas d'étapes.
 *
 * L'ORDRE DES CHAMPS EST CELUI DES QUESTIONS QU'ON SE POSE : de quoi
 * s'agit-il (la rubrique), quoi (le titre), où, à quoi ça ressemble
 * (les photos, facultatives), le détail, puis ce qui est propre à la
 * rubrique. Le bloc « Détails » change avec la rubrique : une date et
 * une rémunération pour un casting, une adresse et une entrée pour un
 * pop-up, rien pour une discussion.
 *
 * L'APERÇU SE CONSTRUIT PENDANT QU'ON TAPE, à droite, avec la vraie
 * carte du fil (`CarteAnnonce`) : ce qu'on voit est exactement ce qui
 * sera publié. Il reste en vue en descendant (colonne collante).
 */

type MarqueGeree = { id: string; name: string; slug: string };

const AUTRE = "__autre__";

export default function FormulaireAnnonce({
  moi,
  marques,
}: {
  moi: MoiForum;
  marques: MarqueGeree[];
}) {
  const router = useRouter();
  const [cle, setCle] = useState<RubriqueCle>("casting");
  const [titre, setTitre] = useState("");
  const [ville, setVille] = useState(moi.ville && VILLES.includes(moi.ville) ? moi.ville : "Paris");
  const [villeLibre, setVilleLibre] = useState("");
  const [texte, setTexte] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState<Details>({ remuneration: "remunere" });
  const [marqueId, setMarqueId] = useState<string>("");
  const [handle, setHandle] = useState(moi.handle);
  const [pseudo, setPseudo] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [photosEnCours, setPhotosEnCours] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const fichiers = useRef<HTMLInputElement>(null);

  const r = laRubrique(cle);
  const villeFinale = ville === AUTRE ? villeLibre.trim() : ville;
  const marque = marques.find((m) => m.id === marqueId) ?? null;

  const apercu: Annonce = useMemo(
    () => ({
      id: "apercu",
      rubrique: cle,
      titre: titre.trim() || "Votre titre apparaîtra ici",
      texte: texte.trim(),
      ville: villeFinale || null,
      images,
      // Seulement les détails de la rubrique choisie : passer d'un
      // casting à une collab ne doit pas laisser « Rémunéré » sur la carte.
      details: Object.fromEntries(
        Object.entries(details).filter(([k]) => r.details.some((c) => c.cle === k))
      ) as Details,
      cloturee: false,
      masque: false,
      votes: 0,
      commentaires: 0,
      created_at: new Date().toISOString(),
      auteur: { id: moi.id, handle: handle ?? "toi", nom: moi.nom, avatar: null },
      marque: marque ? { id: marque.id, nom: marque.name, slug: marque.slug } : null,
      aVote: false,
    }),
    [cle, titre, texte, villeFinale, images, details, moi, handle, marque, r]
  );

  /* ---------------- les photos ---------------- */

  async function ajouterPhotos(liste: FileList | File[]) {
    const place = IMAGES_MAX - images.length - photosEnCours;
    const choisies = Array.from(liste).filter((f) => f.type.startsWith("image/")).slice(0, place);
    if (choisies.length === 0) return;

    const supabase = createClient();
    if (!supabase) {
      setErreur("L'envoi de photos n'est pas disponible ici.");
      return;
    }

    setErreur(null);
    setPhotosEnCours((n) => n + choisies.length);
    for (const f of choisies) {
      try {
        if (f.size > 25 * 1024 * 1024) throw new Error("Image trop lourde : 25 Mo maximum.");
        // Redimensionnée et passée en WebP dans le navigateur : le
        // stockage, la bande passante et le fil y gagnent tous.
        const allege = await allegerImage(f, { maxCote: 1600, qualite: 0.82 });
        const ext = allege.modifie ? "webp" : (f.name.split(".").pop() ?? "jpg").toLowerCase();
        // Dans SON dossier : c'est la seule écriture que la base permet.
        const chemin = `${moi.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("forum")
          .upload(chemin, allege.fichier, { cacheControl: "31536000", upsert: false });
        if (error) throw new Error(`Photo refusée : ${error.message}`);
        const { data } = supabase.storage.from("forum").getPublicUrl(chemin);
        setImages((l) => (l.length < IMAGES_MAX ? [...l, data.publicUrl] : l));
      } catch (e) {
        setErreur((e as Error).message || "Une photo n'est pas passée.");
      } finally {
        setPhotosEnCours((n) => n - 1);
      }
    }
  }

  function retirerPhoto(url: string) {
    setImages((l) => l.filter((u) => u !== url));
    // Le fichier part aussi du stockage ; s'il résiste, il n'est plus
    // référencé nulle part et ne s'affichera jamais.
    const chemin = url.split("/storage/v1/object/public/forum/")[1];
    const supabase = createClient();
    if (chemin && supabase) void supabase.storage.from("forum").remove([decodeURIComponent(chemin)]);
  }

  /* ---------------- publier ---------------- */

  const pret = titre.trim().length >= 3 && photosEnCours === 0 && !envoi;

  async function publier() {
    setEnvoi(true);
    setErreur(null);
    const res = await publierAnnonce({
      rubrique: cle,
      titre,
      texte,
      ville: villeFinale,
      images,
      details,
      marqueId: marqueId || null,
    });
    if (res.raison === "pseudo") {
      setEnvoi(false);
      setPseudo(true);
      return;
    }
    if (!res.ok || !res.lien) {
      setEnvoi(false);
      setErreur(res.error ?? "L'annonce n'a pas été publiée.");
      return;
    }
    router.push(res.lien);
  }

  function surPublier() {
    if (!handle) setPseudo(true);
    else void publier();
  }

  /* ---------------- le dessin ---------------- */

  const etiquette = "mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-white/80";

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="min-w-0">
        {/* La rubrique */}
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Rubrique</legend>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-3">
            {RUBRIQUES.map((x) => {
              const actif = x.cle === cle;
              return (
                <button
                  key={x.cle}
                  type="button"
                  onClick={() => setCle(x.cle)}
                  aria-pressed={actif}
                  className={`min-h-[52px] rounded-[16px] px-3.5 py-3 text-left transition active:scale-[.98] sm:rounded-[18px] sm:px-4 sm:py-3.5 ${
                    actif
                      ? "bg-[#fff] text-[var(--color-ink)] shadow-[0_10px_26px_rgba(23,10,51,0.28)]"
                      : "border border-white/22 bg-white/8 text-white hover:bg-white/14"
                  }`}
                >
                  <span className="flex items-center gap-2 text-[14px] font-extrabold leading-tight sm:text-[15px]">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: x.couleur, boxShadow: "inset 0 0 0 1px rgba(23,10,51,.22)" }}
                    />
                    {x.label}
                  </span>
                  {/* Au doigt, les six tuiles tiennent en trois rangées sans
                      leur description ; le nom suffit à choisir. */}
                  <span className={`mt-1 hidden text-[12.5px] font-medium sm:block ${actif ? "text-[#5a4a85]" : "text-white/70"}`}>
                    {x.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Le titre */}
        <div className="mt-6">
          <label htmlFor="titre-annonce" className={`${etiquette} flex justify-between`}>
            <span>Titre</span>
            <span className="tabular-nums tracking-normal">
              {titre.length} / {TITRE_MAX}
            </span>
          </label>
          <input
            id="titre-annonce"
            value={titre}
            onChange={(e) => setTitre(e.target.value.slice(0, TITRE_MAX))}
            placeholder="Ex. Recherche mannequin pour shooting à Paris"
            className="champ text-[16px]"
          />
        </div>

        {/* La ville et les photos */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ville-annonce" className={etiquette}>
              Ville
            </label>
            <select
              id="ville-annonce"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="champ cursor-pointer"
            >
              {VILLES.map((v) => (
                <option key={v} value={v} className="text-[#170a33]">
                  {v}
                </option>
              ))}
              <option value={AUTRE} className="text-[#170a33]">
                Autre ville…
              </option>
            </select>
            {ville === AUTRE && (
              <input
                value={villeLibre}
                onChange={(e) => setVilleLibre(e.target.value.slice(0, 60))}
                placeholder="Laquelle ?"
                aria-label="Autre ville"
                className="champ mt-2"
              />
            )}
          </div>

          <div>
            <span className={etiquette}>
              Photos <span className="font-bold normal-case tracking-normal text-white/60">· facultatif</span>
            </span>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void ajouterPhotos(e.dataTransfer.files);
              }}
              className="rounded-[13px] border border-dashed border-white/40 p-2"
            >
              {images.length > 0 && (
                <div className="mb-2 grid grid-cols-4 gap-1.5">
                  {images.map((u) => (
                    <div key={u} className="relative aspect-square overflow-hidden rounded-[9px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => retirerPhoto(u)}
                        aria-label="Retirer cette photo"
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[rgba(15,5,38,0.7)] text-[12px] font-black text-[#fff]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fichiers.current?.click()}
                disabled={images.length + photosEnCours >= IMAGES_MAX}
                className="flex min-h-[40px] w-full items-center justify-center rounded-[10px] text-[13px] font-bold text-white/85 transition hover:bg-white/8 disabled:opacity-50"
              >
                {photosEnCours > 0
                  ? "Envoi en cours…"
                  : images.length >= IMAGES_MAX
                    ? "Quatre photos, c'est le maximum"
                    : `Ajouter ou glisser jusqu'à ${IMAGES_MAX - images.length} image${IMAGES_MAX - images.length > 1 ? "s" : ""}`}
              </button>
              <input
                ref={fichiers}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) void ajouterPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        {/* La description */}
        <div className="mt-5">
          <label htmlFor="texte-annonce" className={etiquette}>
            Description
          </label>
          <textarea
            id="texte-annonce"
            value={texte}
            onChange={(e) => setTexte(e.target.value.slice(0, TEXTE_MAX))}
            rows={5}
            placeholder="Le projet, le profil recherché, ce que vous proposez en échange."
            className="champ min-h-[120px] resize-y"
          />
        </div>

        {/* Les détails de la rubrique */}
        {r.details.length > 0 && (
          <div className="glass mt-6 p-4 sm:p-5">
            <p className="eyebrow m-0 mb-3">Détails · {r.label}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {r.details.map((champ) =>
                champ.type === "dates" ? (
                  /* Pas de <label> autour du calendrier : un clic dans le
                     panneau déplié serait renvoyé au bouton, qui le
                     refermerait. L'étiquette le vise par son id. */
                  <div key={champ.cle}>
                    <label
                      htmlFor={`detail-${champ.cle}`}
                      className="mb-1.5 block text-[12.5px] font-extrabold text-white"
                    >
                      {champ.label}
                    </label>
                    <ChoixDates
                      id={`detail-${champ.cle}`}
                      valeur={details[champ.cle] ?? ""}
                      onChange={(v) => setDetails((d) => ({ ...d, [champ.cle]: v }))}
                      placeholder={champ.placeholder}
                    />
                  </div>
                ) : (
                  <label key={champ.cle} className="block">
                    <span className="mb-1.5 block text-[12.5px] font-extrabold text-white">{champ.label}</span>
                    {champ.type === "remuneration" ? (
                      <select
                        value={details.remuneration ?? "remunere"}
                        onChange={(e) => setDetails((d) => ({ ...d, remuneration: e.target.value }))}
                        className="champ cursor-pointer"
                      >
                        {REMUNERATIONS.map((x) => (
                          <option key={x.cle} value={x.cle} className="text-[#170a33]">
                            {x.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={details[champ.cle] ?? ""}
                        onChange={(e) => setDetails((d) => ({ ...d, [champ.cle]: e.target.value.slice(0, 120) }))}
                        placeholder={champ.placeholder}
                        className="champ"
                      />
                    )}
                  </label>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- l'aperçu, collant ---------------- */}
      <div className="lg:sticky lg:top-[96px]">
        <p className="eyebrow m-0 mb-2.5">Aperçu dans le fil</p>
        <CarteAnnonce annonce={apercu} apercu />

        {marques.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow m-0 mb-2">Publier en tant que</p>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: "", name: handle ? `@${handle}` : "Moi" }, ...marques].map((m) => (
                <button
                  key={m.id || "moi"}
                  type="button"
                  onClick={() => setMarqueId(m.id)}
                  aria-pressed={marqueId === m.id}
                  className={`min-h-[36px] rounded-full px-3.5 text-[12.5px] font-extrabold transition ${
                    marqueId === m.id
                      ? "bg-white text-[var(--color-ink)]"
                      : "border border-white/25 text-white/85 hover:bg-white/12"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {erreur && (
          <p className="m-0 mt-4 rounded-[12px] bg-white/14 px-3.5 py-2.5 text-[13px] font-semibold text-white">
            {erreur}
          </p>
        )}

        <button
          type="button"
          onClick={surPublier}
          disabled={!pret}
          className="mt-4 flex min-h-[50px] w-full items-center justify-center rounded-[16px] bg-white text-[15px] font-black text-[var(--color-ink)] shadow-[0_12px_30px_rgba(23,10,51,0.3)] transition active:scale-[.98] disabled:opacity-50"
        >
          {envoi ? "Publication…" : "Publier"}
        </button>
        <p className="m-0 mt-3 text-center text-[12px] font-semibold leading-relaxed text-white/75">
          Publié tout de suite. Une annonce signalée trois fois est masquée en attendant qu&apos;on
          la relise.
        </p>
      </div>

      <ChoixPseudo
        ouvert={pseudo}
        nomInitial={moi.nom}
        onFermer={() => setPseudo(false)}
        onChoisi={(h) => {
          setHandle(h);
          setPseudo(false);
          void publier();
        }}
      />
    </div>
  );
}
