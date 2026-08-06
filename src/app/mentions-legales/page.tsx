import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-[var(--pad)] py-12">
      <h1 className="m-0 text-[clamp(26px,6vw,38px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
        Mentions légales
      </h1>

      <div className="glass mt-8 flex flex-col gap-6 p-6 text-[15px] leading-relaxed text-white/88 sm:p-8">
        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Éditeur</h2>
          <p className="m-0 mt-2">
            NEWAVE SPHERE — contact@newavesphere.fr
            <br />
            <span className="text-white/60">
              À compléter : statut juridique, adresse, numéro SIREN, directeur de la publication.
            </span>
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Hébergement</h2>
          <p className="m-0 mt-2">
            Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Liens vers les marques</h2>
          <p className="m-0 mt-2">
            Les achats se font directement sur les sites des marques présentées.
            NEWAVE SPHERE n&apos;est ni vendeur ni intermédiaire de paiement. Certains liens
            sortants peuvent donner lieu à une rémunération d&apos;affiliation, sans effet
            sur le prix payé ni sur le choix éditorial des marques.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-[16px] font-extrabold text-white">Données personnelles</h2>
          <p className="m-0 mt-2">
            Les données transmises via le formulaire de candidature servent uniquement à
            l&apos;étude du dossier. Tu disposes d&apos;un droit d&apos;accès, de rectification
            et de suppression à contact@newavesphere.fr.
          </p>
        </section>
      </div>
    </div>
  );
}
