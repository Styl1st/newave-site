import Link from "next/link";
import { ListRow } from "@/components/admin/ListRow";
import { adminGetProducts } from "@/lib/admin-queries";
import { formatPrice } from "@/lib/types";

export default async function AdminProducts() {
  const products = await adminGetProducts();

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Sélection</p>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            Pièces
          </h1>
        </div>
        <Link href="/admin/pieces/nouveau" className="card-light px-5 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Nouvelle pièce</span>
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">
            Aucune pièce. Crée d&apos;abord une marque, puis ajoute ses pièces ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <ListRow
              key={p.id}
              href={`/admin/pieces/${p.id}`}
              title={p.name}
              subtitle={[p.brand?.name, formatPrice(p.price_cents, p.currency)].filter(Boolean).join(" · ") || null}
              status={p.status}
              thumb={p.image_url}
            />
          ))}
        </div>
      )}
    </>
  );
}
