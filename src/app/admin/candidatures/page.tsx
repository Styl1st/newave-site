import { setApplicationStatus } from "../actions";
import { adminGetApplications } from "@/lib/admin-queries";
import { APPLICATION_STATUS_LABEL, type Application } from "@/lib/types";

const STATUSES: Application["status"][] = ["nouvelle", "en_cours", "acceptee", "refusee"];

export default async function AdminApplications() {
  const applications = await adminGetApplications();

  return (
    <>
      <header className="mb-7">
        <p className="eyebrow m-0">Boîte de réception</p>
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
            <article key={a.id} className="glass p-6">
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

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
                {a.website && (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/35 px-3.5 py-1.5 text-[11.5px] font-bold text-white/85 transition hover:bg-white/12 hover:text-white"
                  >
                    Voir le site
                  </a>
                )}
                <a
                  href={`mailto:${a.email}?subject=${encodeURIComponent(`NEWAVE SPHERE — ${a.brand_name}`)}`}
                  className="rounded-full border border-white/35 px-3.5 py-1.5 text-[11.5px] font-bold text-white/85 transition hover:bg-white/12 hover:text-white"
                >
                  Répondre
                </a>

                <span className="ml-auto flex flex-wrap gap-1.5">
                  {STATUSES.filter((s) => s !== a.status).map((s) => (
                    <form key={s} action={setApplicationStatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={s} />
                      <button className="rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-white/80 transition hover:bg-white/22 hover:text-white">
                        {APPLICATION_STATUS_LABEL[s]}
                      </button>
                    </form>
                  ))}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
