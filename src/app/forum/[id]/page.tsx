import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionsAnnonce from "@/components/forum/ActionsAnnonce";
import Commentaires from "@/components/forum/Commentaires";
import PastilleRubrique from "@/components/forum/PastilleRubrique";
import { BadgeMarque } from "@/components/forum/CarteAnnonce";
import { getProfile } from "@/lib/auth";
import { mesSignalements } from "@/lib/moderation";
import {
  lireAnnonce,
  lireCarteAuteur,
  lireCommentaires,
  lireVoisines,
  moiForum,
} from "@/lib/forum-queries";
import {
  idDepuisParam,
  ilYA,
  initiales,
  libelleDates,
  libelleRemuneration,
  lienAnnonce,
  rubrique,
  signature,
  type Annonce,
} from "@/lib/forum";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = idDepuisParam((await params).id);
  const a = id ? await lireAnnonce(id) : null;
  if (!a || a.masque) return { title: "Annonce introuvable" };
  return {
    title: `${a.titre} · Forum`,
    description: a.texte.slice(0, 160) || `${rubrique(a.rubrique).label} sur le forum NEWAVE SPHERE.`,
  };
}

/**
 * Les cases du bandeau de détails, quatre au plus.
 *
 * « Où » vient de la ville de l'annonce ; le reste des détails propres
 * à la rubrique. Une case vide ne s'affiche pas : un bandeau de quatre
 * tirets n'apprend rien.
 */
function casesDeDetails(a: Annonce): { label: string; valeur: string; verte?: boolean }[] {
  const d = a.details;
  const cases: { label: string; valeur: string; verte?: boolean }[] = [];
  if (d.date) cases.push({ label: "Quand", valeur: libelleDates(d.date) });
  if (d.dates) cases.push({ label: "Quand", valeur: libelleDates(d.dates) });
  if (d.adresse) cases.push({ label: "Où", valeur: d.adresse });
  else if (a.ville) cases.push({ label: "Où", valeur: a.ville });
  if (d.remuneration) {
    const l = libelleRemuneration(d.remuneration);
    if (l) cases.push({ label: "Rémunération", valeur: l, verte: d.remuneration !== "benevole" });
  }
  if (d.profils) cases.push({ label: "Profils", valeur: d.profils });
  if (d.portfolio) cases.push({ label: "Portfolio", valeur: d.portfolio });
  if (d.entree) cases.push({ label: "Entrée", valeur: d.entree });
  return cases.slice(0, 4);
}

