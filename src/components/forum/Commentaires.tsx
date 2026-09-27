"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BoutonSignaler from "@/components/BoutonSignaler";
import { commenter, supprimerCommentaire } from "@/app/forum/actions";
import Link from "next/link";
import { COMMENTAIRE_MAX, ilYA, initiales, lienMembre, type Commentaire } from "@/lib/forum";
import BoutonVote from "./BoutonVote";
import ChoixPseudo from "./ChoixPseudo";

/**
 * Les réponses publiques d'une annonce.
 *
 * ELLES SERVENT AUX QUESTIONS, PAS À S'ÉCHANGER DES COORDONNÉES. Le
 * champ le dit (« Poser une question publique… ») et la messagerie
 * privée existe pour le reste.
 *
 * Triées par votes, un seul niveau de réponse : « Répondre » sous une
 * réponse la range sous le même commentaire de tête (la base s'en
 * charge, voir migration 37). La réponse de l'auteur de l'annonce porte
 * le badge AUTEUR : c'est souvent elle qu'on cherche en descendant.
 */

type Moi = { id: string; handle: string | null; nom: string | null; avatar?: string | null } | null;

export default function Commentaires({
  annonceId,
  commentaires,
  total,
  auteurAnnonceId,
  signatureAuteur,
  lienSignature = null,
  moi,
  chemin,
  dejaSignales,
}: {
  annonceId: string;
  commentaires: Commentaire[];
  total: number;
  auteurAnnonceId: string;
  /** Au nom de la marque si l'annonce l'est, sinon null. */
  signatureAuteur: string | null;
  /** Où mène ce nom de marque : sa fiche. */
  lienSignature?: string | null;
  moi: Moi;
  chemin: string;
  dejaSignales: string[];
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(moi?.handle ?? null);
  const [pseudo, setPseudo] = useState<null | (() => void)>(null);

  /** Exécute `envoyer` tout de suite, ou après le choix du pseudo. */
  function avecPseudo(envoyer: () => void) {
    if (handle) envoyer();
    else setPseudo(() => envoyer);
  }

  return (
    <section aria-labelledby="titre-reponses" className="mt-8">
      <div className="mb-3.5 flex items-baseline justify-between gap-4">
        <h2 id="titre-reponses" className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-white">
          {total} réponse{total > 1 ? "s" : ""}
        </h2>
        {total > 1 && <span className="text-[12.5px] font-bold text-white/70">Les plus votées</span>}
      </div>

      {moi ? (
        <Formulaire
          annonceId={annonceId}
          parentId={null}
          initialesMoi={initiales(moi.nom ?? handle)}
          photoMoi={moi.avatar ?? null}
          placeholder="Poser une question publique…"
          avecPseudo={avecPseudo}
          onEnvoye={() => router.refresh()}
        />
      ) : (
        <a
          href={`/connexion?suite=${encodeURIComponent(chemin)}`}
          className="glass flex min-h-[56px] items-center px-5 text-[14px] font-bold text-white/85 transition hover:text-white"
        >
          Connecte-toi pour poser une question.
        </a>
      )}

      <div className="mt-3.5 flex flex-col gap-3">
        {commentaires.map((c) => (
          <Fil
            key={c.id}
            c={c}
            annonceId={annonceId}
            auteurAnnonceId={auteurAnnonceId}
            signatureAuteur={signatureAuteur}
            lienSignature={lienSignature}
            moi={moi}
            handle={handle}
            chemin={chemin}
            dejaSignales={dejaSignales}
            avecPseudo={avecPseudo}
          />
        ))}
      </div>

      <ChoixPseudo
        ouvert={pseudo !== null}
        nomInitial={moi?.nom ?? null}
        onFermer={() => setPseudo(null)}
        onChoisi={(h) => {
          setHandle(h);
          const suite = pseudo;
          setPseudo(null);
          suite?.();
        }}
      />
    </section>
  );
}

function Fil({
  c,
  annonceId,
  auteurAnnonceId,
  signatureAuteur,
  lienSignature = null,
  moi,
  handle,
  chemin,
  dejaSignales,
  avecPseudo,
}: {
  c: Commentaire;
  annonceId: string;
  auteurAnnonceId: string;
  signatureAuteur: string | null;
  lienSignature?: string | null;
  moi: Moi;
  handle: string | null;
  chemin: string;
  dejaSignales: string[];
  avecPseudo: (envoyer: () => void) => void;
}) {
  const router = useRouter();
  const [repondre, setRepondre] = useState(false);

  return (
    <article className="rounded-[18px] border border-white/18 bg-white/8 p-4 sm:p-[18px]">
      <Ligne
        c={c}
        auteurAnnonceId={auteurAnnonceId}
        signatureAuteur={signatureAuteur}
        lienSignature={lienSignature}
        moi={moi}
        chemin={chemin}
        dejaSignales={dejaSignales}
        onRepondre={moi ? () => setRepondre((v) => !v) : undefined}
      />

      {(c.reponses.length > 0 || repondre) && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-white/25 pl-4">
          {c.reponses.map((r) => (
            <Ligne
              key={r.id}
              c={r}
              auteurAnnonceId={auteurAnnonceId}
              signatureAuteur={signatureAuteur}
              lienSignature={lienSignature}
              moi={moi}
              chemin={chemin}
              dejaSignales={dejaSignales}
            />
          ))}
          {repondre && moi && (
            <Formulaire
              annonceId={annonceId}
              parentId={c.id}
              initialesMoi={initiales(moi.nom ?? handle)}
              photoMoi={moi.avatar ?? null}
              placeholder={`Répondre à ${c.auteur.handle ? `@${c.auteur.handle}` : "ce commentaire"}…`}
              avecPseudo={avecPseudo}
              onEnvoye={() => {
                setRepondre(false);
                router.refresh();
              }}
              compact
            />
          )}
        </div>
      )}
    </article>
  );
}

