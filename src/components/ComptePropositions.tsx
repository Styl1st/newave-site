/**
 * Ce que le compte ne sait PAS encore faire.
 *
 * Le gabarit dessine ici deux sections : le choix des emails qu'on
 * reçoit, et la suppression du compte. Ni l'un ni l'autre n'existe —
 * pas de colonne en base, pas d'action serveur, pas de route.
 *
 * On les montre quand même, parce que c'est une promesse tenue à
 * l'endroit où on ira la chercher. Mais on ne les câble pas, et
 * surtout : AUCUN DE CES INTERRUPTEURS N'EST UN BOUTON. Ce sont des
 * `span`. Un interrupteur qui bascule sous le doigt sans rien
 * enregistrer ment deux fois — il fait croire que le réglage est pris,
 * puis il l'oublie au rechargement, et l'on n'a aucune raison de s'en
 * apercevoir avant de recevoir l'email qu'on croyait avoir coupé.
 */

const ENVOIS = [
  "Les ventes d'une marque que je suis",
  "Les nouvelles marques, une fois par semaine",
  "Les réponses à mes avis",
];

/** Un interrupteur qui n'en est pas un : un dessin, et rien derrière. */
function Interrupteur() {
  return (
    <span
      aria-hidden
      className="flex h-[27px] w-12 shrink-0 items-center rounded-full bg-white/16 px-[3px]"
    >
      <span className="h-[21px] w-[21px] rounded-full bg-white/45" />
    </span>
  );
}

function Tag() {
  return (
    <span className="rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/60">
      À venir
    </span>
  );
}

export default function ComptePropositions() {
  return (
    /* Pas d'entrée en scène pour ces deux blocs : les animer les
       mettrait en avant, alors que tout leur dessin dit qu'ils
       attendent. */
    <div data-no-reveal className="mt-3 border-t border-white/15 pt-7">
      <p className="m-0 text-[12.5px] leading-relaxed text-white/55">
        À partir d&apos;ici, ce sont des propositions : ces deux réglages sont dessinés,
        pas encore construits. Rien ne se règle et rien ne s&apos;enregistre tant
        qu&apos;ils portent la mention « à venir ».
      </p>

      {/* ---------- ce qu'on t'envoie ---------- */}
      <section className="glass mt-5 p-4 sm:p-[26px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[17px] font-extrabold text-white">Ce qu&apos;on t&apos;envoie</h2>
          <Tag />
        </div>
        <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white/55">
          Aujourd&apos;hui, le site ne t&apos;envoie que ce qui touche à ton compte.
        </p>

        <ul className="m-0 mt-4 flex list-none flex-col gap-1 p-0">
          {ENVOIS.map((libelle) => (
            <li
              key={libelle}
              className="flex items-center justify-between gap-4 rounded-[13px] px-1 py-2.5 opacity-55"
            >
              <span className="text-[13.5px] font-semibold text-white">{libelle}</span>
              <Interrupteur />
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- supprimer mon compte ---------- */}
      <section
        className="mt-4 rounded-[var(--radius)] border p-4 sm:p-[26px]"
        style={{
          borderColor: "rgba(194,39,63,.45)",
          backgroundColor: "rgba(70,10,26,.28)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[17px] font-extrabold text-white">Supprimer mon compte</h2>
          <Tag />
        </div>
        <p className="m-0 mt-2 max-w-prose text-[13px] leading-relaxed text-white/70">
          Il faudra décider du sort de ce qui reste derrière : les marques que tu gères
          ne peuvent pas disparaître avec toi, elles appartiennent à l&apos;annuaire.
          C&apos;est pour ça que le bouton ne fait rien pour l&apos;instant.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 cursor-not-allowed rounded-full border border-[#c2273f] px-5 py-2.5 text-[12.5px] font-extrabold text-white/60"
        >
          Supprimer mon compte
        </button>
      </section>
    </div>
  );
}
