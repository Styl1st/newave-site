import { PRICE_TIER_LABEL, type Application } from "@/lib/types";

/**
 * À quoi ressemblera sa page, si on dit oui.
 *
 * Une candidature ne se juge pas sur un formulaire. Ce qu'on veut
 * savoir, c'est si cette fiche a sa place dans l'annuaire : est-ce
 * qu'elle a une image, un texte qui dit quelque chose, un endroit où
 * acheter. On montre donc la fiche, dans la forme qu'elle aura, avec
 * les visuels que la personne a fournis.
 *
 * Rien de tout cela n'existe encore dans la base. Le brouillon n'est
 * créé qu'à l'acceptation, et c'est délibéré : un brouillon doit
 * vouloir dire « relu, gardé pour plus tard », pas « personne ne l'a
 * encore regardé ».
 */
export default function ApercuCandidature({ a }: { a: Application }) {
  const visuel = a.cover_url ?? a.logo_url ?? null;
  const lieu = [a.ville, a.pays].filter(Boolean).join(", ");
  const reseaux = a.reseaux ?? [];

  return (
    <div className="card-light overflow-hidden">
      <div className="relative z-3">
        {visuel ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={visuel} alt="" className="block aspect-16/9 w-full object-cover" />
        ) : (
          <div className="flex aspect-16/9 w-full items-center justify-center bg-[#e6dcfb]">
            <span className="px-6 text-center text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#8a7bab]">
              Aucun visuel fourni. La fiche ne pourra pas être publiée en l&apos;état.
            </span>
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-[var(--color-ink)]">
              {a.brand_name}
            </h3>
            {a.logo_url && a.cover_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={a.logo_url}
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-1 ring-[rgba(23,10,51,0.15)]"
              />
            )}
          </div>

          {a.description?.trim() ? (
            <p className="m-0 mt-3 whitespace-pre-line text-[13.5px] leading-relaxed text-[#4a3a78]">
              {a.description.length > 480 ? `${a.description.slice(0, 480)}…` : a.description}
            </p>
          ) : (
            <p className="m-0 mt-3 text-[13px] italic leading-relaxed text-[#8a7bab]">
              Aucune présentation fournie. Il faudra en écrire une avant de publier.
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[rgba(23,10,51,0.12)] pt-4 sm:grid-cols-4">
            {(
              [
                ["Origine", lieu || null],
                ["Gamme", PRICE_TIER_LABEL.intermediaire],
                ["Boutique", a.website?.replace(/^https?:\/\//, "") ?? null],
                ["Réseaux", reseaux.length > 0 ? `${reseaux.length}` : null],
              ] as [string, string | null][]
            ).map(([label, valeur]) =>
              valeur ? (
                <div key={label}>
                  <dt className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7bab]">
                    {label}
                  </dt>
                  <dd className="m-0 mt-1 truncate text-[13px] font-bold text-[var(--color-ink)]">
                    {valeur}
                  </dd>
                </div>
              ) : null
            )}
          </dl>

          {(a.categories ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(a.categories ?? []).map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-[rgba(23,10,51,0.07)] px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#4a3a78]"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {reseaux.length > 0 && (
            <p className="m-0 mt-4 text-[12px] font-semibold text-[#6a5a92]">
              {reseaux.map((r) => `${r.reseau} @${r.identifiant}`).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
