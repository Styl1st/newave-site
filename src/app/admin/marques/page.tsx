import Link from "next/link";
import { ListRow } from "@/components/admin/ListRow";
import PublishToggle from "@/components/admin/PublishToggle";
import { adminGetBrands } from "@/lib/admin-queries";

export default async function AdminBrands() {
  const brands = await adminGetBrands();

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Annuaire</p>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            Marques
          </h1>
        </div>
        <Link href="/admin/marques/nouveau" className="card-light px-5 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Nouvelle marque</span>
        </Link>
      </header>

      {brands.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Aucune marque pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {brands.map((b) => (
            <ListRow
              key={b.id}
              href={`/admin/marques/${b.id}`}
              title={b.name}
              subtitle={b.tagline || null}
              status={b.status}
              thumb={b.logo_url ?? b.cover_url}
              action={
                <PublishToggle
                  brandId={b.id}
                  brandName={b.name}
                  published={b.status === "published"}
                  taille="compacte"
                />
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
