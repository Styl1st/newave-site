import Link from "next/link";
import { IconChevron, IconDrapeau, IconInbox } from "@/components/Icons";
import { libelleMotif, type ASignaler } from "@/lib/signalement";
import { attenteCourte } from "@/lib/attente";
import { CANDIDATURES_EN_ATTENTE, RELATIONSHIP_LABEL, type Application } from "@/lib/types";

/** Comment on nomme ce qui est signalé, dans une ligne de pile. */
const NATURE = { avis: "Avis", piece: "Pièce", marque: "Marque" } as const;

/**
 * Tout ce qui attend une décision, sur un seul écran.
 *
 * POURQUOI CETTE PAGE EXISTE. Les candidatures et les signalements
 * étaient deux destinations séparées, et la seconde était la sixième
 * entrée d'une barre qui s'enroulait : un signalement pouvait attendre
 * des semaines sans que personne n'ait de raison d'aller voir. Réunis,
 * ils tiennent sous un seul onglet et sous un seul badge — c'est le
 * badge, plus que cette page, qui fait qu'ils ne s'enterrent plus.
 *
 * ⚠️ ELLE TRIE, ELLE NE TRANCHE PAS. Le dessin proposait d'accepter ou
 * de refuser une candidature depuis sa ligne, en deux boutons. On ne
 * peut pas juger un dossier sur son nom et sa date : accepter crée une
 * fiche de marque et donne des droits au candidat, et ce qui permet
 * d'en décider — le site, l'Instagram, le mot du contact, l'aperçu de
 * la fiche — ne tient pas dans une ligne. `ListeSignalements` a déjà
 * tranché la même question dans l'autre sens pour les pièces et les
 * marques : « on y envoie plutôt que de proposer un bouton qui
 * déciderait à la place de quelqu'un qui n'a pas vu le contenu ».
 *
 * Chaque ligne ouvre donc le dossier, à l'endroit du dossier. Les deux
 * boutons de décision restent là où il y a de quoi décider.
 */
export default function LaPile({
  candidatures,
  signalements,
}: {
  /** Toutes les candidatures, filtrées ici : la page ne décide pas de ce qui attend. */
  candidatures: Application[];
  signalements: ASignaler[];
}) {
  /* La lecture les rend de la plus récente à la plus ancienne. Dans une
     pile, on veut l'inverse : ce qui attend depuis le plus longtemps
     passe en premier, parce que c'est ce qui coûte le plus cher à
     laisser attendre. */
  const enAttente = candidatures
    .filter((a) => (CANDIDATURES_EN_ATTENTE as readonly string[]).includes(a.status))
    .reverse();

  /* `getSignalements()` regroupe par cible : un avis signalé six fois
     fait une entrée, et six signalements. Le compte annoncé est celui
     des signalements, comme sur le tableau de bord. */
  const ouverts = signalements.reduce((n, s) => n + s.signalements.length, 0);
  const total = enAttente.length + ouverts;

  return (
    <>
      <header className="mb-7">
        <p className="eyebrow m-0 flex items-center gap-2">
          <IconInbox /> Modération
        </p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          La pile
        </h1>
        <p className="m-0 mt-3 max-w-2xl text-[14px] leading-relaxed text-white/70">
          {total === 0
            ? "Rien n'attend de décision. Les candidatures et les signalements arrivent ici."
            : `${total} chose${total > 1 ? "s" : ""} attend${total > 1 ? "ent" : ""} une décision. Chaque ligne ouvre le dossier : on tranche là où il y a de quoi juger.`}
        </p>
      </header>

      {/* ---------------- les candidatures ---------------- */}
      <section className="mb-9">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.02em] text-white">
            Candidatures
          </h2>
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">
            {enAttente.length}
          </span>
        </div>

        {enAttente.length === 0 ? (
          <p className="glass m-0 p-4 text-[13.5px] text-white/65">
            Aucune candidature n&apos;attend de réponse.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {enAttente.map((a) => (
              /* L'ancre mène au dossier lui-même, pas au haut de la
                 liste : sur une pile de vingt, retrouver celui qu'on
                 venait d'ouvrir prenait un défilement entier. */
              <Link
                key={a.id}
                href={`/admin/candidatures#${a.id}`}
                className="glass flex min-h-[66px] items-center gap-3 p-3.5 transition active:scale-[.99]"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="truncate text-[14.5px] font-extrabold text-white">
                      {a.brand_name}
                    </span>
                    <span className="shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/70">
                      {RELATIONSHIP_LABEL[a.relationship]}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] font-semibold text-white/55">
                    {a.contact_name} · {attenteCourte(a.created_at)}
                  </span>
                </span>
                <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-white/42" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- les signalements ---------------- */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.02em] text-white">
            Signalements
          </h2>
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">
            {ouverts}
          </span>
        </div>

        {signalements.length === 0 ? (
          <p className="glass m-0 p-4 text-[13.5px] text-white/65">
            Personne n&apos;a rien signalé.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {signalements.map((s) => {
              const dernier = s.signalements[0];
              return (
                /* Le cadre rouge n'est pas un cri : c'est la seule
                   chose qui distingue, en balayant la page, une pile
                   qu'on peut laisser d'une pile qu'on ne peut pas. */
                <Link
                  key={`${s.cible}-${s.cibleId}`}
                  href="/admin/signalements"
                  className="flex min-h-[66px] items-center gap-3 rounded-[var(--radius)] border border-[rgba(194,39,63,.45)] bg-[rgba(194,39,63,.18)] p-3.5 transition active:scale-[.99]"
                >
                  <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-white/13 text-white">
                    <IconDrapeau className="h-[17px] w-[17px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="truncate text-[14.5px] font-extrabold text-white">
                        {s.titre}
                      </span>
                      <span className="shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/70">
                        {NATURE[s.cible]}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[12.5px] font-semibold text-white/60">
                      {s.signalements.length} signalement
                      {s.signalements.length > 1 ? "s" : ""}
                      {dernier && ` · ${libelleMotif(s.cible, dernier.motif)}`}
                    </span>
                  </span>
                  <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-white/42" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
