import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Avatar from "@/components/messages/Avatar";
import CarteProfil from "@/components/forum/CarteProfil";
import OngletsForum from "@/components/forum/OngletsForum";
import { lireAnnoncesDe, lireProfil as lireProfilBrut, lireReponsesDe, moiForum } from "@/lib/forum-queries";
import {
  HANDLE_REGLE,
  handleNettoye,
  ilYA,
  lienAnnonce,
  lienMembre,
  moisAnnee,
  type OngletProfil,
  type ProfilMembre,
} from "@/lib/forum";

export const dynamic = "force-dynamic";

/* Une seule lecture par visite : les métadonnées et la page la partagent. */
const lireProfil = cache(lireProfilBrut);

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ onglet?: string }>;
};

/** Le pseudo de l'adresse, ou null s'il ne peut pas en être un (pas la peine d'interroger la base). */
function pseudoDe(brut: string): string | null {
  let h: string;
  try {
    h = handleNettoye(decodeURIComponent(brut));
  } catch {
    return null;
  }
  return HANDLE_REGLE.test(h) ? h : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = pseudoDe((await params).handle);
  const p = h ? await lireProfil(h) : null;
  if (!p || p === "erreur") return { title: "Membre introuvable", robots: { index: false } };
  return {
    title: `${p.nom} (@${p.handle}) · Forum`,
    description: p.bio ?? `@${p.handle} sur le forum NEWAVE SPHERE.`,
    /* Un profil de membre n'a rien à faire dans un moteur de recherche :
       beaucoup écrivent sous pseudo, et c'est leur affaire. */
    robots: { index: false },
  };
}

/**
 * Le profil public d'un membre (1f).
 *
 * LA RÉPUTATION, SANS CLASSEMENT. Les votes reçus sont là, en grand,
 * parce qu'ils disent si la personne est utile au forum ; ils ne sont
 * comparés à personne. Pas de « top membres » : un classement pousse à
 * publier pour monter, pas pour aider.
 *
 * PAS DE BOUTON « ÉCRIRE ». Une conversation naît d'une annonce (lot B) :
 * on écrit à quelqu'un en répondant à ce qu'il propose. Un message
 * direct, sans objet, ouvrirait la porte au démarchage.
 *
 * DEUX ONGLETS DANS L'ADRESSE (`?onglet=reponses`) : on peut partager
 * l'un ou l'autre, et Retour y ramène.
 */