export default async function AnnoncePage({ params }: Props) {
  const brut = (await params).id;
  const id = idDepuisParam(brut);
  if (!id) notFound();

  const [a, moi, profil] = await Promise.all([lireAnnonce(id), moiForum(), getProfile()]);
  if (!a) notFound();

  const chemin = lienAnnonce(a);
  const [commentaires, carte, voisines, signalees] = await Promise.all([
    lireCommentaires(a.id),
    lireCarteAuteur(a.auteur.id, a.marque?.id ?? null),
    lireVoisines(a),
    moi ? mesSignalements("annonce", [a.id]) : Promise.resolve([] as string[]),
  ]);

  const idsCommentaires = commentaires.flatMap((c) => [c.id, ...c.reponses.map((r) => r.id)]);
  const commentairesSignales = moi && idsCommentaires.length > 0
    ? await mesSignalements("commentaire", idsCommentaires)
    : [];

  const r = rubrique(a.rubrique);
  const cases = casesDeDetails(a);
  const [photo, ...autresPhotos] = a.images;
  const nomAuteur = signature(a);

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-6 sm:py-9">
      <Link
        href={`/forum?rubrique=${a.rubrique}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-white/80 transition hover:text-white"
      >
        ← Forum · {r.label}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">
        <div className="min-w-0">
          {a.masque && (
            <p className="glass m-0 mb-4 px-5 py-4 text-[14px] leading-relaxed text-white">
              <strong>Ton annonce est en cours de relecture.</strong> Plusieurs personnes l&apos;ont
              signalée ; elle n&apos;apparaît plus dans le fil en attendant qu&apos;un
              administrateur la regarde.
            </p>
          )}

          <article className="card-light rise">
            {photo && (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[rgba(123,82,232,0.12)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            {autresPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 px-4 pt-4 sm:px-7">
                {autresPhotos.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[12px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="aspect-square h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            <div className="p-5 sm:p-7">
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold text-[#6a5a92]">
                <PastilleRubrique cle={a.rubrique} habit="texte" className="text-[var(--color-ink)]" />
                {a.ville && <span>· {a.ville}</span>}
                <span suppressHydrationWarning>· {ilYA(a.created_at)}</span>
                {a.cloturee && (
                  <span className="rounded-full bg-[var(--color-ink)] px-2.5 py-[5px] text-[10px] font-black uppercase leading-none tracking-[0.1em] text-white">
                    Clôturée
                  </span>
                )}
              </p>

              <h1 className="m-0 mt-2.5 text-[clamp(24px,4.4vw,34px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--color-ink)] [overflow-wrap:anywhere]">
                {a.titre}
              </h1>

              {a.texte && (
                <p className="m-0 mt-4 whitespace-pre-line text-[15px] leading-[1.7] text-[#3d2f63] [overflow-wrap:anywhere]">
                  {a.texte}
                </p>
              )}

              {cases.length > 0 && (
                <dl className="m-0 mt-6 grid grid-cols-2 overflow-hidden rounded-[14px] bg-[rgba(123,82,232,0.07)] sm:grid-cols-4">
                  {cases.map((c, i) => (
                    <div
                      key={`${c.label}-${i}`}
                      className={`px-4 py-3 ${i > 0 ? "sm:border-l sm:border-[rgba(23,10,51,0.08)]" : ""} ${
                        i % 2 === 1 ? "border-l border-[rgba(23,10,51,0.08)]" : ""
                      } ${i >= 2 ? "border-t border-[rgba(23,10,51,0.08)] sm:border-t-0" : ""}`}
                    >
                      <dt className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6a5a92]">{c.label}</dt>
                      <dd
                        className={`m-0 mt-1 text-[14px] font-extrabold [overflow-wrap:anywhere] ${
                          c.verte ? "text-[#1f7a45]" : "text-[var(--color-ink)]"
                        }`}
                      >
                        {c.valeur}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <ActionsAnnonce
                annonce={a}
                moiId={moi?.id ?? null}
                estAdmin={profil?.role === "admin"}
                chemin={chemin}
                dejaSignalee={signalees.includes(a.id)}
              />
            </div>
          </article>

          <Commentaires
            annonceId={a.id}
            commentaires={commentaires}
            total={idsCommentaires.length}
            auteurAnnonceId={a.auteur.id}
            signatureAuteur={a.marque ? a.marque.nom : null}
            moi={moi ? { id: moi.id, handle: moi.handle, nom: moi.nom } : null}
            chemin={chemin}
            dejaSignales={commentairesSignales}
          />
        </div>

        {/* ---------------- la colonne de droite ---------------- */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
          <div className="card-light p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-[15px] font-black text-[var(--color-ink)]"
                style={{ background: r.couleur }}
              >
                {initiales(a.marque?.nom ?? a.auteur.nom ?? a.auteur.handle)}
              </span>
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-1.5 truncate text-[16px] font-extrabold text-[var(--color-ink)]">
                  {a.marque ? a.marque.nom : a.auteur.nom ?? nomAuteur}
                  {a.marque && <BadgeMarque />}
                </p>
                <p className="m-0 mt-0.5 truncate text-[10.5px] font-black uppercase tracking-[0.12em] text-[#6a5a92]">
                  {a.marque ? "Marque vérifiée" : a.auteur.handle ? `@${a.auteur.handle}` : "Membre"}
                  {a.ville && a.ville !== "En ligne" ? ` · ${a.ville}` : ""}
                </p>
              </div>
            </div>

            {carte && (
              <dl className="m-0 mt-4 grid grid-cols-2 overflow-hidden rounded-[13px] bg-[rgba(123,82,232,0.07)] text-center">
                <div className="flex flex-col-reverse px-2 py-3">
                  <dt className="text-[10.5px] font-bold text-[#6a5a92]">votes reçus</dt>
                  <dd className="m-0 text-[20px] font-extrabold tabular-nums text-[var(--color-ink)]">
                    {carte.votesRecus.toLocaleString("fr-FR")}
                  </dd>
                </div>
                <div className="flex flex-col-reverse border-l border-[rgba(23,10,51,0.08)] px-2 py-3">
                  <dt className="text-[10.5px] font-bold text-[#6a5a92]">
                    annonce{carte.annonces > 1 ? "s" : ""}
                  </dt>
                  <dd className="m-0 text-[20px] font-extrabold tabular-nums text-[var(--color-ink)]">
                    {carte.annonces.toLocaleString("fr-FR")}
                  </dd>
                </div>
              </dl>
            )}

            {a.marque && (
              <Link
                href={`/marques/${a.marque.slug}`}
                className="mt-3 flex min-h-[42px] items-center justify-center rounded-[13px] border border-[rgba(23,10,51,0.14)] bg-[#fff] text-[13px] font-extrabold text-[var(--color-ink)] transition hover:border-[rgba(23,10,51,0.3)]"
              >
                Voir la fiche marque
              </Link>
            )}
          </div>

          {voisines.length > 0 && (
            <div className="glass p-4 sm:p-5">
              <p className="eyebrow m-0 mb-1">Autres · {r.label}</p>
              <ul className="m-0 list-none p-0">
                {voisines.map((v) => (
                  <li key={v.id} className="border-t border-white/15 py-3 first:border-t-0">
                    <Link href={lienAnnonce(v)} className="group block">
                      <span className="block text-[14px] font-extrabold leading-snug text-white group-hover:underline">
                        {v.titre}
                      </span>
                      <span className="mt-1 block text-[12px] font-bold text-white/65">
                        ▲ {v.votes}
                        {v.ville ? ` · ${v.ville}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
