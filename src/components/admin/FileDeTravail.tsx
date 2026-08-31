import Link from "next/link";

/**
 * La file de travail : quatre cartes, et rien qui ne demande une action.
 *
 * L'écran d'administration s'ouvrait sur quatre compteurs. Un compteur
 * ne dit pas quoi faire : il dit combien il y en a. Ces quatre cartes
 * portent chacune un nombre, une phrase qui explique ce que ce nombre
 * implique, et un lien vers l'endroit où l'on s'en occupe.
 *
 * Le calcul reste dans la page : ces cartes ne savent pas lire la base,
 * elles savent seulement présenter ce qu'on leur donne. C'est ce qui
 * permet aux deux dernières de s'appuyer sur `obstacleAPublication()`
 * sans que ce composant ait à en connaître la règle.
 */

export type CarteDeFile = {
  titre: string;
  compte: number;
  /** Ce que le nombre implique, en une ligne. */
  phrase: string;
  href: string;
  /** Le libellé du lien, qui ne promet que ce que la destination tient. */
  lien: string;
  /** La couleur de la pastille quand il y a quelque chose à faire. */
  pastille: string;
  /** Fond clair pour ce qui presse, verre pour ce qui peut attendre. */
  clair?: boolean;
};

function Carte({ carte }: { carte: CarteDeFile }) {
  const rienAFaire = carte.compte === 0;
  const clair = carte.clair === true;

  /*
   * Une pastille rouge sur un zéro est une fausse alerte.
   *
   * La couleur d'urgence ne sert qu'à repérer la carte qui appelle : si
   * la pile est vide, elle doit s'éteindre, sinon on apprend à ne plus
   * la regarder.
   */
  const couleurPastille = rienAFaire
    ? clair
      ? "rgba(138,123,171,0.55)"
      : "rgba(255,255,255,0.28)"
    : carte.pastille;

  return (
    <Link
      href={carte.href}
      className={
        clair
          ? "card-light p-4 sm:p-5"
          : "glass p-4 transition hover:border-white/55 hover:bg-white/[0.06] active:scale-[.99] sm:p-5"
      }
    >
      <span className="relative z-3 block">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: couleurPastille }}
          />
          <span
            className={`text-[10px] font-black uppercase tracking-[0.2em] ${
              clair ? "text-[#6a5a92]" : "text-white/72"
            }`}
          >
            {carte.titre}
          </span>
        </span>

        <span
          className={`mt-2.5 block text-[30px] font-black leading-none ${
            clair ? "text-[var(--color-ink)]" : "text-white"
          } ${rienAFaire ? "opacity-55" : ""}`}
        >
          {carte.compte}
        </span>

        <span
          className={`mt-2 block text-[12.5px] font-semibold leading-snug ${
            clair ? "text-[#4a3d6e]" : "text-white/72"
          }`}
        >
          {carte.phrase}
        </span>

        <span
          className={`mt-3 inline-flex items-center gap-1.5 text-[12px] font-extrabold ${
            clair ? "text-[#3a2470]" : "text-white/85"
          }`}
        >
          {carte.lien} <span aria-hidden>→</span>
        </span>
      </span>
    </Link>
  );
}

export default function FileDeTravail({ cartes }: { cartes: CarteDeFile[] }) {
  return (
    // Deux colonnes dès qu'il y a la place, une seule sur un téléphone :
    // à 390px, deux cartes côte à côte couperaient les phrases en
    // colonnes de trois mots.
    <div className="grid gap-3.5 sm:grid-cols-2">
      {cartes.map((carte) => (
        <Carte key={carte.titre} carte={carte} />
      ))}
    </div>
  );
}
