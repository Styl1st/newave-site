"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerPhotoProfil } from "@/app/forum/actions";

/**
 * La photo de profil, là où l'on se voit : en tête de Mon compte.
 *
 * LA PHOTO SE CHANGE EN TOUCHANT LA PHOTO. C'est le geste que tout le
 * monde essaie en premier, sur n'importe quelle appli. Le carré porte
 * une petite pastille appareil photo pour le dire, et un lien écrit
 * (« Ajouter une photo », « Changer la photo ») le répète à côté du
 * nom, pour qui ne pense pas à toucher l'image.
 *
 * UN SEUL ENDROIT. La photo était rangée dans « Sur le forum », sous le
 * formulaire d'identité : il fallait descendre pour la trouver, et
 * personne ne la trouvait. Elle vit maintenant en tête de la page, et
 * nulle part ailleurs.
 *
 * `children` : ce qui s'écrit à côté (nom, adresse). Les liens de la
 * photo se posent dessous.
 */
export default function PhotoCompte({
  id,
  initiale,
  avatar,
  taille,
  arrondi,
  children,
  clair = false,
}: {
  id: string;
  initiale: string;
  /** L'adresse de la photo actuelle, déjà passée par `photoSure`. */
  avatar: string | null;
  taille: number;
  arrondi: number;
  children?: ReactNode;
  /** Liens sur fond sombre et chromé (le visuel du téléphone) : plus contrastés. */
  clair?: boolean;
}) {
  const { poser, retirer, travail, erreur, derniere } = usePhotoProfil(id);
  const choix = useRef<HTMLInputElement>(null);
  // La photo qu'on vient de poser s'affiche tout de suite, sans attendre
  // que la page se relise.
  const photo = derniere !== undefined ? derniere : avatar;
  const ouvrir = () => !travail && choix.current?.click();

  const lien = `font-extrabold underline decoration-white/35 underline-offset-4 transition hover:decoration-white disabled:opacity-60 ${
    clair ? "text-white" : "text-white/85 hover:text-white"
  }`;

  return (
    <div className="flex min-w-0 items-center gap-4 sm:gap-5">
      <button
        type="button"
        onClick={ouvrir}
        disabled={travail}
        aria-label={photo ? "Changer la photo de profil" : "Ajouter une photo de profil"}
        title={photo ? "Changer la photo" : "Ajouter une photo"}
        className="group relative shrink-0 transition active:scale-[.97]"
        style={{ width: taille, height: taille }}
      >
        <span
          className="absolute inset-0 grid place-items-center overflow-hidden font-black text-white"
          style={{
            borderRadius: arrondi,
            fontSize: Math.round(taille * 0.37),
            background: "linear-gradient(140deg, rgba(var(--accent-1), .5), rgba(var(--accent-2), .44))",
          }}
        >
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            initiale
          )}
          {/* Au survol (souris), le carré entier dit ce qu'il fait. */}
          <span
            aria-hidden
            className={`absolute inset-0 grid place-items-center bg-[rgba(15,5,38,0.5)] transition ${
              travail ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            }`}
          >
            {travail ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <IconePhoto />}
          </span>
        </span>
        {/* Toujours visible : c'est ce qui dit, au doigt, qu'on peut toucher. */}
        <span
          aria-hidden
          className={`absolute grid place-items-center rounded-full bg-[#fff] text-[var(--color-ink)] shadow-[0_4px_12px_rgba(15,5,38,0.35)] ${
            taille < 64 ? "-bottom-1.5 -right-1.5 h-6 w-6" : "-bottom-1 -right-1 h-7 w-7"
          }`}
        >
          <IconePhoto petite />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {children}
        <p className={`m-0 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] ${children ? "mt-2" : ""}`}>
          <button type="button" onClick={ouvrir} disabled={travail} className={lien}>
            {travail ? "Envoi…" : photo ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {photo && !travail && (
            <button type="button" onClick={() => void retirer()} className={`${lien} decoration-transparent`}>
              Retirer
            </button>
          )}
        </p>
        {erreur && (
          <p role="alert" className="m-0 mt-1.5 text-[12.5px] font-bold text-white">
            {erreur}
          </p>
        )}
      </div>

      <input
        ref={choix}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          void poser(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function IconePhoto({ petite = false }: { petite?: boolean }) {
  const t = petite ? 14 : 22;
  return (
    <svg
      width={t}
      height={t}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={petite ? 2.3 : 2}
      strokeLinejoin="round"
      className={petite ? "" : "text-white"}
    >
      <path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z" />
      <circle cx="12" cy="13.2" r="3.4" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   L'envoi
   ------------------------------------------------------------------ */

const COTE = 512;

/**
 * L'image choisie, recadrée en carré au centre et réduite à 512 px, en
 * WebP. Une photo de profil s'affiche au plus en 92 px (184 sur un
 * écran dense) : envoyer les 4000 px d'un téléphone ne servirait à
 * rien, et le carré évite qu'un visage soit coupé différemment selon
 * l'endroit où la photo s'affiche.
 */
async function enCarre(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const cote = Math.min(image.width, image.height);
  const sortie = Math.min(COTE, cote);
  const toile = document.createElement("canvas");
  toile.width = sortie;
  toile.height = sortie;
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("Ton navigateur n'a pas pu préparer l'image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, (image.width - cote) / 2, (image.height - cote) / 2, cote, cote, 0, 0, sortie, sortie);
  image.close();
  const blob = await new Promise<Blob | null>((ok) => toile.toBlob(ok, "image/webp", 0.86));
  if (!blob) throw new Error("Ton navigateur n'a pas pu préparer l'image.");
  return blob;
}

/**
 * Envoyer, remplacer, retirer la photo.
 *
 * Le fichier part dans `forum/{identifiant}/avatar-….webp` (la seule
 * écriture que le bucket permet, et le seul chemin que le garde-fou de
 * la migration 39 accepte), puis l'action serveur l'enregistre et
 * supprime l'ancienne. Toute la page se relit ensuite : la barre du
 * haut prend la nouvelle photo avec le reste.
 */
function usePhotoProfil(id: string) {
  const router = useRouter();
  const [travail, setTravail] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /** undefined : rien changé ici ; sinon la photo posée (ou null, retirée). */
  const [derniere, setDerniere] = useState<string | null | undefined>(undefined);

  async function poser(fichier: File | undefined) {
    setErreur(null);
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) return setErreur("Choisis une image (JPG, PNG ou WebP).");
    if (fichier.size > 25 * 1024 * 1024) return setErreur("Image trop lourde : 25 Mo maximum.");
    const supabase = createClient();
    if (!supabase) return setErreur("L'envoi de photos n'est pas disponible ici.");

    setTravail(true);
    try {
      const carre = await enCarre(fichier);
      const chemin = `${id}/avatar-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("forum")
        .upload(chemin, carre, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (error) throw new Error(`Photo refusée : ${error.message}`);

      const url = supabase.storage.from("forum").getPublicUrl(chemin).data.publicUrl;
      const res = await enregistrerPhotoProfil(url);
      if (!res.ok) {
        void supabase.storage.from("forum").remove([chemin]);
        throw new Error(res.error ?? "La photo n'a pas été enregistrée.");
      }
      setDerniere(url);
      router.refresh();
    } catch (e) {
      setErreur((e as Error).message || "La photo n'est pas passée.");
    } finally {
      setTravail(false);
    }
  }

  async function retirer() {
    setErreur(null);
    setTravail(true);
    const res = await enregistrerPhotoProfil(null);
    setTravail(false);
    if (!res.ok) return setErreur(res.error ?? "La photo n'a pas été retirée.");
    setDerniere(null);
    router.refresh();
  }

  return { poser, retirer, travail, erreur, derniere };
}
