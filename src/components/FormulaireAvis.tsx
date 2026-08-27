"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Etoiles, { enEtoiles } from "./Etoiles";
import { enregistrerAvis, supprimerAvis, type Avis } from "@/lib/avis";

/**
 * Donner sa note, et dire pourquoi.
 *
 * Le choix se fait au demi-cran : dix positions, présentées comme
 * cinq étoiles. On ne demande pas de commentaire, mais on laisse la
 * place — une note seule reste une information, un avis argumenté en
 * est une bien meilleure.
 */

const LIBELLES: Record<number, string> = {
  1: "À éviter",
  2: "Décevant",
  3: "Moyen",
  4: "Correct",
  5: "Pas mal",
  6: "Bien",
  7: "Très bien",
  8: "Excellent",
  9: "Remarquable",
  10: "Exceptionnel",
};

export default function FormulaireAvis({
  cible,
  cibleId,
  nom,
  chemin,
  mien,
}: {
  cible: "marque" | "piece";
  cibleId: string;
  nom: string;
  /** Adresse de la page, pour la rafraîchir après coup. */
  chemin: string;
  /** L'avis déjà déposé par la personne, s'il existe. */
  mien: Avis | null;
}) {
  const [note, setNote] = useState(mien?.note ?? 0);
  const [survol, setSurvol] = useState(0);
  const [commentaire, setCommentaire] = useState(mien?.commentaire ?? "");
  const [note_, setNote_] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const affichee = survol || note;

  function envoyer() {
    if (note < 1) {
      setNote_("Choisis d'abord une note.");
      return;
    }

    /*
     * On efface le message AVANT de partir.
     *
     * Sans ça, « Choisis d'abord une note » restait affiché pendant
     * tout l'envoi, puis était remplacé : on le voyait donc réapparaître
     * une fraction de seconde alors qu'on venait justement de choisir
     * sa note, et on croyait à un refus.
     */
    setNote_(null);

    const formData = new FormData();
    formData.set("note", String(note));
    formData.set("commentaire", commentaire);
    formData.set("chemin", chemin);
    formData.set(cible === "marque" ? "brand_id" : "product_id", cibleId);

    startTransition(async () => {
      const res = await enregistrerAvis(formData);

      if (res.raison === "non-connecte") {
        router.push(`/connexion?suite=${encodeURIComponent(chemin)}`);
        return;
      }
      setNote_(res.ok ? "Merci, ton avis est en ligne." : (res.error ?? "L'envoi a échoué."));
      if (res.ok) router.refresh();
    });
  }

  function retirer() {
    if (!mien) return;
    const formData = new FormData();
    formData.set("id", mien.id);
    formData.set("chemin", chemin);

    startTransition(async () => {
      const res = await supprimerAvis(formData);
      if (res.ok) {
        setNote(0);
        setCommentaire("");
        setNote_("Ton avis a été retiré.");
        router.refresh();
      } else {
        setNote_(res.error ?? "Le retrait a échoué.");
      }
    });
  }

  return (
    <div className="glass p-4 sm:p-5">
      <p className="m-0 text-[14px] font-extrabold text-white">
        {mien ? "Ton avis" : `Ton avis sur ${nom}`}
      </p>
      <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-white/62">
        {cible === "marque"
          ? "La qualité, le sérieux, l'expérience d'achat. Ce que tu aurais aimé lire avant de commander."
          : "La coupe, la matière, la finition. Ce qu'une photo ne dit pas."}
      </p>

      {/* Dix positions, présentées comme cinq étoiles. Chaque étoile
          porte deux boutons : sa moitié gauche et sa moitié droite. */}
      <div
        className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2"
        onMouseLeave={() => setSurvol(0)}
      >
        <div className="relative inline-block">
          <Etoiles note={affichee} taille="grande" />
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => {
              const valeur = i + 1;
              return (
                <button
                  key={valeur}
                  type="button"
                  onClick={() => setNote(valeur)}
                  onMouseEnter={() => setSurvol(valeur)}
                  onFocus={() => setSurvol(valeur)}
                  onBlur={() => setSurvol(0)}
                  aria-label={`${enEtoiles(valeur)} étoile${valeur > 2 ? "s" : ""}`}
                  aria-pressed={note === valeur}
                  className="h-full w-[10%] cursor-pointer py-2"
                />
              );
            })}
          </div>
        </div>

        <span className="text-[12.5px] font-bold text-white/80 sm:text-[13px]">
          {affichee > 0 ? `${enEtoiles(affichee)} / 5 · ${LIBELLES[affichee]}` : "Pas encore noté"}
        </span>
      </div>

      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Quelques phrases, si tu veux. C'est facultatif."
        className="champ mt-4"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={envoyer}
          disabled={pending}
          className="rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-55"
        >
          {pending ? "…" : mien ? "Mettre à jour" : "Publier mon avis"}
        </button>

        {mien && (
          <button
            type="button"
            onClick={retirer}
            disabled={pending}
            className="text-[12.5px] font-bold text-white/70 underline underline-offset-4 transition hover:text-white disabled:opacity-55"
          >
            Retirer mon avis
          </button>
        )}

        {note_ && <p className="m-0 text-[12.5px] text-white/85">{note_}</p>}
      </div>
    </div>
  );
}
