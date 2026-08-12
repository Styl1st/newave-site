import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import MiseAJourCatalogues from "@/components/admin/MiseAJourCatalogues";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mettre à jour les catalogues" };

/** Lire une boutique prend du temps, et l'action part de cette page. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default async function CataloguesPage() {
  await requireAdmin();

  // Combien de marques ont une adresse à relire, pour l'annoncer.
  const supabase = await createClient();
  const { count } = supabase
    ? await supabase
        .from("brands")
        .select("id", { count: "exact", head: true })
        .or("shop_url.not.is.null,website_url.not.is.null")
    : { count: 0 };

  return (
    <>
      <header className="mb-5 sm:mb-7">
        <BackLink href="/admin/marques">Marques</BackLink>
        <p className="eyebrow m-0 mt-3">Entretien</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Mettre à jour les catalogues
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/78">
          À lancer après une correction qui touche à la façon dont on lit les boutiques.
          Rien n&apos;est écrasé de ce que tu as décidé : le rayon d&apos;une pièce, sa
          mise en avant et son état de publication restent tels quels.
        </p>
      </header>

      <MiseAJourCatalogues total={count ?? 0} />
    </>
  );
}
