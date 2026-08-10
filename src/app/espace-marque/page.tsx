import type { Metadata } from "next";
import Link from "next/link";
import BrandSpaceList from "@/components/BrandSpaceList";
import { getManagedBrands } from "@/lib/brand-space";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Espace marque" };

export default async function BrandSpaceHome() {
  const [brands, profile] = await Promise.all([getManagedBrands(), getProfile()]);

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow m-0">{profile?.display_name ?? profile?.email}</p>
        <h1 className="m-0 mt-2 text-[clamp(22px,4.9vw,33px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
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
            dépose ton dossier. On te rattache à ta fiche dès qu&apos;il est validé.
            Si ta marque est déjà sur le site, mentionne-le dans ton message.
          </p>
          <Link href="/candidature" className="card-light mt-6 inline-block px-6 py-3.5">
            <span className="relative z-3 text-[14px] font-extrabold">Proposer ma marque</span>
          </Link>
        </div>
      ) : (
        <BrandSpaceList brands={brands} />
      )}
    </>
  );
}
