import ApplicationActions from "@/components/admin/ApplicationActions";
import { IconExternal, IconInbox } from "@/components/Icons";
import { adminGetApplications } from "@/lib/admin-queries";
import { APPLICATION_STATUS_LABEL } from "@/lib/types";

export default async function AdminApplications() {
  const applications = await adminGetApplications();

  return (
    <>
      <header className="mb-7">
        <p className="eyebrow m-0 flex items-center gap-2">
          <IconInbox /> Boîte de réception
        </p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
          Candidatures
        </h1>
      </header>

      {applications.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Aucune candidature pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((a) => (
            <article key={a.id} className="glass p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="m-0 text-[17px] font-extrabold text-white">{a.brand_name}</h2>
                  <p className="m-0 mt-1 text-[12.5px] font-semibold text-white/65">
                    {a.contact_name} · {a.email}
                    {a.instagram && ` · ${a.instagram}`}
                  </p>
                </div>
                <span className="badge shrink-0">{APPLICATION_STATUS_LABEL[a.status]}</span>
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
                    href={`mailto:${a.email}?subject=${encodeURIComponent(`NEWAVE SPHERE — ${a.brand_name}`)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/8 px-3.5 py-2 text-[11.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white"
                  >
                    Répondre
                  </a>
                </div>

                <ApplicationActions id={a.id} status={a.status} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
