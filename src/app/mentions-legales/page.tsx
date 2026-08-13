import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Qui édite NEWAVE SPHERE, qui l'héberge, et comment nous joindre.",
};

/**
 * Les mentions légales, version « éditeur non professionnel ».
 *
 * L'article 6-III-2 de la loi pour la confiance dans l'économie
 * numérique dispense une personne physique qui édite un site à titre
 * NON PROFESSIONNEL de publier son nom et son adresse. Elle doit en
 * revanche avoir communiqué ces éléments à son hébergeur, qui les
 * tient à la disposition de l'autorité judiciaire.
 *
 * C'est une protection réelle : sans elle, il faudrait afficher son
 * adresse personnelle sur une page publique, ce qui pour un projet
 * tenu par une seule personne n'est pas anodin.
 *
 * Le jour où le site rapporte quelque chose — affiliation, sponsor,
 * publicité — cette dispense tombe, même pour quelques euros. Il
 * faudra alors publier son identité, ses coordonnées, et son numéro
 * d'immatriculation s'il y en a un. C'est écrit noir sur blanc plus
 * bas dans la page pour qu'on ne l'oublie pas.
 */

const CONTACT = "contact@newavesphere.fr";

/**
 * L'hébergeur, en un seul endroit.
 *
 * C'est la seule mention de cette page qui bouge le jour où le site
 * déménage, et la loi impose qu'elle soit exacte. Isolée ici, la mise
 * à jour prend une ligne — noyée dans le texte, on l'oublie.
 *
 * La dispense d'identité de l'article 6-III-2 tient quel que soit
 * l'hébergeur, à une condition : que CELUI-CI connaisse l'éditeur.
 * C'est le cas de tout hébergeur chez qui l'on a un compte à son nom.
 */
const HEBERGEUR = {
  nom: "Vercel Inc.",
  adresse: "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis",
};

export default function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise">
        <p className="eyebrow m-0">Informations légales</p>
        <h1 className="m-0 mt-2 text-[clamp(22px,4.9vw,33px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Mentions légales
        </h1>
      </header>

      <div className="glass rise rise-1 mt-8 flex flex-col gap-7 p-6 text-[15px] leading-relaxed text-white/88 sm:p-8">
        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Éditeur du site</h2>
          <p className="m-0 mt-2">
            NEWAVE SPHERE est édité par une personne physique, à titre personnel et sans
            activité commerciale.
          </p>
          <p className="m-0 mt-3">
            À ce titre, et conformément à l&apos;article 6-III-2 de la loi n° 2004-575 du
            21 juin 2004 pour la confiance dans l&apos;économie numérique, l&apos;éditeur
            n&apos;est pas tenu de publier son nom ni son adresse. Ces informations ont
            été communiquées à l&apos;hébergeur du site, qui les tient à la disposition
            de l&apos;autorité judiciaire.
          </p>
          <p className="m-0 mt-3">
            Contact et directeur de la publication : <strong className="text-white">{CONTACT}</strong>
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Hébergement</h2>
          <p className="m-0 mt-2">
            Le site est hébergé par{" "}
            <strong className="text-white">{HEBERGEUR.nom}</strong>, {HEBERGEUR.adresse}.
          </p>
          <p className="m-0 mt-3 text-white/70">
            La base de données et les images sont hébergées par Supabase, sur des serveurs
            situés dans l&apos;Union européenne. Les emails automatiques du site sont
            envoyés par Resend, aux États-Unis. La boîte {CONTACT} est hébergée par
            OVHcloud, en France.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">
            Les marques présentées
          </h2>
          <p className="m-0 mt-2">
            Les noms, logos, visuels et descriptions des marques référencées appartiennent
            à leurs propriétaires respectifs. Ils sont reproduits dans le seul but de les
            faire connaître, avec un lien vers leur boutique.
          </p>
          <p className="m-0 mt-3">
            Une marque qui souhaite corriger sa fiche, la compléter ou la retirer de
            l&apos;annuaire écrit à {CONTACT}. C&apos;est fait sans discussion et sans
            délai.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Liens vers les boutiques</h2>
          <p className="m-0 mt-2">
            Les achats se font directement sur les sites des marques. NEWAVE SPHERE
            n&apos;est ni vendeur, ni intermédiaire de paiement, et n&apos;intervient
            ni dans la commande, ni dans la livraison, ni dans le service après-vente.
          </p>
          <p className="m-0 mt-3">
            <strong className="text-white">Aucun lien du site n&apos;est rémunéré</strong>{" "}
            à ce jour : le choix des marques présentées ne dépend d&apos;aucun accord
            commercial. Si cela devait changer, ce serait indiqué clairement, ici et sur
            les pages concernées.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Signaler un contenu</h2>
          <p className="m-0 mt-2">
            Un contenu vous paraît illicite, trompeur, ou porte atteinte à vos droits ?
            Écrivez à {CONTACT} en indiquant la page concernée et la raison. Le signalement
            est examiné et traité dans les meilleurs délais.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Données personnelles</h2>
          <p className="m-0 mt-2">
            Ce que le site collecte, pourquoi, combien de temps il le garde et comment
            tout faire supprimer : c&apos;est détaillé sur la{" "}
            <Link href="/confidentialite" className="font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              page confidentialité
            </Link>
            .
          </p>
          <p className="m-0 mt-3 text-white/70">
            Pour exercer vos droits, une seule adresse : {CONTACT}. L&apos;identité de
            l&apos;éditeur, non publiée ici, est communiquée sur demande à toute personne
            concernée qui en fait la demande dans ce cadre.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Propriété du site</h2>
          <p className="m-0 mt-2">
            La structure du site, ses textes éditoriaux et son identité visuelle sont
            protégés par le droit d&apos;auteur. Toute reprise en dehors des courtes
            citations d&apos;usage suppose un accord préalable.
          </p>
        </section>
      </div>

      <p className="rise rise-2 mx-auto mt-6 max-w-lg text-center text-[12.5px] leading-relaxed text-white/45">
        Dernière mise à jour : août 2026.
      </p>
    </div>
  );
}
