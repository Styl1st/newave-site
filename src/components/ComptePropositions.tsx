/**
 * Ce que le compte ne sait PAS encore faire.
 *
 * Le gabarit dessinait ici deux sections : le choix des emails qu'on
 * reçoit, et la suppression du compte. La seconde existe maintenant pour
 * de bon et vit dans `SuppressionCompte` ; il ne reste que les emails,
 * qui n'ont ni colonne en base ni action serveur.
 *
 * On la montre quand même, parce que c'est une promesse tenue à
 * l'endroit où on ira la chercher. Mais on ne la câble pas, et
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
        Ce réglage est dessiné, pas encore construit.
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

    </div>
  );
}
