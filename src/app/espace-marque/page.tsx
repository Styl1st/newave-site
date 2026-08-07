import type { Metadata } from "next";
import Link from "next/link";
import { getManagedBrands } from "@/lib/brand-space";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Espace marque" };

export default async function BrandSpaceHome() {
  const [brands, profile] = await Promise.all([getManagedBrands(), getProfile()]);

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow m-0">{profile?.display_name ?? profile?.email}</p>
        <h1 className="m-0 mt-2 text-[clamp(26px,6vw,38px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          Espace marque
        </h1>
      </header>

      {brands.length === 0 ? (
        <div className="glass p-8">
          <h2 className="m-0 text-[18px] font-extrabold text-white">
            Aucune marque rattachée à ton compte
          </h2>
          <p className="m-0 mt-3 text-[15px] leading-relaxed text-white/84">
            Si tu es à la tête d&apos;une marque et que tu veux gérer ta page toi-même,
            dépose ton dossier — on te rattache à ta fiche dès qu&apos;il est validé.
            Si ta marque est déjà sur le site, mentionne-le dans ton message.
          </p>
          <Link href="/candidature" className="card-light mt-6 inline-block px-6 py-3.5">
            <span className="relative z-3 text-[14px] font-extrabold">Proposer ma marque</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brands.map((b) => (
            <Link key={b.id} href={`/espace-marque/${b.slug}`} className="card-light overflow-hidden">
              <div className="relative z-3">
                {b.cover_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={b.cover_url} alt="" className="block aspect-16/9 w-full object-cover" />
                )}
                <div className="p-5">
                  <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6a5a92]">
                    {b.status === "published" ? "En ligne" : "En attente de publication"}
                  </p>
                  <h2 className="m-0 mt-1.5 text-[17px] font-extrabold text-[var(--color-ink)]">
                    {b.name}
                  </h2>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
