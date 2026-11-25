import type { Metadata } from "next";
import Link from "next/link";
import { enChiffres } from "@/components/chiffres";
import { compterLeCatalogue } from "@/lib/queries";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "NEWAVE SPHERE met en lumière les marques indépendantes et émergentes. Pourquoi, comment, et ce qu'on ne fait pas.",
};

/* Les comptes changent chaque nuit avec les catalogues : la page se
   reconstruit au plus toutes les heures. */
export const revalidate = 3600;

const PRINCIPES = [
  {
    titre: "On ne vend rien",
    texte:
      "Les achats se font chez les marques. On montre, on raconte, on renvoie. Mais on n'encaisse pas, on ne stocke pas, et on n'a aucun intérêt à te pousser vers une pièce plutôt qu'une autre.",
  },
  {
    titre: "Aucune place ne s'achète",
    texte:
      "Une marque n'entre pas dans l'annuaire parce qu'elle a payé. Elle y entre parce que son travail tient debout. Il n'y a ni classement sponsorisé, ni mise en avant monnayée.",
  },
  {
    titre: "On répond à tout le monde",
    texte:
      "Chaque dossier reçu est lu par un humain, et reçoit une réponse, même quand c'est non. Le nombre d'abonnés n'entre pas dans la décision.",
  },
  {
    titre: "Les marques gardent la main",
    texte:
      "Une marque référencée peut obtenir un accès à sa propre page : présentation, visuels, pièces. C'est elle qui parle d'elle, on ne réécrit pas son histoire à sa place.",
  },
];

/**
 * À PROPOS, SANS BOÎTES.
 *
 * C'était la dernière page en plaques de verre : un caisson pour le
 * texte, quatre pour les principes, un dernier pour le contact. Elle
 * parle maintenant comme la vitrine : de grands mots en lettres creuses,
 * des traits fins pour séparer, et le texte à même le fond.
 *
 * LES CHIFFRES SONT LES VRAIS, lus dans le catalogue comme sur la page
 * des pièces. Absents si la base ne répond pas : la ligne disparaît
 * plutôt que d'afficher un ordre de grandeur inventé.
 */
export default async function AProposPage() {
  const catalogue = await compterLeCatalogue();

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-7 sm:py-12">
      {/* ---------- le manifeste ---------- */}
      <header>
        <p className="eyebrow rise m-0">Le projet</p>
        <h1 className="ap-manifeste rise rise-1 m-0 mt-4">
          <span>On montre.</span>
          <span>On raconte.</span>
          <span className="ap-plein">On renvoie.</span>
        </h1>
        <p className="rise rise-2 m-0 mt-7 max-w-2xl text-[clamp(17px,4.2vw,21px)] font-semibold leading-[1.5] text-white">
          NEWAVE SPHERE est un média indépendant consacré à celles et ceux qui créent
          en dehors des circuits classiques.
        </p>
      </header>

      {/* ---------- les chiffres ---------- */}
      {catalogue && (
        <dl className="ap-chiffres rise rise-3">
          <div>
            <dt>marques</dt>
            <dd>{enChiffres(catalogue.marques)}</dd>
          </div>
          <div>
            <dt>pièces au catalogue</dt>
            <dd>{enChiffres(catalogue.pieces)}</dd>
          </div>
          <div>
            <dt>place sponsorisée</dt>
            <dd>0</dd>
          </div>
        </dl>
      )}

      {/* ---------- le texte ---------- */}
      <section className="ap-colonnes rise rise-4">
        <p className="m-0">
          Il se fabrique beaucoup de vêtements, et il s&apos;en raconte peu. Les marques
          qui prennent le temps, celles des séries courtes, des matières choisies et des
          ateliers qu&apos;on peut nommer, n&apos;ont ni le budget ni le réflexe de se
          mettre en avant. Elles existent sur un compte Instagram, une boutique en ligne,
          et rien d&apos;autre.
        </p>
        <p className="m-0">
          On rassemble ce travail au même endroit : un annuaire pour découvrir, des pages
          de marque pour comprendre la démarche, et des publications pour montrer les
          pièces telles qu&apos;elles sont. Un point de ralliement pour ceux qui cherchent
          autre chose que ce que l&apos;algorithme leur sert.
        </p>
      </section>

      {/* ---------- les principes ---------- */}
      <section className="mt-16 sm:mt-24">
        <p className="eyebrow m-0">Ce à quoi on tient</p>
        <ol className="ap-principes">
          {PRINCIPES.map((p, i) => (
            <li key={p.titre} data-reveal>
              <span className="ap-numero" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="m-0 text-[clamp(17px,3.6vw,21px)] font-extrabold tracking-[-0.02em] text-white">
                  {p.titre}
                </h2>
                <p className="m-0 mt-2.5 text-[15px] leading-[1.65] text-white/80">{p.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- le contact ---------- */}
      <section className="ap-contact" data-reveal>
        <h2 className="ap-question m-0">
          Une marque, une question, <span className="ap-plein">une collab&nbsp;?</span>
        </h2>
        <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Link href="/candidature" className="card-light inline-block px-7 py-3.5">
            <span className="relative z-3 text-[14px] font-extrabold">Proposer ma marque</span>
          </Link>
          <a href="mailto:contact@newavesphere.fr" className="bf-lien text-[14px]">
            contact@newavesphere.fr
          </a>
        </div>
      </section>
    </div>
  );
}
