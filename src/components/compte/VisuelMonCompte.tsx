/**
 * Le visuel d'en-tête de la page « Mon compte », au doigt.
 *
 * IL REMPLACE LE GROS TITRE, IL NE S'Y AJOUTE PAS. Sur un écran de
 * téléphone, un titre de trente-quatre pixels suivi d'un sous-titre
 * mangeait le premier tiers de la page pour répéter ce que la
 * navigation disait déjà. Ce bloc dit la même chose en montrant à qui
 * appartient le compte, et il sert de repère : la page Apparence ouvre
 * sur un bloc de même taille, même rayon, même ombre. C'est ce qui fait
 * que les deux se ressemblent sans se confondre.
 *
 * LE VOILE COMMENCE SOMBRE PARCE QUE LE CHROME COMMENCE PAR DU BLANC
 * PUR, en haut à gauche — exactement là où se pose l'œil-de-bœuf. Un
 * voile plus clair ferait tomber le libellé sous le rapport de
 * contraste exigé, et c'est le genre de défaut qu'on ne voit pas sur
 * son propre écran.
 *
 * LA PLAQUE PORTE LE DÉGRADÉ D'ACCENTS, PAS CELUI DU FOND. Avec le
 * dégradé du thème, une ambiance claire lavait le monogramme, et le
 * même compte se retrouvait peint de deux façons entre le hub et cette
 * carte. C'est le dégradé du bandeau d'identité, au caractère près.
 */
export default function VisuelMonCompte({
  initiale,
  role,
}: {
  initiale: string;
  /** Le rôle écrit, ou `null` pour un membre — on ne badge pas l'ordinaire. */
  role: string | null;
}) {
  return (
    <div
      className="relative h-[150px] overflow-hidden lg:hidden"
      style={{
        borderRadius: "22px",
        background: "var(--chrome-edge)",
        border: "1px solid rgba(255,255,255,.22)",
        boxShadow: "0 14px 34px -10px rgba(45,15,100,.55)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(170deg, rgba(20,8,52,.68), rgba(20,8,52,.78) 52%, rgba(20,8,52,.92))",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="m-0 text-[9.5px] font-black uppercase tracking-[0.2em] text-white">
            Mon compte
          </p>
          {role && <span className="badge shrink-0">{role}</span>}
        </div>

        <span
          aria-hidden
          className="grid h-[58px] w-[58px] place-items-center rounded-[18px] text-[23px] font-black text-white"
          style={{
            background:
              "linear-gradient(140deg, rgba(var(--accent-1), .5), rgba(var(--accent-2), .44))",
          }}
        >
          {initiale}
        </span>
      </div>
    </div>
  );
}
