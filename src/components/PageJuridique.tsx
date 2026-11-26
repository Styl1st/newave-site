import type { ReactNode } from "react";

/**
 * LES PAGES DE TEXTE (conditions, confidentialité, mentions légales),
 * SANS BOÎTES.
 *
 * Elles tenaient chacune dans une grande plaque de verre, dernier reste
 * de l'ancienne charte. Elles parlent maintenant comme À propos : le
 * titre en lettres creuses, un sommaire numéroté qui reste à portée de
 * main sur ordinateur, et chaque partie sous un trait fin, avec son
 * numéro en chiffres creux.
 *
 * Un seul gabarit pour les trois : le jour où l'une change de forme, les
 * deux autres suivent, et un lecteur qui passe de l'une à l'autre
 * retrouve ses repères.
 */

export type PartieJuridique = { titre: string; contenu: ReactNode };

export default function PageJuridique({
  surtitre,
  titre,
  plein,
  intro,
  parties,
  pied,
}: {
  surtitre: string;
  /** En lettres creuses. */
  titre: string;
  /** La suite du titre, en plein. */
  plein?: string;
  intro?: ReactNode;
  parties: PartieJuridique[];
  pied?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-7 sm:py-12">
      <header>
        <p className="eyebrow rise m-0">{surtitre}</p>
        <h1 className="pj-titre rise rise-1 m-0 mt-4">
          {titre}
          {plein && (
            <>
              {" "}
              <span className="ap-plein">{plein}</span>
            </>
          )}
        </h1>
        {intro && (
          <p className="rise rise-2 m-0 mt-6 max-w-2xl text-[clamp(16px,4vw,19px)] font-semibold leading-[1.55] text-white">
            {intro}
          </p>
        )}
      </header>

      <div className="pj-corps rise rise-3">
        {/* Le sommaire : des ancres, rien de plus. Collé sur ordinateur. */}
        <nav aria-label="Sommaire" className="pj-sommaire">
          <ol>
            {parties.map((p, i) => (
              <li key={p.titre}>
                <a href={`#partie-${i + 1}`}>
                  <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  {p.titre}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          {parties.map((p, i) => (
            <section key={p.titre} id={`partie-${i + 1}`} className="pj-partie">
              <span className="ap-numero" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h2 className="m-0 text-[clamp(17px,3.6vw,21px)] font-extrabold tracking-[-0.02em] text-white">
                  {p.titre}
                </h2>
                <div className="pj-texte">{p.contenu}</div>
              </div>
            </section>
          ))}

          {pied && <div className="pj-pied">{pied}</div>}
        </div>
      </div>
    </div>
  );
}

/** Met en gras les segments entre doubles astérisques. */
export function riche(texte: string): ReactNode {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-extrabold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Des paragraphes écrits en texte, avec leur gras. */
export function enParagraphes(paragraphes: string[]): ReactNode {
  return paragraphes.map((p, i) => <p key={i}>{riche(p)}</p>);
}
