import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "NEWAVE SPHERE met en lumière les marques indépendantes et émergentes. Pourquoi, comment, et ce qu'on ne fait pas.",
};

const PRINCIPES = [
  {
    titre: "On ne vend rien",
    texte:
      "Les achats se font chez les marques. On montre, on raconte, on renvoie — mais on n'encaisse pas, on ne stocke pas, et on n'a aucun intérêt à te pousser vers une pièce plutôt qu'une autre.",
  },
  {
    titre: "Aucune place ne s'achète",
    texte:
      "Une marque n'entre pas dans l'annuaire parce qu'elle a payé. Elle y entre parce que son travail tient debout. Il n'y a ni classement sponsorisé, ni mise en avant monnayée.",
  },
  {
    titre: "On répond à tout le monde",
    texte:
      "Chaque dossier reçu est lu par un humain, et reçoit une réponse — même quand c'est non. Le nombre d'abonnés n'entre pas dans la décision.",
  },
  {
    titre: "Les marques gardent la main",
    texte:
      "Une marque référencée peut obtenir un accès à sa propre page : présentation, visuels, pièces. C'est elle qui parle d'elle, on ne réécrit pas son histoire à sa place.",
  },
];

export default function AProposPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--pad)] py-12">
      <header className="rise">
        <p className="eyebrow m-0">Le projet</p>
        <h1 className="m-0 mt-2 text-[clamp(28px,7vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          À propos
        </h1>
        <p className="m-0 mt-5 text-[clamp(16px,4.2vw,19px)] leading-relaxed text-white/90">
          NEWAVE SPHERE est un média indépendant consacré à celles et ceux qui créent
          en dehors des circuits classiques.
        </p>
      </header>

      <div className="glass rise rise-1 mt-8 p-6 sm:p-8">
        <p className="m-0 text-[15.5px] leading-[1.7] text-white/92">
          Il se fabrique beaucoup de vêtements, et il s&apos;en raconte peu. Les marques
          qui prennent le temps — séries courtes, matières choisies, ateliers qu&apos;on
          peut nommer — n&apos;ont ni le budget ni le réflexe de se mettre en avant. Elles
          existent sur un compte Instagram, une boutique en ligne, et rien d&apos;autre.
        </p>
        <p className="m-0 mt-4 text-[15.5px] leading-[1.7] text-white/92">
          On rassemble ce travail au même endroit : un annuaire pour découvrir, des
          pages de marque pour comprendre la démarche, et des publications pour montrer
          les pièces telles qu&apos;elles sont. Un point de ralliement pour ceux qui
          cherchent autre chose que ce que l&apos;algorithme leur sert.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="m-0 mb-6 text-[clamp(20px,4.6vw,26px)] font-extrabold tracking-[-0.02em] text-white">
          Ce à quoi on tient
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPES.map((p) => (
            <div key={p.titre} className="glass p-6">
              <h3 className="m-0 text-[16px] font-extrabold text-white">{p.titre}</h3>
              <p className="m-0 mt-2.5 text-[14px] leading-relaxed text-white/80">{p.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass mt-12 p-8 text-center sm:p-10">
        <h2 className="m-0 text-[clamp(19px,4.4vw,24px)] font-extrabold text-white">
          Une marque, une question, une collab ?
        </h2>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-white/84">
          Écris-nous à{" "}
          <a
            href="mailto:contact@newavesphere.fr"
            className="font-bold text-white underline underline-offset-2"
          >
            contact@newavesphere.fr
          </a>
          , ou dépose ton dossier directement.
        </p>
        <Link href="/candidature" className="card-light mt-7 inline-block px-7 py-3.5">
          <span className="relative z-3 text-[14px] font-extrabold">Proposer ma marque</span>
        </Link>
      </section>
    </div>
  );
}
