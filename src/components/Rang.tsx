/**
 * La pastille de rang d'un classement.
 *
 * Les trois premières marches reçoivent une médaille — or, argent,
 * bronze se lisent sans légende, dans toutes les langues. Mais le
 * classement ne s'arrête pas là : toutes les places suivantes sont
 * numérotées elles aussi. Un podium qui coupe à la troisième ne donne
 * envie à personne d'être quatrième, alors que c'est précisément à
 * partir de là qu'on a envie de monter.
 */

const MEDAILLES = [
  { fond: "linear-gradient(140deg,#ffe9a8,#f5c73c 45%,#b8860b)", texte: "#3a2200" },
  { fond: "linear-gradient(140deg,#ffffff,#d4d8e2 45%,#8d94a6)", texte: "#242a38" },
  { fond: "linear-gradient(140deg,#f6cfa8,#d08a4e 45%,#8a4f22)", texte: "#3a1c04" },
];

/** 1 -> « 1ᵉʳ », le reste -> « 2ᵉ », « 3ᵉ »… */
function ordinal(place: number): string {
  return place === 1 ? "1ᵉʳ" : `${place}ᵉ`;
}

export default function Rang({ place }: { place: number }) {
  const medaille = MEDAILLES[place - 1];

  return (
    <span
      aria-label={`${ordinal(place)} du classement`}
      className={`absolute -left-1.5 -top-1.5 z-20 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-[11px] font-black shadow-[0_4px_14px_rgba(35,12,85,0.45)] ${
        medaille ? "" : "bg-[rgba(20,8,50,0.82)] text-white backdrop-blur-sm"
      }`}
      style={medaille ? { background: medaille.fond, color: medaille.texte } : undefined}
    >
      {ordinal(place)}
    </span>
  );
}
