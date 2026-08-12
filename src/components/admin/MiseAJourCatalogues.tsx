"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rafraichirLesCatalogues, type BilanMarque } from "@/app/admin/catalogues-actions";

/**
 * Un bouton, et la page s'occupe du reste.
 *
 * Le serveur ne traite que trois marques par appel, faute de temps :
 * lire un plan de site prend une dizaine de secondes et Vercel coupe à
 * soixante. C'est donc ici qu'on enchaîne, en rappelant l'action tant
 * qu'il reste des marques. De ton côté, c'est un seul clic.
 */
export default function MiseAJourCatalogues({ total }: { total: number }) {
  const router = useRouter();
  const [resultats, setResultats] = useState<BilanMarque[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  /** Le rang atteint, et le drapeau d'arrêt. */
  const rang = useRef(0);
  const arret = useRef(false);

  async function lancer() {
    arret.current = false;
    setEnCours(true);
    setNote(null);

    try {
      for (;;) {
        if (arret.current) break;

        const formData = new FormData();
        formData.set("depuis", String(rang.current));

        const res = await rafraichirLesCatalogues(formData);
        if (!res.ok) {
          setNote(res.error ?? "La mise à jour a échoué.");
          break;
        }

        if (res.taux) setNote(res.taux);
        rang.current += res.parcourues;
        setResultats((r) => [...r, ...res.resultats]);
        setRestantes(res.restantes);

        if (res.parcourues === 0 || res.restantes === 0) break;
      }
    } finally {
      setEnCours(false);
      router.refresh();
    }
  }

  const faites = resultats.length;
  const echecs = resultats.filter((r) => !r.ok).length;

  return (
    <section className="glass p-4 sm:p-5">
      <h2 className="m-0 text-[15.5px] font-extrabold text-white">Relire toutes les boutiques</h2>
      <p className="m-0 mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/65">
        Prix, tailles, photos et disponibilités sont relus chez chaque marque. C&apos;est
        aussi ce qui recalcule l&apos;équivalent en euros des prix étrangers : il se
        calcule à la lecture, pas à l&apos;affichage, donc une correction ne prend effet
        qu&apos;après un passage.
      </p>
      <p className="m-0 mt-2 max-w-2xl text-[13px] leading-relaxed text-white/65">
        La tâche de midi fait la même chose, mais six marques par jour. Ici tout y passe
        d&apos;affilée : compte une minute pour dix marques, et laisse cet onglet ouvert.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={lancer}
          disabled={enCours}
          className="rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-55"
        >
          {enCours ? "Lecture en cours…" : faites === 0 ? `Tout mettre à jour (${total})` : "Reprendre"}
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

        {faites > 0 && (
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
            {faites} lue{faites > 1 ? "s" : ""}
            {echecs > 0 && ` · ${echecs} en échec`}
            {restantes !== null && restantes > 0 && ` · ${restantes} à venir`}
          </p>
        )}
      </div>

      {note && <p className="glass m-0 mt-4 px-4 py-3 text-[13px] text-white">{note}</p>}

      {resultats.length > 0 && (
        <div className="mt-4 flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1">
          {resultats.map((r) => (
            <div
              key={r.brandId}
              className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded-[11px] border px-3 py-2 ${
                r.ok ? "border-white/25 bg-white/6" : "border-white/12"
              }`}
            >
              <span className="text-[13px] font-extrabold text-white">{r.nom}</span>
              <span className="text-[12px] leading-snug text-white/60">{r.note}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
