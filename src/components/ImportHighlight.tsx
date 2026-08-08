import Link from "next/link";
import { IconDownload } from "./Icons";

/**
 * Encart d'appel à l'import Shopify.
 *
 * Une marque qui arrive sur son espace vide n'a aucune raison de
 * deviner qu'on peut remplir son catalogue en un clic. On le lui dit
 * là où elle regarde, pas dans un onglet qu'il faut penser à ouvrir.
 */
export default function ImportHighlight({
  slug,
  shopUrl,
  vide,
}: {
  slug: string;
  shopUrl: string | null;
  /** Aucune pièce enregistrée : le message est alors plus insistant. */
  vide: boolean;
}) {
  return (
    <section className="card-light mb-6 overflow-hidden">
      <div className="relative z-3 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgba(23,10,51,0.08)] text-[var(--color-ink)]">
            <IconDownload className="h-5 w-5" />
          </span>

          <div>
            <h2 className="m-0 text-[16.5px] font-extrabold leading-snug text-[var(--color-ink)]">
              {vide
                ? "Remplis ton catalogue en un clic"
                : "Mettre à jour depuis ta boutique"}
            </h2>
            <p className="m-0 mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-[#4a3a78]">
              {vide ? (
                <>
                  Si ta boutique est sur Shopify, colle son adresse et on récupère tes
                  pièces avec les photos, les prix et les tailles. Tu choisis ce que tu
                  gardes, rien ne s&apos;affiche avant que tu l&apos;aies relu.
                </>
              ) : (
                <>
                  Prix modifiés, nouvelles pièces, ruptures de stock : un import remet
                  tout à jour sans créer de doublon.
                </>
              )}
            </p>
            {shopUrl && (
              <p className="m-0 mt-2 truncate text-[12px] font-bold text-[#6a5a92]">
                Boutique enregistrée : {shopUrl.replace(/^https?:\/\//, "")}
              </p>
            )}
          </div>
        </div>

        <Link
          href={`/espace-marque/${slug}/import`}
          className="shrink-0 rounded-full bg-[var(--color-ink)] px-6 py-3 text-center text-[13.5px] font-extrabold text-white transition hover:bg-[#2a1350] active:scale-[.97]"
        >
          {vide ? "Importer mes pièces" : "Lancer un import"}
        </Link>
      </div>
    </section>
  );
}
