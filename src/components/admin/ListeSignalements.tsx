"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { classerSignalements, retirerAvis } from "@/lib/moderation";
import { libelleMotif, type ASignaler } from "@/lib/signalement";

const NATURE: Record<ASignaler["cible"], string> = {
  avis: "Avis",
  piece: "Pièce",
  marque: "Marque",
};

/**
 * Un signalement, tel qu'on le juge.
 *
 * Deux issues, et elles sont volontairement symétriques : on classe
 * sans suite, ou l'on agit. « Sans suite » n'est pas un abandon, c'est
 * la réponse la plus fréquente — beaucoup de signalements traduisent
 * un désaccord, pas un abus. Sans cette porte, la seule façon de vider
 * la pile serait d'effacer des contenus légitimes.
 *
 * Ce que « agir » veut dire dépend de la nature. Un avis se retire
 * d'ici, en un geste. Une pièce ou une fiche de marque, non : les
 * dépublier demande de regarder la fiche, et il y a un écran fait pour
 * ça. On y envoie plutôt que de proposer un bouton qui déciderait à la
 * place de quelqu'un qui n'a pas vu le contenu.
 */
function Carte({ item }: { item: ASignaler }) {
  const router = useRouter();
  const [pending, setPending] = useState<"" | "retrait" | "classement">("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function agir(quoi: "retrait" | "classement") {
    if (quoi === "retrait" && !confirm("Retirer cet avis définitivement ?")) return;

    setPending(quoi);
    setErreur(null);

    const formData = new FormData();
    if (quoi === "retrait") {
      formData.set("id", item.cibleId);
      if (item.href) formData.set("chemin", item.href);
    } else {
      formData.set("cible", item.cible);
      formData.set("cibleId", item.cibleId);
    }

    const res =
      quoi === "retrait" ? await retirerAvis(formData) : await classerSignalements(formData);

    setPending("");
    if (!res.ok) {
      setErreur(res.error ?? "L'action a échoué.");
      return;
    }
    router.refresh();
  }

  const dernier = item.signalements[0];
  const date = dernier
    ? new Date(dernier.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <article className="glass border border-white/25 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
            <span className="rounded-full bg-white/16 px-2.5 py-1 text-white">
              {NATURE[item.cible]}
            </span>
            {item.signalements.length} signalement{item.signalements.length > 1 ? "s" : ""}
            <span className="font-bold normal-case tracking-normal text-white/45">{date}</span>
          </p>

          <p className="m-0 mt-2 text-[15px] font-extrabold text-white">{item.titre}</p>
          {item.extrait && (
            <p className="m-0 mt-1 line-clamp-3 whitespace-pre-line text-[13.5px] leading-relaxed text-white/78">
              {item.extrait}
            </p>
          )}

          {item.href ? (
            <Link
              href={item.href}
              className="mt-2 inline-block text-[12.5px] font-bold text-white/70 underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-white/70"
            >
              Aller voir en contexte
            </Link>
          ) : (
            <p className="m-0 mt-2 text-[12.5px] text-white/45">
              La cible n&apos;existe plus. Classe sans suite.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => agir("classement")}
            disabled={Boolean(pending)}
            className="rounded-full border border-white/30 px-4 py-2 text-[12px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/12 hover:text-white disabled:opacity-50"
          >
            {pending === "classement" ? "…" : "Sans suite"}
          </button>

          {item.cible === "avis" && (
            <button
              type="button"
              onClick={() => agir("retrait")}
              disabled={Boolean(pending)}
              className="rounded-full bg-white px-4 py-2 text-[12px] font-black text-[var(--color-ink)] transition active:scale-[.97] disabled:opacity-50"
            >
              {pending === "retrait" ? "…" : "Retirer l'avis"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 rounded-[13px] border border-white/18 bg-white/6 p-3">
        {item.signalements.map((s, i) => (
          <p key={i} className="m-0 text-[12.5px] leading-relaxed text-white/78">
            <span className="font-bold text-white">{libelleMotif(item.cible, s.motif)}</span>
            {s.detail && <> — {s.detail}</>}
          </p>
        ))}
      </div>

      {erreur && (
        <p className="m-0 mt-3 rounded-[11px] bg-white/12 px-3 py-2 text-[13px] text-white">
          {erreur}
        </p>
      )}
    </article>
  );
}

export default function ListeSignalements({ items }: { items: ASignaler[] }) {
  const [nature, setNature] = useState<ASignaler["cible"] | null>(null);

  const visibles = nature ? items.filter((i) => i.cible === nature) : items;
  const compter = (c: ASignaler["cible"]) => items.filter((i) => i.cible === c).length;

  const chip = "rounded-full px-3.5 py-2 text-[12.5px] font-bold transition active:scale-[.97]";
  const bouton = (actif: boolean) =>
    `${chip} ${
      actif
        ? "bg-white text-[var(--color-ink)]"
        : "border border-white/25 text-white/78 hover:bg-white/12 hover:text-white"
    }`;

  if (items.length === 0) {
    return (
      <p className="glass m-0 px-5 py-6 text-[14px] leading-relaxed text-white/70">
        Rien à examiner. C&apos;est le cas le plus fréquent, et c&apos;est bon signe.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setNature(null)} className={bouton(nature === null)}>
          Tout <span className="opacity-55">{items.length}</span>
        </button>
        {(["avis", "piece", "marque"] as const).map((c) =>
          compter(c) > 0 ? (
            <button
              key={c}
              type="button"
              onClick={() => setNature(c)}
              className={bouton(nature === c)}
            >
              {NATURE[c]} <span className="opacity-55">{compter(c)}</span>
            </button>
          ) : null
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visibles.map((i) => (
          <Carte key={`${i.cible}-${i.cibleId}`} item={i} />
        ))}
      </div>
    </div>
  );
}
