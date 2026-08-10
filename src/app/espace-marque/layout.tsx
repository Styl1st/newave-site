import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BrandSpaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  /*
   * `data-no-reveal` coupe l'animation de défilement sur tout l'espace
   * marque. C'est une table de travail : un formulaire qui arrive
   * incliné et rapetissé donne l'impression d'être loin, alors qu'on
   * voulait juste le remplir.
   */
  return (
    <div data-no-reveal className="mx-auto w-full max-w-5xl px-[var(--pad)] py-6 sm:py-9">
      {children}
    </div>
  );
}
