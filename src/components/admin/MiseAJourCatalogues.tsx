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
  const [corrigerPays, setCorrigerPays] = useState(false);

  /** Le rang atteint, et le drapeau d'arrêt. */
  const rang = useRef(0);
  const arret = useRef(false);

  const termine = restantes === 0;

  async function lancer() {
    /*
     * Une série achevée : on repart de zéro plutôt que de rester
     * planté sur un « Reprendre » qui n'a plus rien à reprendre.
     *
     * Ce n'est pas qu'un confort. Le tri instable a fait sauter des
     * marques lors des premiers passages, et il faut donc pouvoir
     * relancer un tour complet sans recharger la page.
     */
    if (termine) {
      rang.current = 0;
      setResultats([]);
      setRestantes(null);
    }

    arret.current = false;
    setEnCours(true);
    setNote(null);

    try {
      for (;;) {
        if (arret.current) break;

        const formData = new FormData();
        formData.set("depuis", String(rang.current));
        if (corrigerPays) formData.set("pays", "1");

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

      {/* Décochée par défaut : écraser un pays déjà saisi n'est pas le
          genre de chose qu'on découvre après coup. */}
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[13px] border border-white/18 bg-white/6 p-3">
        <input
          type="checkbox"
          checked={corrigerPays}
          onChange={(e) => setCorrigerPays(e.target.checked)}
          disabled={enCours}
          className="mt-0.5 h-4 w-4 shrink-0 accent-white"
        />
        <span className="text-[13px] leading-relaxed text-white/80">
          <span className="font-extrabold text-white">Corriger aussi le pays</span> — à
          partir de ce que le site déclare et de l&apos;extension de son domaine. Les
          marques dont le pays est vide sont complétées ; les autres ne sont remplacées
          que sur un indice solide, jamais sur la seule monnaie.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={lancer}
          disabled={enCours}
          className="rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-55"
        >
          {enCours
            ? "Lecture en cours…"
            : faites === 0
              ? `Tout mettre à jour (${total})`
              : termine
                ? "Tout relire depuis le début"
                : "Reprendre"}
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
          {/* La clé porte le rang, pas seulement l'identifiant de la
              marque : une même fiche peut légitimement figurer deux
              fois dans ce journal, par exemple si on relance un tour
              complet après une première série. React exige une clé
              unique, et l'identifiant seul ne l'est pas ici. */}
          {resultats.map((r, i) => (
            <div
              key={`${r.brandId}-${i}`}
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
