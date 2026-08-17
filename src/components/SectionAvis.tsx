import Etoiles, { enEtoiles } from "./Etoiles";
import FormulaireAvis from "./FormulaireAvis";
import OutilsAvis from "./OutilsAvis";
import { getAvis, getMonAvis } from "@/lib/avis";
import { mesSignalements } from "@/lib/moderation";
import { getProfile } from "@/lib/auth";

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
  globale,
}: {
  cible: "marque" | "piece";
  cibleId: string;
  nom: string;
  chemin: string;
  /**
   * La note d'ensemble d'une marque, pièces comprises.
   *
   * Elle diffère de la moyenne des avis listés ici, et c'est voulu :
   * cette section montre ce qu'on a écrit SUR LA MARQUE, alors que la
   * note affichée partout ailleurs agrège aussi les avis déposés sur
   * ses pièces. Sans cette distinction, on lisait « 4,5 sur 5 » sur la
   * carte et « aucun avis » sur la fiche.
   */
  globale?: { moyenne: number; avis: number };
}) {
  const filtre = cible === "marque" ? { brand_id: cibleId } : { product_id: cibleId };
  const [avis, mien, profile] = await Promise.all([
    getAvis(filtre),
    getMonAvis(filtre),
    getProfile(),
  ]);

  // Les signalements déjà faits par cette personne : le bouton doit
  // dire « c'est signalé » plutôt que proposer de recommencer.
  const signales = new Set(
    profile ? await mesSignalements("avis", avis.map((a) => a.id)) : []
  );
  const estAdmin = profile?.role === "admin";

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

        {(globale?.avis || total) > 0 && (
          <div className="flex items-center gap-2.5 sm:block sm:text-right">
            <Etoiles note={globale?.avis ? globale.moyenne : moyenne} />
            <p className="m-0 text-[12.5px] font-bold text-white/70 sm:mt-1">
              {enEtoiles(globale?.avis ? globale.moyenne : moyenne)} sur 5 ·{" "}
              {globale?.avis || total} avis
            </p>
            {globale?.avis && globale.avis > total ? (
              <p className="m-0 text-[11.5px] text-white/45 sm:mt-0.5">pièces comprises</p>
            ) : null}
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

              {/* Rien sous son propre avis : on le modifie ou on le
                  retire depuis le formulaire au-dessus, et se signaler
                  soi-même n'aurait aucun sens. */}
              {a.user_id !== profile?.id && (
                <OutilsAvis
                  avisId={a.id}
                  chemin={chemin}
                  connecte={Boolean(profile)}
                  estAdmin={estAdmin}
                  dejaSignale={signales.has(a.id)}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
