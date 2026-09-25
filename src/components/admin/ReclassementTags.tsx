"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reclasserLeCatalogue } from "@/app/admin/tags-actions";

/**
 * Reclasser tout le catalogue, sans relire une seule boutique.
 *
 * Mille pièces par appel, en boucle tant qu'il en reste : même
 * mécanique que « Relire toutes les boutiques », mais sans réseau, donc
 * l'affaire de quelques secondes par tranche au lieu d'une minute pour
 * dix marques.
 */
export default function ReclassementTags({ total }: { total: number }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [parcourues, setParcourues] = useState(0);
  const [changees, setChangees] = useState(0);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const arret = useRef(false);

  async function lancer() {
    arret.current = false;
    setEnCours(true);
    setNote(null);
    setParcourues(0);
    setChangees(0);
    setRestantes(null);

    let rang = 0;
    try {
      for (;;) {
        if (arret.current) break;
        const res = await reclasserLeCatalogue(rang);
        if (!res.ok) {
          setNote(res.error ?? "Le reclassement a échoué.");
          break;
        }
        rang += res.parcourues;
        setParcourues(rang);
        setChangees((n) => n + res.changees);
        setRestantes(res.restantes);
        if (res.parcourues === 0 || res.restantes === 0) break;
      }
    } finally {
      setEnCours(false);
      router.refresh();
    }
  }

  return (
    <section className="glass p-4 sm:p-5">
      <h2 className="m-0 text-[15.5px] font-extrabold text-white">Reclasser tout le catalogue</h2>
      <p className="m-0 mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/65">
        Recalcule le rayon, le type et les tags de boutique de chaque pièce à partir de ce
        que sa boutique a déclaré lors de la dernière lecture. Aucune boutique n&apos;est
        interrogée. À lancer une fois après la migration 34, puis après chaque changement
        du lexique (<code>src/lib/tags.ts</code>). Les pièces dont le gérant a choisi le
        rayon à la main gardent le leur.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={lancer}
          disabled={enCours}
          className="rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] transition active:scale-[.97] disabled:opacity-55"
        >
          {enCours ? "Reclassement…" : `Reclasser les ${total.toLocaleString("fr-FR")} pièces`}
        </button>

        {enCours && (
          <button
            type="button"
            onClick={() => {
              arret.current = true;
            }}
            className="rounded-full border border-white/40 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-white/18 active:scale-[.97]"
          >
            Arrêter
          </button>
        )}

        {parcourues > 0 && (
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
            {parcourues.toLocaleString("fr-FR")} relues · {changees.toLocaleString("fr-FR")}{" "}
            reclassée{changees > 1 ? "s" : ""}
            {restantes !== null && restantes > 0 && ` · ${restantes.toLocaleString("fr-FR")} à venir`}
          </p>
        )}
      </div>

      {note && <p className="glass m-0 mt-4 px-4 py-3 text-[13px] text-white">{note}</p>}
    </section>
  );
}
