import Etoiles, { enEtoiles } from "./Etoiles";
import FormulaireAvis from "./FormulaireAvis";
import { getAvis, getMonAvis } from "@/lib/avis";

/**
 * Les avis d'une marque ou d'une pièce, et de quoi en laisser un.
 *
 * On affiche la moyenne, mais jamais seule : le nombre d'avis va
 * toujours avec. « 5 sur 5 » ne veut rien dire tant qu'on ignore si
 * c'est l'opinion d'une personne ou de deux cents.
 */
export default async function SectionAvis({
  cible,
  cibleId,
  nom,
  chemin,
}: {
  cible: "marque" | "piece";
  cibleId: string;
  nom: string;
  chemin: string;
}) {
  const filtre = cible === "marque" ? { brand_id: cibleId } : { product_id: cibleId };
  const [avis, mien] = await Promise.all([getAvis(filtre), getMonAvis(filtre)]);

  const total = avis.length;
  const moyenne = total > 0 ? avis.reduce((s, a) => s + a.note, 0) / total : 0;

  return (
    <section className="mt-9 sm:mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow m-0">Les avis</p>
          <h2 className="m-0 mt-2 text-[clamp(17px,3.8vw,23px)] font-extrabold tracking-[-0.02em] text-white">
            Ce qu&apos;on en pense
          </h2>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2.5 sm:block sm:text-right">
            <Etoiles note={moyenne} />
            <p className="m-0 text-[12.5px] font-bold text-white/70 sm:mt-1">
              {enEtoiles(moyenne)} sur 5 · {total} avis
            </p>
          </div>
        )}
      </div>

      <FormulaireAvis
        cible={cible}
        cibleId={cibleId}
        nom={nom}
        chemin={chemin}
        mien={mien}
      />

      {total === 0 ? (
        <p className="m-0 mt-4 text-[13.5px] leading-relaxed text-white/62">
          Personne n&apos;a encore donné son avis. Le premier compte double : c&apos;est
          lui qui donne envie aux suivants d&apos;écrire.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {avis.map((a) => (
            <article key={a.id} className="glass p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/14 text-[13px] font-black text-white">
                    {a.auteur.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13.5px] font-extrabold text-white">{a.auteur}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Etoiles note={a.note} taille="petite" />
                  <span className="text-[12px] font-bold text-white/60">
                    {new Date(a.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {a.commentaire && (
                <p className="m-0 mt-3 whitespace-pre-line text-[14px] leading-relaxed text-white/88">
                  {a.commentaire}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
