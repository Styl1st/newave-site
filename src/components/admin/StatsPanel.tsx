import type { Ligne, Stats } from "@/lib/stats";

function Chiffre({ label, valeur, note }: { label: string; valeur: number | string; note?: string }) {
  return (
    <div className="glass p-5">
      <p className="eyebrow m-0">{label}</p>
      <p className="m-0 mt-2 text-[30px] font-black leading-none text-white">{valeur}</p>
      {note && <p className="m-0 mt-1.5 text-[12px] font-semibold text-white/55">{note}</p>}
    </div>
  );
}

/** Histogramme en SVG : pas de bibliothèque pour trente barres. */
function Graphique({ jours }: { jours: Stats["jours"] }) {
  const max = Math.max(...jours.map((j) => j.vues), 1);
  const largeur = 100 / jours.length;

  return (
    <div className="glass p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow m-0">Pages vues, 30 derniers jours</p>
        <p className="m-0 text-[12px] font-bold text-white/55">Maximum : {max} / jour</p>
      </div>

      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Fréquentation des trente derniers jours">
        {jours.map((j) => {
          const hauteur = (j.vues / max) * 100;
          const date = new Date(j.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          return (
            <div
              key={j.date}
              title={`${date} — ${j.vues} vue${j.vues > 1 ? "s" : ""}`}
              style={{ width: `${largeur}%`, height: `${Math.max(hauteur, 1.5)}%` }}
              className="rounded-t-[3px] bg-linear-to-t from-white/35 to-white/85 transition hover:from-white/60 hover:to-white"
            />
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/40">
        <span>{new Date(jours[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        <span>Aujourd&apos;hui</span>
      </div>
    </div>
  );
}

function Classement({ titre, lignes, vide }: { titre: string; lignes: Ligne[]; vide: string }) {
  const max = Math.max(...lignes.map((l) => l.valeur), 1);

  return (
    <div className="glass p-5 sm:p-6">
      <p className="eyebrow m-0 mb-4">{titre}</p>

      {lignes.length === 0 ? (
        <p className="m-0 text-[13.5px] text-white/55">{vide}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {lignes.map((l) => (
            <li key={l.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-bold text-white/90">{l.label}</span>
                <span className="shrink-0 text-[13px] font-extrabold text-white">{l.valeur}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  style={{ width: `${(l.valeur / max) * 100}%` }}
                  className="h-full rounded-full bg-white/70"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function StatsPanel({ stats }: { stats: Stats }) {
  const evolution =
    stats.evolution === null
      ? "pas encore de comparaison"
      : `${stats.evolution >= 0 ? "+" : ""}${stats.evolution} % vs 7 jours avant`;

  return (
    <section className="mt-10">
      <h2 className="m-0 mb-5 text-[clamp(19px,4.4vw,24px)] font-extrabold tracking-[-0.02em] text-white">
        Fréquentation
      </h2>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Chiffre label="7 derniers jours" valeur={stats.vues7} note={evolution} />
        <Chiffre label="30 derniers jours" valeur={stats.vues30} note="pages vues" />
        <Chiffre
          label="Clics vers les marques"
          valeur={stats.clics30}
          note="sur 30 jours — ce que tu leur apportes"
        />
        <Chiffre label="Nouveaux comptes" valeur={stats.comptes30} note="sur 30 jours" />
      </div>

      <Graphique jours={stats.jours} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Classement titre="Pages les plus vues" lignes={stats.pages} vide="Aucune visite enregistrée pour l'instant." />
        <Classement
          titre="D'où viennent les visiteurs"
          lignes={stats.sources}
          vide="Personne n'est encore arrivé depuis un autre site."
        />
        <Classement
          titre="Marques les plus cliquées"
          lignes={stats.clicsParMarque}
          vide="Aucun clic sortant pour l'instant."
        />
        <Classement
          titre="Marques les plus mises en favori"
          lignes={stats.favorisParMarque}
          vide="Aucun favori pour l'instant."
        />
      </div>

      <p className="m-0 mt-4 text-[12.5px] leading-relaxed text-white/50">
        Ces chiffres comptent des pages vues, pas des personnes : aucun cookie ni
        identifiant n&apos;est posé, donc deux visites du même visiteur sont
        indiscernables de deux visiteurs. Tes propres pages d&apos;administration ne
        sont pas comptées.
      </p>
    </section>
  );
}
