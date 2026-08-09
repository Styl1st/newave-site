import Link from "next/link";
import ApplicationActions from "@/components/admin/ApplicationActions";
import { IconExternal, IconInbox } from "@/components/Icons";
import { adminGetApplications } from "@/lib/admin-queries";
import { RELATIONSHIP_LABEL, type Application } from "@/lib/types";

function Carte({ a }: { a: Application }) {
  const proprietaire = a.relationship === "proprietaire";

  return (
    <article className="glass p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-[17px] font-extrabold text-white">{a.brand_name}</h3>
          <p className="m-0 mt-1 text-[12.5px] font-semibold text-white/65">
            {a.contact_name} · {a.email}
            {a.instagram && ` · ${a.instagram}`}
          </p>
        </div>

        {/* La nature du dossier prime sur son statut : c'est elle qui
            décide si accepter donne des droits ou non. */}
        <span
          className={
            proprietaire
              ? "shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-[0.08em] text-[var(--color-ink)]"
              : "shrink-0 rounded-full bg-white/12 px-3.5 py-1.5 text-[10.5px] font-black uppercase tracking-[0.08em] text-white/80"
          }
        >
          {RELATIONSHIP_LABEL[a.relationship]}
        </span>
      </div>

      <p className="m-0 mt-4 whitespace-pre-line text-[14.5px] leading-relaxed text-white/88">
        {a.pitch}
      </p>

      <div className="mt-5 flex flex-col gap-4 border-t border-white/15 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {a.website && (
            <a
              href={a.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/8 px-3.5 py-2 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white"
            >
              <IconExternal /> Le site
            </a>
          )}
          <a
            href={`mailto:${a.email}?subject=${encodeURIComponent(`NEWAVE SPHERE : ${a.brand_name}`)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/8 px-3.5 py-2 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white"
          >
            Répondre
          </a>
          {a.brand_id && (
            <Link
              href={`/admin/marques/${a.brand_id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/8 px-3.5 py-2 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white"
            >
              La fiche créée
            </Link>
          )}
        </div>

        <ApplicationActions id={a.id} status={a.status} brandName={a.brand_name} />
      </div>
    </article>
  );
}

function Section({
  titre,
  note,
  items,
}: {
  titre: string;
  note?: string;
  items: Application[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="m-0 text-[clamp(17px,4vw,21px)] font-extrabold tracking-[-0.02em] text-white">
          {titre}
        </h2>
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">
          {items.length}
        </span>
      </div>
      {note && <p className="m-0 mb-4 text-[13px] leading-relaxed text-white/60">{note}</p>}
      <div className="flex flex-col gap-4">
        {items.map((a) => (
          <Carte key={a.id} a={a} />
        ))}
      </div>
    </section>
  );
}

export default async function AdminApplications() {
  const applications = await adminGetApplications();

  const aTraiter = applications.filter((a) => a.status === "nouvelle" || a.status === "en_cours");
  const acceptees = applications.filter((a) => a.status === "acceptee");
  const refusees = applications.filter((a) => a.status === "refusee");

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow m-0 flex items-center gap-2">
          <IconInbox /> Boîte de réception
        </p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Candidatures
        </h1>
      </header>

      {applications.length === 0 && (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Aucune candidature pour l&apos;instant.</p>
        </div>
      )}

      <Section titre="À traiter" items={aTraiter} />
      <Section
        titre="Candidatures acceptées"
        note="Leur fiche marque existe, en brouillon. Il te reste à la compléter et à la publier."
        items={acceptees}
      />
      <Section titre="Refusées" items={refusees} />
    </>
  );
}