export default async function ProfilPage({ params, searchParams }: Props) {
  const h = pseudoDe((await params).handle);
  if (!h) notFound();

  const [p, moi, { onglet: brut }] = await Promise.all([lireProfil(h), moiForum(), searchParams]);

  if (p === "erreur") {
    return (
      <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
        <h1 className="m-0 text-[clamp(28px,6vw,38px)] font-extrabold tracking-[-0.035em] text-white">@{h}</h1>
        <p className="glass m-0 mt-5 px-5 py-6 text-[15px] leading-relaxed text-white/90">
          Ce profil ne s&apos;est pas chargé. Réessaie dans un instant, ou retourne au{" "}
          <Link href="/forum" className="font-bold text-white underline underline-offset-2">
            forum
          </Link>
          .
        </p>
      </div>
    );
  }
  if (!p) notFound();

  const onglet: OngletProfil = brut === "reponses" ? "reponses" : "annonces";
  const cEstMoi = moi?.id === p.id;

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] pb-24 pt-6 sm:pt-9 md:pb-12">
      <Link
        href="/forum"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-white/80 transition hover:text-white"
      >
        ← Forum
      </Link>

      {/* ---------------- qui ---------------- */}
      <section className="rise flex flex-wrap items-center gap-x-5 gap-y-4">
        <span className="sm:hidden">
          <Avatar id={p.id} nom={p.nom} src={p.avatar} taille={72} arrondi={22} />
        </span>
        <span className="hidden sm:block">
          <Avatar id={p.id} nom={p.nom} src={p.avatar} taille={92} arrondi={28} />
        </span>

        <div className="min-w-0 flex-1 basis-[200px]">
          <h1 className="m-0 text-[clamp(26px,6vw,34px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-white [overflow-wrap:anywhere]">
            {p.nom}
          </h1>
          <p className="m-0 mt-1.5 text-[13.5px] font-bold text-white/85 [overflow-wrap:anywhere]">
            @{p.handle}
            {p.ville ? ` · ${p.ville}` : ""}
          </p>
          <p className="m-0 mt-1 text-[12.5px] font-semibold text-white/65">Membre depuis {moisAnnee(p.created_at)}</p>
        </div>

        {cEstMoi && (
          <Link
            href="/compte#forum"
            className="w-full rounded-[13px] bg-[#fff] px-[18px] py-3 text-center text-[13px] font-black text-[var(--color-ink)] transition active:scale-[.97] sm:w-auto"
          >
            Modifier mon profil
          </Link>
        )}
      </section>

      {p.bio && (
        <p className="rise m-0 mt-4 max-w-[620px] text-[15px] leading-relaxed text-white/90 [overflow-wrap:anywhere]">
          {p.bio}
        </p>
      )}

      {/* ---------------- la réputation ---------------- */}
      <dl className="glass rise rise-2 m-0 mt-6 grid grid-cols-3 overflow-hidden p-0">
        {[
          { n: p.votesRecus, label: "votes reçus" },
          { n: p.annonces, label: p.annonces > 1 ? "annonces" : "annonce" },
          { n: p.reponsesUtiles, label: p.reponsesUtiles > 1 ? "réponses utiles" : "réponse utile" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col-reverse px-3.5 py-3.5 sm:px-5 sm:py-4 ${i > 0 ? "border-l border-white/15" : ""}`}
          >
            <dt className="mt-1 text-[11.5px] font-bold leading-tight text-white/75 sm:text-[12.5px]">{s.label}</dt>
            <dd className="m-0 text-[24px] font-extrabold tabular-nums tracking-[-0.03em] text-white sm:text-[30px]">
              {s.n.toLocaleString("fr-FR")}
            </dd>
          </div>
        ))}
      </dl>

      {/* ---------------- les onglets ---------------- */}
      <nav aria-label="Contenu du profil" className="mt-8 flex gap-6 border-b border-white/25">
        {(
          [
            { cle: "annonces", label: "Annonces", n: p.annonces, href: lienMembre(p.handle) },
            { cle: "reponses", label: "Réponses", n: p.reponses, href: `${lienMembre(p.handle)}?onglet=reponses` },
          ] as const
        ).map((o) => {
          const courant = o.cle === onglet;
          return (
            <Link
              key={o.cle}
              href={o.href}
              scroll={false}
              aria-current={courant ? "page" : undefined}
              className={`-mb-px pb-2.5 text-[14px] transition ${
                courant
                  ? "font-extrabold text-white shadow-[inset_0_-2.5px_0_currentColor]"
                  : "font-bold text-white/70 hover:text-white"
              }`}
            >
              {o.label} <span className="font-bold tabular-nums opacity-70">{o.n}</span>
            </Link>
          );
        })}
      </nav>

      {onglet === "annonces" ? <Annonces p={p} cEstMoi={cEstMoi} /> : <Reponses p={p} cEstMoi={cEstMoi} />}

      <OngletsForum actif={cEstMoi ? "profil" : "forum"} connecte={Boolean(moi)} handle={moi?.handle} />
    </div>
  );
}

async function Annonces({ p, cEstMoi }: { p: ProfilMembre; cEstMoi: boolean }) {
  const annonces = await lireAnnoncesDe(p);

  if (annonces.length === 0) {
    return (
      <Vide>
        {cEstMoi ? (
          <>
            Tu n&apos;as encore rien publié à ton nom.{" "}
            <Link href="/forum/publier" className="font-bold text-white underline underline-offset-2">
              Publier une annonce
            </Link>
          </>
        ) : (
          <>@{p.handle} n&apos;a encore rien publié.</>
        )}
      </Vide>
    );
  }

  return (
    <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4">
      {annonces.map((a) => (
        <li key={a.id}>
          <CarteProfil annonce={a} />
        </li>
      ))}
    </ul>
  );
}

async function Reponses({ p, cEstMoi }: { p: ProfilMembre; cEstMoi: boolean }) {
  const reponses = await lireReponsesDe(p);

  if (reponses.length === 0) {
    return (
      <Vide>
        {cEstMoi ? "Tu n'as encore répondu à aucune annonce." : `@${p.handle} n'a encore répondu à aucune annonce.`}
      </Vide>
    );
  }

  return (
    <ul className="glass m-0 mt-5 list-none overflow-hidden p-0">
      {reponses.map((r) => (
        <li key={r.id} className="border-t border-white/15 first:border-t-0">
          <Link
            href={`${lienAnnonce(r.annonce)}#commentaire-${r.id}`}
            className="block px-4 py-4 transition hover:bg-white/[0.06] sm:px-5"
          >
            <span className="block truncate text-[12px] font-bold text-white/70">
              ↳ Sous « {r.annonce.titre} »
            </span>
            <span className="mt-1.5 line-clamp-4 block whitespace-pre-line text-[14.5px] leading-relaxed text-white [overflow-wrap:anywhere]">
              {r.texte}
            </span>
            <span className="mt-2 block text-[12px] font-bold tabular-nums text-white/65" suppressHydrationWarning>
              ▲ {r.votes} · {ilYA(r.created_at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mt-5 rounded-[16px] border border-dashed border-white/40 px-5 py-8 text-center text-[14px] font-semibold leading-relaxed text-white/85">
      {children}
    </p>
  );
}
