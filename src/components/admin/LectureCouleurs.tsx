"use client";

import { useRef, useState } from "react";
import { lireLesCouleurs } from "@/app/admin/couleurs-actions";
import { enChiffres } from "../chiffres";

/**
 * Le rattrapage des couleurs : enchaîne les passages de quarante
 * secondes tant que la file n'est pas vide. On peut arrêter et reprendre,
 * rien n'est perdu : ce qui est lu est écrit à chaque passage.
 */
export default function LectureCouleurs() {
  const [enCours, setEnCours] = useState(false);
  const [totaux, setTotaux] = useState({ nom: 0, photo: 0, rien: 0 });
  const [restantes, setRestantes] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const arret = useRef(false);

  async function lancer() {
    arret.current = false;
    setEnCours(true);
    setNote(null);
    try {
      for (;;) {
        if (arret.current) break;
        const b = await lireLesCouleurs();
        setTotaux((t) => ({ nom: t.nom + b.parLeNom, photo: t.photo + b.parLaPhoto, rien: t.rien + b.sansReponse }));
        setRestantes(b.restantes);
        if (!b.ok) {
          setNote(b.erreur ?? "Le passage a échoué.");
          break;
        }
        if (b.lues === 0 || b.restantes === 0) break;
      }
    } catch {
      setNote("Le serveur n'a pas répondu. Relance : rien de ce qui est lu n'est perdu.");
    } finally {
      setEnCours(false);
    }
  }

  const faites = totaux.nom + totaux.photo + totaux.rien;

  return (
    <section className="glass mt-5 p-4 sm:p-5">
      <h2 className="m-0 text-[15.5px] font-extrabold text-white">Lire les couleurs des pièces</h2>
      <p className="m-0 mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/65">
        C&apos;est ce qui nourrit le filtre « Couleur » de la vitrine. La couleur se lit
        d&apos;abord dans le nom de la pièce, sinon sur une vignette de sa photo, et une
        seule fois : une pièce n&apos;est relue que si son nom ou sa photo change. La tâche
        quotidienne s&apos;occupe des nouvelles ; ce bouton sert à rattraper tout le
        catalogue. Laisse l&apos;onglet ouvert, compte quelques minutes pour mille pièces.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={lancer}
          disabled={enCours || restantes === 0}
          className="rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(var(--voile),0.3)] transition hover:shadow-[0_8px_22px_rgba(var(--voile),0.45)] active:scale-[.97] disabled:opacity-55"
        >
          {enCours ? "Lecture en cours…" : restantes === 0 ? "Tout est lu" : faites > 0 ? "Reprendre" : "Lire les couleurs"}
        </button>
        {enCours && (
          <button
            type="button"
            onClick={() => {
              arret.current = true;
            }}
            className="rounded-full border border-white/40 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-white/18 active:scale-[.97]"
          >
            Arrêter après ce passage
          </button>
        )}
      </div>

      {(faites > 0 || restantes !== null) && (
        <p className="m-0 mt-3 text-[13px] leading-relaxed text-white/80" aria-live="polite">
          {enChiffres(totaux.nom)} par le nom · {enChiffres(totaux.photo)} par la photo ·{" "}
          {enChiffres(totaux.rien)} sans réponse
          {restantes !== null && <> · <b className="text-white">{enChiffres(restantes)} encore à lire</b></>}
        </p>
      )}
      {note && <p className="m-0 mt-2 text-[13px] font-semibold text-white">{note}</p>}
    </section>
  );
}