function Ligne({
  c,
  auteurAnnonceId,
  signatureAuteur,
  lienSignature = null,
  moi,
  chemin,
  dejaSignales,
  onRepondre,
}: {
  c: Commentaire;
  auteurAnnonceId: string;
  signatureAuteur: string | null;
  lienSignature?: string | null;
  moi: Moi;
  chemin: string;
  dejaSignales: string[];
  onRepondre?: () => void;
}) {
  const router = useRouter();
  const [retrait, setRetrait] = useState(false);
  const deLAuteur = c.auteur.id === auteurAnnonceId;
  const aMoi = Boolean(moi) && moi?.id === c.auteur.id;
  const signeMarque = deLAuteur && Boolean(signatureAuteur);
  const nom = signeMarque ? signatureAuteur : c.auteur.handle ? `@${c.auteur.handle}` : c.auteur.nom ?? "Membre";
  // Le nom mène à qui a écrit : la fiche de la marque, ou le profil.
  const lien = signeMarque ? lienSignature : c.auteur.handle ? lienMembre(c.auteur.handle) : null;

  async function retirer() {
    if (!confirm("Retirer ce commentaire ?")) return;
    setRetrait(true);
    const res = await supprimerCommentaire(c.id);
    setRetrait(false);
    if (res.ok) router.refresh();
  }

  return (
    <div id={`commentaire-${c.id}`} className="scroll-mt-28">
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-bold text-white/70">
        {lien ? (
          <Link href={lien} className="font-extrabold text-white underline-offset-4 hover:underline">
            {nom}
          </Link>
        ) : (
          <span className="font-extrabold text-white">{nom}</span>
        )}
        {deLAuteur && (
          <span className="rounded-[5px] bg-white px-1.5 py-[3px] text-[8.5px] font-black uppercase leading-none tracking-[0.12em] text-[var(--color-ink)]">
            Auteur
          </span>
        )}
        <span suppressHydrationWarning>· {ilYA(c.created_at)}</span>
        {c.masque && (
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] text-white">
            En cours de relecture
          </span>
        )}
      </p>
      <p className="m-0 mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-white [overflow-wrap:anywhere]">
        {c.texte}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <BoutonVote
          cible="commentaire"
          id={c.id}
          votes={c.votes}
          aVote={c.aVote}
          estAuteur={aMoi}
          habit="sombre"
        />
        {onRepondre && (
          <button
            type="button"
            onClick={onRepondre}
            className="text-[12.5px] font-bold text-white/75 transition hover:text-white"
          >
            Répondre
          </button>
        )}
        {aMoi ? (
          <button
            type="button"
            onClick={retirer}
            disabled={retrait}
            className="text-[12px] font-bold text-white/50 underline decoration-white/25 underline-offset-4 transition hover:text-white/80"
          >
            {retrait ? "…" : "Retirer"}
          </button>
        ) : (
          moi && (
            <BoutonSignaler
              cible="commentaire"
              cibleId={c.id}
              chemin={chemin}
              connecte
              dejaFait={dejaSignales.includes(c.id)}
              className="basis-full sm:basis-auto"
            />
          )
        )}
      </div>
    </div>
  );
}

function Formulaire({
  annonceId,
  parentId,
  initialesMoi,
  photoMoi = null,
  placeholder,
  avecPseudo,
  onEnvoye,
  compact = false,
}: {
  annonceId: string;
  parentId: string | null;
  initialesMoi: string;
  /** Sa photo de profil : elle remplace les initiales. */
  photoMoi?: string | null;
  placeholder: string;
  avecPseudo: (envoyer: () => void) => void;
  onEnvoye: () => void;
  compact?: boolean;
}) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyer() {
    const t = texte.trim();
    if (!t) return;
    avecPseudo(async () => {
      setEnvoi(true);
      setErreur(null);
      const res = await commenter({ annonceId, texte: t, parentId });
      setEnvoi(false);
      if (!res.ok) {
        setErreur(res.error ?? "Le commentaire n'est pas parti.");
        return;
      }
      setTexte("");
      onEnvoye();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        envoyer();
      }}
      className={compact ? "" : "glass p-2.5 sm:p-3"}
    >
      <div className="flex items-end gap-2.5">
        {!compact && (
          <span
            aria-hidden
            className="relative mb-1 grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fff] text-[11.5px] font-black text-[var(--color-ink)]"
          >
            {photoMoi ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photoMoi} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              initialesMoi
            )}
          </span>
        )}
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value.slice(0, COMMENTAIRE_MAX))}
          onKeyDown={(e) => {
            // Entrée envoie, Maj+Entrée va à la ligne.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder={placeholder}
          rows={1}
          aria-label={placeholder}
          className="min-h-[44px] flex-1 resize-none rounded-[13px] border border-white/15 bg-white/8 px-3.5 py-2.5 text-[14.5px] text-white outline-none placeholder:text-white/55 focus:border-white/45 [field-sizing:content]"
        />
        <button
          type="submit"
          disabled={!texte.trim() || envoi}
          className="mb-0.5 min-h-[40px] shrink-0 rounded-full bg-white px-4 text-[13px] font-black text-[var(--color-ink)] transition active:scale-[.97] disabled:opacity-50"
        >
          {envoi ? "…" : "Envoyer"}
        </button>
      </div>
      {erreur && <p className="m-0 mt-2 px-1 text-[12.5px] font-bold text-white">{erreur}</p>}
    </form>
  );
}
